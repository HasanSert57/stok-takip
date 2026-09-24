import { PaymentType, SaleStatus, StockMovementType, PriceChangeType } from './enums';

export * from './enums';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | unknown[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
  productCount?: number;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category_id: number | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
  color: string | null;
  purchase_price: number; // Integer kuruş (e.g. 100000 = 1000.00 TL)
  sale_price: number;     // Integer kuruş (e.g. 130000 = 1300.00 TL)
  minimum_stock: number;
  stock_quantity: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
}

export interface Sale {
  id: number;
  sale_number: string;
  total_amount: number;   // Integer kuruş
  discount_amount: number;// Integer kuruş
  payment_type: PaymentType;
  status: SaleStatus;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;     // Integer kuruş
  discount_amount: number;// Integer kuruş
  total_amount: number;   // Integer kuruş
  product_name?: string | null;
  product_barcode?: string | null;
}

export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_name: string | null;
  total_amount: number;   // Integer kuruş
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;     // Integer kuruş
  total_amount: number;   // Integer kuruş
  product_name?: string | null;
  product_barcode?: string | null;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number | null;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  created_at: string;
  product_name?: string | null;
  product_barcode?: string | null;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  old_price: number;      // Integer kuruş
  new_price: number;      // Integer kuruş
  change_type: PriceChangeType;
  change_value: number;
  description: string | null;
  created_at: string;
  product_name?: string | null;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface BackupHistory {
  id: number;
  file_name: string;
  file_path: string;
  backup_type: 'MANUAL' | 'AUTO' | 'PRE_RESTORE';
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalStockValue: number; // Integer kuruş
  todaySalesCount: number;
  todaySalesAmount: number; // Integer kuruş
  monthlySalesAmount: number; // Integer kuruş
  estimatedProfit: number;  // Integer kuruş
  lowStockCount: number;
  outOfStockCount: number;
  recentSales: Sale[];
  recentStockMovements: StockMovement[];
  topSellingProducts: {
    product_id: number;
    product_name: string;
    product_barcode: string;
    total_quantity: number;
    total_revenue: number; // Integer kuruş
  }[];
  weeklySalesTrend?: {
    name: string;
    date: string;
    satis: number;
  }[];
}

export interface PricePreviewItem {
  product_id: number;
  product_name: string;
  barcode: string;
  current_price: number;  // Integer kuruş
  new_price: number;      // Integer kuruş
  purchase_price: number; // Integer kuruş
  difference: number;     // Integer kuruş
}

export interface SalesReportFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  productId?: number;
  paymentType?: PaymentType;
}

export interface ReportSummary {
  totalCount: number;
  totalAmount: number;     // Integer kuruş
  totalDiscount: number;   // Integer kuruş
  totalCost: number;       // Integer kuruş
  totalProfit: number;     // Integer kuruş
  items: Record<string, unknown>[];
}
