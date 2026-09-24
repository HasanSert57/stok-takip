import { z } from 'zod';
import { PaymentType, PriceChangeType } from '../types/enums';

// Category Schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Kategori adı zorunludur'),
  parent_id: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.number(),
});

// Product Schemas
export const createProductSchema = z.object({
  barcode: z.string().min(1, 'Barkod zorunludur'),
  name: z.string().min(1, 'Ürün adı zorunludur'),
  category_id: z.number().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  variant: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  purchase_price: z.number().int().min(0, 'Alış fiyatı 0 veya daha büyük olmalıdır'),
  sale_price: z.number().int().min(0, 'Satış fiyatı 0 veya daha büyük olmalıdır'),
  minimum_stock: z.number().int().min(0).default(0),
  stock_quantity: z.number().int().min(0).default(0),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.number(),
});

// Sale Schemas
export const saleItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive('Miktar 1 veya daha fazla olmalıdır'),
  unit_price: z.number().int().min(0),
  discount_amount: z.number().int().min(0).default(0),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'En az bir ürün eklenmelidir'),
  discount_amount: z.number().int().min(0).default(0),
  payment_type: z.nativeEnum(PaymentType),
});

export const cancelSaleSchema = z.object({
  sale_id: z.number(),
  reason: z.string().optional(),
});

export const returnSaleItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive(),
});

export const returnSaleSchema = z.object({
  sale_id: z.number(),
  items: z.array(returnSaleItemSchema).min(1, 'En az bir ürün seçilmelidir'),
  reason: z.string().optional(),
});

// Purchase Schemas
export const purchaseItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().int().min(0),
});

export const createPurchaseSchema = z.object({
  supplier_name: z.string().nullable().optional(),
  items: z.array(purchaseItemSchema).min(1, 'En az bir ürün eklenmelidir'),
});

// Stock Adjustment Schema
export const adjustStockSchema = z.object({
  product_id: z.number(),
  new_quantity: z.number().int().min(0, 'Stok miktarı negatif olamaz'),
  description: z.string().optional(),
});

// Price Management Schemas
export const updateSinglePriceSchema = z.object({
  product_id: z.number(),
  new_sale_price: z.number().int().min(0),
  description: z.string().optional(),
});

export const pricePercentageSchema = z.object({
  category_id: z.number().nullable().optional(), // null = all categories
  product_ids: z.array(z.number()).optional(),
  percentage: z.number(), // e.g. 10 for +10%, -5 for -5%
  description: z.string().optional(),
});

export const priceFixedAmountSchema = z.object({
  category_id: z.number().nullable().optional(),
  product_ids: z.array(z.number()).optional(),
  amount: z.number().int(), // Integer kuruş shift
  description: z.string().optional(),
});

export const priceMarginSchema = z.object({
  category_id: z.number().nullable().optional(),
  product_ids: z.array(z.number()).optional(),
  margin_percentage: z.number().min(0), // e.g. 30 for 30% margin over purchase_price
  description: z.string().optional(),
});

// Report Query Schema
export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.number().optional(),
  productId: z.number().optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
});

// Settings Schema
export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
