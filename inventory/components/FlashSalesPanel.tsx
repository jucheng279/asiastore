import { useState, useEffect, useRef } from 'react';
import { Plus, Zap, Percent, Calendar, Link2, Timer, RotateCcw, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import { Product, Language, FlashSaleItem, FlashSaleSettings } from '../types';
import { ProductTableHeader } from './ProductTableHeader';
import { ProductRow } from './ProductRow';
import { FlashSaleStackRow } from './FlashSaleStackRow';

interface FlashSalesPanelProps {
  items: FlashSaleItem[];
  flashSaleSettings: FlashSaleSettings;
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<FlashSaleItem>) => void;
  onUpdateChildItem: (parentItemId: string, childItemId: string, updates: Partial<FlashSaleItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  onUpdateSettings: (updates: Partial<FlashSaleSettings>) => void;
  onApplyDiscount: () => void;
  onResetAllDates: () => void;
  onResetItemDate: (itemId: string) => void;
  highlightedProductId?: string | null;
}

function getRemainingDays(startDate: string, flashDays: number): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + flashDays);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function FlashSalesPanel({
  items,
  flashSaleSettings,
  currentLanguage,
  onLanguageChange,
  onAddItem,
  onUpdateItem,
  onUpdateChildItem,
  onDeleteItem,
  onOrderChange,
  onUpdateSettings,
  onApplyDiscount,
  onResetAllDates,
  onResetItemDate,
  highlightedProductId,
}: FlashSalesPanelProps) {
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'apply' | 'resetAll' | null>(null);

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
          <h2 className="font-semibold text-slate-800 text-lg">Flash Sales</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button onClick={onAddItem} className="btn-primary">
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <FlashSaleSettingsToolbar
        settings={flashSaleSettings}
        onUpdateSettings={onUpdateSettings}
        onApplyDiscount={() => setConfirmAction('apply')}
        onResetAllDates={() => setConfirmAction('resetAll')}
        hasItems={items.length > 0}
      />

      <FlashSaleConfirmationModal
        action={confirmAction}
        settings={flashSaleSettings}
        itemCount={items.length}
        onConfirm={() => {
          if (confirmAction === 'apply') onApplyDiscount();
          else if (confirmAction === 'resetAll') onResetAllDates();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
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
                <Zap size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No flash sale items yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-1 max-w-xs">
                Toggle Flash on products in categories, or add items manually.
              </p>
            </div>
          ) : (
            sortedItems.map(item => (
              item.isStackParent && item.childItems ? (
                <FlashSaleStackRow
                  key={item.id}
                  item={item}
                  currentLanguage={currentLanguage}
                  onUpdateItem={onUpdateItem}
                  onUpdateChildItem={onUpdateChildItem}
                  onDeleteItem={onDeleteItem}
                  onOrderChange={onOrderChange}
                  onResetItemDate={onResetItemDate}
                  isSettingsOpen={openSettingsId === item.id}
                  onSettingsToggle={setOpenSettingsId}
                />
              ) : (
                <FlashSaleRow
                  key={item.id}
                  item={item}
                  currentLanguage={currentLanguage}
                  onUpdateItem={onUpdateItem}
                  onDeleteItem={onDeleteItem}
                  onOrderChange={onOrderChange}
                  onResetItemDate={onResetItemDate}
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

interface FlashSaleRowProps {
  item: FlashSaleItem;
  currentLanguage: Language;
  onUpdateItem: (itemId: string, updates: Partial<FlashSaleItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  onResetItemDate: (itemId: string) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: (id: string | null) => void;
}

function FlashSaleRow({
  item,
  currentLanguage,
  onUpdateItem,
  onDeleteItem,
  onOrderChange,
  onResetItemDate,
  isSettingsOpen,
  onSettingsToggle,
}: FlashSaleRowProps) {
  const remaining = getRemainingDays(item.flashStartDate, item.flashDays);
  const isExpired = remaining <= 0;
  const isSynced = item.sourceProductId !== null;

  const [daysInput, setDaysInput] = useState(String(item.flashDays));
  const [discountInput, setDiscountInput] = useState(String(item.flashDiscountPercentage));
  const editingField = useRef<'discount' | 'price' | 'newPrice' | null>(null);
  const prevPriceRef = useRef(item.price);
  const prevNewPriceRef = useRef(item.newPrice);

  useEffect(() => {
    setDaysInput(String(item.flashDays));
  }, [item.flashDays]);

  useEffect(() => {
    if (editingField.current === 'discount') return;

    const price = parseFloat(item.price);
    const newPrice = parseFloat(item.newPrice);
    if (!isNaN(price) && price > 0 && !isNaN(newPrice) && newPrice >= 0) {
      const computed = Math.round(((price - newPrice) / price) * 100);
      setDiscountInput(String(computed));
      if (computed !== item.flashDiscountPercentage) {
        onUpdateItem(item.id, { flashDiscountPercentage: computed });
      }
    } else {
      setDiscountInput(String(item.flashDiscountPercentage));
    }
  }, [item.price, item.newPrice, item.flashDiscountPercentage, item.id]);

  useEffect(() => {
    if (editingField.current === 'newPrice') {
      prevPriceRef.current = item.price;
      prevNewPriceRef.current = item.newPrice;
      return;
    }

    const priceChanged = item.price !== prevPriceRef.current;
    prevPriceRef.current = item.price;
    prevNewPriceRef.current = item.newPrice;

    if (priceChanged) {
      const price = parseFloat(item.price);
      const discount = item.flashDiscountPercentage;
      if (!isNaN(price) && price > 0 && discount > 0) {
        const computed = (price * (1 - discount / 100)).toFixed(2);
        onUpdateItem(item.id, { newPrice: computed });
      }
    }
  }, [item.price, item.flashDiscountPercentage, item.id]);

  const handleDiscountChange = (value: string) => {
    editingField.current = 'discount';
    setDiscountInput(value);

    const val = parseFloat(value);
    const price = parseFloat(item.price);
    if (!isNaN(val) && val >= 0 && val <= 100 && !isNaN(price) && price > 0) {
      const computed = (price * (1 - val / 100)).toFixed(2);
      onUpdateItem(item.id, { flashDiscountPercentage: Math.round(val), newPrice: computed });
    }
  };

  const handleDiscountBlur = () => {
    editingField.current = null;
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0 || val > 100) {
      const price = parseFloat(item.price);
      const newPrice = parseFloat(item.newPrice);
      if (!isNaN(price) && price > 0 && !isNaN(newPrice) && newPrice >= 0) {
        setDiscountInput(String(Math.round(((price - newPrice) / price) * 100)));
      } else {
        setDiscountInput(String(item.flashDiscountPercentage));
      }
    }
  };

  const handleProductUpdate = (_productId: string, updates: Partial<Product>) => {
    if ('newPrice' in updates) {
      editingField.current = 'newPrice';
      const price = parseFloat('price' in updates ? (updates.price || '') : item.price);
      const newPrice = parseFloat(updates.newPrice || '');
      if (!isNaN(price) && price > 0 && !isNaN(newPrice) && newPrice >= 0) {
        const computed = Math.round(((price - newPrice) / price) * 100);
        setDiscountInput(String(computed));
        onUpdateItem(item.id, { ...updates, flashDiscountPercentage: computed });
        setTimeout(() => { editingField.current = null; }, 0);
        return;
      }
      onUpdateItem(item.id, updates);
      setTimeout(() => { editingField.current = null; }, 0);
      return;
    }

    if ('price' in updates) {
      editingField.current = 'price';
      const price = parseFloat(updates.price || '');
      const discount = item.flashDiscountPercentage;
      if (!isNaN(price) && price > 0 && discount > 0) {
        const computed = (price * (1 - discount / 100)).toFixed(2);
        onUpdateItem(item.id, { ...updates, newPrice: computed });
      } else {
        onUpdateItem(item.id, updates);
      }
      setTimeout(() => { editingField.current = null; }, 0);
      return;
    }

    onUpdateItem(item.id, updates);
  };

  return (
    <div>
      <ProductRow
        product={item}
        currentLanguage={currentLanguage}
        onUpdate={handleProductUpdate}
        onDelete={onDeleteItem}
        onOrderChange={onOrderChange}
        isSettingsOpen={isSettingsOpen}
        onSettingsToggle={onSettingsToggle}
        isReadOnly={false}
      />
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-xs">
        {isSynced && (
          <span className="flex items-center gap-1 text-blue-600">
            <Link2 size={12} />
            <span className="font-medium">Synced</span>
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <Timer size={12} className="text-slate-500" />
          <span className="text-slate-600 font-medium">Duration</span>
          <input
            type="number"
            value={daysInput}
            onChange={e => setDaysInput(e.target.value)}
            onBlur={() => {
              const val = parseInt(daysInput, 10);
              if (!isNaN(val) && val >= 0) {
                onUpdateItem(item.id, { flashDays: val });
              } else {
                setDaysInput(String(item.flashDays));
              }
            }}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            min="0"
          />
          <span className="text-slate-500">days</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Percent size={12} className="text-slate-500" />
          <span className="text-slate-600 font-medium">Discount</span>
          <input
            type="number"
            value={discountInput}
            onChange={e => handleDiscountChange(e.target.value)}
            onBlur={handleDiscountBlur}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            min="0"
            max="100"
          />
          <span className="text-slate-500">%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-slate-500" />
          <span className="text-slate-500">Started {item.flashStartDate}</span>
          <button
            onClick={() => onResetItemDate(item.id)}
            className="p-0.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Reset start date to today"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        <span className={`ml-auto px-2 py-0.5 rounded-full font-medium ${
          isExpired
            ? 'bg-red-100 text-red-700'
            : remaining <= 2
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isExpired ? 'Expired' : `${remaining} day${remaining === 1 ? '' : 's'} left`}
        </span>
      </div>
    </div>
  );
}

interface FlashSaleSettingsToolbarProps {
  settings: FlashSaleSettings;
  onUpdateSettings: (updates: Partial<FlashSaleSettings>) => void;
  onApplyDiscount: () => void;
  onResetAllDates: () => void;
  hasItems: boolean;
}

function FlashSaleSettingsToolbar({
  settings,
  onUpdateSettings,
  onApplyDiscount,
  onResetAllDates,
  hasItems,
}: FlashSaleSettingsToolbarProps) {
  const [daysInput, setDaysInput] = useState(String(settings.defaultFlashDays));
  const [discountInput, setDiscountInput] = useState(String(settings.defaultDiscountPercentage));

  useEffect(() => {
    setDaysInput(String(settings.defaultFlashDays));
  }, [settings.defaultFlashDays]);

  useEffect(() => {
    setDiscountInput(String(settings.defaultDiscountPercentage));
  }, [settings.defaultDiscountPercentage]);

  return (
    <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Calendar size={15} className="text-slate-500" />
        <span className="text-sm text-slate-600 font-medium">Default Days</span>
        <input
          type="number"
          value={daysInput}
          onChange={e => setDaysInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(daysInput, 10);
            if (!isNaN(val) && val >= 0) {
              onUpdateSettings({ defaultFlashDays: val });
            } else {
              setDaysInput(String(settings.defaultFlashDays));
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
        <span className="text-sm text-slate-600 font-medium">Default Discount</span>
        <input
          type="number"
          value={discountInput}
          onChange={e => setDiscountInput(e.target.value)}
          onBlur={() => {
            const val = parseInt(discountInput, 10);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              onUpdateSettings({ defaultDiscountPercentage: val });
            } else {
              setDiscountInput(String(settings.defaultDiscountPercentage));
            }
          }}
          onWheel={e => e.currentTarget.blur()}
          className="w-16 px-2 py-1 text-sm bg-white border border-slate-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          min="0"
          max="100"
        />
        <span className="text-sm text-slate-500">%</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onResetAllDates}
          disabled={!hasItems}
          className="px-4 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <span className="flex items-center gap-1.5">
            <RotateCcw size={13} />
            Reset All Dates
          </span>
        </button>
        <button
          onClick={onApplyDiscount}
          disabled={!hasItems || settings.defaultDiscountPercentage === 0}
          className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg transition-all duration-150 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-soft"
        >
          Apply Discount
        </button>
      </div>
    </div>
  );
}

interface FlashSaleConfirmationModalProps {
  action: 'apply' | 'resetAll' | null;
  settings: FlashSaleSettings;
  itemCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function FlashSaleConfirmationModal({
  action,
  settings,
  itemCount,
  onConfirm,
  onCancel,
}: FlashSaleConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (action) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [action, onCancel]);

  if (!action) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const title = action === 'apply' ? 'Apply Discount to All Items' : 'Reset All Start Dates';
  const message = action === 'apply'
    ? `This will set all ${itemCount} flash sale item${itemCount === 1 ? '' : 's'} to ${settings.defaultDiscountPercentage}% off for ${settings.defaultFlashDays} days. Individual overrides will be lost.`
    : `This will reset the start date of all ${itemCount} flash sale item${itemCount === 1 ? '' : 's'} to today. All countdowns will restart.`;
  const confirmLabel = action === 'apply' ? 'Apply Discount' : 'Reset Dates';

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${action === 'apply' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <AlertTriangle size={18} className={action === 'apply' ? 'text-amber-600' : 'text-blue-600'} />
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            className={action === 'apply' ? 'btn-primary' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
