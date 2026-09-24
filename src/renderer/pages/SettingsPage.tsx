import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BackupHistory } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { formatDate } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Database, HardDriveDownload, ShieldCheck, Settings as SettingsIcon, AlertOctagon } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useApp();
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [autoBackup, setAutoBackup] = useState<string>('OFF');
  const [storeName, setStoreName] = useState<string>('Kodhanem Stok Takip Market');
  const [defaultMargin, setDefaultMargin] = useState<number>(30);

  // Restore Modal State
  const [restoreFilePath, setRestoreFilePath] = useState<string | null>(null);
  const [confirmCheckbox, setConfirmCheckbox] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const fetchSettingsAndBackups = async () => {
    const bRes = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_LIST);
    if (bRes.success && bRes.data) setBackups(bRes.data);

    const sRes = await window.electronAPI.invoke(IPC_CHANNELS.SETTINGS_GET);
    if (sRes.success && sRes.data) {
      if (sRes.data.auto_backup_frequency) setAutoBackup(sRes.data.auto_backup_frequency);
      if (sRes.data.store_name) setStoreName(sRes.data.store_name);
      if (sRes.data.default_margin) setDefaultMargin(Number(sRes.data.default_margin));
    }
  };

  useEffect(() => {
    fetchSettingsAndBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_CREATE, { backupType: 'MANUAL' });
      if (res.success && res.data) {
        showToast(`Yedek başarıyla oluşturuldu: ${res.data.file_name}`, 'success');
        fetchSettingsAndBackups();
      } else {
        showToast(res.error?.message || 'Yedek oluşturulamadı', 'danger');
      }
    } catch {
      showToast('Yedekleme sırasında hata oluştu', 'danger');
    }
  };

  const handleSelectRestoreFile = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_SELECT_FILE);
    if (res.success && res.data && typeof res.data === 'string') {
      setRestoreFilePath(res.data);
      setConfirmCheckbox(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreFilePath || !confirmCheckbox) return;

    setIsRestoring(true);
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.BACKUP_RESTORE, { filePath: restoreFilePath });
      if (res.success) {
        showToast('Yedek başarıyla geri yüklendi! Uygulama yeniden başlatılıyor...', 'success');
        setRestoreFilePath(null);
      } else {
        showToast(res.error?.message || 'Geri yükleme başarısız', 'danger');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveSettings = async () => {
    const res = await window.electronAPI.invoke(IPC_CHANNELS.SETTINGS_UPDATE, {
      auto_backup_frequency: autoBackup,
      store_name: storeName,
      default_margin: defaultMargin,
    });

    if (res.success) {
      showToast('Sistem ayarları başarıyla kaydedildi', 'success');
    } else {
      showToast('Ayarlar kaydedilemedi', 'danger');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Prominent Backup Workspace Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Database size={20} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Veritabanı Yedekleme & Geri Yükleme</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          SQLite veritabanınızın anlık sıcak yedeğini alabilir veya bilgisayarınızdaki bir yedek dosyasından verilerinizi geri yükleyebilirsiniz.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCreateBackup} size="lg" className="shadow-lg shadow-blue-600/20">
            <ShieldCheck size={18} /> ŞİMDİ YEDEK AL
          </Button>

          <Button onClick={handleSelectRestoreFile} variant="warning" size="lg" className="shadow-lg shadow-amber-600/20">
            <HardDriveDownload size={18} /> YEDEKTEN GERİ YÜKLE...
          </Button>
        </div>
      </Card>

      {/* Auto Backup & Store Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <SettingsIcon size={20} className="text-cyan-600" />
          <h3 className="text-sm font-bold text-slate-800">Firma & Otomatik Yedekleme Ayarları</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="İşletme / Mağaza Adı"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />

          <Input
            label="Varsayılan Kâr Marjı (%)"
            type="number"
            value={defaultMargin}
            onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
          />

          <Select
            label="Otomatik Yedekleme Sıklığı"
            value={autoBackup}
            onChange={(e) => setAutoBackup(e.target.value)}
          >
            <option value="OFF">Devre Dışı (Kapalı)</option>
            <option value="DAILY">Her Gün Otomatik</option>
            <option value="WEEKLY">Her Hafta Otomatik</option>
          </Select>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="success" onClick={handleSaveSettings}>
            Ayarları Kaydet
          </Button>
        </div>
      </Card>

      {/* Backup History Table */}
      <Card className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Yedekleme Geçmişi Logu</h4>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-3">Tarih</th>
                <th className="p-3">Dosya Adı</th>
                <th className="p-3">Yedek Tipi</th>
                <th className="p-3">Dosya Yolu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                    Henüz oluşturulmuş bir yedek kaydı yok.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500">{formatDate(b.created_at)}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{b.file_name}</td>
                    <td className="p-3">
                      <Badge variant={b.backup_type === 'PRE_RESTORE' ? 'warning' : 'info'}>
                        {b.backup_type === 'MANUAL' ? 'Manuel' : b.backup_type === 'AUTO' ? 'Otomatik' : 'Geri Yükleme Öncesi'}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{b.file_path}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Restore Confirmation Dialog with Checkbox */}
      <Dialog
        isOpen={!!restoreFilePath}
        onClose={() => setRestoreFilePath(null)}
        title="Yedekten Geri Yükleme Onayı"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <AlertOctagon size={24} className="shrink-0 text-amber-600" />
            <p className="leading-relaxed">
              Mevcut verileriniz geri yüklenecek yedekle değiştirilecektir. Mevcut verileriniz önce otomatik olarak güvenli bir yedeğe alınacaktır.
            </p>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] truncate">
            {restoreFilePath}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={confirmCheckbox}
              onChange={(e) => setConfirmCheckbox(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="font-semibold text-slate-800">Verilerimin değiştirileceğini onaylıyorum</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setRestoreFilePath(null)} disabled={isRestoring}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              disabled={!confirmCheckbox || isRestoring}
              onClick={handleExecuteRestore}
            >
              {isRestoring ? 'Geri Yükleniyor...' : 'Geri Yüklemeyi Başlat'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
