import React, { useState } from 'react';
import { Lock, ShieldCheck, Copy, Check, KeyRound, AlertCircle, Sparkles, Server } from 'lucide-react';
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels';

interface LicenseModalProps {
  machineId: string;
  errorMessage?: string;
  onActivated: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  machineId,
  errorMessage: initialError,
  onActivated,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState<string | null>(null);

  // Admin Key Generator Modal state
  const [showAdminTab, setShowAdminTab] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminTargetId, setAdminTargetId] = useState(machineId);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Lütfen lisans anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.LICENSE_ACTIVATE, {
        licenseKey: licenseKey.trim(),
      });

      if (res.success && res.data.isLicensed) {
        setSuccess('Lisansınız başarıyla etkinleştirildi! Uygulama açılıyor...');
        setTimeout(() => {
          onActivated();
        }, 1200);
      } else {
        setError(res.error?.message || 'Girdiğiniz lisans anahtarı geçersiz!');
      }
    } catch (err: any) {
      setError(err?.message || 'Etkinleştirme sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setGeneratedKeyResult(null);

    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.LICENSE_GENERATE_KEY, {
        targetMachineId: adminTargetId.trim(),
        adminPin: adminPin.trim(),
      });

      if (res.success && res.data) {
        setGeneratedKeyResult(res.data);
      } else {
        setAdminError(res.error?.message || 'Lisans anahtarı üretilemedi.');
      }
    } catch (err: any) {
      setAdminError(err?.message || 'Hatalı PIN veya işlem hatası.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 select-none">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-indigo-950/40 text-slate-100 transition-all">
        
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-center border-b border-indigo-500/20">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-400/30 backdrop-blur-md shadow-lg shadow-indigo-600/30 text-indigo-300">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Cihaz Lisanslama & Aktivasyon
          </h2>
          <p className="mt-1 text-xs text-indigo-200/80 font-medium">
            Kodhanem Stok Takip Programı — Güvenli Masaüstü Yönetimi
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-5">
          {!showAdminTab ? (
            <>
              {/* Hardware ID Display Box */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Bu Bilgisayarın Cihaz Kimliği (Hardware ID)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-sm font-bold bg-slate-950/80 border border-slate-800 text-indigo-300 px-4 py-3 rounded-xl tracking-wider select-all">
                    {machineId}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMachineId}
                    className={`flex items-center gap-1.5 px-4 py-3 rounded-xl font-medium text-xs transition-all shadow-md ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-emerald-950/50'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50 active:scale-95'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopyala
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  📌 Bu programı bu bilgisayarda çalıştırmak için yukarıdaki kodu program sahibine ileterek lisans anahtarınızı isteyin.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-rose-200">Aktivasyon Başarısız</span>
                    {error}
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {success && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{success}</span>
                </div>
              )}

              {/* License Key Form */}
              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Lisans Anahtarı (Activation Key)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      placeholder="LIC-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-3 font-mono text-sm font-bold tracking-wider text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !licenseKey.trim()}
                  className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Cihazı Etkinleştir
                    </>
                  )}
                </button>
              </form>

              {/* Admin Panel Toggle */}
              <div className="pt-2 text-center border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAdminTab(true)}
                  className="text-[11px] text-slate-500 hover:text-indigo-400 transition-colors font-medium inline-flex items-center gap-1"
                >
                  <Server className="h-3 w-3" />
                  Program Sahibi / Yönetici Girişi
                </button>
              </div>
            </>
          ) : (
            /* Admin Key Generator Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-indigo-400" />
                  Yönetici Lisans Üretici Paneli
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminTab(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Geri Dön
                </button>
              </div>

              {adminError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  {adminError}
                </div>
              )}

              <form onSubmit={handleAdminGenerateKey} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Hedef Cihaz Kimliği
                  </label>
                  <input
                    type="text"
                    value={adminTargetId}
                    onChange={(e) => setAdminTargetId(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Yönetici PIN Kodu
                  </label>
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="PIN giriniz"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Lisans Anahtarı Üret
                </button>
              </form>

              {generatedKeyResult && (
                <div className="p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl space-y-2">
                  <span className="block text-[11px] font-semibold text-indigo-300">
                    Üretilen Lisans Anahtarı:
                  </span>
                  <div className="font-mono text-sm font-extrabold text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800 select-all">
                    {generatedKeyResult}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseKey(generatedKeyResult);
                      setShowAdminTab(false);
                    }}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded"
                  >
                    Bu Anahtarı Otomatik Formda Kullan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
          Bu cihazın donanım kimliği tescillidir. İzinsiz çoğaltılamaz ve kopyalanamaz.
        </div>
      </div>
    </div>
  );
};
