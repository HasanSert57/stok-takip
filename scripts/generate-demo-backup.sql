PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Create Tables
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
  minimum_stock INTEGER NOT NULL DEFAULT 5,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id INTEGER,
  description TEXT,
  unit_price INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_number TEXT NOT NULL UNIQUE,
  total_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'CASH',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_name TEXT,
  total_amount INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  backup_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Insert 10 Categories
INSERT INTO categories (id, name, parent_id, description, is_active, created_at, updated_at) VALUES
(1, 'Akıllı Telefonlar', NULL, 'Sıfır ve 2. El Akıllı Cihazlar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Kılıf & Kapaklar', NULL, 'Silikon, Magsafe, Tank Zırh Kılıflar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Ekran Koruyucular', NULL, 'Hayalet Cam, 9H Temperli, Seramik', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Şarj Cihazları & Kablo', NULL, 'Hızlı Şarj Adaptörleri ve Kablolar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Kulaklık & Ses', NULL, 'TWS Kablosuz ve Kablolu Kulaklıklar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Giyilebilir Teknoloji', NULL, 'Akıllı Saat ve Kordonlar', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'Powerbank & Taşınabilir', NULL, 'Taşınabilir Güç Kaynakları', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'Yedek Parça & Ekran', NULL, 'OLED Ekran, Batarya, Soket', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'Hafıza Kartı & USB', NULL, 'MicroSD Kart ve Flash Bellekler', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'Araç Aksesuarları', NULL, 'Araç İçi Tutucu ve Araç Şarjları', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Settings
INSERT INTO settings (key, value, created_at, updated_at) VALUES
('first_run_completed', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('store_name', 'Telefoncu Stok Demo Mağaza (200+ Ürün)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('currency_symbol', '₺', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default_margin', '35', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('auto_backup_frequency', 'DAILY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
