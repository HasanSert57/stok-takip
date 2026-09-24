import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';

export interface UpdateStatusPayload {
  status: 'CHECKING' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR';
  version?: string;
  releaseNotes?: string;
  progress?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  error?: string;
}

export class AutoUpdateService {
  private static isInitialized = false;

  public static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Configure autoUpdater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Log update activity
    autoUpdater.on('checking-for-update', () => {
      this.broadcastStatus({ status: 'CHECKING' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.broadcastStatus({
        status: 'AVAILABLE',
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.broadcastStatus({ status: 'NOT_AVAILABLE' });
    });

    autoUpdater.on('error', (err: Error) => {
      console.warn('AutoUpdate Error:', err);
      const isMacCodeSignError = process.platform === 'darwin' && (err.message?.includes('Code signature') || err.message?.includes('validation'));
      
      this.broadcastStatus({
        status: 'ERROR',
        error: isMacCodeSignError
          ? 'macOS Güvenlik: Sertifikasız Mac sürümünde otomatik uygulama değişimi engellendi. İndirme sayfasına yönlendiriliyorsunuz.'
          : err.message || 'Güncelleme kontrolü sırasında hata oluştu.',
      });

      if (isMacCodeSignError) {
        const { shell } = require('electron');
        shell.openExternal('https://github.com/HasanSert57/stok-takip/releases/latest');
      }
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      this.broadcastStatus({
        status: 'DOWNLOADING',
        progress: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.broadcastStatus({
        status: 'DOWNLOADED',
        version: info.version,
      });
    });

    // Register IPC Handlers
    ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, data: result?.updateInfo };
      } catch (err: any) {
        return { success: false, error: err.message || 'Güncelleme kontrolü yapılamadı.' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Güncelleme indirilemedi.' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    });
  }

  public static async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (e) {
      console.warn('Silent auto update check failed:', e);
    }
  }

  private static broadcastStatus(payload: UpdateStatusPayload): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.UPDATE_STATUS, payload);
      }
    }
  }
}
