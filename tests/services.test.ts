import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { setCustomDatabasePath, closeDatabase } from '../src/main/database/connection';
import { runMigrations } from '../src/main/database/migration';
import { ProductService } from '../src/main/services/ProductService';
import { CategoryService } from '../src/main/services/CategoryService';
import { StockService } from '../src/main/services/StockService';
import { SaleService } from '../src/main/services/SaleService';
import { PriceService } from '../src/main/services/PriceService';
import { BackupService } from '../src/main/services/BackupService';
import { PaymentType, SaleStatus, StockMovementType } from '../src/shared/types';

const TEST_DB_PATH = path.join(process.cwd(), '.data', 'test_telefoncu.sqlite');

describe('Telefoncu Stok Core Services & Pre-Release QA Test Suite', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    setCustomDatabasePath(TEST_DB_PATH);
  });

  beforeEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
  });

  // --- 1. PRODUCT SERVICE TESTS ---
  describe('ProductService', () => {
    it('should create and retrieve a product successfully', async () => {
      const prod = await ProductService.createProduct({
        barcode: '8690001112223',
        name: 'iPhone 15 Pro Max',
        purchase_price: 6000000, // 60,000.00 TL
        sale_price: 7500000,     // 75,000.00 TL
        minimum_stock: 3,
        stock_quantity: 10,
        is_active: true,
      });

      expect(prod.id).toBeDefined();
      expect(prod.name).toBe('iPhone 15 Pro Max');
      expect(prod.barcode).toBe('8690001112223');
      expect(prod.sale_price).toBe(7500000);

      const found = await ProductService.getProductByBarcode('8690001112223');
      expect(found).not.toBeNull();
      expect(found?.id).toBe(prod.id);
    });

    it('should reject duplicate barcode creation', async () => {
      await ProductService.createProduct({
        barcode: 'BARCODE123',
        name: 'Product 1',
        purchase_price: 1000,
        sale_price: 2000,
        minimum_stock: 1,
        stock_quantity: 5,
        is_active: true,
      });

      await expect(
        ProductService.createProduct({
          barcode: 'BARCODE123',
          name: 'Product 2',
          purchase_price: 1500,
          sale_price: 2500,
          minimum_stock: 1,
          stock_quantity: 5,
          is_active: true,
        })
      ).rejects.toMatchObject({ code: 'DUPLICATE_BARCODE' });
    });

    it('should allow reusing barcode of a soft-deleted product by reactivating it', async () => {
      const original = await ProductService.createProduct({
        barcode: 'REUSE_BARCODE_001',
        name: 'Original Product',
        purchase_price: 1000,
        sale_price: 2000,
        minimum_stock: 1,
        stock_quantity: 5,
        is_active: true,
      });

      // Soft delete product
      await ProductService.deleteProduct(original.id);
      const deletedCheck = await ProductService.getProductById(original.id);
      expect(deletedCheck?.is_active).toBe(false);

      // Re-add product with same barcode
      const restored = await ProductService.createProduct({
        barcode: 'REUSE_BARCODE_001',
        name: 'New Product Same Barcode',
        purchase_price: 1200,
        sale_price: 2400,
        minimum_stock: 2,
        stock_quantity: 10,
        is_active: true,
      });

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe('New Product Same Barcode');
      expect(restored.is_active).toBe(true);
      expect(restored.sale_price).toBe(2400);

      const activeCheck = await ProductService.getProductByBarcode('REUSE_BARCODE_001');
      expect(activeCheck).not.toBeNull();
      expect(activeCheck?.id).toBe(original.id);
    });
  });

  // --- 2. CATEGORY SERVICE TESTS ---
  describe('CategoryService', () => {
    it('should create categories and support hierarchy tree', async () => {
      const parent = await CategoryService.createCategory({
        name: 'Telefonlar',
        is_active: true,
      });

      const child = await CategoryService.createCategory({
        name: 'Aksesuarlar',
        parent_id: parent.id,
        is_active: true,
      });

      const tree = await CategoryService.getCategoryTree();
      expect(tree.length).toBeGreaterThan(0);
      const root = tree.find((n) => n.id === parent.id);
      expect(root).toBeDefined();
      expect(root?.children.length).toBe(1);
      expect(root?.children[0].id).toBe(child.id);
    });

    it('should prevent deleting a category that has active products', async () => {
      const cat = await CategoryService.createCategory({
        name: 'Kılıflar',
        is_active: true,
      });

      await ProductService.createProduct({
        barcode: 'KILIF001',
        name: 'Silikon Kılıf',
        category_id: cat.id,
        purchase_price: 5000,
        sale_price: 15000,
        minimum_stock: 2,
        stock_quantity: 20,
        is_active: true,
      });

      await expect(CategoryService.deleteCategory(cat.id)).rejects.toMatchObject({
        code: 'CATEGORY_HAS_PRODUCTS',
      });
    });
  });

  // --- 3. SALE & STOCK MATH ACCURACY TEST (ITEM 6) ---
  describe('SaleService & Stock Sequence Math (10 -> Sale 3 -> 7 -> Return 1 -> 8)', () => {
    it('should maintain exact stock math sequence: 10 -> Sale 3 -> 7 -> Return 1 -> 8', async () => {
      const prod = await ProductService.createProduct({
        barcode: 'MATH001',
        name: 'Ekran Koruyucu Cam',
        purchase_price: 10000,
        sale_price: 20000,
        minimum_stock: 2,
        stock_quantity: 10, // Initial stock = 10
        is_active: true,
      });

      expect(prod.stock_quantity).toBe(10);

      // 1. Perform sale of 3 units
      const sale = await SaleService.createSale({
        items: [{ product_id: prod.id, quantity: 3, unit_price: 20000, discount_amount: 0 }],
        discount_amount: 0,
        payment_type: PaymentType.CASH,
      });

      // Stock must be 7
      let updatedProd = await ProductService.getProductById(prod.id);
      expect(updatedProd?.stock_quantity).toBe(7);

      // 2. Perform return of 1 unit
      await SaleService.returnSale({
        sale_id: sale.id,
        items: [{ product_id: prod.id, quantity: 1 }],
        reason: 'Müşteri İadesi',
      });

      // Stock must be 8
      updatedProd = await ProductService.getProductById(prod.id);
      expect(updatedProd?.stock_quantity).toBe(8);
    });

    it('should strictly block negative stock attempts', async () => {
      const prod = await ProductService.createProduct({
        barcode: 'NEG001',
        name: 'Stok Sınırı Ürünü',
        purchase_price: 1000,
        sale_price: 2000,
        minimum_stock: 1,
        stock_quantity: 2,
        is_active: true,
      });

      await expect(
        StockService.decreaseStock(prod.id, 5)
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    });
  });

  // --- 4. EXACT PRICE UPDATE TEST (ITEM 5) ---
  describe('PriceService %20 Price Calculation (400, 500, 600 -> 480, 600, 720)', () => {
    it('should preview +20% price increase accurately without mutating DB', async () => {
      const cat = await CategoryService.createCategory({ name: 'Test Kategori', is_active: true });

      const p1 = await ProductService.createProduct({
        barcode: 'PR1', name: 'Ürün 400', category_id: cat.id,
        purchase_price: 20000, sale_price: 40000, minimum_stock: 1, stock_quantity: 10, is_active: true,
      });
      const p2 = await ProductService.createProduct({
        barcode: 'PR2', name: 'Ürün 500', category_id: cat.id,
        purchase_price: 25000, sale_price: 50000, minimum_stock: 1, stock_quantity: 10, is_active: true,
      });
      const p3 = await ProductService.createProduct({
        barcode: 'PR3', name: 'Ürün 600', category_id: cat.id,
        purchase_price: 30000, sale_price: 60000, minimum_stock: 1, stock_quantity: 10, is_active: true,
      });

      // Preview +20%
      const preview = await PriceService.previewPercentagePrice({
        category_id: cat.id,
        percentage: 20,
      });

      expect(preview.length).toBe(3);
      const pr1 = preview.find((item) => item.product_id === p1.id);
      const pr2 = preview.find((item) => item.product_id === p2.id);
      const pr3 = preview.find((item) => item.product_id === p3.id);

      expect(pr1?.new_price).toBe(48000); // 480.00 TL
      expect(pr2?.new_price).toBe(60000); // 600.00 TL
      expect(pr3?.new_price).toBe(72000); // 720.00 TL

      // Database prices must remain UNCHANGED during preview
      expect((await ProductService.getProductById(p1.id))?.sale_price).toBe(40000);
      expect((await ProductService.getProductById(p2.id))?.sale_price).toBe(50000);
      expect((await ProductService.getProductById(p3.id))?.sale_price).toBe(60000);

      // Apply +20%
      const updatedCount = await PriceService.applyPercentagePrice({
        category_id: cat.id,
        percentage: 20,
        description: '%20 Zam Uygulandı',
      });

      expect(updatedCount).toBe(3);

      // Database prices must now be updated
      expect((await ProductService.getProductById(p1.id))?.sale_price).toBe(48000);
      expect((await ProductService.getProductById(p2.id))?.sale_price).toBe(60000);
      expect((await ProductService.getProductById(p3.id))?.sale_price).toBe(72000);

      // History log must exist
      const history = await PriceService.getPriceHistory(p1.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].old_price).toBe(40000);
      expect(history[0].new_price).toBe(48000);
    });
  });

  // --- 5. BACKUP & RESTORE SAFETY TESTS (ITEM 7) ---
  describe('BackupService Integrity & Restore Safety', () => {
    it('should create backup, validate magic bytes, and reject corrupted files', async () => {
      const backup = await BackupService.createBackup('MANUAL');
      expect(backup.file_name).toBeDefined();
      expect(fs.existsSync(backup.file_path)).toBe(true);

      // Validate valid backup file
      expect(() => BackupService.validateBackupFile(backup.file_path)).not.toThrow();

      // Test corrupted invalid file rejection
      const corruptedPath = path.join(process.cwd(), '.data', 'corrupted.sqlite');
      fs.writeFileSync(corruptedPath, 'INVALID DUMMY TEXT CONTENT');

      expect(() => BackupService.validateBackupFile(corruptedPath)).toThrow();
      await expect(BackupService.restoreBackup(corruptedPath)).rejects.toMatchObject({
        code: 'INVALID_BACKUP',
      });

      if (fs.existsSync(corruptedPath)) fs.unlinkSync(corruptedPath);
    });
  });
});
