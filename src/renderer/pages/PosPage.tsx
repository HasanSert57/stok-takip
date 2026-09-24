import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatTL, tlToKuruş } from '../utils/formatters';
import { Product, PaymentType, Sale } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { BarcodeInput, CurrencyInput } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
}

export const PosPage: React.FC = () => {
  const { showToast, refreshSignal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [saleDiscountTL, setSaleDiscountTL] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcut F1 focus POS input
  useKeyboardShortcuts({
    onFocusSearch: () => barcodeInputRef.current?.focus(),
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_SEARCH, { query: searchTerm });
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchTerm, refreshSignal]);

  const addProductToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      showToast(`${product.name} stoğu tükenmiş!`, 'danger');
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        if (item.quantity + 1 > product.stock_quantity) {
          showToast(`Mevcut stok (${product.stock_quantity}) aşılamaz!`, 'warning');
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = { ...item, quantity: item.quantity + 1 };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            unit_price: product.sale_price,
            discount_amount: 0,
          },
        ];
      }
    });

    setSearchTerm('');
    setSearchResults([]);
  };

  useBarcodeScanner({
    onScan: async (barcode) => {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.PRODUCT_GET_BY_BARCODE, { barcode });
      if (res.success && res.data) {
        addProductToCart(res.data);
        showToast(`${res.data.name} sepete eklendi`, 'success');
      } else {
        showToast(`Barkod (${barcode}) bulunamadı!`, 'danger');
      }
    },
  });

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock_quantity) {
              showToast(`Mevcut stok: ${item.product.stock_quantity}`, 'warning');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const subtotalKuruş = cart.reduce((sum, item) => sum + item.quantity * item.unit_price - item.discount_amount, 0);
  const totalDiscountKuruş = tlToKuruş(saleDiscountTL);
  const grandTotalKuruş = Math.max(0, subtotalKuruş - totalDiscountKuruş);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Sepette ürün yok!', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
        })),
        discount_amount: totalDiscountKuruş,
        payment_type: paymentType,
      };

      const res = await window.electronAPI.invoke(IPC_CHANNELS.SALE_CREATE, payload);
      if (res.success && res.data) {
        showToast('Satış başarıyla tamamlandı!', 'success');
        setCompletedSale(res.data);
        setCart([]);
        setSaleDiscountTL(0);
      } else {
        showToast(res.error?.message || 'Satış tamamlanamadı', 'danger');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-108px)]">
      {/* Left Workspace: Product Barcode Reader & Cart */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barcode Search Bar */}
        <div className="relative p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <BarcodeInput
              ref={barcodeInputRef}
              placeholder="Barkod Okutun veya Ürün Adı / Marka / Model arayın... (F1)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  addProductToCart(searchResults[0]);
                }
              }}
            />
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addProductToCart(p)}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      Barkod: <span className="font-mono">{p.barcode}</span> | Stok: {p.stock_quantity} Adet
                    </div>
                  </div>
                  <div className="font-bold text-emerald-600 text-sm">{formatTL(p.sale_price)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table Container */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-600" /> Sepetteki Ürünler ({cart.length})
            </h3>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-red-600 h-7 text-xs">
                Sepeti Temizle
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase">
                  <th className="p-3">Ürün</th>
                  <th className="p-3">Barkod</th>
                  <th className="p-3">Birim Fiyat</th>
                  <th className="p-3 text-center">Adet</th>
                  <th className="p-3">Toplam</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                      Sepetiniz boş. Barkod okutarak hızlıca ürün ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const lineTotal = item.quantity * item.unit_price - item.discount_amount;
                    return (
                      <tr key={item.product.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.product.name}</div>
                          <div className="text-[11px] text-slate-400">{item.product.brand} {item.product.model}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{item.product.barcode}</td>
                        <td className="p-3 font-medium">{formatTL(item.unit_price)}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>
                              <Minus size={12} />
                            </Button>
                            <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>
                              <Plus size={12} />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-600">{formatTL(lineTotal)}</td>
                        <td className="p-3">
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Checkout Summary & Payment Controls */}
      <div className="w-80 flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Ödeme & Satış Özeti</h3>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Ödeme Yöntemi</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentType === PaymentType.CASH ? 'primary' : 'outline'}
                onClick={() => setPaymentType(PaymentType.CASH)}
                size="sm"
              >
                <Banknote size={16} /> Nakit
              </Button>
              <Button
                type="button"
                variant={paymentType === PaymentType.CARD ? 'primary' : 'outline'}
                onClick={() => setPaymentType(PaymentType.CARD)}
                size="sm"
              >
                <CreditCard size={16} /> Kart
              </Button>
              <Button
                type="button"
                variant={paymentType === PaymentType.TRANSFER ? 'primary' : 'outline'}
                onClick={() => setPaymentType(PaymentType.TRANSFER)}
                size="sm"
              >
                <ArrowRightLeft size={16} /> Havale
              </Button>
              <Button
                type="button"
                variant={paymentType === PaymentType.OTHER ? 'primary' : 'outline'}
                onClick={() => setPaymentType(PaymentType.OTHER)}
                size="sm"
              >
                Diğer
              </Button>
            </div>
          </div>

          {/* Overall Discount Input */}
          <CurrencyInput
            label="Genel İndirim (TL)"
            value={saleDiscountTL || ''}
            onChange={(e) => setSaleDiscountTL(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />

          {/* Totals Breakdown */}
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Ara Toplam:</span>
              <span>{formatTL(subtotalKuruş)}</span>
            </div>
            {totalDiscountKuruş > 0 && (
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>İndirim:</span>
                <span>-{formatTL(totalDiscountKuruş)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-extrabold text-emerald-600 pt-2 border-t border-slate-100">
              <span>GENEL TOPLAM:</span>
              <span>{formatTL(grandTotalKuruş)}</span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="success"
            size="lg"
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
            className="w-full text-base font-bold shadow-lg shadow-emerald-600/20 mt-2"
          >
            {isProcessing ? 'İşleniyor...' : 'SATIŞI TAMAMLA (ENTER)'}
          </Button>
        </div>
      </div>

      {/* Sale Receipt Dialog */}
      <Dialog
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
        title="Satış Fişi / Alındı Belgesi"
        maxWidth="max-w-md"
      >
        {completedSale && (
          <div className="text-center space-y-4">
            <div className="text-emerald-600 flex justify-center">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Satış Başarıyla Kaydedildi</h3>
            <div className="text-xs text-slate-500">
              Fiş No: <span className="font-mono font-bold text-slate-800">{completedSale.sale_number}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-left text-xs space-y-2 border border-slate-200">
              {completedSale.items?.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.quantity}x {it.product_name}</span>
                  <span className="font-semibold">{formatTL(it.total_amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                <span>Toplam Tutar:</span>
                <span className="text-emerald-600">{formatTL(completedSale.total_amount)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setCompletedSale(null)}>
              Tamam
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
};
