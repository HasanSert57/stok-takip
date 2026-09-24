import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import fs from 'fs';
import path from 'path';
import https from 'https';
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
  dmgPath?: string;
}

export class AutoUpdateService {
  private static isInitialized = false;
  private static latestVersion: string | null = null;
  private static downloadedDmgPath: string | null = null;

  public static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.broadcastStatus({ status: 'CHECKING' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.latestVersion = info.version;
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
      this.broadcastStatus({
        status: 'ERROR',
        error: err.message || 'Güncelleme kontrolü sırasında hata oluştu.',
      });
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
        if (process.platform === 'darwin') {
          // Direct DMG Stream Download for macOS to bypass Squirrel.mac certificate requirement
          await this.downloadMacDmgDirectly();
        } else {
          await autoUpdater.downloadUpdate();
        }
        return { success: true };
      } catch (err: any) {
        this.broadcastStatus({
          status: 'ERROR',
          error: err.message || 'Güncelleme indirilemedi.',
        });
        return { success: false, error: err.message || 'Güncelleme indirilemedi.' };
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, () => {
      if (process.platform === 'darwin' && this.downloadedDmgPath) {
        if (fs.existsSync(this.downloadedDmgPath)) {
          shell.openPath(this.downloadedDmgPath);
        } else {
          shell.openExternal('https://github.com/HasanSert57/stok-takip/releases/latest');
        }
      } else {
        autoUpdater.quitAndInstall(false, true);
      }
      return { success: true };
    });
  }

  /**
   * Directly downloads the .dmg installer for macOS with progress reporting, bypassing Squirrel.mac code signing restrictions
   */
  private static async downloadMacDmgDirectly(): Promise<void> {
    const archStr = process.arch === 'arm64' ? 'arm64' : 'x64';
    const version = this.latestVersion || '1.0.1';
    const filename = `Kodhanem-Stok-Takip-${version}-mac-${archStr}.dmg`;
    const downloadUrl = `https://github.com/HasanSert57/stok-takip/releases/download/v${version}/${filename}`;

    const downloadsDir = app.getPath('downloads');
    const targetPath = path.join(downloadsDir, filename);
    this.downloadedDmgPath = targetPath;

    this.broadcastStatus({ status: 'DOWNLOADING', progress: 5 });

    return new Promise((resolve, reject) => {
      const fetchFile = (url: string) => {
        https.get(url, { headers: { 'User-Agent': 'Electron-App' } }, (res) => {
          // Handle 301 / 302 redirects (GitHub Release downloads redirect to AWS S3)
          if (res.statusCode === 301 || res.statusCode === 302) {
            if (res.headers.location) {
              fetchFile(res.headers.location);
              return;
            }
          }

          if (res.statusCode !== 200) {
            reject(new Error(`İndirme sunucusu yanıt vermedi (HTTP ${res.statusCode})`));
            return;
          }

          const totalSize = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedSize = 0;
          const fileStream = fs.createWriteStream(targetPath);

          res.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const percent = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 50;
            this.broadcastStatus({
              status: 'DOWNLOADING',
              progress: percent,
              transferred: downloadedSize,
              total: totalSize,
            });
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            this.broadcastStatus({
              status: 'DOWNLOADED',
              version,
              dmgPath: targetPath,
            });
            resolve();
          });

          fileStream.on('error', (err) => {
            fs.unlink(targetPath, () => {});
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });
      };

      fetchFile(downloadUrl);
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
