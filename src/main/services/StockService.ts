import { eq, desc } from 'drizzle-orm';
import { getDb } from '../database/connection';
import { products, stockMovements } from '../database/schema';
import { StockMovementType, StockMovement } from '../../shared/types';
import { ProductService } from './ProductService';
import { adjustStockSchema } from '../../shared/schemas';
import { z } from 'zod';

export class StockService {
  static async getStock(productId: number): Promise<number> {
    const product = await ProductService.getProductById(productId);
    if (!product) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' };
    }
    return product.stock_quantity;
  }

  static async getStockMovements(productId?: number, limit = 100): Promise<StockMovement[]> {
    const db = getDb();
    if (productId) {
      return db
        .select({
          id: stockMovements.id,
          product_id: stockMovements.product_id,
          movement_type: stockMovements.movement_type as any,
          quantity: stockMovements.quantity,
          previous_stock: stockMovements.previous_stock,
          new_stock: stockMovements.new_stock,
          unit_price: stockMovements.unit_price,
          reference_type: stockMovements.reference_type,
          reference_id: stockMovements.reference_id,
          description: stockMovements.description,
          created_at: stockMovements.created_at,
          product_name: products.name,
          product_barcode: products.barcode,
        })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.product_id, products.id))
        .where(eq(stockMovements.product_id, productId))
        .orderBy(desc(stockMovements.created_at))
        .limit(limit);
    }

    return db
      .select({
        id: stockMovements.id,
        product_id: stockMovements.product_id,
        movement_type: stockMovements.movement_type as any,
        quantity: stockMovements.quantity,
        previous_stock: stockMovements.previous_stock,
        new_stock: stockMovements.new_stock,
        unit_price: stockMovements.unit_price,
        reference_type: stockMovements.reference_type,
        reference_id: stockMovements.reference_id,
        description: stockMovements.description,
        created_at: stockMovements.created_at,
        product_name: products.name,
        product_barcode: products.barcode,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.product_id, products.id))
      .orderBy(desc(stockMovements.created_at))
      .limit(limit);
  }

  static async increaseStock(
    productId: number,
    quantity: number,
    movementType: StockMovementType = StockMovementType.PURCHASE,
    referenceType?: string,
    referenceId?: number,
    description?: string,
    unitPrice?: number,
    dbTx?: any
  ): Promise<number> {
    if (quantity <= 0) {
      throw { code: 'INVALID_QUANTITY', message: 'Miktar 0 dan büyük olmalıdır.' };
    }

    const db = dbTx || getDb();
    const product = await ProductService.getProductById(productId);
    if (!product) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' };
    }

    const previousStock = product.stock_quantity;
    const newStock = previousStock + quantity;
    const now = new Date().toISOString();

    await db
      .update(products)
      .set({ stock_quantity: newStock, updated_at: now })
      .where(eq(products.id, productId));

    await db.insert(stockMovements).values({
      product_id: productId,
      movement_type: movementType,
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      unit_price: unitPrice || product.purchase_price,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      description: description || null,
      created_at: now,
    });

    return newStock;
  }

  static async decreaseStock(
    productId: number,
    quantity: number,
    movementType: StockMovementType = StockMovementType.SALE,
    referenceType?: string,
    referenceId?: number,
    description?: string,
    unitPrice?: number,
    dbTx?: any
  ): Promise<number> {
    if (quantity <= 0) {
      throw { code: 'INVALID_QUANTITY', message: 'Miktar 0 dan büyük olmalıdır.' };
    }

    const db = dbTx || getDb();
    const product = await ProductService.getProductById(productId);
    if (!product) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' };
    }

    const previousStock = product.stock_quantity;
    const newStock = previousStock - quantity;

    if (newStock < 0) {
      throw {
        code: 'INSUFFICIENT_STOCK',
        message: `Yetersiz stok! ${product.name} (Stok: ${previousStock}, İstenen: ${quantity})`,
      };
    }

    const now = new Date().toISOString();

    await db
      .update(products)
      .set({ stock_quantity: newStock, updated_at: now })
      .where(eq(products.id, productId));

    await db.insert(stockMovements).values({
      product_id: productId,
      movement_type: movementType,
      quantity: -quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      unit_price: unitPrice || product.sale_price,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      description: description || null,
      created_at: now,
    });

    return newStock;
  }

  static async adjustStock(data: z.infer<typeof adjustStockSchema>): Promise<number> {
    const validated = adjustStockSchema.parse(data);
    const db = getDb();

    const product = await ProductService.getProductById(validated.product_id);
    if (!product) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' };
    }

    const previousStock = product.stock_quantity;
    const newStock = validated.new_quantity;

    if (newStock < 0) {
      throw { code: 'INSUFFICIENT_STOCK', message: 'Stok miktarı negatif olamaz.' };
    }

    const diff = newStock - previousStock;
    if (diff === 0) return newStock;

    const movementType =
      diff > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT;

    const now = new Date().toISOString();

    await db
      .update(products)
      .set({ stock_quantity: newStock, updated_at: now })
      .where(eq(products.id, validated.product_id));

    await db.insert(stockMovements).values({
      product_id: validated.product_id,
      movement_type: movementType,
      quantity: diff,
      previous_stock: previousStock,
      new_stock: newStock,
      unit_price: product.sale_price,
      reference_type: 'MANUAL_ADJUSTMENT',
      reference_id: null,
      description: validated.description || 'Manuel stok düzeltme',
      created_at: now,
    });

    return newStock;
  }
}
