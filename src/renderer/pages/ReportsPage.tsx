import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, formatDate } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { FileBarChart, Download, DollarSign, Package, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { showToast } = useApp();
  const [reportType, setReportType] = useState<'sales' | 'stock' | 'purchases'>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    let res: any;
    if (reportType === 'sales') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.REPORT_SALES, {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
    } else if (reportType === 'stock') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.REPORT_STOCK);
    } else if (reportType === 'purchases') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.REPORT_PURCHASES, {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
    }

    if (res && res.success && res.data) {
      setReportData(res.data);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const handleExportCsv = async () => {
    if (!reportData || !reportData.items || reportData.items.length === 0) {
      showToast('Dışa aktarılacak veri bulunamadı', 'warning');
      return;
    }

    const csvRes = await window.electronAPI.invoke(IPC_CHANNELS.REPORT_EXPORT_CSV, { data: reportData.items });
    if (csvRes.success && csvRes.data) {
      const blob = new Blob([csvRes.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Kodhanem-Stok-Rapor-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV Raporu başarıyla bilgisayarınıza indirildi', 'success');
    }
  };

  const chartData = reportData?.items ? reportData.items.slice(0, 10).map((it: any) => ({
    name: it.product_name || it.name || it.sale_number,
    tutar: Math.round((it.total_amount || it.total_purchase_value || 0) / 100),
  })) : [];

  return (
    <div className="space-y-6">
      {/* Report Type Selector & CSV Export */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-2">
          <Button
            variant={reportType === 'sales' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setReportType('sales')}
          >
            <DollarSign size={16} /> Satış & Kâr Raporu
          </Button>
          <Button
            variant={reportType === 'stock' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setReportType('stock')}
          >
            <Package size={16} /> Stok Değerleme Raporu
          </Button>
          <Button
            variant={reportType === 'purchases' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setReportType('purchases')}
          >
            <TrendingUp size={16} /> Alış Raporu
          </Button>
        </div>

        <Button variant="success" size="sm" onClick={handleExportCsv}>
          <Download size={16} /> CSV Olarak Dışa Aktar
        </Button>
      </div>

      {/* Date Range Picker Filters */}
      {reportType !== 'stock' && (
        <Card className="p-3 flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500">Tarih Aralığı Seçin:</span>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          <span className="text-slate-400">-</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
            Filtreyi Temizle
          </Button>
        </Card>
      )}

      {/* Report Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportType === 'sales' && (
            <>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Toplam İşlem Adedi</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{reportData.totalCount}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Toplam Ciro</div>
                <div className="text-2xl font-extrabold text-blue-600 mt-1">{formatTL(reportData.totalAmount)}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Toplam Ürün Maliyeti</div>
                <div className="text-2xl font-extrabold text-slate-500 mt-1">{formatTL(reportData.totalCost)}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Tahmini Net Kâr</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatTL(reportData.totalProfit)}</div>
              </Card>
            </>
          )}

          {reportType === 'stock' && (
            <>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Toplam Ürün Çeşidi</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{reportData.totalProducts}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Toplam Stok Adedi</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{reportData.totalQuantity}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Maliyet Cinsinden Değer</div>
                <div className="text-2xl font-extrabold text-cyan-600 mt-1">{formatTL(reportData.totalPurchaseValue)}</div>
              </Card>
              <Card>
                <div className="text-xs text-slate-400 font-medium">Satış Cinsinden Değer</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">{formatTL(reportData.totalSaleValue)}</div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Recharts Graphical Representation */}
      {chartData.length > 0 && (
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Görsel Rapor Grafiği (TL)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`₺${val}`, 'Tutar']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="tutar" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Table Data */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
            {reportType === 'sales' && (
              <tr>
                <th className="p-3">Tarih</th>
                <th className="p-3">Satış No</th>
                <th className="p-3">Ürün</th>
                <th className="p-3">Barkod</th>
                <th className="p-3">Adet</th>
                <th className="p-3">Birim Satış</th>
                <th className="p-3">Toplam Tutar</th>
                <th className="p-3">Net Kâr</th>
              </tr>
            )}
            {reportType === 'stock' && (
              <tr>
                <th className="p-3">Barkod</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Stok Adedi</th>
                <th className="p-3">Birim Alış</th>
                <th className="p-3">Birim Satış</th>
                <th className="p-3">Toplam Maliyet Değeri</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData && reportData.items && reportData.items.length > 0 ? (
              reportData.items.map((it: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  {reportType === 'sales' && (
                    <>
                      <td className="p-3 text-slate-500">{formatDate(it.created_at)}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{it.sale_number}</td>
                      <td className="p-3 font-semibold text-slate-800">{it.product_name}</td>
                      <td className="p-3 font-mono text-slate-500">{it.barcode}</td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3">{formatTL(it.unit_price)}</td>
                      <td className="p-3 font-semibold">{formatTL(it.total_amount)}</td>
                      <td className="p-3 font-bold text-emerald-600">
                        {formatTL(it.total_amount - it.purchase_cost)}
                      </td>
                    </>
                  )}
                  {reportType === 'stock' && (
                    <>
                      <td className="p-3 font-mono text-slate-600">{it.barcode}</td>
                      <td className="p-3 font-bold text-slate-800">{it.name}</td>
                      <td className="p-3">{it.category_name || '-'}</td>
                      <td className="p-3 font-medium">{it.stock_quantity}</td>
                      <td className="p-3">{formatTL(it.purchase_price)}</td>
                      <td className="p-3">{formatTL(it.sale_price)}</td>
                      <td className="p-3 font-bold text-cyan-600">{formatTL(it.total_purchase_value)}</td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                  Rapor verisi bekleniyor veya uygun kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
