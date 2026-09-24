import { ipcMain, dialog, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { ApiResponse } from '../../shared/types';
import { ProductService } from '../services/ProductService';
import { CategoryService } from '../services/CategoryService';
import { StockService } from '../services/StockService';
import { SaleService } from '../services/SaleService';
import { PurchaseService } from '../services/PurchaseService';
import { PriceService } from '../services/PriceService';
import { BarcodeService } from '../services/BarcodeService';
import { DashboardService } from '../services/DashboardService';
import { ReportService } from '../services/ReportService';
import { BackupService } from '../services/BackupService';
import { LicenseService } from '../services/LicenseService';
import { getDb } from '../database/connection';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createSaleSchema,
  cancelSaleSchema,
  returnSaleSchema,
  createPurchaseSchema,
  adjustStockSchema,
  updateSinglePriceSchema,
  pricePercentageSchema,
  priceFixedAmountSchema,
  priceMarginSchema,
  reportQuerySchema,
} from '../../shared/schemas';

function wrapHandler<T>(handler: (payload: any) => Promise<T>) {
  return async (_event: any, payload: any): Promise<ApiResponse<T>> => {
    try {
      const data = await handler(payload);
      return { success: true, data };
    } catch (err: any) {
      const code = err.code || 'INTERNAL_ERROR';
      const message = err.message || 'Bir hata oluştu.';
      const details = err.details || undefined;

      return {
        success: false,
        error: { code, message, details },
      };
    }
  };
}

export function registerIpcHandlers(): void {
  // --- PRODUCT ---
  ipcMain.handle(IPC_CHANNELS.PRODUCT_CREATE, wrapHandler((p) => {
    const validated = createProductSchema.parse(p);
    return ProductService.createProduct(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_UPDATE, wrapHandler((p) => {
    const validated = updateProductSchema.parse(p);
    return ProductService.updateProduct(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_DELETE, wrapHandler((p) => {
    return ProductService.deleteProduct(Number(p.id));
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_BY_ID, wrapHandler((p) => {
    return ProductService.getProductById(Number(p.id));
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_BY_BARCODE, wrapHandler((p) => {
    return ProductService.getProductByBarcode(String(p.barcode));
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_SEARCH, wrapHandler((p) => {
    return ProductService.searchProducts(String(p.query || ''));
  }));

  ipcMain.handle(IPC_CHANNELS.PRODUCT_GET_BY_CATEGORY, wrapHandler((p) => {
    return ProductService.getProductsByCategory(Number(p.categoryId));
  }));

  // --- CATEGORY ---
  ipcMain.handle(IPC_CHANNELS.CATEGORY_LIST, wrapHandler(() => {
    return CategoryService.getCategories();
  }));

  ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, wrapHandler((p) => {
    const validated = createCategorySchema.parse(p);
    return CategoryService.createCategory(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.CATEGORY_UPDATE, wrapHandler((p) => {
    const validated = updateCategorySchema.parse(p);
    return CategoryService.updateCategory(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, wrapHandler((p) => {
    return CategoryService.deleteCategory(Number(p.id));
  }));

  ipcMain.handle(IPC_CHANNELS.CATEGORY_TREE, wrapHandler(() => {
    return CategoryService.getCategoryTree();
  }));

  ipcMain.handle(IPC_CHANNELS.CATEGORY_SUMMARY, wrapHandler((p) => {
    return CategoryService.getCategoryStockSummary(Number(p.categoryId));
  }));

  // --- STOCK ---
  ipcMain.handle(IPC_CHANNELS.STOCK_GET, wrapHandler((p) => {
    return StockService.getStock(Number(p.productId));
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_INCREASE, wrapHandler((p) => {
    return StockService.increaseStock(
      Number(p.productId),
      Number(p.quantity),
      p.movementType,
      p.referenceType,
      p.referenceId,
      p.description,
      p.unitPrice
    );
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_DECREASE, wrapHandler((p) => {
    return StockService.decreaseStock(
      Number(p.productId),
      Number(p.quantity),
      p.movementType,
      p.referenceType,
      p.referenceId,
      p.description,
      p.unitPrice
    );
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_ADJUST, wrapHandler((p) => {
    const validated = adjustStockSchema.parse(p);
    return StockService.adjustStock(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_MOVEMENTS, wrapHandler((p) => {
    return StockService.getStockMovements(p?.productId ? Number(p.productId) : undefined);
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_LOW, wrapHandler(() => {
    return ProductService.getLowStockProducts();
  }));

  ipcMain.handle(IPC_CHANNELS.STOCK_OUT, wrapHandler(() => {
    return ProductService.getOutOfStockProducts();
  }));

  // --- SALE ---
  ipcMain.handle(IPC_CHANNELS.SALE_CREATE, wrapHandler((p) => {
    const validated = createSaleSchema.parse(p);
    return SaleService.createSale(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.SALE_GET, wrapHandler((p) => {
    return SaleService.getSaleById(Number(p.id));
  }));

  ipcMain.handle(IPC_CHANNELS.SALE_LIST, wrapHandler((p) => {
    return SaleService.getSales(p?.limit ? Number(p.limit) : 100);
  }));

  ipcMain.handle(IPC_CHANNELS.SALE_CANCEL, wrapHandler((p) => {
    const validated = cancelSaleSchema.parse(p);
    return SaleService.cancelSale(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.SALE_RETURN, wrapHandler((p) => {
    const validated = returnSaleSchema.parse(p);
    return SaleService.returnSale(validated);
  }));

  // --- PURCHASE ---
  ipcMain.handle(IPC_CHANNELS.PURCHASE_CREATE, wrapHandler((p) => {
    const validated = createPurchaseSchema.parse(p);
    return PurchaseService.createPurchase(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PURCHASE_GET, wrapHandler((p) => {
    return PurchaseService.getPurchaseById(Number(p.id));
  }));

  ipcMain.handle(IPC_CHANNELS.PURCHASE_LIST, wrapHandler((p) => {
    return PurchaseService.getPurchases(p?.limit ? Number(p.limit) : 100);
  }));

  // --- PRICE MANAGEMENT ---
  ipcMain.handle(IPC_CHANNELS.PRICE_UPDATE, wrapHandler((p) => {
    const validated = updateSinglePriceSchema.parse(p);
    return PriceService.updateSinglePrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_PREVIEW_PERCENTAGE, wrapHandler((p) => {
    const validated = pricePercentageSchema.parse(p);
    return PriceService.previewPercentagePrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_APPLY_PERCENTAGE, wrapHandler((p) => {
    const validated = pricePercentageSchema.parse(p);
    return PriceService.applyPercentagePrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_PREVIEW_AMOUNT, wrapHandler((p) => {
    const validated = priceFixedAmountSchema.parse(p);
    return PriceService.previewAmountPrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_APPLY_AMOUNT, wrapHandler((p) => {
    const validated = priceFixedAmountSchema.parse(p);
    return PriceService.applyAmountPrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_PREVIEW_MARGIN, wrapHandler((p) => {
    const validated = priceMarginSchema.parse(p);
    return PriceService.previewMarginPrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_APPLY_MARGIN, wrapHandler((p) => {
    const validated = priceMarginSchema.parse(p);
    return PriceService.applyMarginPrice(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.PRICE_HISTORY, wrapHandler((p) => {
    return PriceService.getPriceHistory(p?.productId ? Number(p.productId) : undefined);
  }));

  // --- BARCODE ---
  ipcMain.handle(IPC_CHANNELS.BARCODE_GENERATE, wrapHandler(() => {
    return BarcodeService.generateBarcode();
  }));

  ipcMain.handle(IPC_CHANNELS.BARCODE_VALIDATE, wrapHandler((p) => {
    return BarcodeService.validateBarcode(String(p.barcode || ''));
  }));

  // --- DASHBOARD ---
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET, wrapHandler(() => {
    return DashboardService.getDashboardStats();
  }));

  // --- REPORTS ---
  ipcMain.handle(IPC_CHANNELS.REPORT_SALES, wrapHandler((p) => {
    const validated = reportQuerySchema.parse(p || {});
    return ReportService.getSalesReport(validated);
  }));

  ipcMain.handle(IPC_CHANNELS.REPORT_STOCK, wrapHandler(() => {
    return ReportService.getStockReport();
  }));

  ipcMain.handle(IPC_CHANNELS.REPORT_PURCHASES, wrapHandler((p) => {
    return ReportService.getPurchaseReport(p?.startDate, p?.endDate);
  }));

  ipcMain.handle(IPC_CHANNELS.REPORT_EXPORT_CSV, wrapHandler(async (p) => {
    return ReportService.exportToCsv(p.data);
  }));

  // --- BACKUP & RESTORE ---
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, wrapHandler((p) => {
    return BackupService.createBackup(p?.backupType || 'MANUAL', p?.targetDir);
  }));

  ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, wrapHandler(async (p) => {
    const success = await BackupService.restoreBackup(String(p.filePath));
    if (success) {
      setTimeout(() => {
        try {
          const { BrowserWindow } = require('electron');
          const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
          if (win) {
            win.reload();
          }
        } catch (e) {
          console.warn('Window reload after restore skipped:', e);
        }
      }, 600);
    }
    return success;
  }));

  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, wrapHandler(() => {
    return BackupService.listBackups();
  }));

  ipcMain.handle(IPC_CHANNELS.BACKUP_SELECT_FILE, wrapHandler(async () => {
    const defaultDir = BackupService.getBackupDir();
    const result = await dialog.showOpenDialog({
      title: 'Yedek Dosyası Seçin',
      defaultPath: defaultDir,
      filters: [{ name: 'SQLite Backup', extensions: ['sqlite', 'db'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }));

  // --- SETTINGS ---
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, wrapHandler(async () => {
    const db = getDb();
    const rows = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }
    return settingsMap;
  }));

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, wrapHandler(async (p) => {
    const db = getDb();
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(p)) {
      const valStr = String(value);
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value: valStr, updated_at: now }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: valStr, created_at: now, updated_at: now });
      }
    }
    return true;
  }));

  // --- APP & LICENSE ---
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, wrapHandler(async () => {
    return app.getVersion();
  }));

  ipcMain.handle(IPC_CHANNELS.LICENSE_GET_STATUS, wrapHandler(async () => {
    return LicenseService.getStatus();
  }));

  ipcMain.handle(IPC_CHANNELS.LICENSE_ACTIVATE, wrapHandler(async (p) => {
    return LicenseService.activateLicense(String(p.licenseKey || ''));
  }));

  ipcMain.handle(IPC_CHANNELS.LICENSE_GENERATE_KEY, wrapHandler(async (p) => {
    return LicenseService.generateKeyForAdmin(String(p.targetMachineId || ''), String(p.adminPin || ''));
  }));
}
