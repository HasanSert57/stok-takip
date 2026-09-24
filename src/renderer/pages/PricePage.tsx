import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Category, PricePreviewItem, PriceHistory } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatTL, tlToKuruş, formatDate } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { Input, CurrencyInput } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Percent, PlusCircle, TrendingUp, Eye, CheckCircle2, History } from 'lucide-react';

export const PricePage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [mode, setMode] = useState<'PERCENTAGE' | 'FIXED' | 'MARGIN' | 'HISTORY'>('PERCENTAGE');

  // Input states
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [percentage, setPercentage] = useState<number>(10);
  const [amountTL, setAmountTL] = useState<number>(50);
  const [marginPercentage, setMarginPercentage] = useState<number>(30);
  const [description, setDescription] = useState<string>('');

  // Preview state
  const [previewItems, setPreviewItems] = useState<PricePreviewItem[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const fetchCategoriesAndHistory = async () => {
    const catRes = await window.electronAPI.invoke(IPC_CHANNELS.CATEGORY_LIST);
    if (catRes.success && catRes.data) setCategories(catRes.data);

    const histRes = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_HISTORY);
    if (histRes.success && histRes.data) setHistory(histRes.data);
  };

  useEffect(() => {
    fetchCategoriesAndHistory();
  }, [refreshSignal]);

  const handlePreview = async () => {
    let res: any;

    if (mode === 'PERCENTAGE') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_PREVIEW_PERCENTAGE, {
        category_id: selectedCategoryId,
        percentage: Number(percentage),
        description,
      });
    } else if (mode === 'FIXED') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_PREVIEW_AMOUNT, {
        category_id: selectedCategoryId,
        amount: tlToKuruş(amountTL),
        description,
      });
    } else if (mode === 'MARGIN') {
      res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_PREVIEW_MARGIN, {
        category_id: selectedCategoryId,
        margin_percentage: Number(marginPercentage),
        description,
      });
    }

    if (res && res.success && res.data) {
      setPreviewItems(res.data);
      showToast(`${res.data.length} ürün için fiyat önizlemesi hazırlandı.`, 'info');
    } else {
      showToast(res?.error?.message || 'Önizleme oluşturulamadı', 'danger');
    }
  };

  const handleApply = async () => {
    if (!previewItems || previewItems.length === 0) return;

    setIsApplying(true);
    let res: any;

    try {
      if (mode === 'PERCENTAGE') {
        res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_APPLY_PERCENTAGE, {
          category_id: selectedCategoryId,
          percentage: Number(percentage),
          description,
        });
      } else if (mode === 'FIXED') {
        res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_APPLY_AMOUNT, {
          category_id: selectedCategoryId,
          amount: tlToKuruş(amountTL),
          description,
        });
      } else if (mode === 'MARGIN') {
        res = await window.electronAPI.invoke(IPC_CHANNELS.PRICE_APPLY_MARGIN, {
          category_id: selectedCategoryId,
          margin_percentage: Number(marginPercentage),
          description,
        });
      }

      if (res && res.success) {
        showToast(`${res.data} adet ürünün satış fiyatı başarıyla güncellendi!`, 'success');
        setPreviewItems(null);
        fetchCategoriesAndHistory();
      } else {
        showToast(res?.error?.message || 'Fiyatlar uygulanamadı', 'danger');
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 w-fit">
        <Button
          variant={mode === 'PERCENTAGE' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => { setMode('PERCENTAGE'); setPreviewItems(null); }}
        >
          <Percent size={14} /> Yüzde (%) Güncelleme
        </Button>
        <Button
          variant={mode === 'FIXED' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => { setMode('FIXED'); setPreviewItems(null); }}
        >
          <PlusCircle size={14} /> Sabit Tutar (+/- TL)
        </Button>
        <Button
          variant={mode === 'MARGIN' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => { setMode('MARGIN'); setPreviewItems(null); }}
        >
          <TrendingUp size={14} /> Maliyet + Kâr Marjı
        </Button>
        <Button
          variant={mode === 'HISTORY' ? 'warning' : 'ghost'}
          size="sm"
          onClick={() => setMode('HISTORY')}
        >
          <History size={14} /> Fiyat Geçmişi
        </Button>
      </div>

      {mode !== 'HISTORY' ? (
        <div className="space-y-4">
          {/* Controls Card */}
          <Card className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <Select
              label="Hedef Kategori"
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">(Tüm Ürünler)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {mode === 'PERCENTAGE' && (
              <Input
                label="Yüzde Değişim Oranı (%)"
                type="number"
                step="0.1"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                placeholder="Örn: 10 (+%10) veya -5 (-%5)"
              />
            )}

            {mode === 'FIXED' && (
              <CurrencyInput
                label="Eklenecek / Çıkarılacak Tutar (TL)"
                value={amountTL}
                onChange={(e) => setAmountTL(parseFloat(e.target.value) || 0)}
                placeholder="Örn: 50 veya -20"
              />
            )}

            {mode === 'MARGIN' && (
              <Input
                label="Hedef Kâr Marjı (%)"
                type="number"
                step="0.1"
                min="0"
                value={marginPercentage}
                onChange={(e) => setMarginPercentage(parseFloat(e.target.value) || 0)}
                placeholder="Örn: 30 (%30 marj)"
              />
            )}

            <Input
              label="Değişiklik Notu"
              placeholder="Örn: Yaz Sezonu Zamları"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Button onClick={handlePreview} className="h-9">
              <Eye size={16} /> Önizleme Oluştur
            </Button>
          </Card>

          {/* Preview Table Container */}
          {previewItems && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-blue-600">
                  Fiyat Değişiklik Önizlemesi ({previewItems.length} Ürün Etkilenecek)
                </h3>
                <Button
                  variant="success"
                  disabled={isApplying}
                  onClick={handleApply}
                >
                  <CheckCircle2 size={16} /> Değişiklikleri Onayla ve Uygula (Transaction)
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-3">Barkod</th>
                      <th className="p-3">Ürün Adı</th>
                      <th className="p-3">Alış Fiyatı</th>
                      <th className="p-3">Mevcut Satış Fiyatı</th>
                      <th className="p-3">Yeni Satış Fiyatı</th>
                      <th className="p-3">Fark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewItems.map((item) => {
                      const isUp = item.difference > 0;
                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-600">{item.barcode}</td>
                          <td className="p-3 font-bold text-slate-800">{item.product_name}</td>
                          <td className="p-3">{formatTL(item.purchase_price)}</td>
                          <td className="p-3">{formatTL(item.current_price)}</td>
                          <td className="p-3 font-bold text-blue-600">{formatTL(item.new_price)}</td>
                          <td className={`p-3 font-bold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isUp ? `+${formatTL(item.difference)}` : formatTL(item.difference)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* History View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-3">Tarih</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">Eski Fiyat</th>
                <th className="p-3">Yeni Fiyat</th>
                <th className="p-3">Değişim Tipi</th>
                <th className="p-3">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Fiyat değişim geçmişi bulunamadı.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500">{formatDate(h.created_at)}</td>
                    <td className="p-3 font-bold text-slate-800">{h.product_name || '-'}</td>
                    <td className="p-3">{formatTL(h.old_price)}</td>
                    <td className="p-3 font-bold text-emerald-600">{formatTL(h.new_price)}</td>
                    <td className="p-3">
                      <Badge variant="info">{h.change_type}</Badge>
                    </td>
                    <td className="p-3 text-slate-500">{h.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
