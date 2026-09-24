const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Target backup file path
const homeDir = os.homedir();
const backupDir = path.join(homeDir, 'stok-takip', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const backupFilePath = path.join(backupDir, 'Telefoncu-Test-200-Urun-Yedek.sqlite');

// Remove existing file if present
if (fs.existsSync(backupFilePath)) {
  fs.unlinkSync(backupFilePath);
}

console.log('Generating demo backup at:', backupFilePath);

const db = new Database(backupFilePath);
db.pragma('foreign_keys = ON;');
db.pragma('journal_mode = WAL;');

// Initialize Tables
db.exec(`
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
    net_amount INTEGER NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'CASH',
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    purchase_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT,
    total_amount INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_purchase_price INTEGER NOT NULL,
    new_purchase_price INTEGER NOT NULL,
    old_sale_price INTEGER NOT NULL,
    new_sale_price INTEGER NOT NULL,
    change_reason TEXT,
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
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const now = new Date().toISOString();

// 1. Insert Categories
const categoryData = [
  { id: 1, name: 'Akıllı Telefonlar', parent_id: null, description: 'Sıfır ve 2. El Akıllı Cihazlar' },
  { id: 2, name: 'Kılıf & Kapaklar', parent_id: null, description: 'Silikon, Magsafe, Tank Zırh Kılıflar' },
  { id: 3, name: 'Ekran Koruyucular', parent_id: null, description: 'Hayalet Cam, 9H Temperli, Seramik' },
  { id: 4, name: 'Şarj Cihazları & Kablo', parent_id: null, description: 'Hızlı Şarj Adaptörleri ve Kablolar' },
  { id: 5, name: 'Kulaklık & Ses', parent_id: null, description: 'TWS Kablosuz ve Kablolu Kulaklıklar' },
  { id: 6, name: 'Giyilebilir Teknoloji', parent_id: null, description: 'Akıllı Saat ve Kordonlar' },
  { id: 7, name: 'Powerbank & Taşınabilir', parent_id: null, description: 'Taşınabilir Güç Kaynakları' },
  { id: 8, name: 'Yedek Parça & Ekran', parent_id: null, description: 'OLED Ekran, Batarya, Soket' },
  { id: 9, name: 'Hafıza Kartı & USB', parent_id: null, description: 'MicroSD Kart ve Flash Bellekler' },
  { id: 10, name: 'Araç Aksesuarları', parent_id: null, description: 'Araç İçi Tutucu ve Araç Şarjları' },
];

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, parent_id, description, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, 1, ?, ?)
`);

for (const c of categoryData) {
  insertCategory.run(c.id, c.name, c.parent_id, c.description, now, now);
}

// Helper to generate EAN-13
function generateEAN13(index) {
  const prefix = '869';
  const body = (100000000 + index).toString();
  const twelve = prefix + body;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelve.charAt(i), 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return twelve + checkDigit;
}

// Realistic Demo Data Lists
const brands = ['Apple', 'Samsung', 'Xiaomi', 'Realme', 'Oppo', 'Huawei', 'Anker', 'Baseus', 'Spigen', 'JBL'];
const colors = ['Siyah', 'Beyaz', 'Şeffaf', 'Lacivert', 'Uzay Grisi', 'Titanyum', 'Yeşil', 'Kırmızı', 'Altın'];

const productTemplates = [
  // iPhone Kılıflar
  { catId: 2, brand: 'Spigen', model: 'iPhone 15 Pro', name: 'iPhone 15 Pro Magsafe Ultra Hybrid Kılıf', baseBuy: 25000, baseSell: 45000 },
  { catId: 2, brand: 'Apple', model: 'iPhone 15', name: 'iPhone 15 Orijinal Silikon Kılıf', baseBuy: 30000, baseSell: 65000 },
  { catId: 2, brand: 'Baseus', model: 'iPhone 14 Pro Max', name: 'iPhone 14 Pro Max Şeffaf Darbe Emici Kılıf', baseBuy: 12000, baseSell: 25000 },
  { catId: 2, brand: 'Spigen', model: 'iPhone 13', name: 'iPhone 13 Tough Armor Tank Kılıf', baseBuy: 28000, baseSell: 52000 },

  // Samsung Kılıflar
  { catId: 2, brand: 'Spigen', model: 'Galaxy S24 Ultra', name: 'Samsung Galaxy S24 Ultra Rugged Armor Kılıf', baseBuy: 26000, baseSell: 48000 },
  { catId: 2, brand: 'Baseus', model: 'Galaxy S23 FE', name: 'Samsung S23 FE Şeffaf Kamera Korumalı Kılıf', baseBuy: 10000, baseSell: 22000 },
  { catId: 2, brand: 'Spigen', model: 'Galaxy A54', name: 'Samsung Galaxy A54 Liquid Air Kılıf', baseBuy: 18000, baseSell: 35000 },

  // Ekran Koruyucular
  { catId: 3, brand: 'Spigen', model: 'iPhone 15 Pro', name: 'iPhone 15 Pro Ez Fit Kolay Kurulum Cam', baseBuy: 15000, baseSell: 35000 },
  { catId: 3, brand: 'Baseus', model: 'iPhone 14', name: 'iPhone 14 9H Temperli Cam Koruyucu', baseBuy: 4000, baseSell: 15000 },
  { catId: 3, brand: 'Spigen', model: 'iPhone 13/14', name: 'iPhone 13/14 Hayalet Gizlilik Camı', baseBuy: 8000, baseSell: 25000 },
  { catId: 3, brand: 'Baseus', model: 'Galaxy S24 Ultra', name: 'Samsung S24 Ultra Seramik Kırılmaz Cam', baseBuy: 6000, baseSell: 20000 },

  // Şarj Cihazları
  { catId: 4, brand: 'Anker', model: '20W GaN', name: 'Anker 20W USB-C Hızlı Şarj Adaptörü', baseBuy: 18000, baseSell: 38000 },
  { catId: 4, brand: 'Apple', model: '20W USB-C', name: 'Apple 20W USB-C Güç Adaptörü (Orijinal)', baseBuy: 45000, baseSell: 75000 },
  { catId: 4, brand: 'Baseus', model: '100W Cable', name: 'Baseus Type-C to Type-C 100W Örgülü Kablo (1m)', baseBuy: 12000, baseSell: 28000 },
  { catId: 4, brand: 'Anker', model: 'Lightning', name: 'Anker MFi Sertifikalı Lightning Şarj Kablosu', baseBuy: 14000, baseSell: 32000 },

  // Kulaklıklar
  { catId: 5, brand: 'Apple', model: 'AirPods Pro 2', name: 'Apple AirPods Pro 2. Nesil Type-C Kulaklık', baseBuy: 550000, baseSell: 749000 },
  { catId: 5, brand: 'Anker', model: 'Soundcore R50i', name: 'Anker Soundcore R50i TWS Kablosuz Kulaklık', baseBuy: 38000, baseSell: 69000 },
  { catId: 5, brand: 'JBL', model: 'Wave 300', name: 'JBL Wave 300TWS Kablosuz Kulak İçi Kulaklık', baseBuy: 85000, baseSell: 139000 },

  // Powerbank
  { catId: 7, brand: 'Anker', model: '10000mAh', name: 'Anker PowerCore 10000mAh Taşınabilir Şarj Cihazı', baseBuy: 32000, baseSell: 59000 },
  { catId: 7, brand: 'Baseus', model: '20000mAh 22.5W', name: 'Baseus Bipow 20000mAh 22.5W Dijital Ekranlı Powerbank', baseBuy: 48000, baseSell: 89000 },

  // Araç Aksesuarları
  { catId: 10, brand: 'Baseus', model: 'Magsafe Mount', name: 'Baseus Araç İçi Magsafe Havalandırma Tutucu', baseBuy: 16000, baseSell: 36000 },
  { catId: 10, brand: 'Anker', model: '30W Car Charger', name: 'Anker 30W Çift Çıkışlı Hızlı Araç Şarjı', baseBuy: 14000, baseSell: 32000 },

  // Hafıza
  { catId: 9, brand: 'SanDisk', model: '128GB Ultra', name: 'SanDisk 128GB MicroSDXC 140MB/s Hafıza Kartı', baseBuy: 19000, baseSell: 38000 },
  { catId: 9, brand: 'SanDisk', model: '64GB Dual', name: 'SanDisk 64GB Ultra Dual Type-C Flash Bellek', baseBuy: 13000, baseSell: 26000 },
];

// Generate 220 Products
const insertProduct = db.prepare(`
  INSERT INTO products (
    barcode, name, category_id, brand, model, variant, color,
    purchase_price, sale_price, minimum_stock, stock_quantity,
    description, is_active, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

const insertStockMovement = db.prepare(`
  INSERT INTO stock_movements (
    product_id, movement_type, quantity, reference_type, reference_id, description, unit_price, created_at
  ) VALUES (?, 'IN_PURCHASE', ?, 'INITIAL_SEED', 1, 'İlk Stok Yüklemesi', ?, ?)
`);

console.log('Inserting 220 realistic products into database...');

let productCount = 0;
for (let i = 1; i <= 220; i++) {
  const template = productTemplates[(i - 1) % productTemplates.length];
  const barcode = generateEAN13(i);
  const color = colors[(i - 1) % colors.length];
  const variant = (i % 3 === 0) ? '256GB' : (i % 2 === 0) ? '128GB' : 'Standart';

  const name = `${template.name} (${color} - ${i})`;
  const purchasePrice = template.baseBuy + ((i % 5) * 500);
  const salePrice = Math.round(purchasePrice * 1.35); // 35% margin
  const minStock = (i % 4 === 0) ? 10 : 5;

  // Varied stocks: normal, low, and out-of-stock for testing dashboard alerts
  let stockQty = 15 + (i % 40);
  if (i % 15 === 0) {
    stockQty = 0; // Out of stock
  } else if (i % 7 === 0) {
    stockQty = 3; // Low stock (< minStock)
  }

  const res = insertProduct.run(
    barcode,
    name,
    template.catId,
    template.brand,
    template.model,
    variant,
    color,
    purchasePrice,
    salePrice,
    minStock,
    stockQty,
    'Sistem tarafından üretilmiş demo test verisi',
    now,
    now
  );

  const productId = res.lastInsertRowid;
  if (stockQty > 0) {
    insertStockMovement.run(productId, stockQty, purchasePrice, now);
  }

  productCount++;
}

// 2. Insert Settings
const insertSetting = db.prepare(`
  INSERT INTO settings (key, value, created_at, updated_at)
  VALUES (?, ?, ?, ?)
`);

insertSetting.run('first_run_completed', 'true', now, now);
insertSetting.run('store_name', 'Telefoncu Stok Demo Mağaza', now, now);
insertSetting.run('currency_symbol', '₺', now, now);
insertSetting.run('default_margin', '35', now, now);
insertSetting.run('auto_backup_frequency', 'DAILY', now, now);

// 3. Record Backup History
const insertBackupHistory = db.prepare(`
  INSERT INTO backup_history (file_name, file_path, backup_type, created_at)
  VALUES (?, ?, 'MANUAL', ?)
`);
insertBackupHistory.run('Telefoncu-Test-200-Urun-Yedek.sqlite', backupFilePath, now);

db.close();

console.log(`SUCCESS! Created demo backup database with 10 categories and ${productCount} products.`);
console.log('File size:', (fs.statSync(backupFilePath).size / 1024).toFixed(2), 'KB');
