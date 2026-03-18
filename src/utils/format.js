const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/**
 * Tarihi "15 Mart 2025" formatında döndürür (gün ay yıl, kaba olmayan).
 */
export function formatDateDayMonthYear(dateInput) {
  if (dateInput == null) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTHS_TR[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Sayıyı kısa gösterimle döndürür: 1200 → "1.2K", 1500000 → "1.5M"
 * Beğeni, izlenme vb. için kullanılır.
 */
export function abbreviateNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '0';
  const num = Number(n);
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return String(Math.floor(num));
}
