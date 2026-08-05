import { useState } from 'react';
import { Product, Language, ExpiryItem } from '../types';
import { ProductRow } from './ProductRow';
import { StackChildRow } from './StackChildRow';

interface ExpiryStackRowProps {
  item: ExpiryItem;
  currentLanguage: Language;
  onUpdateItem: (itemId: string, updates: Partial<Product>) => void;
  onUpdateChildItem: (parentItemId: string, childItemId: string, updates: Partial<Product>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: (id: string | null) => void;
}

export function ExpiryStackRow({
  item,
  currentLanguage,
  onUpdateItem,
  onUpdateChildItem,
  onDeleteItem,
  onOrderChange,
  isSettingsOpen,
  onSettingsToggle,
}: ExpiryStackRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const childCount = item.childItems?.length || 0;
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
        onUpdate={onUpdateItem}
        onDelete={onDeleteItem}
        onOrderChange={onOrderChange}
        isSettingsOpen={isSettingsOpen}
        onSettingsToggle={onSettingsToggle}
        isReadOnly={hasVariants}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        subProductCount={childCount}
        isExpiryItem
        hasVariants={hasVariants}
        variantAggregates={variantAggregates}
      />

      {isExpanded && item.childItems && item.childItems.length > 0 && (
        <div className="bg-slate-50/60">
          {item.childItems.map(child => (
            <StackChildRow
              key={child.id}
              product={child}
              currentLanguage={currentLanguage}
              isReadOnly={false}
              isExpiryItem
              onUpdate={(childId, updates) => {
                onUpdateChildItem(item.id, childId, updates);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
