import { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Product, Language, ExpiryItem, ExpirySettings } from '../types';
import { ProductRow } from './ProductRow';
import { ExpiryStackRow } from './ExpiryStackRow';
import { LanguageSelector, getLanguageBadge } from './LanguageSelector';

interface ExpiryItemsPanelProps {
  items: ExpiryItem[];
  expirySettings: ExpirySettings;
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<Product>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  onUpdateSettings: (updates: Partial<ExpirySettings>) => void;
  onApplyDiscount: () => void;
  highlightedProductId?: string | null;
}

export function ExpiryItemsPanel({
  items,
  expirySettings,
  currentLanguage,
  onLanguageChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onOrderChange,
  onUpdateSettings,
  onApplyDiscount,
  highlightedProductId,
}: ExpiryItemsPanelProps) {
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedProductId) return;
    const scrollTimer = setTimeout(() => {
      const el = document.querySelector(`[data-product-id="${highlightedProductId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('search-highlight');
        setTimeout(() => el.classList.remove('search-highlight'), 2500);
      }
    }, 100);
    return () => clearTimeout(scrollTimer);
  }, [highlightedProductId]);

  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 animate-fade-in">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 text-lg">Expiry Items</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button onClick={onAddItem} className="btn-primary">
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <ExpirySettingsToolbar
        settings={expirySettings}
        onUpdateSettings={onUpdateSettings}
        onApplyDiscount={onApplyDiscount}
        hasItems={items.length > 0}
      />

      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-max bg-white rounded-xl border border-slate-200 shadow-soft">
          <ExpiryTableHeader
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
          />

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Clock size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No expiry items yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-1 max-w-xs">
                Add items manually and set their expiration dates.
              </p>
            </div>
          ) : (
            sortedItems.map(item => (
              item.isStackParent && item.childItems ? (
                <ExpiryStackRow
                  key={item.id}
                  item={item}
                  currentLanguage={currentLanguage}
                  onUpdateItem={onUpdateItem}
                  onDeleteItem={onDeleteItem}
                  onOrderChange={onOrderChange}
                  isSettingsOpen={openSettingsId === item.id}
                  onSettingsToggle={setOpenSettingsId}
                />
              ) : (
                <ProductRow
                  key={item.id}
                  product={item}
                  currentLanguage={currentLanguage}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  onOrderChange={onOrderChange}
                  isSettingsOpen={openSettingsId === item.id}
                  onSettingsToggle={setOpenSettingsId}
                  isExpiryItem
                />
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface ExpiryTableHeaderProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

function ExpiryTableHeader({ currentLanguage, onLanguageChange }: ExpiryTableHeaderProps) {
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);

  return (
    <div className="flex items-center bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
      <div className="w-7 flex-shrink-0" />
      <div className="w-52 px-2 py-1.5 border-r border-slate-200 relative">
        <button
          onClick={() => setIsLanguageSelectorOpen(true)}
          className="flex items-center gap-2 hover:text-primary-600 transition-colors"
        >
          Name
          <span className="px-1.5 py-0.5 bg-primary-600 text-white text-[10px] rounded-md font-medium normal-case">
            {getLanguageBadge(currentLanguage)}
          </span>
        </button>
        <LanguageSelector
          isOpen={isLanguageSelectorOpen}
          currentLanguage={currentLanguage}
          onSelect={onLanguageChange}
          onClose={() => setIsLanguageSelectorOpen(false)}
        />
      </div>
      <div className="w-20 px-2 py-1.5 border-r border-slate-200">Price</div>
      <div className="w-20 px-2 py-1.5 border-r border-slate-200">Sale</div>
      <div className="w-14 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Stock</div>
      <div className="w-[4.5rem] px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Preserve</div>
      <div className="w-[4.5rem] px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Available</div>
      <div className="w-36 px-2 py-1.5 border-r border-slate-200">Expiration</div>
      <div className="w-16 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Info</div>
      <div className="w-14 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Order</div>
      <div className="w-14 px-2 py-1.5"></div>
    </div>
  );
}

interface ExpirySettingsToolbarProps {
  settings: ExpirySettings;
  onUpdateSettings: (updates: Partial<ExpirySettings>) => void;
  onApplyDiscount: () => void;
  hasItems: boolean;
}

function ExpirySettingsToolbar({
  settings,
  onUpdateSettings,
  onApplyDiscount,
  hasItems,
}: ExpirySettingsToolbarProps) {
  const [expiredDiscount, setExpiredDiscount] = useState(String(settings.expiredDiscountPercentage));
  const [t1Days, setT1Days] = useState(String(settings.threshold1Days));
  const [t1Discount, setT1Discount] = useState(String(settings.threshold1DiscountPercentage));
  const [t2Days, setT2Days] = useState(String(settings.threshold2Days));
  const [t2Discount, setT2Discount] = useState(String(settings.threshold2DiscountPercentage));

  useEffect(() => {
    setExpiredDiscount(String(settings.expiredDiscountPercentage));
    setT1Days(String(settings.threshold1Days));
    setT1Discount(String(settings.threshold1DiscountPercentage));
    setT2Days(String(settings.threshold2Days));
    setT2Discount(String(settings.threshold2DiscountPercentage));
  }, [settings]);

  const commitNumber = (
    value: string,
    fallback: number,
    key: keyof ExpirySettings,
    setter: (v: string) => void,
    min = 0,
    max = Infinity
  ) => {
    const val = parseFloat(value);
    if (!isNaN(val) && val >= min && val <= max) {
      onUpdateSettings({ [key]: val });
    } else {
      setter(String(fallback));
    }
  };

  const hasAnyDiscount =
    settings.expiredDiscountPercentage > 0 ||
    settings.threshold1DiscountPercentage > 0 ||
    settings.threshold2DiscountPercentage > 0;

  return (
    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700 whitespace-nowrap">Expired</span>
          <input
            type="number"
            value={expiredDiscount}
            onChange={e => setExpiredDiscount(e.target.value)}
            onBlur={() => commitNumber(expiredDiscount, settings.expiredDiscountPercentage, 'expiredDiscountPercentage', setExpiredDiscount, 0, 100)}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 px-2 py-0.5 text-sm bg-white border border-red-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            min="0"
            max="100"
          />
          <span className="text-xs text-red-500">%</span>
        </div>

        <div className="w-px h-8 bg-slate-200" />

        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
          <Calendar size={14} className="text-amber-600 flex-shrink-0" />
          <input
            type="number"
            value={t1Days}
            onChange={e => setT1Days(e.target.value)}
            onBlur={() => commitNumber(t1Days, settings.threshold1Days, 'threshold1Days', setT1Days, 0)}
            onWheel={e => e.currentTarget.blur()}
            className="w-12 px-2 py-0.5 text-sm bg-white border border-amber-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            min="0"
          />
          <span className="text-xs text-amber-600 whitespace-nowrap">days</span>
          <div className="w-px h-5 bg-amber-200 mx-1" />
          <input
            type="number"
            value={t1Discount}
            onChange={e => setT1Discount(e.target.value)}
            onBlur={() => commitNumber(t1Discount, settings.threshold1DiscountPercentage, 'threshold1DiscountPercentage', setT1Discount, 0, 100)}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 px-2 py-0.5 text-sm bg-white border border-amber-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            min="0"
            max="100"
          />
          <span className="text-xs text-amber-500">%</span>
        </div>

        <div className="w-px h-8 bg-slate-200" />

        <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-lg border border-sky-100">
          <Calendar size={14} className="text-sky-600 flex-shrink-0" />
          <input
            type="number"
            value={t2Days}
            onChange={e => setT2Days(e.target.value)}
            onBlur={() => commitNumber(t2Days, settings.threshold2Days, 'threshold2Days', setT2Days, 0)}
            onWheel={e => e.currentTarget.blur()}
            className="w-12 px-2 py-0.5 text-sm bg-white border border-sky-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            min="0"
          />
          <span className="text-xs text-sky-600 whitespace-nowrap">days</span>
          <div className="w-px h-5 bg-sky-200 mx-1" />
          <input
            type="number"
            value={t2Discount}
            onChange={e => setT2Discount(e.target.value)}
            onBlur={() => commitNumber(t2Discount, settings.threshold2DiscountPercentage, 'threshold2DiscountPercentage', setT2Discount, 0, 100)}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 px-2 py-0.5 text-sm bg-white border border-sky-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            min="0"
            max="100"
          />
          <span className="text-xs text-sky-500">%</span>
        </div>

        <button
          onClick={onApplyDiscount}
          disabled={!hasItems || !hasAnyDiscount}
          className="ml-auto px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg transition-all duration-150 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-soft"
        >
          Apply Discount
        </button>
      </div>
    </div>
  );
}
