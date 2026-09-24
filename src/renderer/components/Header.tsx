import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Barcode, Settings, RefreshCw, Clock } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Button } from './ui/Button';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, triggerRefresh } = useApp();
  const [time, setTime] = useState<string>(new Date().toISOString());
  const [globalQuery, setGlobalQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toISOString()), 10000);
    return () => clearInterval(timer);
  }, []);

  const titles: Record<string, string> = {
    dashboard: 'İşletme Özet Ekranı & Genel Durum',
    products: 'Ürün Kataloğu & Envanter Yönetimi',
    categories: 'Kategori Hiyerarşi Ağacı',
    stock: 'Stok Durumu & Sayım Ayarlamaları',
    pos: 'Hızlı Satış Terminali (POS)',
    purchases: 'Mal Alış Fatura ve Stok Girişi',
    price: 'Toplu Fiyat Güncelleme Portalı',
    barcode: 'Barkod & Etiket Tasarlama Basım',
    'stock-movements': 'Tüm Stok Hareket Logları',
    reports: 'İşletme Raporları ve CSV Aktarımı',
    backup: 'Veritabanı Yedekleme & Geri Yükleme',
    settings: 'Sistem Konfigürasyonu & Ayarlar',
  };

  const handleGlobalSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalQuery.trim()) {
      setActiveTab('products');
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-slate-900">
          {titles[activeTab] || 'Kodhanem Stok Takip Programı'}
        </h1>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-4">
        {/* Global Search Input (F2) */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Global Arama / Barkod Okut (F2)..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={handleGlobalSearchKeyDown}
            className="flex h-9 w-full rounded-md border border-slate-300 bg-slate-50/80 pl-9 pr-8 py-1 text-xs shadow-sm transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <kbd className="absolute right-2 top-2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
            F2
          </kbd>
        </div>

        {/* Scanner Ready Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-medium">
          <Barcode size={14} />
          <span>Barkod Okuyucu Hazır (HID)</span>
        </div>

        {/* Date Time */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock size={14} className="text-slate-400" />
          <span>{formatDate(time)}</span>
        </div>

        {/* Refresh & Settings Shortcuts */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <Button
            variant="outline"
            size="icon"
            onClick={triggerRefresh}
            title="Verileri Yenile"
            className="h-8 w-8"
          >
            <RefreshCw size={14} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setActiveTab('settings')}
            title="Ayarlar"
            className="h-8 w-8"
          >
            <Settings size={14} />
          </Button>
        </div>
      </div>
    </header>
  );
};
