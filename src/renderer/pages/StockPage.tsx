import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { ColumnDef } from '@tanstack/react-table';
import { Boxes, AlertTriangle, XCircle, SlidersHorizontal, Plus, Minus } from 'lucide-react';

export const StockPage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT'>('ALL');

  // Adjustment Modal
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Quick Action State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    product: Product | null;
    action: 'increase' | 'decrease' | null;
    qty: number;
  }>({ isOpen: false, product: null, action: null, qty: 1 });

  const fetchProducts = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_SEARCH, { query: '' });
    if (res.success && res.data) setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshSignal]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isOut = p.stock_quantity === 0;
      const isLow = p.stock_quantity <= p.minimum_stock;

      if (filterStatus === 'OUT') return isOut;
      if (filterStatus === 'LOW') return isLow && !isOut;
      if (filterStatus === 'NORMAL') return !isLow && !isOut;
      return true;
    });
  }, [products, filterStatus]);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    const res = await window.electronAPI.invoke(IPC_CHANNELS.STOCK_ADJUST, {
      product_id: adjustProduct.id,
      new_quantity: Number(newQuantity),
      description: adjustReason,
    });

    if (res.success) {
      showToast('Stok miktarı güncellendi ve hareket kaydedildi', 'success');
      setAdjustProduct(null);
      fetchProducts();
    } else {
      showToast(res.error?.message || 'Stok güncellenemedi', 'danger');
    }
  };

  const handleQuickAction = async () => {
    if (!confirmState.product || !confirmState.action) return;

    const p = confirmState.product;
    let res: any;

    if (confirmState.action === 'increase') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.STOCK_INCREASE, {
        productId: p.id,
        quantity: 1,
        description: 'Hızlı Stok Artırma',
      });
    } else {
      res = await window.electronAPI.invoke(IPC_CHANNELS.STOCK_DECREASE, {
        productId: p.id,
        quantity: 1,
        description: 'Hızlı Stok Azaltma',
      });
    }

    if (res.success) {
      showToast(`${p.name} stoğu güncellendi`, 'success');
      setConfirmState({ isOpen: false, product: null, action: null, qty: 1 });
      fetchProducts();
    } else {
      showToast(res.error?.message || 'İşlem gerçekleştirilemedi', 'danger');
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'barcode',
      header: 'Barkod',
      cell: ({ row }) => <span className="font-mono text-blue-600 font-semibold">{row.original.barcode}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Ürün Adı',
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.original.name}</span>,
    },
    {
      accessorKey: 'category_name',
      header: 'Kategori',
      cell: ({ row }) => row.original.category_name || '-',
    },
    {
      accessorKey: 'stock_quantity',
      header: 'Mevcut Stok',
      cell: ({ row }) => {
        const qty = row.original.stock_quantity;
        const min = row.original.minimum_stock;
        const isOut = qty === 0;
        const isLow = qty <= min;

        return (
          <Badge variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}>
            {isOut ? 'TÜKENDİ (0)' : isLow ? `KRİTİK (${qty})` : `NORMAL (${qty})`}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'minimum_stock',
      header: 'Kritik Eşik',
      cell: ({ row }) => `${row.original.minimum_stock} Adet`,
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
            title="1 Adet Artır"
            onClick={() => setConfirmState({ isOpen: true, product: row.original, action: 'increase', qty: 1 })}
          >
            <Plus size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            title="1 Adet Azalt"
            onClick={() => setConfirmState({ isOpen: true, product: row.original, action: 'decrease', qty: 1 })}
          >
            <Minus size={14} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAdjustProduct(row.original);
              setNewQuantity(row.original.stock_quantity);
              setAdjustReason('');
            }}
          >
            <SlidersHorizontal size={14} /> Sayım Düzelt
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sub Filter Controls */}
      <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
        <span className="text-xs font-semibold text-slate-500 mr-2">Stok Durum Filtresi:</span>
        <Button
          variant={filterStatus === 'ALL' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('ALL')}
        >
          <Boxes size={14} /> Tüm Ürünler ({products.length})
        </Button>
        <Button
          variant={filterStatus === 'NORMAL' ? 'success' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('NORMAL')}
        >
          Normal Stok
        </Button>
        <Button
          variant={filterStatus === 'LOW' ? 'warning' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('LOW')}
        >
          <AlertTriangle size={14} /> Kritik Stok
        </Button>
        <Button
          variant={filterStatus === 'OUT' ? 'danger' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('OUT')}
        >
          <XCircle size={14} /> Tükenenler
        </Button>
      </div>

      {/* TanStack Table */}
      <DataTable columns={columns} data={filteredProducts} searchPlaceholder="Barkod veya Ürün Adı ile arayın..." />

      {/* Adjust Modal */}
      <Dialog
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        title="Stok Sayım & Düzeltme İşlemi"
        maxWidth="max-w-md"
      >
        {adjustProduct && (
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-sm text-slate-800">{adjustProduct.name}</div>
              <div className="text-xs text-slate-500">Mevcut Stok: {adjustProduct.stock_quantity} Adet</div>
            </div>

            <Input
              label="Yeni Stok Miktarı"
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              required
            />

            <Input
              label="Düzeltme Nedeni / Açıklama"
              placeholder="Örn: Sayım farkı, Hasarlı ürün..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setAdjustProduct(null)}>
                İptal
              </Button>
              <Button type="submit">Stoku Güncelle</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Quick Action Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, product: null, action: null, qty: 1 })}
        onConfirm={handleQuickAction}
        title={confirmState.action === 'increase' ? 'Stok Artırma Onayı' : 'Stok Azaltma Onayı'}
        description={`${confirmState.product?.name} için stok miktarını 1 adet ${
          confirmState.action === 'increase' ? 'artırmak' : 'azaltmak'
        } istediğinize emin misiniz?`}
        confirmText="Evet, Onayla"
        variant={confirmState.action === 'increase' ? 'primary' : 'danger'}
      />
    </div>
  );
};
