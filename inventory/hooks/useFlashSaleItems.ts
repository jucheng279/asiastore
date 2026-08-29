import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, FlashSaleItem, FlashSaleSettings } from '../types';
import { reorderProducts, getNextOrder } from './useProductOrder';
import {
  replaceDraftFlashSaleItems,
  saveDraftFlashSaleSettings,
} from '../../lib/inventoryDb';

const FLASH_ONLY_KEYS = new Set<string>([
  'flashDays', 'flashStartDate', 'flashDiscountPercentage',
  'sourceProductId', 'isStackParent', 'childItems',
]);

function createFlashChild(
  product: Product,
  parentFlashItem: { flashDays: number; flashStartDate: string; flashDiscountPercentage: number }
): FlashSaleItem {
  return {
    ...product,
    id: crypto.randomUUID(),
    sourceProductId: product.id,
    photos: product.photos.map(p => ({ ...p })),
    names: { ...product.names },
    descriptions: { ...product.descriptions },
    order: product.internalOrder,
    flashDays: parentFlashItem.flashDays,
    flashStartDate: parentFlashItem.flashStartDate,
    flashDiscountPercentage: parentFlashItem.flashDiscountPercentage,
  };
}

function syncFlashItemFromSource(item: FlashSaleItem, source: Product): FlashSaleItem | null {
  const fieldsToCompare: (keyof Product)[] = [
    'price', 'newPrice', 'stock', 'preserve', 'expiration',
    'categoryId', 'subCategoryId', 'visible', 'trending', 'flash',
  ];

  const nameChanged =
    item.names.en !== source.names.en ||
    item.names.sv !== source.names.sv ||
    item.names.zh !== source.names.zh;

  const fieldChanged = fieldsToCompare.some(
    field => item[field] !== source[field]
  );

  if (nameChanged || fieldChanged) {
    return {
      ...item,
      names: { ...source.names },
      price: source.price,
      newPrice: source.newPrice,
      stock: source.stock,
      preserve: source.preserve,
      expiration: source.expiration,
      descriptions: { ...source.descriptions },
      photos: source.photos.map(p => ({ ...p })),
      categoryId: source.categoryId,
      subCategoryId: source.subCategoryId,
      visible: source.visible,
      trending: source.trending,
      flash: source.flash,
    };
  }

  return null;
}

interface UseFlashSaleItemsOptions {
  initialItems?: FlashSaleItem[];
  initialSettings?: FlashSaleSettings;
}

export function useFlashSaleItems(
  products: Product[],
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void,
  options?: UseFlashSaleItemsOptions
) {
  const [flashSaleItems, setFlashSaleItems] = useState<FlashSaleItem[]>(options?.initialItems || []);
  const [flashSaleSettings, setFlashSaleSettings] = useState<FlashSaleSettings>(
    options?.initialSettings || { defaultFlashDays: 14, defaultDiscountPercentage: 30 }
  );
  const reverseSyncRef = useRef(false);
  useEffect(() => {
    if (options?.initialItems && options.initialItems.length > 0 && flashSaleItems.length === 0) {
      setFlashSaleItems(options.initialItems);
    }
  }, [options?.initialItems]);

  useEffect(() => {
    if (options?.initialSettings) {
      setFlashSaleSettings(options.initialSettings);
    }
  }, [options?.initialSettings]);

  const activeFlashProductIds = useMemo(() => {
    const ids = new Set<string>();
    flashSaleItems.forEach(item => {
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
  }, [flashSaleItems]);

  const persistItems = useCallback((items: FlashSaleItem[]) => {
    replaceDraftFlashSaleItems(items);
  }, []);

  useEffect(() => {
    const flashProductIds = new Set(
      products.filter(p => p.flash).map(p => p.id)
    );

    setFlashSaleItems(prev => {
      let updated = [...prev];
      let changed = false;

      const linkedSourceIds = new Set<string>();
      updated.forEach(item => {
        if (item.sourceProductId !== null) linkedSourceIds.add(item.sourceProductId);
        if (item.childItems) {
          item.childItems.forEach(child => {
            if (child.sourceProductId !== null) linkedSourceIds.add(child.sourceProductId);
          });
        }
      });

      products.forEach(product => {
        if (!product.flash) return;
        if (linkedSourceIds.has(product.id)) return;

        const isMainProduct = product.parentProductId === null;

        if (isMainProduct) {
          const variants = products.filter(p => p.parentProductId === product.id);
          const today = new Date();
          const startDate = today.toISOString().split('T')[0];
          const nextOrder = updated.length > 0
            ? Math.max(...updated.map(i => i.order)) + 1
            : 1;

          const parentFlash = {
            flashDays: flashSaleSettings.defaultFlashDays,
            flashStartDate: startDate,
            flashDiscountPercentage: flashSaleSettings.defaultDiscountPercentage,
          };

          const childItems = variants.map(v => createFlashChild(v, parentFlash));

          updated.push({
            ...product,
            id: crypto.randomUUID(),
            sourceProductId: product.id,
            photos: product.photos.map(p => ({ ...p })),
            names: { ...product.names },
            descriptions: { ...product.descriptions },
            order: nextOrder,
            ...parentFlash,
            isStackParent: variants.length > 0,
            childItems: childItems.length > 0 ? childItems : undefined,
          });

          linkedSourceIds.add(product.id);
          variants.forEach(v => linkedSourceIds.add(v.id));
          changed = true;
        } else {
          const parent = products.find(p => p.id === product.parentProductId);
          if (parent && parent.flash) return;

          const today = new Date();
          const startDate = today.toISOString().split('T')[0];
          const nextOrder = updated.length > 0
            ? Math.max(...updated.map(i => i.order)) + 1
            : 1;

          updated.push({
            ...product,
            id: crypto.randomUUID(),
            sourceProductId: product.id,
            photos: product.photos.map(p => ({ ...p })),
            names: { ...product.names },
            descriptions: { ...product.descriptions },
            order: nextOrder,
            flashDays: flashSaleSettings.defaultFlashDays,
            flashStartDate: startDate,
            flashDiscountPercentage: flashSaleSettings.defaultDiscountPercentage,
          });
          changed = true;
        }
      });

      const removedItems = updated.filter(item => {
        if (item.sourceProductId === null) return false;
        if (item.isStackParent) {
          return !flashProductIds.has(item.sourceProductId!);
        }
        return !flashProductIds.has(item.sourceProductId!);
      });

      if (removedItems.length > 0) {
        updated = updated.filter(item => {
          if (item.sourceProductId === null) return true;
          if (item.isStackParent) {
            return flashProductIds.has(item.sourceProductId!);
          }
          return flashProductIds.has(item.sourceProductId!);
        });
        updated = updated
          .sort((a, b) => a.order - b.order)
          .map((item, index) => ({ ...item, order: index + 1 }));
        changed = true;
      }

      if (changed) {
        persistItems(updated);
      }
      return changed ? updated : prev;
    });
  }, [products, flashSaleSettings.defaultFlashDays, flashSaleSettings.defaultDiscountPercentage, persistItems]);

  useEffect(() => {
    if (reverseSyncRef.current) return;

    setFlashSaleItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (item.sourceProductId === null) return item;

        const source = products.find(p => p.id === item.sourceProductId);
        if (!source) return item;

        let itemChanged = false;
        let syncedItem = item;

        const parentSync = syncFlashItemFromSource(item, source);
        if (parentSync) {
          syncedItem = parentSync;
          itemChanged = true;
        }

        if (syncedItem.isStackParent) {
          const currentVariants = products.filter(p => p.parentProductId === source.id);
          const existingChildren = syncedItem.childItems || [];

          const existingChildSourceIds = new Set(
            existingChildren.map(c => c.sourceProductId).filter(Boolean) as string[]
          );

          let newChildren = [...existingChildren];
          let childrenChanged = false;

          newChildren = newChildren.map(child => {
            if (!child.sourceProductId) return child;
            const childSource = currentVariants.find(v => v.id === child.sourceProductId);
            if (!childSource) {
              childrenChanged = true;
              return null as unknown as FlashSaleItem;
            }
            const childSync = syncFlashItemFromSource(child, childSource);
            if (childSync) {
              childrenChanged = true;
              return childSync;
            }
            return child;
          }).filter(Boolean);

          currentVariants.forEach(variant => {
            if (!existingChildSourceIds.has(variant.id)) {
              newChildren.push(createFlashChild(variant, {
                flashDays: syncedItem.flashDays,
                flashStartDate: syncedItem.flashStartDate,
                flashDiscountPercentage: syncedItem.flashDiscountPercentage,
              }));
              childrenChanged = true;
            }
          });

          if (childrenChanged) {
            itemChanged = true;
            syncedItem = {
              ...syncedItem,
              childItems: newChildren.length > 0 ? newChildren : undefined,
              isStackParent: currentVariants.length > 0 || undefined,
            };
          }
        }

        if (itemChanged) {
          changed = true;
          return syncedItem;
        }

        return item;
      });

      if (changed) {
        persistItems(updated);
      }
      return changed ? updated : prev;
    });
  }, [products, persistItems]);

  const handleAddFlashSaleItem = () => {
    const today = new Date().toISOString().split('T')[0];
    const newItem: FlashSaleItem = {
      id: crypto.randomUUID(),
      names: { en: '', sv: '', zh: '' },
      price: '',
      newPrice: '',
      stock: '',
      preserve: 0,
      expiration: '',
      descriptions: { en: '', sv: '', zh: '' },
      photos: [],
      order: getNextOrder(flashSaleItems),
      categoryId: '',
      subCategoryId: null,
      visible: true,
      trending: false,
      flash: true,
      parentProductId: null,
      internalOrder: 0,
      sourceProductId: null,
      flashDays: flashSaleSettings.defaultFlashDays,
      flashStartDate: today,
      flashDiscountPercentage: flashSaleSettings.defaultDiscountPercentage,
    };
    setFlashSaleItems(prev => {
      const updated = [...prev, newItem];
      persistItems(updated);
      return updated;
    });
  };

  const reverseSync = useCallback((sourceProductId: string, updates: Partial<FlashSaleItem>) => {
    const shared: Partial<Product> = {};
    for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
      if (!FLASH_ONLY_KEYS.has(key)) {
        (shared as Record<string, unknown>)[key] = updates[key];
      }
    }
    if (Object.keys(shared).length === 0) return;
    reverseSyncRef.current = true;
    onUpdateProduct(sourceProductId, shared);
    setTimeout(() => { reverseSyncRef.current = false; }, 0);
  }, [onUpdateProduct]);

  const handleUpdateFlashSaleItem = (itemId: string, updates: Partial<FlashSaleItem>) => {
    setFlashSaleItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item?.sourceProductId) {
        reverseSync(item.sourceProductId, updates);
      }

      const updated = prev.map(i => {
        if (i.id === itemId) {
          const updatedItem = { ...i, ...updates };

          if (i.isStackParent && i.childItems) {
            const flashFieldsUpdated =
              'flashDays' in updates ||
              'flashStartDate' in updates ||
              'flashDiscountPercentage' in updates;

            if (flashFieldsUpdated) {
              const newDiscount = updates.flashDiscountPercentage;
              updatedItem.childItems = i.childItems.map(child => {
                const childUpdate: Partial<FlashSaleItem> = {
                  ...(updates.flashDays !== undefined && { flashDays: updates.flashDays }),
                  ...(updates.flashStartDate !== undefined && { flashStartDate: updates.flashStartDate }),
                };

                if (newDiscount !== undefined) {
                  childUpdate.flashDiscountPercentage = newDiscount;
                  const childPrice = parseFloat(child.price);
                  if (!isNaN(childPrice) && childPrice > 0) {
                    const computed = (childPrice * (1 - newDiscount / 100)).toFixed(2);
                    childUpdate.newPrice = computed;
                    if (child.sourceProductId) {
                      reverseSync(child.sourceProductId, { newPrice: computed });
                    }
                  }
                }

                return { ...child, ...childUpdate };
              });
            }
          }

          return updatedItem;
        }
        return i;
      });
      persistItems(updated);
      return updated;
    });
  };

  const handleUpdateFlashSaleChildItem = (parentItemId: string, childItemId: string, updates: Partial<FlashSaleItem>) => {
    const { flashDays: _fd, flashStartDate: _fsd, ...safeUpdates } = updates;

    setFlashSaleItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== parentItemId || !item.childItems) return item;

        const child = item.childItems.find(c => c.id === childItemId);
        if (child?.sourceProductId) {
          reverseSync(child.sourceProductId, safeUpdates);
        }

        return {
          ...item,
          childItems: item.childItems.map(c =>
            c.id === childItemId ? { ...c, ...safeUpdates } : c
          ),
        };
      });
      persistItems(updated);
      return updated;
    });
  };

  const handleDeleteFlashSaleItem = (itemId: string) => {
    const item = flashSaleItems.find(i => i.id === itemId);
    if (item?.sourceProductId) {
      onUpdateProduct(item.sourceProductId, { flash: false });
    }

    setFlashSaleItems(prev => {
      const remaining = prev.filter(i => i.id !== itemId);
      const updated = remaining
        .sort((a, b) => a.order - b.order)
        .map((i, index) => ({ ...i, order: index + 1 }));
      persistItems(updated);
      return updated;
    });
  };

  const handleFlashSaleOrderChange = (itemId: string, newOrder: number) => {
    setFlashSaleItems(prev => {
      const updated = reorderProducts(prev, itemId, newOrder);
      persistItems(updated);
      return updated;
    });
  };

  const handleUpdateFlashSaleSettings = (updates: Partial<FlashSaleSettings>) => {
    setFlashSaleSettings(prev => {
      const updated = { ...prev, ...updates };
      saveDraftFlashSaleSettings(updated);
      return updated;
    });
  };

  const handleApplyFlashDiscount = () => {
    const { defaultDiscountPercentage, defaultFlashDays } = flashSaleSettings;
    setFlashSaleItems(prev => {
      reverseSyncRef.current = true;

      const updated = prev.map(item => {
        const applyDiscount = (target: FlashSaleItem): FlashSaleItem => {
          const price = parseFloat(target.price);
          const updatedTarget = {
            ...target,
            flashDiscountPercentage: defaultDiscountPercentage,
            flashDays: defaultFlashDays,
          };
          if (isNaN(price) || price <= 0 || defaultDiscountPercentage <= 0) return updatedTarget;
          const discounted = price * (1 - defaultDiscountPercentage / 100);
          const newPrice = discounted.toFixed(2);
          if (target.sourceProductId) {
            onUpdateProduct(target.sourceProductId, { newPrice });
          }
          return { ...updatedTarget, newPrice };
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

      setTimeout(() => { reverseSyncRef.current = false; }, 0);
      persistItems(updated);
      return updated;
    });
  };

  const handleResetAllDates = () => {
    const today = new Date().toISOString().split('T')[0];
    setFlashSaleItems(prev => {
      const updated = prev.map(item => {
        const resetItem = { ...item, flashStartDate: today };
        if (resetItem.isStackParent && resetItem.childItems) {
          resetItem.childItems = resetItem.childItems.map(child => ({ ...child, flashStartDate: today }));
        }
        return resetItem;
      });
      persistItems(updated);
      return updated;
    });
  };

  const handleResetItemDate = (itemId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setFlashSaleItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== itemId) return item;
        const resetItem = { ...item, flashStartDate: today };
        if (resetItem.isStackParent && resetItem.childItems) {
          resetItem.childItems = resetItem.childItems.map(child => ({ ...child, flashStartDate: today }));
        }
        return resetItem;
      });
      persistItems(updated);
      return updated;
    });
  };

  return {
    flashSaleItems,
    flashSaleSettings,
    activeFlashProductIds,
    handleAddFlashSaleItem,
    handleUpdateFlashSaleItem,
    handleUpdateFlashSaleChildItem,
    handleDeleteFlashSaleItem,
    handleFlashSaleOrderChange,
    handleUpdateFlashSaleSettings,
    handleApplyFlashDiscount,
    handleResetAllDates,
    handleResetItemDate,
  };
}
