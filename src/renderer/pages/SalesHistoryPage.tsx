import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sale, SaleStatus } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, formatDate, formatPaymentType, formatSaleStatus } from '../utils/formatters';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, RotateCcw, XCircle, AlertTriangle } from 'lucide-react';

export const SalesHistoryPage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Cancellation Modal
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Return Modal
  const [returnModalSale, setReturnModalSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState('');

  const fetchSales = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.SALE_LIST, { limit: 100 });
    if (res.success && res.data) setSales(res.data);
  };

  useEffect(() => {
    fetchSales();
  }, [refreshSignal]);

  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalSale) return;

    const res = await window.electronAPI.invoke(IPC_CHANNELS.SALE_CANCEL, {
      sale_id: cancelModalSale.id,
      reason: cancelReason,
    });

    if (res.success) {
      showToast('Satış iptal edildi ve stoklar otomatik iade edildi', 'success');
      setCancelModalSale(null);
      fetchSales();
    } else {
      showToast(res.error?.message || 'Satış iptal edilemedi', 'danger');
    }
  };

  const handleOpenReturnModal = (s: Sale) => {
    setReturnModalSale(s);
    const initialQty: Record<number, number> = {};
    if (s.items) {
      for (const item of s.items) {
        initialQty[item.product_id] = 0;
      }
    }
    setReturnQuantities(initialQty);
    setReturnReason('');
  };

  const handleReturnSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalSale) return;

    const returnItems = Object.entries(returnQuantities)
      .map(([productIdStr, quantity]) => ({
        product_id: Number(productIdStr),
        quantity: Number(quantity),
      }))
      .filter((it) => it.quantity > 0);

    if (returnItems.length === 0) {
      showToast('Lütfen iade edilecek ürün miktarını girin', 'warning');
      return;
    }

    const res = await window.electronAPI.invoke(IPC_CHANNELS.SALE_RETURN, {
      sale_id: returnModalSale.id,
      items: returnItems,
      reason: returnReason,
    });

    if (res.success) {
      showToast('İade işlemi tamamlandı ve stoklar güncellendi', 'success');
      setReturnModalSale(null);
      fetchSales();
    } else {
      showToast(res.error?.message || 'İade işlemi başarısız', 'danger');
    }
  };

  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: 'sale_number',
      header: 'Satış No',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-800">{row.original.sale_number}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Tarih',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: 'payment_type',
      header: 'Ödeme Yöntemi',
      cell: ({ row }) => <Badge variant="info">{formatPaymentType(row.original.payment_type)}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Durum',
      cell: ({ row }) => {
        const s = row.original.status;
        const v = s === SaleStatus.COMPLETED ? 'success' : s === SaleStatus.CANCELLED ? 'danger' : 'warning';
        return <Badge variant={v}>{formatSaleStatus(s)}</Badge>;
      },
    },
    {
      accessorKey: 'total_amount',
      header: 'Toplam Tutar',
      cell: ({ row }) => <span className="font-bold text-emerald-600">{formatTL(row.original.total_amount)}</span>,
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSale(row.original)}>
            <Eye size={14} /> Detay
          </Button>
          {row.original.status === SaleStatus.COMPLETED && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleOpenReturnModal(row.original)}>
                <RotateCcw size={14} /> İade
              </Button>
              <Button variant="danger" size="sm" onClick={() => setCancelModalSale(row.original)}>
                <XCircle size={14} /> İptal
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* TanStack Table */}
      <DataTable columns={columns} data={sales} searchPlaceholder="Satış No ile arayın..." />

      {/* Sale Detail Dialog */}
      <Dialog
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={`Satış Detayı: ${selectedSale?.sale_number}`}
        maxWidth="max-w-lg"
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-500">Tarih: {formatDate(selectedSale.created_at)}</span>
              <Badge variant={selectedSale.status === SaleStatus.COMPLETED ? 'success' : 'danger'}>
                {formatSaleStatus(selectedSale.status)}
              </Badge>
            </div>

            <div className="flex justify-between items-center text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-semibold">
              <span>Ödeme Yöntemi:</span>
              <span className="font-bold text-blue-600">{formatPaymentType(selectedSale.payment_type)}</span>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">Ürün</th>
                    <th className="p-2.5">Fiyat</th>
                    <th className="p-2.5">Adet</th>
                    <th className="p-2.5">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-bold text-slate-800">{it.product_name}</td>
                      <td className="p-2.5">{formatTL(it.unit_price)}</td>
                      <td className="p-2.5">{it.quantity}</td>
                      <td className="p-2.5 font-semibold text-emerald-600">{formatTL(it.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-extrabold border-t border-slate-100 pt-3">
              <span>Genel Toplam:</span>
              <span className="text-emerald-600">{formatTL(selectedSale.total_amount)}</span>
            </div>

            <Button className="w-full" variant="outline" onClick={() => setSelectedSale(null)}>
              Kapat
            </Button>
          </div>
        )}
      </Dialog>

      {/* Cancel Sale Modal */}
      <Dialog
        isOpen={!!cancelModalSale}
        onClose={() => setCancelModalSale(null)}
        title="Satış İptali Onayı"
        maxWidth="max-w-md"
      >
        {cancelModalSale && (
          <form onSubmit={handleCancelSale} className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertTriangle size={24} className="shrink-0 text-red-600" />
              <div>
                <strong>{cancelModalSale.sale_number}</strong> numaralı satış tamamen iptal edilecek ve stoklar otomatik geri eklenecektir.
              </div>
            </div>

            <Input
              label="İptal Nedeni"
              placeholder="Örn: Müşteri vazgeçti..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setCancelModalSale(null)}>
                Vazgeç
              </Button>
              <Button type="submit" variant="danger">
                İptali Onayla
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Item Return Modal */}
      <Dialog
        isOpen={!!returnModalSale}
        onClose={() => setReturnModalSale(null)}
        title="Ürün Bazlı İade İşlemi"
        maxWidth="max-w-md"
      >
        {returnModalSale && (
          <form onSubmit={handleReturnSale} className="space-y-4 text-xs">
            <div className="text-slate-500">İade edilecek miktar giriniz:</div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {returnModalSale.items?.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">{item.product_name}</div>
                    <div className="text-[11px] text-slate-400">Satılan: {item.quantity} adet | {formatTL(item.unit_price)}</div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    className="w-20 text-center"
                    value={returnQuantities[item.product_id] || 0}
                    onChange={(e) =>
                      setReturnQuantities({
                        ...returnQuantities,
                        [item.product_id]: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <Input
              label="İade Nedeni"
              placeholder="Örn: Müşteri beğenmedi..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setReturnModalSale(null)}>
                İptal
              </Button>
              <Button type="submit" variant="warning">
                İadeyi Al ve Stok Güncelle
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};
