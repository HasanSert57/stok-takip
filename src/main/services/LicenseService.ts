import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../database/connection';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';

const MASTER_SECRET = 'TELEFONCU_STOK_MASTER_KEY_2026_SECURE_SALT_9988';
const MASTER_ADMIN_PIN = 'Birnokta1,'; // Admin PIN for built-in key generator

export interface LicenseStatus {
  isLicensed: boolean;
  machineId: string;
  activatedAt?: string;
  errorMessage?: string;
}

export class LicenseService {
  /**
   * Returns path to the persistent license JSON file outside SQLite DB
   */
  private static getLicenseFilePath(): string {
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

    const dir = path.join(baseHomeDir, 'stok-takip');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'license.json');
  }

  /**
   * Saves license info into persistent file
   */
  private static saveLicenseToFile(licenseKey: string, activatedAt: string): void {
    try {
      const filePath = this.getLicenseFilePath();
      const content = JSON.stringify({
        licenseKey: licenseKey.trim().toUpperCase(),
        activatedAt,
        machineId: this.getMachineId(),
      }, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      console.warn('Could not save license to persistent file:', err);
    }
  }

  /**
   * Reads license info from persistent file
   */
  private static readLicenseFromFile(): { licenseKey?: string; activatedAt?: string } | null {
    try {
      const filePath = this.getLicenseFilePath();
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data.licenseKey === 'string') {
        return {
          licenseKey: data.licenseKey,
          activatedAt: data.activatedAt,
        };
      }
    } catch (err) {
      console.warn('Could not read license from persistent file:', err);
    }
    return null;
  }

  /**
   * Generates a deterministic, stable Hardware Machine ID unique to the host PC
   */
  public static getMachineId(): string {
    try {
      const hostname = (os.hostname() || 'unknown-host').toLowerCase().trim();
      const cpus = os.cpus();
      const cpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'unknown-cpu';
      const arch = os.arch();
      const platform = os.platform();
      const homedir = (os.homedir ? os.homedir() : '').trim();
      let userInfo = 'unknown-user';
      try {
        if (os.userInfo) {
          userInfo = (os.userInfo().username || 'unknown-user').trim();
        }
      } catch {}

      // Gather ONLY physical MAC addresses (ignore AWDL, VPN, virtual bridges, Docker, etc.)
      const networkInterfaces = os.networkInterfaces();
      const physicalMacs = new Set<string>();

      const ignoredPrefixes = [
        'awdl', 'llw', 'utun', 'bridge', 'vbox', 'docker', 'veth', 'tun', 'tap', 'lo', 'dummy', 'ham', 'wg', 'tailscale', 'p2p'
      ];

      Object.keys(networkInterfaces).forEach((ifaceName) => {
        const lowerIface = ifaceName.toLowerCase();
        const isIgnored = ignoredPrefixes.some((prefix) => lowerIface.startsWith(prefix));
        if (!isIgnored) {
          const iface = networkInterfaces[ifaceName];
          if (iface) {
            iface.forEach((details) => {
              if (details.mac && details.mac !== '00:00:00:00:00:00' && !details.internal) {
                physicalMacs.add(details.mac.toLowerCase());
              }
            });
          }
        }
      });

      const sortedMacs = Array.from(physicalMacs).sort();

      const rawFingerprint = `${platform}-${arch}-${hostname}-${cpuModel}-${homedir}-${userInfo}-${sortedMacs.join(',')}`;

      const hash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').toUpperCase();

      const part1 = hash.substring(0, 4);
      const part2 = hash.substring(4, 8);
      const part3 = hash.substring(8, 12);

      return `STOK-${part1}-${part2}-${part3}`;
    } catch (err) {
      // Safe fallback
      const fallbackHash = crypto.createHash('sha256').update(os.hostname() || 'fallback').digest('hex').toUpperCase();
      return `STOK-${fallbackHash.substring(0, 4)}-${fallbackHash.substring(4, 8)}-${fallbackHash.substring(8, 12)}`;
    }
  }

  /**
   * Generates the unique valid License Key for a given Machine ID
   */
  public static generateLicenseKey(machineId: string): string {
    const cleanId = machineId.trim().toUpperCase();
    const hmac = crypto.createHmac('sha256', MASTER_SECRET);
    hmac.update(cleanId);
    const hash = hmac.digest('hex').toUpperCase();

    const p1 = hash.substring(0, 4);
    const p2 = hash.substring(4, 8);
    const p3 = hash.substring(8, 12);
    const p4 = hash.substring(12, 16);

    return `LIC-${p1}-${p2}-${p3}-${p4}`;
  }

  /**
   * Validates if a license key matches a machine ID
   */
  public static verifyKey(machineId: string, inputKey: string): boolean {
    if (!inputKey || typeof inputKey !== 'string') return false;
    const expected = this.generateLicenseKey(machineId);
    const cleanInput = inputKey.trim().toUpperCase();
    return cleanInput === expected;
  }

  /**
   * Syncs persistent license key into active SQLite database settings table if missing
   */
  public static async syncLicenseToDb(): Promise<boolean> {
    try {
      const machineId = this.getMachineId();
      const fileLicense = this.readLicenseFromFile();
      if (!fileLicense || !fileLicense.licenseKey) return false;

      if (!this.verifyKey(machineId, fileLicense.licenseKey)) return false;

      const db = getDb();
      const now = fileLicense.activatedAt || new Date().toISOString();

      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'license_key'))
        .limit(1);

      if (existing && existing.length > 0) {
        await db
          .update(settings)
          .set({ value: fileLicense.licenseKey, updated_at: now })
          .where(eq(settings.key, 'license_key'));
      } else {
        await db.insert(settings).values({
          key: 'license_key',
          value: fileLicense.licenseKey,
          created_at: now,
          updated_at: now,
        });
      }
      return true;
    } catch (err) {
      console.warn('Could not sync license into DB:', err);
      return false;
    }
  }

  /**
   * Gets current license status from database & persistent file
   */
  public static async getStatus(): Promise<LicenseStatus> {
    const machineId = this.getMachineId();
    const db = getDb();

    try {
      let savedKey: string | null = null;
      let activatedAt: string | undefined;

      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'license_key'))
        .limit(1);

      if (existing && existing.length > 0) {
        savedKey = existing[0].value;
        activatedAt = existing[0].updated_at;
      }

      // If DB has valid key
      if (savedKey && this.verifyKey(machineId, savedKey)) {
        // Ensure license file is also up to date
        this.saveLicenseToFile(savedKey, activatedAt || new Date().toISOString());
        return {
          isLicensed: true,
          machineId,
          activatedAt,
        };
      }

      // If DB is missing key (e.g. after database backup restore or reset), check persistent file
      const fileLicense = this.readLicenseFromFile();
      if (fileLicense && fileLicense.licenseKey && this.verifyKey(machineId, fileLicense.licenseKey)) {
        await this.syncLicenseToDb();
        return {
          isLicensed: true,
          machineId,
          activatedAt: fileLicense.activatedAt,
        };
      }

      return {
        isLicensed: false,
        machineId,
        errorMessage: savedKey ? 'Lisans anahtarı bu cihaz ile uyuşmuyor veya lisans kopyalanmış!' : undefined,
      };
    } catch (err: any) {
      return {
        isLicensed: false,
        machineId,
        errorMessage: err?.message || 'Lisans kontrolünde hata oluştu.',
      };
    }
  }

  /**
   * Activates the license for the current machine
   */
  public static async activateLicense(licenseKey: string): Promise<LicenseStatus> {
    const machineId = this.getMachineId();
    const isValid = this.verifyKey(machineId, licenseKey);

    if (!isValid) {
      throw new Error('Girdiğiniz lisans anahtarı bu cihaz için geçerli değil!');
    }

    const db = getDb();
    const now = new Date().toISOString();
    const cleanKey = licenseKey.trim().toUpperCase();

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'license_key'))
      .limit(1);

    if (existing && existing.length > 0) {
      await db
        .update(settings)
        .set({ value: cleanKey, updated_at: now })
        .where(eq(settings.key, 'license_key'));
    } else {
      await db.insert(settings).values({
        key: 'license_key',
        value: cleanKey,
        created_at: now,
        updated_at: now,
      });
    }

    // Save to persistent file as well
    this.saveLicenseToFile(cleanKey, now);

    return {
      isLicensed: true,
      machineId,
      activatedAt: now,
    };
  }

  /**
   * Generates a license key for admin generator panel
   */
  public static generateKeyForAdmin(targetMachineId: string, adminPin: string): string {
    if (adminPin !== MASTER_ADMIN_PIN) {
      throw new Error('Geçersiz Yönetici PIN Kodu!');
    }
    return this.generateLicenseKey(targetMachineId);
  }
}

