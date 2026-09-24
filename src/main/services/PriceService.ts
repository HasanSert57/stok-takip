import { eq, desc, inArray, and } from 'drizzle-orm';
import { getDb, getSqliteInstance } from '../database/connection';
import { products, priceHistory } from '../database/schema';
import { PriceChangeType, PriceHistory, PricePreviewItem } from '../../shared/types';
import {
  updateSinglePriceSchema,
  pricePercentageSchema,
  priceFixedAmountSchema,
  priceMarginSchema,
} from '../../shared/schemas';
import { z } from 'zod';

export class PriceService {
  static async getPriceHistory(productId?: number): Promise<PriceHistory[]> {
    const db = getDb();
    if (productId) {
      return db
        .select({
          id: priceHistory.id,
          product_id: priceHistory.product_id,
          old_price: priceHistory.old_price,
          new_price: priceHistory.new_price,
          change_type: priceHistory.change_type as any,
          change_value: priceHistory.change_value,
          description: priceHistory.description,
          created_at: priceHistory.created_at,
          product_name: products.name,
        })
        .from(priceHistory)
        .leftJoin(products, eq(priceHistory.product_id, products.id))
        .where(eq(priceHistory.product_id, productId))
        .orderBy(desc(priceHistory.created_at));
    }

    return db
      .select({
        id: priceHistory.id,
        product_id: priceHistory.product_id,
        old_price: priceHistory.old_price,
        new_price: priceHistory.new_price,
        change_type: priceHistory.change_type as any,
        change_value: priceHistory.change_value,
        description: priceHistory.description,
        created_at: priceHistory.created_at,
        product_name: products.name,
      })
      .from(priceHistory)
      .leftJoin(products, eq(priceHistory.product_id, products.id))
      .orderBy(desc(priceHistory.created_at));
  }

  static async updateSinglePrice(data: z.infer<typeof updateSinglePriceSchema>): Promise<boolean> {
    const validated = updateSinglePriceSchema.parse(data);
    const sqlite = getSqliteInstance();

    const transaction = sqlite.transaction(() => {
      const product = sqlite
        .prepare('SELECT id, sale_price FROM products WHERE id = ?')
        .get(validated.product_id) as any;

      if (!product) {
        throw new Error('Ürün bulunamadı.');
      }

      const now = new Date().toISOString();
      const oldPrice = product.sale_price;
      const newPrice = validated.new_sale_price;

      sqlite
        .prepare('UPDATE products SET sale_price = ?, updated_at = ? WHERE id = ?')
        .run(newPrice, now, validated.product_id);

      sqlite
        .prepare(
          `INSERT INTO price_history (product_id, old_price, new_price, change_type, change_value, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          validated.product_id,
          oldPrice,
          newPrice,
          PriceChangeType.MANUAL,
          newPrice - oldPrice,
          validated.description || 'Manuel Fiyat Güncelleme',
          now
        );
    });

    try {
      transaction();
      return true;
    } catch (err: any) {
      throw { code: 'PRICE_UPDATE_FAILED', message: err.message || 'Fiyat güncellenemedi.' };
    }
  }

  // --- PERCENTAGE PRICE ---
  static async previewPercentagePrice(data: z.infer<typeof pricePercentageSchema>): Promise<PricePreviewItem[]> {
    const validated = pricePercentageSchema.parse(data);
    const db = getDb();
    const activeProducts = await this.fetchTargetProducts(validated.category_id, validated.product_ids);

    const factor = 1 + validated.percentage / 100;
    return activeProducts.map((p) => {
      const calculated = Math.round(p.sale_price * factor);
      const newPrice = Math.max(0, calculated);
      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        current_price: p.sale_price,
        new_price: newPrice,
        purchase_price: p.purchase_price,
        difference: newPrice - p.sale_price,
      };
    });
  }

  static async applyPercentagePrice(data: z.infer<typeof pricePercentageSchema>): Promise<number> {
    const preview = await this.previewPercentagePrice(data);
    return this.applyBatchPrices(preview, PriceChangeType.PERCENTAGE, data.percentage, data.description || `%${data.percentage} Oranında Fiyat Güncelleme`);
  }

  // --- FIXED AMOUNT PRICE ---
  static async previewAmountPrice(data: z.infer<typeof priceFixedAmountSchema>): Promise<PricePreviewItem[]> {
    const validated = priceFixedAmountSchema.parse(data);
    const activeProducts = await this.fetchTargetProducts(validated.category_id, validated.product_ids);

    return activeProducts.map((p) => {
      const newPrice = Math.max(0, p.sale_price + validated.amount);
      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        current_price: p.sale_price,
        new_price: newPrice,
        purchase_price: p.purchase_price,
        difference: newPrice - p.sale_price,
      };
    });
  }

  static async applyAmountPrice(data: z.infer<typeof priceFixedAmountSchema>): Promise<number> {
    const preview = await this.previewAmountPrice(data);
    return this.applyBatchPrices(preview, PriceChangeType.FIXED_AMOUNT, data.amount, data.description || `Sabit Tutar Fiyat Güncelleme (${data.amount / 100} TL)`);
  }

  // --- MARGIN PRICE ---
  static async previewMarginPrice(data: z.infer<typeof priceMarginSchema>): Promise<PricePreviewItem[]> {
    const validated = priceMarginSchema.parse(data);
    const activeProducts = await this.fetchTargetProducts(validated.category_id, validated.product_ids);

    const marginFactor = 1 + validated.margin_percentage / 100;
    return activeProducts.map((p) => {
      const newPrice = Math.round(p.purchase_price * marginFactor);
      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        current_price: p.sale_price,
        new_price: newPrice,
        purchase_price: p.purchase_price,
        difference: newPrice - p.sale_price,
      };
    });
  }

  static async applyMarginPrice(data: z.infer<typeof priceMarginSchema>): Promise<number> {
    const preview = await this.previewMarginPrice(data);
    return this.applyBatchPrices(preview, PriceChangeType.COST_MARGIN, data.margin_percentage, data.description || `%${data.margin_percentage} Maliyet+Kâr Marjı Güncelleme`);
  }

  // Helper methods
  private static async fetchTargetProducts(categoryId?: number | null, productIds?: number[]) {
    const db = getDb();
    if (productIds && productIds.length > 0) {
      return db
        .select()
        .from(products)
        .where(and(eq(products.is_active, true), inArray(products.id, productIds)));
    } else if (categoryId) {
      return db
        .select()
        .from(products)
        .where(and(eq(products.is_active, true), eq(products.category_id, categoryId)));
    } else {
      return db.select().from(products).where(eq(products.is_active, true));
    }
  }

  private static async applyBatchPrices(
    items: PricePreviewItem[],
    changeType: PriceChangeType,
    changeValue: number,
    description: string
  ): Promise<number> {
    const sqlite = getSqliteInstance();

    const transaction = sqlite.transaction(() => {
      const now = new Date().toISOString();
      let updatedCount = 0;

      for (const item of items) {
        if (item.current_price !== item.new_price) {
          sqlite
            .prepare('UPDATE products SET sale_price = ?, updated_at = ? WHERE id = ?')
            .run(item.new_price, now, item.product_id);

          sqlite
            .prepare(
              `INSERT INTO price_history (product_id, old_price, new_price, change_type, change_value, description, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              item.product_id,
              item.current_price,
              item.new_price,
              changeType,
              changeValue,
              description,
              now
            );

          updatedCount++;
        }
      }

      return updatedCount;
    });

    try {
      return transaction();
    } catch (err: any) {
      throw { code: 'BATCH_PRICE_UPDATE_FAILED', message: err.message || 'Toplu fiyat güncellenemedi.' };
    }
  }
}
