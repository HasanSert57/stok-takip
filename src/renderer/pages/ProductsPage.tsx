import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, kuruşToTL, tlToKuruş } from '../utils/formatters';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, BarcodeInput, CurrencyInput } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductSchema } from '../../shared/schemas';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Eye, RefreshCw, Printer } from 'lucide-react';

type ProductFormValues = z.infer<typeof createProductSchema>;

export const ProductsPage: React.FC = () => {
  const { showToast, refreshSignal, addToPrintQueue, setActiveTab } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      minimum_stock: 5,
      stock_quantity: 0,
      is_active: true,
    },
  });

  const fetchProducts = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_SEARCH, { query: '' });
    if (res.success && res.data) setProducts(res.data);
  };

  const fetchCategories = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_LIST);
    if (res.success && res.data) setCategories(res.data);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [refreshSignal]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.brand) set.add(p.brand);
    }
    return Array.from(set);
  }, [products]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    reset({
      barcode: '',
      name: '',
      category_id: categories.length > 0 ? categories[0].id : null,
      brand: '',
      model: '',
      variant: '',
      color: '',
      purchase_price: 0,
      sale_price: 0,
      minimum_stock: 5,
      stock_quantity: 0,
      description: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    reset({
      barcode: p.barcode,
      name: p.name,
      category_id: p.category_id,
      brand: p.brand || '',
      model: p.model || '',
      variant: p.variant || '',
      color: p.color || '',
      purchase_price: p.purchase_price,
      sale_price: p.sale_price,
      minimum_stock: p.minimum_stock,
      stock_quantity: p.stock_quantity,
      description: p.description || '',
      is_active: p.is_active,
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = async (values: ProductFormValues) => {
    if (editingProduct) {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_UPDATE, { ...values, id: editingProduct.id });
      if (res.success) {
        showToast('Ürün başarıyla güncellendi', 'success');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        showToast(res.error?.message || 'Güncelleme başarısız', 'danger');
      }
    } else {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_CREATE, values);
      if (res.success && res.data) {
        const created: Product = res.data;
        showToast('Yeni ürün eklendi. Etiket sepetine eklendi.', 'success');
        addToPrintQueue(created, created.stock_quantity > 0 ? created.stock_quantity : 1);
        setIsModalOpen(false);
        fetchProducts();
      } else {
        showToast(res.error?.message || 'Ekleme başarısız', 'danger');
      }
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deleteProductId) return;

    const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_DELETE, { id: deleteProductId });
    if (res.success) {
      showToast('Ürün silindi (pasife alındı)', 'info');
      setDeleteProductId(null);
      fetchProducts();
    } else {
      showToast(res.error?.message || 'Silme işlemi başarısız', 'danger');
      setDeleteProductId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category_id !== Number(selectedCategory)) return false;
      if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;
      return true;
    });
  }, [products, selectedCategory, selectedBrand]);

  // TanStack Table Columns
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'barcode',
      header: 'Barkod',
      cell: ({ row }) => <span className="font-mono text-blue-600 font-semibold">{row.original.barcode}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Ürün Adı',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-800">{row.original.name}</div>
          <div className="text-[11px] text-slate-400">{row.original.variant ? `Varyant: ${row.original.variant}` : ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category_name',
      header: 'Kategori',
      cell: ({ row }) => row.original.category_name || '-',
    },
    {
      accessorKey: 'brand',
      header: 'Marka / Model',
      cell: ({ row }) => (row.original.brand ? `${row.original.brand} ${row.original.model || ''}` : '-'),
    },
    {
      accessorKey: 'purchase_price',
      header: 'Alış Fiyatı',
      cell: ({ row }) => formatTL(row.original.purchase_price),
    },
    {
      accessorKey: 'sale_price',
      header: 'Satış Fiyatı',
      cell: ({ row }) => <span className="font-bold text-emerald-600">{formatTL(row.original.sale_price)}</span>,
    },
    {
      accessorKey: 'stock_quantity',
      header: 'Stok',
      cell: ({ row }) => {
        const qty = row.original.stock_quantity;
        const min = row.original.minimum_stock;
        const isOut = qty === 0;
        const isLow = qty <= min;
        return (
          <Badge variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}>
            {qty} adet
          </Badge>
        );
      },
    },
    {
      accessorKey: 'minimum_stock',
      header: 'Min. Stok',
      cell: ({ row }) => `${row.original.minimum_stock} adet`,
    },
    {
      id: 'actions',
      header: 'İşlem',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => addToPrintQueue(row.original, 1)}
            title="Barkod Etiket Sepetine Ekle"
          >
            <Printer size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailProduct(row.original)} title="Detay">
            <Eye size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleOpenEditModal(row.original)} title="Düzenle">
            <Edit2 size={14} />
          </Button>
          <Button variant="danger" size="icon" className="h-7 w-7" onClick={() => setDeleteProductId(row.original.id)} title="Sil">
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls & Category/Brand Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="w-48">
            <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="ALL">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-48">
            <Select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              <option value="ALL">Tüm Markalar</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button onClick={handleOpenAddModal}>
          <Plus size={16} /> Yeni Ürün Ekle
        </Button>
      </div>

      {/* TanStack Data Table */}
      <DataTable columns={columns} data={filteredProducts} searchPlaceholder="Barkod, Ürün Adı, Marka veya Model arayın..." />

      {/* Add / Edit Product Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-2 items-end">
            <BarcodeInput
              label="Barkod (Zorunlu)"
              error={errors.barcode?.message}
              {...register('barcode')}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Yeni Barkod Üret"
              onClick={async () => {
                const res = await window.electronAPI.invoke(IPC_CHANNELS.BARCODE_GENERATE, { type: 'EAN13' });
                if (res.success) setValue('barcode', res.data);
              }}
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          <Input
            label="Ürün Adı (Zorunlu)"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Kategori"
            error={errors.category_id?.message}
            {...register('category_id', { setValueAs: (v) => (v ? Number(v) : null) })}
          >
            <option value="">Seçiniz...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input label="Marka" {...register('brand')} placeholder="Örn: Apple, Samsung" />
          <Input label="Model" {...register('model')} placeholder="Örn: iPhone 15 Pro" />
          <Input label="Varyant / Hafıza" {...register('variant')} placeholder="Örn: 256GB" />
          <Input label="Renk" {...register('color')} placeholder="Örn: Uzay Siyahı" />

          <CurrencyInput
            label="Alış Fiyatı (TL)"
            error={errors.purchase_price?.message}
            defaultValue={editingProduct ? kuruşToTL(editingProduct.purchase_price) : ''}
            onChange={(e) => setValue('purchase_price', tlToKuruş(e.target.value))}
          />

          <CurrencyInput
            label="Satış Fiyatı (TL)"
            error={errors.sale_price?.message}
            defaultValue={editingProduct ? kuruşToTL(editingProduct.sale_price) : ''}
            onChange={(e) => setValue('sale_price', tlToKuruş(e.target.value))}
          />

          <Input
            label="Mevcut Stok Adedi"
            type="number"
            error={errors.stock_quantity?.message}
            {...register('stock_quantity', { valueAsNumber: true })}
          />

          <Input
            label="Minimum Stok Eşiği"
            type="number"
            error={errors.minimum_stock?.message}
            {...register('minimum_stock', { valueAsNumber: true })}
          />

          <div className="sm:col-span-2">
            <Input label="Açıklama / Notlar" {...register('description')} />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Kaydet
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Product Detail Drawer */}
      <Dialog
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        title={`Ürün Detay Kartı: ${detailProduct?.name}`}
        maxWidth="max-w-lg"
      >
        {detailProduct && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 font-medium">Barkod:</span>
                <div className="font-mono font-bold text-slate-800">{detailProduct.barcode}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Kategori:</span>
                <div className="font-semibold text-slate-800">{detailProduct.category_name || '-'}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Alış Fiyatı:</span>
                <div className="font-semibold text-slate-800">{formatTL(detailProduct.purchase_price)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Satış Fiyatı:</span>
                <div className="font-bold text-emerald-600">{formatTL(detailProduct.sale_price)}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Birim Marj:</span>
                <div className="font-bold text-blue-600">
                  {formatTL(detailProduct.sale_price - detailProduct.purchase_price)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Stok Durumu:</span>
                <div className="font-semibold text-slate-800">{detailProduct.stock_quantity} Adet</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  addToPrintQueue(detailProduct, detailProduct.stock_quantity > 0 ? detailProduct.stock_quantity : 1);
                  setDetailProduct(null);
                  setActiveTab('barcode');
                }}
              >
                <Printer size={16} /> Barkod Sepetine Ekle ve Bas
              </Button>
              <Button variant="outline" onClick={() => setDetailProduct(null)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Product Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Ürün Silme Onayı"
        description="Bu ürünü silmek istediğinize emin misiniz?"
        confirmText="Evet, Sil"
        variant="danger"
      />
    </div>
  );
};
