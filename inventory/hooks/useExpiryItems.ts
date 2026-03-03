import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product, ExpiryItem, ExpirySettings } from '../types';
import { reorderProducts, getNextOrder } from './useProductOrder';
import {
  replaceDraftExpiryItems,
  saveDraftExpirySettings,
} from '../../lib/inventoryDb';

function createExpiryChild(product: Product): ExpiryItem {
  return {
    ...product,
    id: crypto.randomUUID(),
    sourceProductId: product.id,
    photos: product.photos.map(p => ({ ...p })),
    names: { ...product.names },
    descriptions: { ...product.descriptions },
    order: product.internalOrder,
  };
}

interface UseExpiryItemsOptions {
  initialItems?: ExpiryItem[];
  initialSettings?: ExpirySettings;
}

export function useExpiryItems(products: Product[], options?: UseExpiryItemsOptions) {
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>(options?.initialItems || []);
  const [expirySettings, setExpirySettings] = useState<ExpirySettings>(
    options?.initialSettings || { thresholdDays: 30, discountPercentage: 0 }
  );
  const copiedProductIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (options?.initialItems && !initializedRef.current) {
      setExpiryItems(options.initialItems);
      const ids = new Set<string>();
      for (const item of options.initialItems) {
        if (item.sourceProductId) ids.add(item.sourceProductId);
        if ((item as any).childItems) {
          for (const child of (item as any).childItems) {
            if (child.sourceProductId) ids.add(child.sourceProductId);
          }
        }
      }
      copiedProductIdsRef.current = ids;
      initializedRef.current = true;
    }
  }, [options?.initialItems]);

  useEffect(() => {
    if (options?.initialSettings && !initializedRef.current) {
      setExpirySettings(options.initialSettings);
    }
  }, [options?.initialSettings]);

  const activeCopiedProductIds = useMemo(() => {
    const ids = new Set<string>();
    expiryItems.forEach(item => {
      if (item.sourceProductId !== null) {
        ids.add(item.sourceProductId);
      }
      if (item.childItems) {
        item.childItems.forEach(child => {
          if (child.sourceProductId !== null) {
            ids.add(child.sourceProductId);
          }
        });
      }
    });
    return ids;
  }, [expiryItems]);

  const persistItems = useCallback((items: ExpiryItem[]) => {
    replaceDraftExpiryItems(items);
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + expirySettings.thresholdDays);

    const newItems: ExpiryItem[] = [];

    products.forEach(product => {
      if (!product.expiration) return;
      if (copiedProductIdsRef.current.has(product.id)) return;

      const expirationDate = new Date(product.expiration + 'T00:00:00');
      if (expirationDate <= thresholdDate) {
        const isMainProduct = product.parentProductId === null;

        if (isMainProduct) {
          const variants = products.filter(p => p.parentProductId === product.id);
          const childItems = variants.map(v => createExpiryChild(v));

          newItems.push({
            ...product,
            id: crypto.randomUUID(),
            sourceProductId: product.id,
            photos: product.photos.map(p => ({ ...p })),
            names: { ...product.names },
            descriptions: { ...product.descriptions },
            order: 0,
            isStackParent: variants.length > 0,
            childItems: childItems.length > 0 ? childItems : undefined,
          });

          copiedProductIdsRef.current.add(product.id);
          variants.forEach(v => copiedProductIdsRef.current.add(v.id));
        } else {
          const parent = products.find(p => p.id === product.parentProductId);
          const parentAlreadyCopied = parent && copiedProductIdsRef.current.has(parent.id);
          if (parentAlreadyCopied) return;

          newItems.push({
            ...product,
            id: crypto.randomUUID(),
            sourceProductId: product.id,
            photos: product.photos.map(p => ({ ...p })),
            names: { ...product.names },
            descriptions: { ...product.descriptions },
            order: 0,
          });
          copiedProductIdsRef.current.add(product.id);
        }
      }
    });

    if (newItems.length > 0) {
      setExpiryItems(prev => {
        const nextOrder = prev.length > 0 ? Math.max(...prev.map(i => i.order)) + 1 : 1;
        const updated = [
          ...prev,
          ...newItems.map((item, index) => ({
            ...item,
            order: nextOrder + index,
          })),
        ];
        persistItems(updated);
        return updated;
      });
    }
  }, [products, expirySettings.thresholdDays, persistItems]);

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
    };
    setExpiryItems(prev => {
      const updated = [...prev, newItem];
      persistItems(updated);
      return updated;
    });
  };

  const handleUpdateExpiryItem = (itemId: string, updates: Partial<Product>) => {
    setExpiryItems(prev => {
      const updated = prev.map(item => (item.id === itemId ? { ...item, ...updates } : item));
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
      const updated = { ...prev, ...updates };
      saveDraftExpirySettings(updated);
      return updated;
    });
  };

  const handleApplyDiscount = () => {
    setExpiryItems(prev => {
      const updated = prev.map(item => {
        const applyDiscount = (target: ExpiryItem): ExpiryItem => {
          const price = parseFloat(target.price);
          if (isNaN(price) || price <= 0) return target;
          const discounted = price * (1 - expirySettings.discountPercentage / 100);
          return { ...target, newPrice: discounted.toFixed(2) };
        };

        const discountedItem = applyDiscount(item);

        if (discountedItem.isStackParent && discountedItem.childItems) {
          return {
            ...discountedItem,
            childItems: discountedItem.childItems.map(child => applyDiscount(child)),
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
    activeCopiedProductIds,
    handleAddExpiryItem,
    handleUpdateExpiryItem,
    handleDeleteExpiryItem,
    handleExpiryOrderChange,
    handleUpdateExpirySettings,
    handleApplyDiscount,
  };
}
