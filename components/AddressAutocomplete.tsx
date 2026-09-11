import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  formatted: string;
}

interface SelectedAddress {
  streetAddress: string;
  postalCode: string;
  city: string;
}

interface AddressAutocompleteProps {
  onSelect: (address: SelectedAddress) => void;
  initialValue?: string;
  compact?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onSelect, initialValue, compact }) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(!!initialValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const fetchSuggestions = useCallback(async (text: string) => {
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
      const params = new URLSearchParams({ text, lang: i18n.language });
      const res = await fetch(
        `${supabaseUrl}/functions/v1/address-autocomplete?${params}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setSuggestions(data.results);
        setIsOpen(data.results.length > 0);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabaseUrl, i18n.language]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const street = suggestion.housenumber
      ? `${suggestion.street} ${suggestion.housenumber}`
      : suggestion.street;
    setQuery(street);
    setSelected(true);
    setIsOpen(false);
    setSuggestions([]);
    onSelect({
      streetAddress: street,
      postalCode: suggestion.postcode,
      city: suggestion.city || 'Linkoping',
    });
  };

  const handleClear = () => {
    setQuery('');
    setSelected(false);
    setSuggestions([]);
    setIsOpen(false);
    onSelect({ streetAddress: '', postalCode: '', city: '' });
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const inputClass = compact
    ? "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-text-main dark:text-white placeholder:text-text-sub pr-9"
    : "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-text-main dark:text-white placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all pr-10";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={t('addressAutocomplete.placeholder')}
          className={inputClass}
          readOnly={selected}
          onFocus={() => {
            if (selected) return;
            if (suggestions.length > 0) setIsOpen(true);
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          )}
          {selected ? (
            <button
              type="button"
              onClick={handleClear}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-sub text-[16px]">close</span>
            </button>
          ) : !isLoading && (
            <span className="material-symbols-outlined text-text-sub text-[18px]">search</span>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => {
            const display = s.housenumber ? `${s.street} ${s.housenumber}` : s.street;
            return (
              <button
                key={`${s.formatted}-${i}`}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">location_on</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-main dark:text-white truncate">{display}</p>
                    <p className="text-xs text-text-sub truncate">{s.postcode} {s.city}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 text-text-sub">
            <span className="material-symbols-outlined text-[18px]">search_off</span>
            <p className="text-sm">{t('addressAutocomplete.noResults')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
