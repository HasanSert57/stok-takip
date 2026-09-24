export const IPC_CHANNELS = {
  // Product
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_GET_BY_ID: 'product:getById',
  PRODUCT_GET_BY_BARCODE: 'product:getByBarcode',
  PRODUCT_SEARCH: 'product:search',
  PRODUCT_GET_BY_CATEGORY: 'product:getByCategory',

  // Category
  CATEGORY_LIST: 'category:list',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_TREE: 'category:tree',
  CATEGORY_SUMMARY: 'category:summary',

  // Stock
  STOCK_GET: 'stock:get',
  STOCK_INCREASE: 'stock:increase',
  STOCK_DECREASE: 'stock:decrease',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_MOVEMENTS: 'stock:movements',
  STOCK_LOW: 'stock:low',
  STOCK_OUT: 'stock:out',

  // Sale
  SALE_CREATE: 'sale:create',
  SALE_GET: 'sale:get',
  SALE_LIST: 'sale:list',
  SALE_CANCEL: 'sale:cancel',
  SALE_RETURN: 'sale:return',

  // Purchase
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_GET: 'purchase:get',
  PURCHASE_LIST: 'purchase:list',

  // Price Management
  PRICE_UPDATE: 'price:update',
  PRICE_PREVIEW_PERCENTAGE: 'price:previewPercentage',
  PRICE_APPLY_PERCENTAGE: 'price:applyPercentage',
  PRICE_PREVIEW_AMOUNT: 'price:previewAmount',
  PRICE_APPLY_AMOUNT: 'price:applyAmount',
  PRICE_PREVIEW_MARGIN: 'price:previewMargin',
  PRICE_APPLY_MARGIN: 'price:applyMargin',
  PRICE_HISTORY: 'price:history',

  // Barcode
  BARCODE_GENERATE: 'barcode:generate',
  BARCODE_VALIDATE: 'barcode:validate',

  // Dashboard
  DASHBOARD_GET: 'dashboard:get',

  // Reports & Export
  REPORT_SALES: 'report:sales',
  REPORT_STOCK: 'report:stock',
  REPORT_PROFIT: 'report:profit',
  REPORT_PURCHASES: 'report:purchases',
  REPORT_EXPORT_CSV: 'report:exportCsv',

  // Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',
  BACKUP_SELECT_FILE: 'backup:selectFile',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // License & Hardware Lock
  LICENSE_GET_STATUS: 'license:getStatus',
  LICENSE_ACTIVATE: 'license:activate',
  LICENSE_GENERATE_KEY: 'license:generateKey',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
