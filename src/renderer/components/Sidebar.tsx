import React, { useState, useEffect } from 'react';
import { useApp, TabType } from '../context/AppContext';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Truck,
  DollarSign,
  Barcode,
  History,
  FileBarChart,
  Database,
  Settings,
  Smartphone,
  BookOpen,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  id: TabType;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    if (window.electronAPI?.invoke) {
      window.electronAPI.invoke(IPC_CHANNELS.APP_GET_VERSION).then((res) => {
        if (res && res.success && res.data) {
          setAppVersion(res.data);
        }
      }).catch(() => {});
    }
  }, []);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Özet Ekranı', icon: <LayoutDashboard size={18} /> },
    { id: 'products', label: 'Ürün Kataloğu', icon: <Package size={18} /> },
    { id: 'categories', label: 'Kategoriler', icon: <FolderTree size={18} /> },
    { id: 'stock', label: 'Stok Durumu', icon: <Boxes size={18} /> },
    { id: 'pos', label: 'Hızlı Satış (POS)', badge: 'F1', icon: <ShoppingCart size={18} /> },
    { id: 'purchases', label: 'Alış / Stok Girişi', badge: 'F4', icon: <Truck size={18} /> },
    { id: 'price', label: 'Fiyat Yönetimi', icon: <DollarSign size={18} /> },
    { id: 'barcode', label: 'Barkod Etiket', icon: <Barcode size={18} /> },
    { id: 'stock-movements', label: 'Stok Hareketleri', icon: <History size={18} /> },
    { id: 'reports', label: 'Raporlar', icon: <FileBarChart size={18} /> },
    { id: 'backup', label: 'Yedekleme', icon: <Database size={18} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={18} /> },
    { id: 'help', label: 'Kullanım Kılavuzu', icon: <BookOpen size={18} /> },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 shadow-sm">
      {/* App Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black text-xs tracking-tighter">
          KS
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            Kodhanem Stok
          </h2>
          <span className="text-[11px] font-semibold text-indigo-600">
            v{appVersion} Ticari Sürüm
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200/60'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn('transition-colors', isActive ? 'text-blue-600' : 'text-slate-400')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer System Info */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50/50">
        <span>SQLite Veritabanı</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
          ● Sistem Hazır
        </span>
      </div>
    </aside>
  );
};
