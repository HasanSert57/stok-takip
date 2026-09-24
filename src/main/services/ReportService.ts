import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getDb } from '../database/connection';
import { sales, saleItems, products, categories, purchases, purchaseItems } from '../database/schema';
import { ReportSummary, SalesReportFilter, SaleStatus } from '../../shared/types';
import Papa from 'papaparse';

export class ReportService {
  static async getSalesReport(filter: SalesReportFilter): Promise<ReportSummary> {
    const db = getDb();
    const conditions = [eq(sales.status, SaleStatus.COMPLETED)];

    if (filter.startDate) {
      conditions.push(gte(sales.created_at, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(sales.created_at, filter.endDate));
    }
    if (filter.paymentType) {
      conditions.push(eq(sales.payment_type, filter.paymentType));
    }

    const rows = await db
      .select({
        sale_id: sales.id,
        sale_number: sales.sale_number,
        payment_type: sales.payment_type,
        status: sales.status,
        created_at: sales.created_at,
        product_id: saleItems.product_id,
        product_name: products.name,
        barcode: products.barcode,
        category_name: categories.name,
        quantity: saleItems.quantity,
        unit_price: saleItems.unit_price,
        discount_amount: saleItems.discount_amount,
        total_amount: saleItems.total_amount,
        purchase_cost: sql<number>`${saleItems.quantity} * ${products.purchase_price}`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.sale_id, sales.id))
      .innerJoin(products, eq(saleItems.product_id, products.id))
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(and(...conditions))
      .orderBy(desc(sales.created_at));

    let totalAmount = 0;
    let totalDiscount = 0;
    let totalCost = 0;

    for (const r of rows) {
      totalAmount += r.total_amount;
      totalDiscount += r.discount_amount;
      totalCost += r.purchase_cost;
    }

    return {
      totalCount: rows.length,
      totalAmount,
      totalDiscount,
      totalCost,
      totalProfit: totalAmount - totalCost,
      items: rows,
    };
  }

  static async getStockReport() {
    const db = getDb();
    const rows = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        category_name: categories.name,
        brand: products.brand,
        model: products.model,
        stock_quantity: products.stock_quantity,
        minimum_stock: products.minimum_stock,
        purchase_price: products.purchase_price,
        sale_price: products.sale_price,
        total_purchase_value: sql<number>`${products.stock_quantity} * ${products.purchase_price}`,
        total_sale_value: sql<number>`${products.stock_quantity} * ${products.sale_price}`,
      })
      .from(products)
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(eq(products.is_active, true))
      .orderBy(products.name);

    let totalQuantity = 0;
    let totalPurchaseValue = 0;
    let totalSaleValue = 0;

    for (const r of rows) {
      totalQuantity += r.stock_quantity;
      totalPurchaseValue += r.total_purchase_value;
      totalSaleValue += r.total_sale_value;
    }

    return {
      totalProducts: rows.length,
      totalQuantity,
      totalPurchaseValue,
      totalSaleValue,
      potentialProfit: totalSaleValue - totalPurchaseValue,
      items: rows,
    };
  }

  static async getPurchaseReport(startDate?: string, endDate?: string) {
    const db = getDb();
    const conditions = [];

    if (startDate) conditions.push(gte(purchases.created_at, startDate));
    if (endDate) conditions.push(lte(purchases.created_at, endDate));

    const rows = await db
      .select({
        purchase_id: purchases.id,
        purchase_number: purchases.purchase_number,
        supplier_name: purchases.supplier_name,
        created_at: purchases.created_at,
        product_name: products.name,
        barcode: products.barcode,
        quantity: purchaseItems.quantity,
        unit_price: purchaseItems.unit_price,
        total_amount: purchaseItems.total_amount,
      })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchase_id, purchases.id))
      .innerJoin(products, eq(purchaseItems.product_id, products.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchases.created_at));

    let grandTotal = 0;
    for (const r of rows) {
      grandTotal += r.total_amount;
    }

    return {
      totalCount: rows.length,
      grandTotal,
      items: rows,
    };
  }

  static exportToCsv(data: Record<string, unknown>[]): string {
    if (!data || data.length === 0) return '';

    // Map items to clean Turkish Excel headers
    const mapped = data.map((item) => {
      const row: Record<string, unknown> = {};

      if ('created_at' in item) row['Tarih'] = item.created_at;
      if ('sale_number' in item) row['Satış Fiş No'] = item.sale_number;
      if ('purchase_number' in item) row['Alış Fiş No'] = item.purchase_number;
      if ('supplier_name' in item) row['Tedarikçi / Firma'] = item.supplier_name || 'Genel Tedarikçi';
      if ('product_name' in item || 'name' in item) row['Ürün Adı'] = item.product_name || item.name;
      if ('barcode' in item) row['Barkod'] = item.barcode;
      if ('category_name' in item) row['Kategori'] = item.category_name || '-';
      if ('brand' in item) row['Marka'] = item.brand || '-';
      if ('model' in item) row['Model'] = item.model || '-';
      if ('quantity' in item) row['Adet'] = item.quantity;
      if ('stock_quantity' in item) row['Mevcut Stok Adedi'] = item.stock_quantity;

      if ('unit_price' in item) row['Birim Fiyat (TL)'] = ((item.unit_price as number) / 100).toFixed(2);
      if ('purchase_price' in item) row['Birim Alış (TL)'] = ((item.purchase_price as number) / 100).toFixed(2);
      if ('sale_price' in item) row['Birim Satış (TL)'] = ((item.sale_price as number) / 100).toFixed(2);
      if ('total_amount' in item) row['Toplam Tutar (TL)'] = ((item.total_amount as number) / 100).toFixed(2);
      if ('total_purchase_value' in item) row['Toplam Maliyet Değeri (TL)'] = ((item.total_purchase_value as number) / 100).toFixed(2);
      if ('purchase_cost' in item) row['Ürün Maliyeti (TL)'] = ((item.purchase_cost as number) / 100).toFixed(2);

      if ('payment_type' in item) {
        const pt = String(item.payment_type).toUpperCase();
        row['Ödeme Yöntemi'] = pt === 'CASH' ? 'Nakit' : pt === 'CARD' ? 'Kredi Kartı' : pt === 'TRANSFER' ? 'Havale / EFT' : pt;
      }
      if ('status' in item) {
        const st = String(item.status).toUpperCase();
        row['Durum'] = st === 'COMPLETED' ? 'Tamamlandı' : st === 'CANCELLED' ? 'İptal Edildi' : st === 'RETURNED' ? 'İade Alındı' : st;
      }

      return row;
    });

    return Papa.unparse(mapped);
  }
}
