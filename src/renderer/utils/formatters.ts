/**
 * Formats integer kuruş to Turkish Lira string
 * e.g. 39999 -> "₺399,99"
 */
export function formatTL(kuruş: number | null | undefined): string {
  if (kuruş === null || kuruş === undefined || isNaN(kuruş)) {
    return '₺0,00';
  }
  const lira = kuruş / 100;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(lira);
}

/**
 * Converts float TL to integer kuruş
 * e.g. 399.99 -> 39999
 */
export function tlToKuruş(tl: number | string): number {
  const num = typeof tl === 'string' ? parseFloat(tl.replace(',', '.')) : tl;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer kuruş to float TL number
 * e.g. 39999 -> 399.99
 */
export function kuruşToTL(kuruş: number | null | undefined): number {
  if (!kuruş) return 0;
  return kuruş / 100;
}

/**
 * Formats ISO date string to Turkish format
 * e.g. 2026-08-31T14:28:40.000Z -> "31.08.2026 14:28"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Translates PaymentType enum to Turkish
 * CASH -> Nakit
 * CARD -> Kredi Kartı
 * TRANSFER -> Havale / EFT
 */
export function formatPaymentType(type: string | null | undefined): string {
  if (!type) return 'Nakit';
  const upper = String(type).toUpperCase();
  switch (upper) {
    case 'CASH':
      return 'Nakit';
    case 'CARD':
      return 'Kredi Kartı';
    case 'TRANSFER':
      return 'Havale / EFT';
    case 'OTHER':
      return 'Diğer';
    default:
      return type;
  }
}

/**
 * Translates SaleStatus enum to Turkish
 * COMPLETED -> Tamamlandı
 * CANCELLED -> İptal Edildi
 * RETURNED -> İade Alındı
 * PARTIALLY_RETURNED -> Kısmi İade
 */
export function formatSaleStatus(status: string | null | undefined): string {
  if (!status) return 'Tamamlandı';
  const upper = String(status).toUpperCase();
  switch (upper) {
    case 'COMPLETED':
      return 'Tamamlandı';
    case 'CANCELLED':
      return 'İptal Edildi';
    case 'RETURNED':
      return 'İade Alındı';
    case 'PARTIALLY_RETURNED':
      return 'Kısmi İade';
    default:
      return status;
  }
}

/**
 * Translates StockMovementType enum to Turkish
 */
export function formatMovementType(type: string | null | undefined): string {
  if (!type) return 'Stok Girişi';
  const upper = String(type).toUpperCase();
  switch (upper) {
    case 'INITIAL':
    case 'INITIAL_SEED':
      return 'İlk Stok Girişi';
    case 'PURCHASE':
    case 'IN_PURCHASE':
      return 'Mal Alış Girişi';
    case 'SALE':
      return 'Kasa Satışı';
    case 'RETURN':
    case 'SALE_RETURN':
      return 'Müşteri İadesi';
    case 'CANCEL':
    case 'SALE_CANCEL':
      return 'Satış İptali';
    case 'ADJUSTMENT_IN':
      return 'Stok Sayım Fazlası (+)';
    case 'ADJUSTMENT_OUT':
      return 'Stok Sayım Eksiği (-)';
    case 'MANUAL_ADJUSTMENT':
      return 'Stok Düzeltme';
    default:
      return type;
  }
}
