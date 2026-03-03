import { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ExpiryItem, ExpirySettings } from '../types';
import { reorderProducts, getNextOrder } from './useProductOrder';
import {
  replaceDraftExpiryItems,
  saveDraftExpirySettings,
} from '../../lib/inventoryDb';

function getDiscountForItem(
  expiration: string,
  settings: ExpirySettings
): number {
  if (!expiration) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiration + 'T00:00:00');

  if (expiryDate <= today) {
    return settings.expiredDiscountPercentage;
  }

  const diffMs = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const t1 = Math.min(settings.threshold1Days, settings.threshold2Days);
  const t2 = Math.max(settings.threshold1Days, settings.threshold2Days);
  const d1 = settings.threshold1Days <= settings.threshold2Days
    ? settings.threshold1DiscountPercentage
    : settings.threshold2DiscountPercentage;
  const d2 = settings.threshold1Days <= settings.threshold2Days
    ? settings.threshold2DiscountPercentage
    : settings.threshold1DiscountPercentage;

  if (diffDays <= t1) return d1;
  if (diffDays <= t2) return d2;
  return 0;
}

function applyDiscountToItem(
  item: ExpiryItem,
  settings: ExpirySettings
): ExpiryItem {
  const price = parseFloat(item.price);
  if (isNaN(price) || price <= 0) return { ...item, discountApplied: true };
  const pct = getDiscountForItem(item.expiration, settings);
  const salePrice = pct > 0 ? (price * (1 - pct / 100)).toFixed(2) : '';
  return { ...item, newPrice: salePrice, discountApplied: true };
}

interface UseExpiryItemsOptions {
  initialItems?: ExpiryItem[];
  initialSettings?: ExpirySettings;
}

const DEFAULT_SETTINGS: ExpirySettings = {
  thresholdDays: 30,
  expiredDiscountPercentage: 0,
  threshold1Days: 7,
  threshold1DiscountPercentage: 0,
  threshold2Days: 14,
  threshold2DiscountPercentage: 0,
};

export function useExpiryItems(_products: Product[], options?: UseExpiryItemsOptions) {
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>(options?.initialItems || []);
  const [expirySettings, setExpirySettings] = useState<ExpirySettings>(
    options?.initialSettings || DEFAULT_SETTINGS
  );
  const initializedRef = useRef(false);

  useEffect(() => {
    if (options?.initialItems && !initializedRef.current) {
      setExpiryItems(options.initialItems);
      initializedRef.current = true;
    }
  }, [options?.initialItems]);

  useEffect(() => {
    if (options?.initialSettings && !initializedRef.current) {
      setExpirySettings(options.initialSettings);
    }
  }, [options?.initialSettings]);

  const persistItems = useCallback((items: ExpiryItem[]) => {
    replaceDraftExpiryItems(items);
  }, []);

  useEffect(() => {
    const hasApplied = expiryItems.some(item => item.discountApplied);
    if (!hasApplied) return;

    setExpiryItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (!item.discountApplied) return item;

        const recalced = applyDiscountToItem(item, expirySettings);
        let recalcedChildren = recalced.childItems;
        if (recalced.isStackParent && recalced.childItems) {
          recalcedChildren = recalced.childItems.map(child => {
            if (!child.discountApplied) return child;
            const rc = applyDiscountToItem(child, expirySettings);
            if (rc.newPrice !== child.newPrice) changed = true;
            return rc;
          });
        }
        if (recalced.newPrice !== item.newPrice) changed = true;
        return { ...recalced, childItems: recalcedChildren };
      });

      if (changed) {
        persistItems(updated);
        return updated;
      }
      return prev;
    });
  }, [expirySettings, persistItems]);

  const handleAddExpiryItem = () => {
    const newItem: ExpiryItem = {
      id: crypto.randomUUID(),
      names: { en: '', sv: '', zh: '' },
      price: '',
      newPrice: '',
      stock: '',
      preserve: 0,
      expiration: '',
      descriptions: { en: '', sv: '', zh: '' },
      photos: [],
      order: getNextOrder(expiryItems),
      categoryId: '',
      subCategoryId: null,
      visible: true,
      trending: false,
      flash: false,
      parentProductId: null,
      internalOrder: 0,
      sourceProductId: null,
      discountApplied: false,
    };
    setExpiryItems(prev => {
      const updated = [...prev, newItem];
      persistItems(updated);
      return updated;
    });
  };

  const handleUpdateExpiryItem = (itemId: string, updates: Partial<Product>) => {
    setExpiryItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== itemId) return item;
        const merged = { ...item, ...updates };
        if (!merged.discountApplied) return merged;
        return applyDiscountToItem(merged, expirySettings);
      });
      persistItems(updated);
      return updated;
    });
  };

  const handleDeleteExpiryItem = (itemId: string) => {
    setExpiryItems(prev => {
      const remaining = prev.filter(item => item.id !== itemId);
      const updated = remaining
        .sort((a, b) => a.order - b.order)
        .map((item, index) => ({ ...item, order: index + 1 }));
      persistItems(updated);
      return updated;
    });
  };

  const handleExpiryOrderChange = (itemId: string, newOrder: number) => {
    setExpiryItems(prev => {
      const updated = reorderProducts(prev, itemId, newOrder);
      persistItems(updated);
      return updated;
    });
  };

  const handleUpdateExpirySettings = (updates: Partial<ExpirySettings>) => {
    setExpirySettings(prev => {
      const merged = { ...prev, ...updates };
      if (updates.threshold1Days !== undefined || updates.threshold2Days !== undefined) {
        const t1 = merged.threshold1Days;
        const t2 = merged.threshold2Days;
        if (t1 > t2) {
          merged.threshold1Days = t2;
          merged.threshold1DiscountPercentage = prev.threshold2DiscountPercentage;
          merged.threshold2Days = t1;
          merged.threshold2DiscountPercentage = prev.threshold1DiscountPercentage;
        }
      }
      saveDraftExpirySettings(merged);
      return merged;
    });
  };

  const handleApplyDiscount = () => {
    setExpiryItems(prev => {
      const updated = prev.map(item => {
        const discountedItem = applyDiscountToItem(item, expirySettings);
        if (discountedItem.isStackParent && discountedItem.childItems) {
          return {
            ...discountedItem,
            childItems: discountedItem.childItems.map(child =>
              applyDiscountToItem(child, expirySettings)
            ),
          };
        }
        return discountedItem;
      });
      persistItems(updated);
      return updated;
    });
  };

  return {
    expiryItems,
    expirySettings,
    handleAddExpiryItem,
    handleUpdateExpiryItem,
    handleDeleteExpiryItem,
    handleExpiryOrderChange,
    handleUpdateExpirySettings,
    handleApplyDiscount,
  };
}
