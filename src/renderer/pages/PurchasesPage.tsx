import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Purchase, Product } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, kuruşToTL, tlToKuruş, formatDate } from '../utils/formatters';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, CurrencyInput } from '../components/ui/Input';
import { SearchableSelect, SearchableOption } from '../components/ui/SearchableSelect';
import { Dialog } from '../components/ui/Dialog';
import { ColumnDef } from '@tanstack/react-table';
import { Truck, Plus, Trash2 } from 'lucide-react';

interface PurchaseItemInput {
  product: Product;
  quantity: number;
  unit_priceTL: number;
}

export const PurchasesPage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPriceTL, setUnitPriceTL] = useState<number>(0);
  const [items, setItems] = useState<PurchaseItemInput[]>([]);

  useKeyboardShortcuts({
    onPurchaseIntake: () => setIsModalOpen(true),
  });

  const fetchPurchasesAndProducts = async () => {
    const pRes = await window.electronAPI.invoke(IPC_CHANNELS.PURCHASE_LIST, { limit: 100 });
    if (pRes.success && pRes.data) setPurchases(pRes.data);

    const prodRes = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_SEARCH, { query: '' });
    if (prodRes.success && prodRes.data) setProducts(prodRes.data);
  };

  useEffect(() => {
    fetchPurchasesAndProducts();
  }, [refreshSignal]);

  const productOptions: SearchableOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `${formatTL(p.purchase_price)} Alış / ${formatTL(p.sale_price)} Satış`,
    badge: p.barcode,
  }));

  const handleAddItemToPurchase = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    setItems((prev) => [
      ...prev,
      {
        product,
        quantity: Number(quantity),
        unit_priceTL: Number(unitPriceTL),
      },
    ]);

    setSelectedProductId(null);
    setQuantity(1);
    setUnitPriceTL(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('Lütfen en az bir ürün ekleyin', 'warning');
      return;
    }

    const payload = {
      supplier_name: supplierName || null,
      items: items.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity,
        unit_price: tlToKuruş(it.unit_priceTL),
      })),
    };

    const res = await window.electronAPI.invoke(IPC_CHANNELS.PURCHASE_CREATE, payload);
    if (res.success) {
      showToast('Alış faturası oluşturuldu, stoklar ve alış fiyatları güncellendi', 'success');
      setIsModalOpen(false);
      setItems([]);
      setSupplierName('');
      fetchPurchasesAndProducts();
    } else {
      showToast(res.error?.message || 'Alış kaydı oluşturulamadı', 'danger');
    }
  };

  const columns: ColumnDef<Purchase>[] = [
    {
      accessorKey: 'purchase_number',
      header: 'Alış Fiş No',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-800">{row.original.purchase_number}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Tarih',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      accessorKey: 'supplier_name',
      header: 'Tedarikçi / Firma',
      cell: ({ row }) => row.original.supplier_name || 'Genel Tedarikçi',
    },
    {
      accessorKey: 'total_amount',
      header: 'Toplam Tutar',
      cell: ({ row }) => <span className="font-bold text-cyan-600">{formatTL(row.original.total_amount)}</span>,
    },
  ];

  const grandTotalTL = items.reduce((sum, item) => sum + item.quantity * item.unit_priceTL, 0);

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Truck size={20} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Mal Alış & Stok Giriş Faturaları</h3>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Yeni Alış Faturası Girişi (F4)
        </Button>
      </div>

      {/* TanStack Table */}
      <DataTable columns={columns} data={purchases} searchPlaceholder="Alış No veya Tedarikçi arayın..." />

      {/* Intake Purchase Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Mal Alış & Stok Girişi (F4)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          <Input
            label="Tedarikçi / Firma Adı (Opsiyonel)"
            placeholder="Örn: Genpa, İndeks, KVK..."
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-2">
              <SearchableSelect
                label="Ürün Seçin veya Yazarak Arayın"
                placeholder="Kulaklık, kılıf, şarj cihazı veya barkod..."
                options={productOptions}
                value={selectedProductId}
                onChange={(val) => {
                  const pid = Number(val);
                  setSelectedProductId(pid || null);
                  const p = products.find((pr) => pr.id === pid);
                  if (p) setUnitPriceTL(kuruşToTL(p.purchase_price));
                }}
              />
            </div>

            <Input
              label="Miktar"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />

            <CurrencyInput
              label="Birim Alış (TL)"
              value={unitPriceTL}
              onChange={(e) => setUnitPriceTL(parseFloat(e.target.value) || 0)}
            />

            <div className="sm:col-span-4 flex justify-end pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItemToPurchase}>
                <Plus size={14} /> Ürünü Faturaya Ekle
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-2.5">Ürün</th>
                  <th className="p-2.5">Miktar</th>
                  <th className="p-2.5">Birim Fiyat</th>
                  <th className="p-2.5">Toplam</th>
                  <th className="p-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                      Faturaya eklenmiş ürün bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-800">{it.product.name}</td>
                      <td className="p-2.5">{it.quantity}</td>
                      <td className="p-2.5">₺{it.unit_priceTL.toFixed(2)}</td>
                      <td className="p-2.5 font-semibold text-cyan-600">₺{(it.quantity * it.unit_priceTL).toFixed(2)}</td>
                      <td className="p-2.5">
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-sm font-extrabold text-slate-900">
              Toplam Fatura Tutarı: <span className="text-cyan-600">₺{grandTotalTL.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="success">
                Alış Faturasını Kaydet
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
