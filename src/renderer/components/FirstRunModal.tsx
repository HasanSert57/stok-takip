import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Smartphone, Sparkles, HardDriveDownload, CheckCircle2, AlertOctagon } from 'lucide-react';

interface FirstRunModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const FirstRunModal: React.FC<FirstRunModalProps> = ({ isOpen, onComplete }) => {
  const { showToast, triggerRefresh } = useApp();
  const [step, setStep] = useState<'CHOICE' | 'NEW_SYSTEM' | 'CONFIRM_RESTORE'>('CHOICE');
  const [restoreFilePath, setRestoreFilePath] = useState<string | null>(null);

  // New system setup fields
  const [storeName, setStoreName] = useState('Kodhanem Stok Takip Market');
  const [currencySymbol, setCurrencySymbol] = useState('₺');
  const [defaultMargin, setDefaultMargin] = useState(30);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartNewSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.SETTINGS_UPDATE, {
        first_run_completed: 'true',
        store_name: storeName,
        currency_symbol: currencySymbol,
        default_margin: defaultMargin,
      });

      if (res.success) {
        showToast('Kodhanem Stok Kurulumu Tamamlandı!', 'success');
        onComplete();
      } else {
        showToast('Kurulum ayarları kaydedilemedi', 'danger');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectBackupFile = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_SELECT_FILE);
    if (res.success && res.data && typeof res.data === 'string') {
      setRestoreFilePath(res.data);
      setStep('CONFIRM_RESTORE');
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreFilePath) return;

    setIsProcessing(true);
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_RESTORE, { filePath: restoreFilePath });
      if (res.success) {
        await window.electronAPI.invoke(IPC_CHANNELS.SETTINGS_UPDATE, {
          first_run_completed: 'true',
        });
        showToast('Yedek başarıyla geri yüklendi! Sistem güncelleniyor...', 'success');
        triggerRefresh();
        onComplete();
      } else {
        showToast(res.error?.message || 'Geri yükleme başarısız oldu', 'danger');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={() => {}} title="Kodhanem Stok Takip Programına Hoş Geldiniz" maxWidth="max-w-lg">
      {step === 'CHOICE' && (
        <div className="text-center space-y-6 py-2">
          <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Smartphone size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-slate-900">Kurulum Tercihinizi Seçin</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Lütfen yeni bir mağaza veritabanı mı oluşturmak, yoksa var olan bir yedekten mi devam etmek istediğinizi belirtin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setStep('NEW_SYSTEM')}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/50 flex flex-col items-center gap-3 text-center transition-all group shadow-sm"
            >
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">Yeni Sistem Başlat</div>
                <div className="text-[11px] text-slate-500 mt-1">Sıfırdan mağaza bilgilerinizi ve ayarlarınızı yapılandırın.</div>
              </div>
            </button>

            <button
              onClick={handleSelectBackupFile}
              disabled={isProcessing}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/50 flex flex-col items-center gap-3 text-center transition-all group shadow-sm"
            >
              <div className="p-3 rounded-full bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
                <HardDriveDownload size={24} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">Yedekten Devam Et</div>
                <div className="text-[11px] text-slate-500 mt-1">Eski bilgisayarınızdaki SQLite yedeğini seçip geri yükleyin.</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 'NEW_SYSTEM' && (
        <form onSubmit={handleStartNewSystem} className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-blue-600" />
            <span>Mağaza temel bilgilerinizi giriniz. Bu ayarları daha sonra değiştirebilirsiniz.</span>
          </div>

          <Input
            label="İşletme / Firma Adı"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Para Birimi"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
            >
              <option value="₺">₺ (Türk Lirası - TL)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
            </Select>

            <Input
              label="Varsayılan Kâr Marjı (%)"
              type="number"
              value={defaultMargin}
              onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setStep('CHOICE')}>
              Geri
            </Button>
            <Button type="submit" variant="success" disabled={isProcessing}>
              {isProcessing ? 'Kuruluyor...' : 'Sistemi Başlat ve Giriş Yap'}
            </Button>
          </div>
        </form>
      )}

      {step === 'CONFIRM_RESTORE' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertOctagon size={24} className="shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              Seçilen veritabanı yedeği yüklenecek ve mağaza verileriniz güncellenecektir. Onaylıyor musunuz?
            </p>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] truncate">
            {restoreFilePath}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRestoreFilePath(null);
                setStep('CHOICE');
              }}
              disabled={isProcessing}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="warning"
              onClick={handleExecuteRestore}
              disabled={isProcessing}
            >
              {isProcessing ? 'Geri Yükleniyor...' : 'Geri Yüklemeyi Başlat'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
