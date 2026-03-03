import { useState } from 'react';
import { Product, Language, ExpiryItem } from '../types';
import { ProductRow } from './ProductRow';
import { StackChildRow } from './StackChildRow';

interface ExpiryStackRowProps {
  item: ExpiryItem;
  currentLanguage: Language;
  onUpdateItem: (itemId: string, updates: Partial<Product>) => void;
  onDeleteItem: (itemId: string) => void;
  onOrderChange: (itemId: string, newOrder: number) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: (id: string | null) => void;
}

export function ExpiryStackRow({
  item,
  currentLanguage,
  onUpdateItem,
  onDeleteItem,
  onOrderChange,
  isSettingsOpen,
  onSettingsToggle,
}: ExpiryStackRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const childCount = item.childItems?.length || 0;

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
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        subProductCount={childCount}
        isExpiryItem
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
                onUpdateItem(childId, updates);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
