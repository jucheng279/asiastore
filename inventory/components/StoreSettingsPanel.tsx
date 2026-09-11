import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ToggleLeft, ToggleRight, CalendarClock, Radio, MapPin, Search, Loader2 } from 'lucide-react';
import type { AdminStoreSettings, Language } from '../types';
import { isStoreOpen } from '../../lib/storeStatus';

interface StoreSettingsPanelProps {
  settings: AdminStoreSettings;
  onUpdate: (updates: Partial<AdminStoreSettings>) => void;
}

const DAY_OPTIONS = [
  { value: 1, en: 'Monday', sv: 'Måndag', zh: '周一' },
  { value: 2, en: 'Tuesday', sv: 'Tisdag', zh: '周二' },
  { value: 3, en: 'Wednesday', sv: 'Onsdag', zh: '周三' },
  { value: 4, en: 'Thursday', sv: 'Torsdag', zh: '周四' },
  { value: 5, en: 'Friday', sv: 'Fredag', zh: '周五' },
  { value: 6, en: 'Saturday', sv: 'Lördag', zh: '周六' },
  { value: 7, en: 'Sunday', sv: 'Söndag', zh: '周日' },
];

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  formatted: string;
  lat?: number;
  lon?: number;
}

function StoreAddressInput({
  settings,
  onUpdate,
}: {
  settings: AdminStoreSettings;
  onUpdate: (updates: Partial<AdminStoreSettings>) => void;
}) {
  const addr = settings.storeAddress;
  const displayValue = addr.street
    ? `${addr.street}, ${addr.postalCode} ${addr.city}`
    : '';

  const [query, setQuery] = useState(displayValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(!!addr.street);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (addr.street && !isSelected) {
      setQuery(`${addr.street}, ${addr.postalCode} ${addr.city}`);
      setIsSelected(true);
    }
  }, [addr.street]);

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ text, lang: 'en' });
        const res = await fetch(
          `${supabaseUrl}/functions/v1/address-autocomplete?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setSuggestions(data.results || []);
        setIsOpen((data.results || []).length > 0);
      } catch {
        // aborted or network error
      } finally {
        setIsLoading(false);
      }
    },
    [supabaseUrl],
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    setIsSelected(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelect = (s: AddressSuggestion) => {
    const street = s.housenumber ? `${s.street} ${s.housenumber}` : s.street;
    setQuery(`${street}, ${s.postcode} ${s.city}`);
    setIsOpen(false);
    setIsSelected(true);
    onUpdate({
      storeAddress: {
        street,
        postalCode: s.postcode,
        city: s.city,
        lat: s.lat ?? null,
        lon: s.lon ?? null,
      },
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search for store address..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        {isLoading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              {s.formatted}
            </button>
          ))}
        </div>
      )}
      {isSelected && addr.street && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <MapPin size={12} />
          {addr.street}, {addr.postalCode} {addr.city}
        </p>
      )}
    </div>
  );
}

export function StoreSettingsPanel({ settings, onUpdate }: StoreSettingsPanelProps) {
  const [liveOpen, setLiveOpen] = useState(() => isStoreOpen({
    ...settings,
    orderingMode: settings.orderingMode,
    orderingEnabled: settings.orderingEnabled,
    autoOpenDay: settings.autoOpenDay,
    autoOpenTime: settings.autoOpenTime,
    autoCloseDay: settings.autoCloseDay,
    autoCloseTime: settings.autoCloseTime,
    closedMessageEn: settings.closedMessageEn,
    closedMessageSv: settings.closedMessageSv,
    closedMessageZh: settings.closedMessageZh,
  }));

  useEffect(() => {
    const check = () => setLiveOpen(isStoreOpen(settings));
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [settings]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarClock className="w-6 h-6 text-gray-600" />
        <h2 className="text-xl font-bold text-gray-900">Store Settings</h2>
      </div>

      <div className={`rounded-xl p-5 mb-8 border-2 ${
        liveOpen
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${liveOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className={`text-lg font-bold ${liveOpen ? 'text-emerald-800' : 'text-amber-800'}`}>
            {liveOpen ? 'Store is OPEN' : 'Store is CLOSED'}
          </span>
        </div>
        <p className={`text-sm mt-1 ml-6 ${liveOpen ? 'text-emerald-600' : 'text-amber-600'}`}>
          {settings.orderingMode === 'auto'
            ? 'Using automatic schedule'
            : `Manual override: ${settings.orderingEnabled ? 'Enabled' : 'Disabled'}`
          }
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Ordering Mode</h3>
            <div className="flex gap-3">
              <button
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  settings.orderingMode === 'auto'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onUpdate({ orderingMode: 'auto' })}
              >
                <Clock className={`w-5 h-5 ${settings.orderingMode === 'auto' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-semibold text-sm ${settings.orderingMode === 'auto' ? 'text-blue-800' : 'text-gray-700'}`}>
                    Automatic Schedule
                  </p>
                  <p className="text-xs text-gray-500">Opens and closes automatically</p>
                </div>
              </button>
              <button
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                  settings.orderingMode === 'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onUpdate({ orderingMode: 'manual' })}
              >
                <Radio className={`w-5 h-5 ${settings.orderingMode === 'manual' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`font-semibold text-sm ${settings.orderingMode === 'manual' ? 'text-blue-800' : 'text-gray-700'}`}>
                    Manual Override
                  </p>
                  <p className="text-xs text-gray-500">You control open/close</p>
                </div>
              </button>
            </div>
          </div>

          {settings.orderingMode === 'auto' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Weekly Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Opens on</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={settings.autoOpenDay}
                    onChange={(e) => onUpdate({ autoOpenDay: Number(e.target.value) })}
                  >
                    {DAY_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">At time</label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={settings.autoOpenTime}
                    onChange={(e) => onUpdate({ autoOpenTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Closes on</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={settings.autoCloseDay}
                    onChange={(e) => onUpdate({ autoCloseDay: Number(e.target.value) })}
                  >
                    {DAY_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">At time</label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={settings.autoCloseTime}
                    onChange={(e) => onUpdate({ autoCloseTime: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                All times are in Sweden timezone (Europe/Stockholm)
              </p>
            </div>
          )}

          {settings.orderingMode === 'manual' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Manual Control</h3>
              <button
                className="flex items-center gap-3 w-full"
                onClick={() => onUpdate({ orderingEnabled: !settings.orderingEnabled })}
              >
                {settings.orderingEnabled ? (
                  <ToggleRight className="w-10 h-10 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
                <div className="text-left">
                  <p className={`font-semibold ${settings.orderingEnabled ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {settings.orderingEnabled ? 'Ordering is enabled' : 'Ordering is disabled'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {settings.orderingEnabled
                      ? 'Customers can place orders now'
                      : 'Customers cannot place orders'}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Closed Message</h3>
          <p className="text-xs text-gray-500 mb-4">
            This message is shown to customers when the store is closed. Customize it for each language.
          </p>
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">English</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                rows={3}
                value={settings.closedMessageEn}
                onChange={(e) => onUpdate({ closedMessageEn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Svenska</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                rows={3}
                value={settings.closedMessageSv}
                onChange={(e) => onUpdate({ closedMessageSv: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">中文</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                rows={3}
                value={settings.closedMessageZh}
                onChange={(e) => onUpdate({ closedMessageZh: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Store Address</h3>
          <p className="text-xs text-gray-500 mb-4">
            Used as the starting point for delivery route planning. Search for and select your store's real address.
          </p>
          <StoreAddressInput settings={settings} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
}
