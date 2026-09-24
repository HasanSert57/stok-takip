import { app, BrowserWindow } from 'electron';
import path from 'path';
import { runMigrations } from './database/migration';
import { closeDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/register-handlers';
import { AutoUpdateService } from './services/AutoUpdateService';

let mainWindow: BrowserWindow | null = null;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Main Process:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Main Process:', reason);
});

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Kodhanem Stok Takip Programı',
    icon: path.join(__dirname, '../../build/icon.png'),
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // Load static built index.html from disk
  const indexPath = path.join(__dirname, '../renderer/index.html');
  await mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    runMigrations();
  } catch (err) {
    console.error('Failed to run database migrations:', err);
  }

  registerIpcHandlers();
  AutoUpdateService.init();

  await createWindow();

  if (app.isPackaged) {
    setTimeout(() => {
      AutoUpdateService.checkForUpdates();
    }, 4000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
