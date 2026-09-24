import { ProductService } from './ProductService';

export class BarcodeService {
  /**
   * Generates a unique EAN-13 barcode string for standard handheld scanners.
   */
  static async generateBarcode(): Promise<string> {
    let candidate = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      attempts++;
      candidate = this.generateRandomEAN13();

      const existing = await ProductService.getProductByBarcode(candidate, true);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw { code: 'BARCODE_GENERATION_FAILED', message: 'Benzersiz EAN-13 barkod oluşturulamadı.' };
    }

    return candidate;
  }

  static async validateBarcode(barcode: string): Promise<{ valid: boolean; message?: string }> {
    if (!barcode || barcode.trim().length === 0) {
      return { valid: false, message: 'Barkod boş olamaz.' };
    }

    // Check if unique in DB
    const existing = await ProductService.getProductByBarcode(barcode.trim());
    if (existing) {
      return { valid: false, message: `Bu barkod (${barcode}) başka bir ürüne aittir.` };
    }

    return { valid: true };
  }

  private static generateRandomEAN13(): string {
    // Turkish country code prefix: 869
    const prefix = '869';
    const randomBody = Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
    const twelveDigits = prefix + randomBody;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(twelveDigits.charAt(i), 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return twelveDigits + checkDigit.toString();
  }
}
