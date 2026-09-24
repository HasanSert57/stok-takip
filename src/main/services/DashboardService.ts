import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../database/connection';
import { products, sales, saleItems } from '../database/schema';
import { DashboardStats, SaleStatus } from '../../shared/types';
import { SaleService } from './SaleService';
import { StockService } from './StockService';

export class DashboardService {
  static async getDashboardStats(): Promise<DashboardStats> {
    const db = getDb();
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Products & Stock Counts (Aggregated directly in SQLite C++ engine)
    const productStats = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        totalStock: sql<number>`coalesce(sum(${products.stock_quantity}), 0)`,
        totalStockValue: sql<number>`coalesce(sum(${products.stock_quantity} * ${products.purchase_price}), 0)`,
        lowStockCount: sql<number>`coalesce(sum(case when ${products.stock_quantity} <= ${products.minimum_stock} then 1 else 0 end), 0)`,
        outOfStockCount: sql<number>`coalesce(sum(case when ${products.stock_quantity} = 0 then 1 else 0 end), 0)`,
      })
      .from(products)
      .where(eq(products.is_active, true));

    const pStat = productStats[0] || {
      totalProducts: 0,
      totalStock: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    // 2. Today's Sales
    const todaySales = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${sales.total_amount}), 0)`,
      })
      .from(sales)
      .where(
        and(
          gte(sales.created_at, todayStart),
          eq(sales.status, SaleStatus.COMPLETED)
        )
      );

    const tSales = todaySales[0] || { count: 0, total: 0 };

    // 3. Monthly Sales & Estimated Profit
    const monthlySales = await db
      .select({
        totalAmount: sql<number>`coalesce(sum(${sales.total_amount}), 0)`,
      })
      .from(sales)
      .where(
        and(
          gte(sales.created_at, monthStart),
          eq(sales.status, SaleStatus.COMPLETED)
        )
      );

    const mTotal = monthlySales[0]?.totalAmount || 0;

    // Monthly Profit = Revenue - Purchase Cost of sold items
    const profitQuery = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${saleItems.quantity} * ${saleItems.unit_price}), 0)`,
        totalCost: sql<number>`coalesce(sum(${saleItems.quantity} * ${products.purchase_price}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.sale_id, sales.id))
      .innerJoin(products, eq(saleItems.product_id, products.id))
      .where(
        and(
          gte(sales.created_at, monthStart),
          eq(sales.status, SaleStatus.COMPLETED)
        )
      );

    const profitData = profitQuery[0] || { totalRevenue: 0, totalCost: 0 };
    const estimatedProfit = Math.max(0, profitData.totalRevenue - profitData.totalCost);

    // 4. Top Selling Products (Limit 5 in SQL)
    const topSelling = await db
      .select({
        product_id: saleItems.product_id,
        product_name: products.name,
        product_barcode: products.barcode,
        total_quantity: sql<number>`sum(${saleItems.quantity})`,
        total_revenue: sql<number>`sum(${saleItems.quantity} * ${saleItems.unit_price})`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.sale_id, sales.id))
      .innerJoin(products, eq(saleItems.product_id, products.id))
      .where(eq(sales.status, SaleStatus.COMPLETED))
      .groupBy(saleItems.product_id, products.name, products.barcode)
      .orderBy(desc(sql`sum(${saleItems.quantity})`))
      .limit(5);

    // 5. Recent Sales & Recent Stock Movements (Limit 10 in SQL for high performance)
    const recentSales = await SaleService.getSales(5);
    const recentStockMovements = await StockService.getStockMovements(undefined, 10);

    // 6. Real Last 7 Days Sales Trend Calculation
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const weeklySalesTrend: { name: string; date: string; satis: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();

      const dayQuery = await db
        .select({
          total: sql<number>`coalesce(sum(${sales.total_amount}), 0)`,
        })
        .from(sales)
        .where(
          and(
            gte(sales.created_at, dStart),
            lte(sales.created_at, dEnd),
            eq(sales.status, SaleStatus.COMPLETED)
          )
        );

      const dayTotal = dayQuery[0]?.total || 0;
      weeklySalesTrend.push({
        name: dayNames[d.getDay()],
        date: d.toISOString().slice(0, 10),
        satis: Math.round(dayTotal / 100), // Convert kuruş to TL
      });
    }

    return {
      totalProducts: Number(pStat.totalProducts),
      totalStock: Number(pStat.totalStock),
      totalStockValue: Number(pStat.totalStockValue),
      todaySalesCount: Number(tSales.count),
      todaySalesAmount: Number(tSales.total),
      monthlySalesAmount: Number(mTotal),
      estimatedProfit: Number(estimatedProfit),
      lowStockCount: Number(pStat.lowStockCount),
      outOfStockCount: Number(pStat.outOfStockCount),
      recentSales,
      recentStockMovements,
      topSellingProducts: topSelling.map((t) => ({
        ...t,
        total_quantity: Number(t.total_quantity),
        total_revenue: Number(t.total_revenue),
      })),
      weeklySalesTrend,
    };
  }
}
