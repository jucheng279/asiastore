import { supabase } from './supabase';

export interface StoreSettings {
  orderingMode: 'auto' | 'manual';
  orderingEnabled: boolean;
  autoOpenDay: number;
  autoOpenTime: string;
  autoCloseDay: number;
  autoCloseTime: string;
  closedMessageEn: string;
  closedMessageSv: string;
  closedMessageZh: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  orderingMode: 'auto',
  orderingEnabled: true,
  autoOpenDay: 1,
  autoOpenTime: '00:00',
  autoCloseDay: 5,
  autoCloseTime: '12:00',
  closedMessageEn: 'Ordering is currently closed. We open every Monday and close Friday at noon.',
  closedMessageSv: 'Beställning är för tillfället stängd. Vi öppnar varje måndag och stänger fredag kl. 12.',
  closedMessageZh: '目前暂停接单。我们每周一开放，周五中午关闭。',
};

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;

  return {
    orderingMode: data.ordering_mode,
    orderingEnabled: data.ordering_enabled,
    autoOpenDay: data.auto_open_day,
    autoOpenTime: data.auto_open_time,
    autoCloseDay: data.auto_close_day,
    autoCloseTime: data.auto_close_time,
    closedMessageEn: data.closed_message_en,
    closedMessageSv: data.closed_message_sv,
    closedMessageZh: data.closed_message_zh,
  };
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function getStockholmNow(): { dayOfWeek: number; hours: number; minutes: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };

  return { dayOfWeek: dayMap[weekdayStr] || 1, hours: hour, minutes: minute };
}

function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export function isStoreOpen(settings: StoreSettings): boolean {
  if (settings.orderingMode === 'manual') {
    return settings.orderingEnabled;
  }

  const now = getStockholmNow();
  const openTime = parseTime(settings.autoOpenTime);
  const closeTime = parseTime(settings.autoCloseTime);

  const nowDayMinutes = (now.dayOfWeek - 1) * 1440 + timeToMinutes(now.hours, now.minutes);
  const openDayMinutes = (settings.autoOpenDay - 1) * 1440 + timeToMinutes(openTime.hours, openTime.minutes);
  const closeDayMinutes = (settings.autoCloseDay - 1) * 1440 + timeToMinutes(closeTime.hours, closeTime.minutes);

  return nowDayMinutes >= openDayMinutes && nowDayMinutes < closeDayMinutes;
}

const DAY_NAMES_EN = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SV = ['', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAY_NAMES_ZH = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function getNextOpenTime(settings: StoreSettings, lang: 'en' | 'sv' | 'zh'): string {
  if (settings.orderingMode === 'manual') return '';

  const dayNames = lang === 'sv' ? DAY_NAMES_SV : lang === 'zh' ? DAY_NAMES_ZH : DAY_NAMES_EN;
  return `${dayNames[settings.autoOpenDay]} ${settings.autoOpenTime}`;
}

export function getClosedMessage(settings: StoreSettings, lang: 'en' | 'sv' | 'zh'): string {
  if (lang === 'sv') return settings.closedMessageSv;
  if (lang === 'zh') return settings.closedMessageZh;
  return settings.closedMessageEn;
}
