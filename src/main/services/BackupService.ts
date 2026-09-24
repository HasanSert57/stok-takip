import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getSqliteInstance, getDatabasePath, closeDatabase, reconnectDatabase, getDb } from '../database/connection';
import { backupHistory } from '../database/schema';
import { BackupHistory } from '../../shared/types';
import { desc } from 'drizzle-orm';

export class BackupService {
  /**
   * Returns backup directory located directly under User Home directory: ~/stok-takip/backups
   */
  static getBackupDir(): string {
    let baseHomeDir = process.cwd();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('electron');
      if (app && app.getPath) {
        baseHomeDir = app.getPath('home');
      }
    } catch {
      baseHomeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    }

    const backupDir = path.join(baseHomeDir, 'stok-takip', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  static async createBackup(
    backupType: 'MANUAL' | 'AUTO' | 'PRE_RESTORE' = 'MANUAL',
    targetDir?: string
  ): Promise<BackupHistory> {
    const sqlite = getSqliteInstance();
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, '-')
      .replace(/:/g, '-')
      .split('.')[0]; // YYYY-MM-DD-HH-mm-ss

    const fileName = `Kodhanem-Backup-${timestamp}.sqlite`;
    const destinationDir = targetDir || this.getBackupDir();

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    const filePath = path.join(destinationDir, fileName);

    // Online hot backup using SQLite online backup API
    await sqlite.backup(filePath);

    // Record in backup history DB
    const db = getDb();
    const nowIso = now.toISOString();

    const result = await db.insert(backupHistory).values({
      file_name: fileName,
      file_path: filePath,
      backup_type: backupType,
      created_at: nowIso,
    }).returning({ id: backupHistory.id });

    return {
      id: result[0].id,
      file_name: fileName,
      file_path: filePath,
      backup_type: backupType,
      created_at: nowIso,
    };
  }

  static async restoreBackup(backupFilePath: string): Promise<boolean> {
    if (!fs.existsSync(backupFilePath)) {
      throw { code: 'INVALID_BACKUP', message: 'Yedek dosyası bulunamadı.' };
    }

    // 1. Validate SQLite database file structure
    this.validateBackupFile(backupFilePath);

    // 2. Create automated safety backup before restore
    let safetyBackup: BackupHistory | null = null;
    try {
      safetyBackup = await this.createBackup('PRE_RESTORE');
    } catch (e) {
      console.warn('Could not create pre-restore safety backup:', e);
    }

    const activeDbPath = getDatabasePath();

    try {
      // 3. Close database connection safely
      closeDatabase();

      // 4. Copy backup file over active database file
      fs.copyFileSync(backupFilePath, activeDbPath);

      // Remove active WAL and SHM files safely if present
      const walPath = `${activeDbPath}-wal`;
      const shmPath = `${activeDbPath}-shm`;
      try {
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      } catch (e) {
        console.warn('Could not remove WAL file:', e);
      }
      try {
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      } catch (e) {
        console.warn('Could not remove SHM file:', e);
      }

      // 5. Reconnect database
      reconnectDatabase();

      // 6. Test query to ensure DB is healthy
      const restoredSqlite = getSqliteInstance();
      const check = restoredSqlite.prepare('SELECT count(*) as count FROM products').get();
      if (!check) {
        throw new Error('Geri yüklenen veritabanı okunamadı.');
      }

      // 7. Re-sync persistent license to DB
      try {
        const { LicenseService } = require('./LicenseService');
        await LicenseService.syncLicenseToDb();
      } catch (licErr) {
        console.warn('Could not sync license after restore:', licErr);
      }

      return true;
    } catch (err: any) {
      console.error('Restore failed, attempting rollback...', err);

      // Attempt rollback to safety backup if available
      if (safetyBackup && fs.existsSync(safetyBackup.file_path)) {
        try {
          closeDatabase();
          fs.copyFileSync(safetyBackup.file_path, activeDbPath);
          reconnectDatabase();
        } catch (rollbackErr) {
          console.error('Critical: Rollback failed after broken restore:', rollbackErr);
        }
      }

      throw {
        code: 'RESTORE_FAILED',
        message: err.message || 'Yedekten geri yükleme işlemi başarısız oldu.',
      };
    }
  }

  static validateBackupFile(filePath: string): void {
    // Check file header for SQLite magic string "SQLite format 3\0"
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    const magic = buffer.toString('utf8', 0, 15);
    if (magic !== 'SQLite format 3') {
      throw { code: 'INVALID_BACKUP', message: 'Seçilen dosya geçerli bir SQLite veritabanı yedeği değil!' };
    }

    // Test open with better-sqlite3 and check schema
    let testDb: Database.Database | null = null;
    try {
      testDb = new Database(filePath, { readonly: true });
      const pragmaCheck = testDb.pragma('quick_check') as any[];
      if (!pragmaCheck || pragmaCheck[0]?.quick_check !== 'ok') {
        throw new Error('Veritabanı bütünlük kontrolü (quick_check) başarısız oldu.');
      }

      const tables = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[];

      const tableNames = new Set(tables.map((t) => t.name));
      if (!tableNames.has('products') || !tableNames.has('sales') || !tableNames.has('categories')) {
        throw new Error('Yedek dosyasında gerekli veritabanı tabloları eksik!');
      }
    } catch (err: any) {
      throw {
        code: 'INVALID_BACKUP',
        message: err.message || 'Yedek dosyası doğrulaması başarısız oldu.',
      };
    } finally {
      if (testDb) {
        try {
          testDb.close();
        } catch {}
      }
    }
  }

  static async listBackups(): Promise<BackupHistory[]> {
    const db = getDb();
    const rows = await db.select().from(backupHistory).orderBy(desc(backupHistory.created_at));
    return rows.map((b) => ({
      ...b,
      backup_type: b.backup_type as 'MANUAL' | 'AUTO' | 'PRE_RESTORE',
    }));
  }
}
