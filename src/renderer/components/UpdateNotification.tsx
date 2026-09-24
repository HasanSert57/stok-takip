import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Sparkles, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';

interface UpdatePayload {
  status: 'CHECKING' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR';
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
}

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdatePayload>({ status: 'NOT_AVAILABLE' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const unsubscribe = window.electronAPI.on(IPC_CHANNELS.UPDATE_STATUS, (_, payload: UpdatePayload) => {
      console.log('Update Status Received:', payload);
      setUpdateState(payload);
      if (payload.status === 'AVAILABLE' || payload.status === 'DOWNLOADED') {
        setDismissed(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartDownload = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD);
    } catch (err) {
      console.error('Failed to start update download:', err);
    }
  };

  const handleInstall = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.UPDATE_INSTALL);
    } catch (err) {
      console.error('Failed to trigger update install:', err);
    }
  };

  if (dismissed || updateState.status === 'NOT_AVAILABLE' || updateState.status === 'CHECKING') {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9990] max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 p-4 text-slate-100 backdrop-blur-xl">
        
        {/* State 1: UPDATE AVAILABLE */}
        {updateState.status === 'AVAILABLE' && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Yeni Sürüm Mevcut!</h4>
                  <p className="text-xs text-indigo-200/80 font-mono">
                    Sürüm {updateState.version || 'Yeni Versiyon'} yayında.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Programın daha kararlı ve performanslı çalışması için yeni güncellemeyi indirebilirsiniz.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Sonra Hatırlat
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/50 transition-all active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                Şimdi İndir
              </button>
            </div>
          </div>
        )}

        {/* State 2: DOWNLOADING */}
        {updateState.status === 'DOWNLOADING' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                Güncelleme İndiriliyor...
              </span>
              <span className="font-mono font-bold text-indigo-400">
                %{updateState.progress || 0}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${updateState.progress || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-right">
              Arka planda indiriliyor, çalışmaya devam edebilirsiniz.
            </p>
          </div>
        )}

        {/* State 3: DOWNLOADED & READY */}
        {updateState.status === 'DOWNLOADED' && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Güncelleme Hazır!</h4>
                  <p className="text-xs text-emerald-300 font-mono">
                    Sürüm {updateState.version} başarıyla indirildi.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Uygulamayı yeniden başlatarak güncellemeyi anında uygulayabilirsiniz.
            </p>

            <button
              type="button"
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Yeniden Başlat ve Güncelle
            </button>
          </div>
        )}

        {/* State 4: ERROR */}
        {updateState.status === 'ERROR' && (
          <div className="flex items-start gap-3 text-xs">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-rose-200 block">Güncelleme Hatası</span>
              <p className="text-rose-300/80 text-[11px] mt-0.5">{updateState.error}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
