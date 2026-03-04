import { useState, useEffect, useRef } from 'react';
import { Percent, Calendar, Link2, Timer } from 'lucide-react';
import { Product, Language, FlashSaleItem } from '../types';
import { ProductRow } from './ProductRow';
import { StackChildRow } from './StackChildRow';

function getRemainingDays(startDate: string, flashDays: number): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + flashDays);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface FlashSaleStackRowProps {
  item: FlashSaleItem;
  currentLanguage: Language;
  onUpdateItem: (itemId: string, updates: Partial<FlashSaleItem>) => void;
  onUpdateChildItem: (parentItemId: string, childItemId: string, updates: Partial<FlashSaleItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: (id: string | null) => void;
}

export function FlashSaleStackRow({
  item,
  currentLanguage,
  onUpdateItem,
  onUpdateChildItem,
  onDeleteItem,
  onOrderChange,
  isSettingsOpen,
  onSettingsToggle,
}: FlashSaleStackRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const remaining = getRemainingDays(item.flashStartDate, item.flashDays);
  const isExpired = remaining <= 0;
  const childCount = item.childItems?.length || 0;

  const [daysInput, setDaysInput] = useState(String(item.flashDays));
  const [discountInput, setDiscountInput] = useState(String(item.flashDiscountPercentage));
  const editingField = useRef<'discount' | 'price' | 'newPrice' | null>(null);
  const prevPriceRef = useRef(item.price);

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
      return;
    }

    const priceChanged = item.price !== prevPriceRef.current;
    prevPriceRef.current = item.price;

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

  const handleChildUpdate = (childId: string, updates: Partial<Product>) => {
    onUpdateChildItem(item.id, childId, updates);
  };

  const hasVariants = childCount > 0;
  const variantAggregates = hasVariants && item.childItems ? (() => {
    let lowestEffective = Infinity;
    let lowestPrice = '';
    let lowestSalePrice = '';
    let totalStock = 0;
    let totalPreserve = 0;
    item.childItems.forEach(v => {
      const price = parseFloat(v.price) || 0;
      const sale = parseFloat(v.newPrice) || 0;
      const effective = (sale > 0 && sale < price) ? sale : price;
      if (effective < lowestEffective) {
        lowestEffective = effective;
        lowestPrice = v.price;
        lowestSalePrice = v.newPrice;
      }
      totalStock += parseInt(v.stock, 10) || 0;
      totalPreserve += v.preserve;
    });
    return { price: lowestPrice, salePrice: lowestSalePrice, stock: totalStock, preserve: totalPreserve, available: totalStock - totalPreserve };
  })() : undefined;

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
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        subProductCount={childCount}
        hasVariants={hasVariants}
        variantAggregates={variantAggregates}
      />

      <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-xs">
        <span className="flex items-center gap-1 text-blue-600">
          <Link2 size={12} />
          <span className="font-medium">Synced Stack</span>
        </span>

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

      {isExpanded && item.childItems && item.childItems.length > 0 && (
        <div className="bg-slate-50/60">
          {item.childItems.map(child => (
            <StackChildRow
              key={child.id}
              product={child}
              currentLanguage={currentLanguage}
              isReadOnly={false}
              onUpdate={(childId, updates) => handleChildUpdate(childId, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
