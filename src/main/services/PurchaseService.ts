import { eq, desc } from 'drizzle-orm';
import { getDb, getSqliteInstance } from '../database/connection';
import { purchases, purchaseItems, products } from '../database/schema';
import { Purchase, StockMovementType } from '../../shared/types';
import { createPurchaseSchema } from '../../shared/schemas';
import { z } from 'zod';

export class PurchaseService {
  static async getPurchases(limit = 100): Promise<Purchase[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(purchases)
      .orderBy(desc(purchases.created_at))
      .limit(limit);

    const purchaseList: Purchase[] = [];
    for (const p of rows) {
      const items = await db
        .select({
          id: purchaseItems.id,
          purchase_id: purchaseItems.purchase_id,
          product_id: purchaseItems.product_id,
          quantity: purchaseItems.quantity,
          unit_price: purchaseItems.unit_price,
          total_amount: purchaseItems.total_amount,
          product_name: products.name,
          product_barcode: products.barcode,
        })
        .from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.product_id, products.id))
        .where(eq(purchaseItems.purchase_id, p.id));

      purchaseList.push({
        ...p,
        items,
      });
    }

    return purchaseList;
  }

  static async getPurchaseById(id: number): Promise<Purchase | null> {
    const db = getDb();
    const rows = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
    if (rows.length === 0) return null;

    const p = rows[0];
    const items = await db
      .select({
        id: purchaseItems.id,
        purchase_id: purchaseItems.purchase_id,
        product_id: purchaseItems.product_id,
        quantity: purchaseItems.quantity,
        unit_price: purchaseItems.unit_price,
        total_amount: purchaseItems.total_amount,
        product_name: products.name,
        product_barcode: products.barcode,
      })
      .from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.product_id, products.id))
      .where(eq(purchaseItems.purchase_id, p.id));

    return {
      ...p,
      items,
    };
  }

  static async createPurchase(data: z.infer<typeof createPurchaseSchema>): Promise<Purchase> {
    const validated = createPurchaseSchema.parse(data);
    const sqlite = getSqliteInstance();

    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const purchaseNumber = `ALS-${dateStr}-${randomSuffix}`;

    const transaction = sqlite.transaction(() => {
      let grandTotal = 0;

      for (const item of validated.items) {
        const product = sqlite
          .prepare('SELECT id FROM products WHERE id = ?')
          .get(item.product_id) as any;

        if (!product) {
          throw new Error(`Ürün bulunamadı (ID: ${item.product_id})`);
        }

        grandTotal += item.quantity * item.unit_price;
      }

      // 1. Insert Purchase
      const purchaseResult = sqlite
        .prepare(
          `INSERT INTO purchases (purchase_number, supplier_name, total_amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(purchaseNumber, validated.supplier_name || null, grandTotal, now, now);

      const purchaseId = purchaseResult.lastInsertRowid as number;

      // 2. Insert Purchase Items & Increase Stock & Update Purchase Price
      for (const item of validated.items) {
        const itemTotal = item.quantity * item.unit_price;

        sqlite
          .prepare(
            `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_amount)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(purchaseId, item.product_id, item.quantity, item.unit_price, itemTotal);

        const product = sqlite
          .prepare('SELECT stock_quantity FROM products WHERE id = ?')
          .get(item.product_id) as any;

        const prevStock = product.stock_quantity;
        const newStock = prevStock + item.quantity;

        sqlite
          .prepare(
            `UPDATE products SET stock_quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?`
          )
          .run(newStock, item.unit_price, now, item.product_id);

        sqlite
          .prepare(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_price, reference_type, reference_id, description, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            item.product_id,
            StockMovementType.PURCHASE,
            item.quantity,
            prevStock,
            newStock,
            item.unit_price,
            'PURCHASE',
            purchaseId,
            `Alış: ${purchaseNumber}`,
            now
          );
      }

      return purchaseId;
    });

    try {
      const purchaseId = transaction();
      return (await this.getPurchaseById(purchaseId))!;
    } catch (err: any) {
      throw {
        code: 'PURCHASE_FAILED',
        message: err.message || 'Alış kaydı oluşturulamadı.',
      };
    }
  }
}
