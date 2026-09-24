import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb, getSqliteInstance } from '../database/connection';
import { sales, saleItems, products, stockMovements } from '../database/schema';
import { Sale, SaleStatus, StockMovementType } from '../../shared/types';
import { createSaleSchema, cancelSaleSchema, returnSaleSchema } from '../../shared/schemas';
import { z } from 'zod';
import { ProductService } from './ProductService';

export class SaleService {
  static async getSales(limit = 100): Promise<Sale[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(sales)
      .orderBy(desc(sales.created_at))
      .limit(limit);

    const saleList: Sale[] = [];
    for (const s of rows) {
      const items = await db
        .select({
          id: saleItems.id,
          sale_id: saleItems.sale_id,
          product_id: saleItems.product_id,
          quantity: saleItems.quantity,
          unit_price: saleItems.unit_price,
          discount_amount: saleItems.discount_amount,
          total_amount: saleItems.total_amount,
          product_name: products.name,
          product_barcode: products.barcode,
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.product_id, products.id))
        .where(eq(saleItems.sale_id, s.id));

      saleList.push({
        ...s,
        payment_type: s.payment_type as any,
        status: s.status as any,
        items,
      });
    }

    return saleList;
  }

  static async getSaleById(id: number): Promise<Sale | null> {
    const db = getDb();
    const rows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (rows.length === 0) return null;

    const s = rows[0];
    const items = await db
      .select({
        id: saleItems.id,
        sale_id: saleItems.sale_id,
        product_id: saleItems.product_id,
        quantity: saleItems.quantity,
        unit_price: saleItems.unit_price,
        discount_amount: saleItems.discount_amount,
        total_amount: saleItems.total_amount,
        product_name: products.name,
        product_barcode: products.barcode,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.product_id, products.id))
      .where(eq(saleItems.sale_id, s.id));

    return {
      ...s,
      payment_type: s.payment_type as any,
      status: s.status as any,
      items,
    };
  }

  static async createSale(data: z.infer<typeof createSaleSchema>): Promise<Sale> {
    const validated = createSaleSchema.parse(data);
    const sqlite = getSqliteInstance();

    // Merge duplicate products in cart
    const itemMap = new Map<number, { product_id: number; quantity: number; unit_price: number; discount_amount: number }>();
    for (const item of validated.items) {
      if (itemMap.has(item.product_id)) {
        const existing = itemMap.get(item.product_id)!;
        existing.quantity += item.quantity;
        existing.discount_amount += item.discount_amount;
      } else {
        itemMap.set(item.product_id, { ...item });
      }
    }
    const mergedItems = Array.from(itemMap.values());

    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const saleNumber = `SAT-${dateStr}-${randomSuffix}`;

    // Execute within SQLite Transaction
    const transaction = sqlite.transaction(() => {
      let grandTotal = 0;

      // 1. Verify products & stock quantities
      for (const item of mergedItems) {
        const product = sqlite
          .prepare('SELECT id, name, stock_quantity, sale_price, is_active FROM products WHERE id = ?')
          .get(item.product_id) as any;

        if (!product || !product.is_active) {
          throw new Error(`Ürün bulunamadı veya pasif (ID: ${item.product_id})`);
        }

        if (product.stock_quantity < item.quantity) {
          throw new Error(
            `Yetersiz stok! ${product.name} (Stok: ${product.stock_quantity}, İstenen: ${item.quantity})`
          );
        }

        const itemTotal = item.quantity * item.unit_price - item.discount_amount;
        grandTotal += itemTotal;
      }

      grandTotal = Math.max(0, grandTotal - validated.discount_amount);

      // 2. Insert Sale
      const saleResult = sqlite
        .prepare(
          `INSERT INTO sales (sale_number, total_amount, discount_amount, payment_type, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          saleNumber,
          grandTotal,
          validated.discount_amount,
          validated.payment_type,
          SaleStatus.COMPLETED,
          now,
          now
        );

      const saleId = saleResult.lastInsertRowid as number;

      // 3. Insert Sale Items & Decrease Stock & Log Movement
      for (const item of mergedItems) {
        const itemTotal = Math.max(0, item.quantity * item.unit_price - item.discount_amount);

        sqlite
          .prepare(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, total_amount)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(saleId, item.product_id, item.quantity, item.unit_price, item.discount_amount, itemTotal);

        const currentProduct = sqlite
          .prepare('SELECT stock_quantity FROM products WHERE id = ?')
          .get(item.product_id) as any;

        const prevStock = currentProduct.stock_quantity;
        const newStock = prevStock - item.quantity;

        sqlite
          .prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?')
          .run(newStock, now, item.product_id);

        sqlite
          .prepare(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            item.product_id,
            StockMovementType.SALE,
            -item.quantity,
            prevStock,
            newStock,
            item.unit_price,
            'SALE',
            saleId,
            `Satış: ${saleNumber}`,
            now
          );
      }

      return saleId;
    });

    try {
      const saleId = transaction();
      return (await this.getSaleById(saleId))!;
    } catch (err: any) {
      throw {
        code: 'SALE_FAILED',
        message: err.message || 'Satış işlemi gerçekleştirilemedi.',
      };
    }
  }

  static async cancelSale(data: z.infer<typeof cancelSaleSchema>): Promise<Sale> {
    const validated = cancelSaleSchema.parse(data);
    const sqlite = getSqliteInstance();

    const transaction = sqlite.transaction(() => {
      const sale = sqlite
        .prepare('SELECT * FROM sales WHERE id = ?')
        .get(validated.sale_id) as any;

      if (!sale) {
        throw new Error('Satış kaydı bulunamadı.');
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new Error('Bu satış zaten iptal edilmiş!');
      }

      const items = sqlite
        .prepare('SELECT * FROM sale_items WHERE sale_id = ?')
        .all(validated.sale_id) as any[];

      const now = new Date().toISOString();

      // Restore stocks for all items
      for (const item of items) {
        const product = sqlite
          .prepare('SELECT stock_quantity FROM products WHERE id = ?')
          .get(item.product_id) as any;

        if (product) {
          const prevStock = product.stock_quantity;
          const newStock = prevStock + item.quantity;

          sqlite
            .prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?')
            .run(newStock, now, item.product_id);

          sqlite
            .prepare(
              `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              item.product_id,
              StockMovementType.CANCEL,
              item.quantity,
              prevStock,
              newStock,
              item.unit_price,
              'SALE_CANCEL',
              sale.id,
              `Satış İptali: ${sale.sale_number} - ${validated.reason || 'Kullanıcı İptali'}`,
              now
            );
        }
      }

      sqlite
        .prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?')
        .run(SaleStatus.CANCELLED, now, sale.id);

      return sale.id;
    });

    try {
      const saleId = transaction();
      return (await this.getSaleById(saleId))!;
    } catch (err: any) {
      throw {
        code: 'CANCEL_FAILED',
        message: err.message || 'Satış iptal edilemedi.',
      };
    }
  }

  static async returnSale(data: z.infer<typeof returnSaleSchema>): Promise<Sale> {
    const validated = returnSaleSchema.parse(data);
    const sqlite = getSqliteInstance();

    const transaction = sqlite.transaction(() => {
      const sale = sqlite
        .prepare('SELECT * FROM sales WHERE id = ?')
        .get(validated.sale_id) as any;

      if (!sale) {
        throw new Error('Satış kaydı bulunamadı.');
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new Error('İptal edilmiş bir satıştan iade alınamaz.');
      }

      const now = new Date().toISOString();

      for (const returnItem of validated.items) {
        const saleItem = sqlite
          .prepare('SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ?')
          .get(validated.sale_id, returnItem.product_id) as any;

        if (!saleItem) {
          throw new Error(`Satışta bu ürün (ID: ${returnItem.product_id}) bulunamadı.`);
        }

        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(
            `İade miktarı (${returnItem.quantity}) satılan miktardan (${saleItem.quantity}) fazla olamaz!`
          );
        }

        const product = sqlite
          .prepare('SELECT stock_quantity FROM products WHERE id = ?')
          .get(returnItem.product_id) as any;

        if (product) {
          const prevStock = product.stock_quantity;
          const newStock = prevStock + returnItem.quantity;

          sqlite
            .prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?')
            .run(newStock, now, returnItem.product_id);

          sqlite
            .prepare(
              `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              returnItem.product_id,
              StockMovementType.RETURN,
              returnItem.quantity,
              prevStock,
              newStock,
              saleItem.unit_price,
              'SALE_RETURN',
              sale.id,
              `Ürün İadesi: ${sale.sale_number} - ${validated.reason || 'Müşteri İadesi'}`,
              now
            );
        }
      }

      // Check if all items in sale were returned or partial
      const allItems = sqlite
        .prepare('SELECT * FROM sale_items WHERE sale_id = ?')
        .all(validated.sale_id) as any[];

      let totalSaleQty = 0;
      for (const item of allItems) {
        totalSaleQty += item.quantity;
      }

      let totalReturnedQty = 0;
      for (const item of validated.items) {
        totalReturnedQty += item.quantity;
      }

      const newStatus =
        totalReturnedQty >= totalSaleQty
          ? SaleStatus.RETURNED
          : SaleStatus.PARTIALLY_RETURNED;

      sqlite
        .prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?')
        .run(newStatus, now, sale.id);

      return sale.id;
    });

    try {
      const saleId = transaction();
      return (await this.getSaleById(saleId))!;
    } catch (err: any) {
      throw {
        code: 'RETURN_FAILED',
        message: err.message || 'İade işlemi gerçekleştirilemedi.',
      };
    }
  }
}
