import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DashboardStats } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, formatDate, formatPaymentType } from '../utils/formatters';
import { StatCard, Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/States';
import {
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Boxes,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { refreshSignal, setActiveTab } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.DASHBOARD_GET);
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setError(res.error?.message || 'Dashboard verileri alınamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Dashboard metrikleri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshSignal]);

  if (isLoading && !stats) {
    return <LoadingState message="Dashboard metrikleri hesaplanıyor..." />;
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-red-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-md">
        <div className="p-3 rounded-full bg-red-100 text-red-600">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Dashboard Yüklenemedi</h3>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
        <Button onClick={fetchDashboard} variant="primary" size="sm">
          <RefreshCw size={14} /> Tekrar Deneyin
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  // Real Weekly Sales Trend Chart Data
  const salesChartData = stats.weeklySalesTrend && stats.weeklySalesTrend.length > 0
    ? stats.weeklySalesTrend
    : [
        { name: 'Pzt', satis: 0 },
        { name: 'Sal', satis: 0 },
        { name: 'Çar', satis: 0 },
        { name: 'Per', satis: 0 },
        { name: 'Cum', satis: 0 },
        { name: 'Cmt', satis: 0 },
        { name: 'Paz', satis: 0 },
      ];

  const topProductsChart = (stats.topSellingProducts || []).map((p) => ({
    name: p.product_name.length > 12 ? `${p.product_name.slice(0, 12)}...` : p.product_name,
    adet: p.total_quantity,
    ciro: Math.round(p.total_revenue / 100),
  }));

  return (
    <div className="space-y-6">
      {/* 8 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Ürün"
          value={stats.totalProducts}
          subtitle="Kayıtlı Ürün Çeşidi"
          color="blue"
          icon={<Package size={20} />}
          onClick={() => setActiveTab('products')}
        />
        <StatCard
          title="Toplam Stok"
          value={`${stats.totalStock} Adet`}
          subtitle={`Stok Değeri: ${formatTL(stats.totalStockValue)}`}
          color="amber"
          icon={<Boxes size={20} />}
          onClick={() => setActiveTab('stock')}
        />
        <StatCard
          title="Bugünkü Satış"
          value={`${stats.todaySalesCount} İşlem`}
          subtitle={`Satış Adedi: ${stats.todaySalesCount}`}
          color="cyan"
          icon={<ShoppingBag size={20} />}
          onClick={() => setActiveTab('sales')}
        />
        <StatCard
          title="Bugünkü Ciro"
          value={formatTL(stats.todaySalesAmount)}
          subtitle="Nakit / Kart / Havale"
          color="emerald"
          icon={<DollarSign size={20} />}
        />
        <StatCard
          title="Aylık Ciro"
          value={formatTL(stats.monthlySalesAmount)}
          subtitle="Bu Ayki Toplam Satış"
          color="purple"
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          title="Tahmini Kâr"
          value={formatTL(stats.estimatedProfit)}
          subtitle="Satış - Alış Maliyeti"
          color="emerald"
          icon={<Flame size={20} />}
        />
        <StatCard
          title="Kritik Stok"
          value={`${stats.lowStockCount} Ürün`}
          subtitle="Eşik Altında Kalanlar"
          color="amber"
          icon={<AlertTriangle size={20} />}
          onClick={() => setActiveTab('stock')}
        />
        <StatCard
          title="Tükenen Ürün"
          value={`${stats.outOfStockCount} Ürün`}
          subtitle="Stok Miktarı 0 Olanlar"
          color="red"
          icon={<XCircle size={20} />}
          onClick={() => setActiveTab('stock')}
        />
      </div>

      {/* Recharts Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Line Chart */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Haftalık Satış Trendi (TL)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Son 7 Gün</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`₺${val}`, 'Satış Cirosu']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="satis" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Selling Products Bar Chart */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Flame size={16} className="text-amber-500" /> En Çok Satan Ürünler (Satış Adedi)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Top 5 Ürün</span>
          </div>
          <div className="h-64 w-full">
            {topProductsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    formatter={(val: any, name: any) => [val, name === 'adet' ? 'Satış Adedi' : 'Ciro']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="adet" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Henüz yeterli satış verisi bulunmuyor.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Sales Table & Low Stock Alert Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Log */}
        <Card className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Son Yapılan Satışlar</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('sales')}>
              Tümünü Gör <ArrowUpRight size={14} />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase">
                  <th className="p-2.5">Satış No</th>
                  <th className="p-2.5">Tarih</th>
                  <th className="p-2.5">Ödeme</th>
                  <th className="p-2.5">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats.recentSales || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 font-medium">
                      Henüz kaydolmuş satış bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  (stats.recentSales || []).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-semibold text-slate-800">{s.sale_number}</td>
                      <td className="p-2.5 text-slate-500">{formatDate(s.created_at)}</td>
                      <td className="p-2.5">
                        <Badge variant="info">{formatPaymentType(s.payment_type)}</Badge>
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600">{formatTL(s.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Low Stock Warning Banner */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-amber-600 flex items-center gap-2">
              <AlertTriangle size={16} /> Stok Aksiyon Takibi
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <div
              onClick={() => setActiveTab('stock')}
              className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-amber-800">Kritik Stok Uyarısı</div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  {stats.lowStockCount} adet ürün minimum stok eşiğinin altında.
                </div>
              </div>
              <ArrowUpRight size={18} className="text-amber-700" />
            </div>

            <div
              onClick={() => setActiveTab('stock')}
              className="p-3.5 rounded-lg border border-red-200 bg-red-50 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-red-800">Stoğu Tükenen Ürünler</div>
                <div className="text-[11px] text-red-700 mt-0.5">
                  {stats.outOfStockCount} adet ürün stokta kalmadı.
                </div>
              </div>
              <ArrowUpRight size={18} className="text-red-700" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
