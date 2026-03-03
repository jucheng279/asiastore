import { useState, useEffect } from 'react';
import { Plus, Clock, Percent, Calendar } from 'lucide-react';
import { Product, Language, ExpiryItem, ExpirySettings } from '../types';
import { ProductTableHeader } from './ProductTableHeader';
import { ProductRow } from './ProductRow';
import { ExpiryStackRow } from './ExpiryStackRow';

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
          <ProductTableHeader
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
                Products approaching their expiration date will appear here automatically.
              </p>
              <p className="text-xs text-slate-400">
                Current threshold: {expirySettings.thresholdDays} days
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
                />
              )
            ))
          )}
        </div>
      </div>
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
  const [thresholdInput, setThresholdInput] = useState(String(settings.thresholdDays));
  const [discountInput, setDiscountInput] = useState(String(settings.discountPercentage));

  useEffect(() => {
    setThresholdInput(String(settings.thresholdDays));
  }, [settings.thresholdDays]);

  useEffect(() => {
    setDiscountInput(String(settings.discountPercentage));
  }, [settings.discountPercentage]);

  return (
    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Calendar size={15} className="text-slate-500" />
        <span className="text-sm text-slate-600 font-medium">Threshold</span>
        <input
          type="number"
          value={thresholdInput}
          onChange={e => setThresholdInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(thresholdInput, 10);
            if (!isNaN(val) && val >= 0) {
              onUpdateSettings({ thresholdDays: val });
            } else {
              setThresholdInput(String(settings.thresholdDays));
            }
          }}
          onWheel={e => e.currentTarget.blur()}
          className="w-16 px-2 py-1 text-sm bg-white border border-slate-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          min="0"
        />
        <span className="text-sm text-slate-500">days</span>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      <div className="flex items-center gap-2">
        <Percent size={15} className="text-slate-500" />
        <span className="text-sm text-slate-600 font-medium">Discount</span>
        <input
          type="number"
          value={discountInput}
          onChange={e => setDiscountInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(discountInput, 10);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              onUpdateSettings({ discountPercentage: val });
            } else {
              setDiscountInput(String(settings.discountPercentage));
            }
          }}
          onWheel={e => e.currentTarget.blur()}
          className="w-16 px-2 py-1 text-sm bg-white border border-slate-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          min="0"
          max="100"
        />
        <span className="text-sm text-slate-500">%</span>
      </div>

      <button
        onClick={onApplyDiscount}
        disabled={!hasItems || settings.discountPercentage === 0}
        className="ml-auto px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg transition-all duration-150 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-soft"
      >
        Apply Discount
      </button>
    </div>
  );
}
