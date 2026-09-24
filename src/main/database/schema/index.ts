import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parent_id: integer('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  description: text('description'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    barcode: text('barcode').notNull().unique(),
    name: text('name').notNull(),
    category_id: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    brand: text('brand'),
    model: text('model'),
    variant: text('variant'),
    color: text('color'),
    purchase_price: integer('purchase_price').notNull().default(0), // Integer kuruş
    sale_price: integer('sale_price').notNull().default(0),         // Integer kuruş
    minimum_stock: integer('minimum_stock').notNull().default(0),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    description: text('description'),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_products_barcode').on(table.barcode),
    index('idx_products_name').on(table.name),
    index('idx_products_category_id').on(table.category_id),
    index('idx_products_brand').on(table.brand),
    index('idx_products_model').on(table.model),
  ]
);

export const sales = sqliteTable(
  'sales',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sale_number: text('sale_number').notNull().unique(),
    total_amount: integer('total_amount').notNull(),       // Integer kuruş
    discount_amount: integer('discount_amount').notNull().default(0),
    payment_type: text('payment_type').notNull(),          // CASH, CARD, TRANSFER, OTHER
    status: text('status').notNull(),                      // COMPLETED, CANCELLED, PARTIALLY_RETURNED, RETURNED
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_sales_sale_number').on(table.sale_number),
    index('idx_sales_created_at').on(table.created_at),
  ]
);

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unit_price: integer('unit_price').notNull(),            // Integer kuruş
  discount_amount: integer('discount_amount').notNull().default(0),
  total_amount: integer('total_amount').notNull(),          // Integer kuruş
});

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_number: text('purchase_number').notNull().unique(),
  supplier_name: text('supplier_name'),
  total_amount: integer('total_amount').notNull(),        // Integer kuruş
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const purchaseItems = sqliteTable('purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchase_id: integer('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unit_price: integer('unit_price').notNull(),            // Integer kuruş
  total_amount: integer('total_amount').notNull(),          // Integer kuruş
});

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    movement_type: text('movement_type').notNull(), // INITIAL, PURCHASE, SALE, RETURN, CANCEL, ADJUSTMENT_IN, ADJUSTMENT_OUT
    quantity: integer('quantity').notNull(),
    previous_stock: integer('previous_stock').notNull(),
    new_stock: integer('new_stock').notNull(),
    unit_price: integer('unit_price'),               // Integer kuruş
    reference_type: text('reference_type'),
    reference_id: integer('reference_id'),
    description: text('description'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_stock_movements_product_id').on(table.product_id),
    index('idx_stock_movements_created_at').on(table.created_at),
  ]
);

export const priceHistory = sqliteTable(
  'price_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    old_price: integer('old_price').notNull(),     // Integer kuruş
    new_price: integer('new_price').notNull(),     // Integer kuruş
    change_type: text('change_type').notNull(),    // MANUAL, PERCENTAGE, FIXED_AMOUNT, COST_MARGIN
    change_value: integer('change_value').notNull(),
    description: text('description'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_price_history_product_id').on(table.product_id),
  ]
);

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const backupHistory = sqliteTable('backup_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  file_name: text('file_name').notNull(),
  file_path: text('file_path').notNull(),
  backup_type: text('backup_type').notNull(), // MANUAL, AUTO, PRE_RESTORE
  created_at: text('created_at').notNull(),
});
