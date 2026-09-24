import { eq, like, or, and, sql, desc, lte } from 'drizzle-orm';
import { getDb } from '../database/connection';
import { products, categories, stockMovements, saleItems, sales } from '../database/schema';
import { Product } from '../../shared/types';
import { createProductSchema, updateProductSchema } from '../../shared/schemas';
import { z } from 'zod';

export class ProductService {
  static async getProducts(): Promise<Product[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(eq(products.is_active, true))
      .orderBy(desc(products.id));

    return rows;
  }

  static async getProductById(id: number): Promise<Product | null> {
    const db = getDb();
    const rows = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    return rows[0] || null;
  }

  static async getProductByBarcode(barcode: string, includeInactive = false): Promise<Product | null> {
    const db = getDb();
    const condition = includeInactive
      ? eq(products.barcode, barcode)
      : and(eq(products.barcode, barcode), eq(products.is_active, true));

    const rows = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(condition)
      .limit(1);

    return rows[0] || null;
  }

  static async createProduct(data: z.infer<typeof createProductSchema>): Promise<Product> {
    const validated = createProductSchema.parse(data);
    const db = getDb();

    // Check duplicate barcode across active and inactive products
    const existingAny = await this.getProductByBarcode(validated.barcode, true);
    if (existingAny) {
      if (existingAny.is_active) {
        throw { code: 'DUPLICATE_BARCODE', message: `Bu barkod (${validated.barcode}) zaten kullanımda!` };
      }

      // Soft-deleted product exists with this barcode: Reactivate and update with new details
      const now = new Date().toISOString();
      await db
        .update(products)
        .set({
          name: validated.name,
          category_id: validated.category_id || null,
          brand: validated.brand || null,
          model: validated.model || null,
          variant: validated.variant || null,
          color: validated.color || null,
          purchase_price: validated.purchase_price,
          sale_price: validated.sale_price,
          minimum_stock: validated.minimum_stock,
          stock_quantity: validated.stock_quantity,
          description: validated.description || null,
          is_active: true,
          updated_at: now,
        })
        .where(eq(products.id, existingAny.id));

      const updated = await this.getProductById(existingAny.id);
      if (!updated) {
        throw { code: 'CREATE_FAILED', message: 'Ürün oluşturulamadı.' };
      }
      return updated;
    }

    const now = new Date().toISOString();
    const result = await db.insert(products).values({
      barcode: validated.barcode,
      name: validated.name,
      category_id: validated.category_id || null,
      brand: validated.brand || null,
      model: validated.model || null,
      variant: validated.variant || null,
      color: validated.color || null,
      purchase_price: validated.purchase_price,
      sale_price: validated.sale_price,
      minimum_stock: validated.minimum_stock,
      stock_quantity: validated.stock_quantity,
      description: validated.description || null,
      is_active: validated.is_active,
      created_at: now,
      updated_at: now,
    }).returning({ id: products.id });

    const created = await this.getProductById(result[0].id);
    if (!created) {
      throw { code: 'CREATE_FAILED', message: 'Ürün oluşturulamadı.' };
    }
    return created;
  }

  static async updateProduct(data: z.infer<typeof updateProductSchema>): Promise<Product> {
    const validated = updateProductSchema.parse(data);
    const db = getDb();

    const existing = await this.getProductById(validated.id);
    if (!existing) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' };
    }

    if (validated.barcode && validated.barcode !== existing.barcode) {
      const barcodeExists = await this.getProductByBarcode(validated.barcode, true);
      if (barcodeExists && barcodeExists.id !== validated.id) {
        throw { code: 'DUPLICATE_BARCODE', message: `Bu barkod (${validated.barcode}) başka bir üründe kullanılıyor!` };
      }
    }

    const now = new Date().toISOString();
    await db
      .update(products)
      .set({
        ...(validated.barcode !== undefined && { barcode: validated.barcode }),
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.category_id !== undefined && { category_id: validated.category_id }),
        ...(validated.brand !== undefined && { brand: validated.brand }),
        ...(validated.model !== undefined && { model: validated.model }),
        ...(validated.variant !== undefined && { variant: validated.variant }),
        ...(validated.color !== undefined && { color: validated.color }),
        ...(validated.purchase_price !== undefined && { purchase_price: validated.purchase_price }),
        ...(validated.sale_price !== undefined && { sale_price: validated.sale_price }),
        ...(validated.minimum_stock !== undefined && { minimum_stock: validated.minimum_stock }),
        ...(validated.stock_quantity !== undefined && { stock_quantity: validated.stock_quantity }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        updated_at: now,
      })
      .where(eq(products.id, validated.id));

    const updated = await this.getProductById(validated.id);
    return updated!;
  }

  static async deleteProduct(id: number): Promise<boolean> {
    const db = getDb();
    const existing = await this.getProductById(id);
    if (!existing) {
      throw { code: 'PRODUCT_NOT_FOUND', message: 'Silinecek ürün bulunamadı.' };
    }

    // Soft delete
    const now = new Date().toISOString();
    await db
      .update(products)
      .set({ is_active: false, updated_at: now })
      .where(eq(products.id, id));

    return true;
  }

  static async searchProducts(query: string): Promise<Product[]> {
    const db = getDb();
    const term = `%${query}%`;

    return db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(
        and(
          eq(products.is_active, true),
          or(
            like(products.barcode, term),
            like(products.name, term),
            like(products.brand, term),
            like(products.model, term)
          )
        )
      )
      .orderBy(desc(products.id));
  }

  static async getProductsByCategory(categoryId: number): Promise<Product[]> {
    const db = getDb();
    return db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(and(eq(products.category_id, categoryId), eq(products.is_active, true)))
      .orderBy(desc(products.id));
  }

  static async getLowStockProducts(): Promise<Product[]> {
    const db = getDb();
    return db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(
        and(
          eq(products.is_active, true),
          lte(products.stock_quantity, products.minimum_stock)
        )
      );
  }

  static async getOutOfStockProducts(): Promise<Product[]> {
    const db = getDb();
    return db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_id: products.category_id,
        brand: products.brand,
        model: products.model,
        variant: products.variant,
        color: products.color,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        minimum_stock: products.minimum_stock,
        stock_quantity: products.stock_quantity,
        description: products.description,
        is_active: products.is_active,
        created_at: products.created_at,
        updated_at: products.updated_at,
        category_name: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(and(eq(products.is_active, true), eq(products.stock_quantity, 0)));
  }

  static async getProductStockHistory(productId: number) {
    const db = getDb();
    return db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.product_id, productId))
      .orderBy(desc(stockMovements.created_at));
  }

  static async getProductSalesHistory(productId: number) {
    const db = getDb();
    return db
      .select({
        sale_id: sales.id,
        sale_number: sales.sale_number,
        quantity: saleItems.quantity,
        unit_price: saleItems.unit_price,
        total_amount: saleItems.total_amount,
        created_at: sales.created_at,
        status: sales.status,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.sale_id, sales.id))
      .where(eq(saleItems.product_id, productId))
      .orderBy(desc(sales.created_at));
  }
}
