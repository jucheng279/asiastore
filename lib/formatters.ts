import type { Language } from './api';

export function formatPrice(amount: number, lang: Language): string {
  switch (lang) {
    case 'sv':
      return `${amount.toFixed(2)} kr`;
    case 'zh':
      return `SEK ${amount.toFixed(2)}`;
    default:
      return `${amount.toFixed(2)} kr`;
  }
}

export function formatDate(dateStr: string, lang: Language): string {
  const locale = lang === 'sv' ? 'sv-SE' : lang === 'zh' ? 'zh-CN' : 'en-SE';
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFlashTimeRemaining(
  startDate: string,
  days: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const end = new Date(startDate);
  end.setDate(end.getDate() + days);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return t('product.ended');
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    return t('product.timeRemainingDaysHours', { days: d, hours: hours % 24 });
  }
  return t('product.timeRemainingHoursMinutes', { hours, minutes });
}

export function formatFromPrice(amount: number, lang: Language, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return t('product.fromPrice', { price: formatPrice(amount, lang) });
}

export function getExpiryText(
  days: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (days <= 0) return t('product.expiresToday');
  if (days === 1) return t('product.expiresTomorrow');
  return t('product.expiresInDays', { count: days });
}
