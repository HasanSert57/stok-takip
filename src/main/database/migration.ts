import { getSqliteInstance } from './connection';

export function runMigrations(): void {
  const sqlite = getSqliteInstance();

  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    -- Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Products Table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      brand TEXT,
      model TEXT,
      variant TEXT,
      color TEXT,
      purchase_price INTEGER NOT NULL DEFAULT 0,
      sale_price INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Sales Table
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT NOT NULL UNIQUE,
      total_amount INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Sale Items Table
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL
    );

    -- Purchases Table
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT NOT NULL UNIQUE,
      supplier_name TEXT,
      total_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Purchase Items Table
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_amount INTEGER NOT NULL
    );

    -- Stock Movements Table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      unit_price INTEGER,
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      created_at TEXT NOT NULL
    );

    -- Price History Table
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      old_price INTEGER NOT NULL,
      new_price INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      change_value INTEGER NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    -- Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Backup History Table
    CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      backup_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);

    CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

    CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
  `);

  // Initialize default settings if empty
  const defaultSettings = [
    { key: 'auto_backup_frequency', value: 'OFF' },
    { key: 'store_name', value: 'Kodhanem Stok Takip Market' },
    { key: 'store_phone', value: '' },
    { key: 'store_address', value: '' },
    { key: 'currency_symbol', value: '₺' },
    { key: 'schema_version', value: '1.0.0' },
  ];

  const checkStmt = sqlite.prepare('SELECT COUNT(*) as count FROM settings WHERE key = ?');
  const insertStmt = sqlite.prepare(
    'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)'
  );

  const now = new Date().toISOString();
  for (const s of defaultSettings) {
    const res = checkStmt.get(s.key) as { count: number };
    if (res.count === 0) {
      insertStmt.run(s.key, s.value, now, now);
    }
  }
}
