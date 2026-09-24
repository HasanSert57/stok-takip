import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../database/connection';
import { categories, products } from '../database/schema';
import { Category, CategoryNode } from '../../shared/types';
import { createCategorySchema, updateCategorySchema } from '../../shared/schemas';
import { z } from 'zod';

export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    const db = getDb();
    return db
      .select()
      .from(categories)
      .where(eq(categories.is_active, true))
      .orderBy(categories.name);
  }

  static async getCategoryById(id: number): Promise<Category | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return rows[0] || null;
  }

  static async createCategory(data: z.infer<typeof createCategorySchema>): Promise<Category> {
    const validated = createCategorySchema.parse(data);
    const db = getDb();
    const now = new Date().toISOString();

    const result = await db.insert(categories).values({
      name: validated.name,
      parent_id: validated.parent_id || null,
      description: validated.description || null,
      is_active: validated.is_active,
      created_at: now,
      updated_at: now,
    }).returning({ id: categories.id });

    const created = await this.getCategoryById(result[0].id);
    return created!;
  }

  static async updateCategory(data: z.infer<typeof updateCategorySchema>): Promise<Category> {
    const validated = updateCategorySchema.parse(data);
    const db = getDb();

    const existing = await this.getCategoryById(validated.id);
    if (!existing) {
      throw { code: 'CATEGORY_NOT_FOUND', message: 'Kategori bulunamadı.' };
    }

    const now = new Date().toISOString();
    await db
      .update(categories)
      .set({
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.parent_id !== undefined && { parent_id: validated.parent_id }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        updated_at: now,
      })
      .where(eq(categories.id, validated.id));

    const updated = await this.getCategoryById(validated.id);
    return updated!;
  }

  static async deleteCategory(id: number): Promise<boolean> {
    const db = getDb();
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw { code: 'CATEGORY_NOT_FOUND', message: 'Kategori bulunamadı.' };
    }

    // Check if any active products reference this category
    const activeProducts = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.category_id, id), eq(products.is_active, true)));

    if (activeProducts[0].count > 0) {
      throw {
        code: 'CATEGORY_HAS_PRODUCTS',
        message: `Bu kategoriye ait ${activeProducts[0].count} aktif ürün bulunmaktadır. Kategori silinemez!`,
      };
    }

    const now = new Date().toISOString();
    await db
      .update(categories)
      .set({ is_active: false, updated_at: now })
      .where(eq(categories.id, id));

    return true;
  }

  static async getCategoryTree(): Promise<CategoryNode[]> {
    const allCategories = await this.getCategories();
    const db = getDb();

    // Fetch product counts per category
    const productCounts = await db
      .select({
        category_id: products.category_id,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.is_active, true))
      .groupBy(products.category_id);

    const countMap = new Map<number, number>();
    for (const pc of productCounts) {
      if (pc.category_id !== null) {
        countMap.set(pc.category_id, pc.count);
      }
    }

    const nodeMap = new Map<number, CategoryNode>();

    for (const cat of allCategories) {
      nodeMap.set(cat.id, {
        ...cat,
        children: [],
        productCount: countMap.get(cat.id) || 0,
      });
    }

    const rootNodes: CategoryNode[] = [];

    for (const cat of allCategories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parent_id && nodeMap.has(cat.parent_id)) {
        nodeMap.get(cat.parent_id)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  static async getCategoryStockSummary(categoryId: number) {
    const db = getDb();
    const result = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        totalStockQuantity: sql<number>`coalesce(sum(${products.stock_quantity}), 0)`,
        totalStockValue: sql<number>`coalesce(sum(${products.stock_quantity} * ${products.purchase_price}), 0)`,
        totalSalesValue: sql<number>`coalesce(sum(${products.stock_quantity} * ${products.sale_price}), 0)`,
      })
      .from(products)
      .where(and(eq(products.category_id, categoryId), eq(products.is_active, true)));

    return result[0];
  }
}
