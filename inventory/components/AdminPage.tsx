import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { Category, SubCategory, Product, ProductNames, Language, ActiveView, AdminStoreSettings } from '../types';
import { CategorySidebar, SearchResult } from './CategorySidebar';
import { ProductTable } from './ProductTable';
import { ExpiryItemsPanel } from './ExpiryItemsPanel';
import { FlashSalesPanel } from './FlashSalesPanel';
import { UsersPanel } from './UsersPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { StoreSettingsPanel } from './StoreSettingsPanel';
import { OrderSummaryPanel } from './OrderSummaryPanel';
import { reorderProducts, getNextOrder } from '../hooks/useProductOrder';
import { useExpiryItems } from '../hooks/useExpiryItems';
import { useFlashSaleItems } from '../hooks/useFlashSaleItems';
import {
  pushUpdate,
  loadDraftFromDb,
  fetchLivePreserveMap,
  saveDraftCategory,
  deleteDraftCategory,
  saveDraftSubCategory,
  deleteDraftSubCategory,
  saveDraftProduct,
  saveDraftProducts,
  deleteDraftProduct,
  deleteDraftProducts,
  normalizeProductOrders,
  saveDraftStoreSettings,
} from '../../lib/inventoryDb';
import type { LoadedData } from '../../lib/inventoryDb';
import { supabase } from '../../lib/supabase';
import { resizeCategoryImage } from '../utils/imageResize';
import { debounce } from '../utils/debounce';

interface AdminPageProps {
  onSignOut: () => void;
}

const NAV_STATE_KEY = 'inventory_nav_state';

function loadNavState() {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveNavState(state: {
  activeView: ActiveView;
  selectedCategoryId: string | null;
  selectedSubCategoryId: string | null;
  currentLanguage: Language;
}) {
  try {
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function AdminPage({ onSignOut }: AdminPageProps) {
  const savedNav = useRef(loadNavState());
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(savedNav.current?.selectedCategoryId ?? null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(savedNav.current?.selectedSubCategoryId ?? null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(savedNav.current?.currentLanguage ?? 'en');
  const [activeView, setActiveView] = useState<ActiveView>(savedNav.current?.activeView ?? 'categories');
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [categoryImageUploading, setCategoryImageUploading] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [initialData, setInitialData] = useState<LoadedData | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [storeSettings, setStoreSettings] = useState<AdminStoreSettings>({
    orderingMode: 'auto',
    orderingEnabled: true,
    autoOpenDay: 1,
    autoOpenTime: '00:00',
    autoCloseDay: 5,
    autoCloseTime: '12:00',
    closedMessageEn: '',
    closedMessageSv: '',
    closedMessageZh: '',
    storeAddress: { street: '', postalCode: '', city: '', lat: null, lon: null },
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveNavState({ activeView, selectedCategoryId, selectedSubCategoryId, currentLanguage });
  }, [activeView, selectedCategoryId, selectedSubCategoryId, currentLanguage]);

  const showSaveStatus = useCallback(() => {
    setDraftSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setDraftSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setDraftSaveStatus('idle'), 2000);
    }, 300);
  }, []);

  const debouncedSaveDraftProduct = useMemo(
    () => debounce((product: Product) => {
      saveDraftProduct(product);
      showSaveStatus();
    }, 300),
    [showSaveStatus]
  );

  const expiryOptions = useMemo(() => {
    if (!initialData) return undefined;
    return {
      initialItems: initialData.expiryItems,
      initialSettings: initialData.expirySettings,
    };
  }, [initialData]);

  const handleUpdateProduct = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const updated = prev.map(p => (p.id === productId ? { ...p, ...updates } : p));
      const changedProduct = updated.find(p => p.id === productId);
      if (changedProduct) {
        debouncedSaveDraftProduct(changedProduct);
      }
      return updated;
    });
  }, [debouncedSaveDraftProduct]);

  const {
    expiryItems,
    expirySettings,
    handleAddExpiryItem,
    handleUpdateExpiryItem,
    handleUpdateExpiryChildItem,
    handleDeleteExpiryItem,
    handleExpiryOrderChange,
    handleUpdateExpirySettings,
    handleApplyDiscount,
  } = useExpiryItems(products, expiryOptions);

  const flashOptions = useMemo(() => {
    if (!initialData) return undefined;
    return {
      initialItems: initialData.flashSaleItems,
      initialSettings: initialData.flashSaleSettings,
    };
  }, [initialData]);

  const {
    flashSaleItems,
    flashSaleSettings,
    handleAddFlashSaleItem,
    handleUpdateFlashSaleItem,
    handleUpdateFlashSaleChildItem,
    handleDeleteFlashSaleItem,
    handleFlashSaleOrderChange,
    handleUpdateFlashSaleSettings,
    handleApplyFlashDiscount,
    handleResetAllDates,
    handleResetItemDate,
  } = useFlashSaleItems(products, handleUpdateProduct, flashOptions);

  useEffect(() => {
    loadDraftFromDb().then(data => {
      const { normalized, changed } = normalizeProductOrders(data.products);
      setCategories(data.categories);
      setProducts(normalized);
      setInitialData({ ...data, products: normalized });
      setStoreSettings(data.storeSettings);
      setIsLoading(false);
      if (changed.length > 0) {
        saveDraftProducts(changed);
      }
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(async () => {
      try {
        const preserveMap = await fetchLivePreserveMap();
        setProducts(prev => prev.map(p => {
          const live = preserveMap.get(p.id);
          return live !== undefined ? { ...p, preserve: live } : p;
        }));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handlePushUpdate = useCallback(async () => {
    setPushStatus('pushing');
    setPushError(undefined);
    const result = await pushUpdate();
    if (result.success) {
      setPushStatus('success');
      setTimeout(() => setPushStatus('idle'), 3000);
    } else {
      setPushStatus('error');
      setPushError(result.error);
      setTimeout(() => setPushStatus('idle'), 5000);
    }
  }, []);

  const handleAddCategory = (name: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      names: { en: name, sv: '', zh: '' },
      imageUrl: '',
      isCollapsed: true,
      subCategories: [],
    };
    setCategories(prev => {
      const updated = [...prev, newCategory];
      saveDraftCategory(newCategory, updated.length);
      showSaveStatus();
      return updated;
    });
  };

  const handleAddSubCategory = (categoryId: string, name: string) => {
    const newSub: SubCategory = {
      id: crypto.randomUUID(),
      name,
      names: { en: name, sv: '', zh: '' },
      parentId: categoryId,
      isCollapsed: true,
    };
    setCategories(prev => {
      const updated = prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, subCategories: [...cat.subCategories, newSub] }
          : cat
      );
      const cat = updated.find(c => c.id === categoryId);
      if (cat) {
        saveDraftSubCategory(categoryId, newSub, cat.subCategories.length);
        showSaveStatus();
      }
      return updated;
    });
  };

  const handleRenameCategory = (categoryId: string, names: ProductNames) => {
    const displayName = names.en || names.sv || names.zh;
    setCategories(prev => {
      const updated = prev.map(cat => (cat.id === categoryId ? { ...cat, name: displayName, names } : cat));
      const idx = updated.findIndex(c => c.id === categoryId);
      if (idx !== -1) {
        saveDraftCategory(updated[idx], idx + 1);
        showSaveStatus();
      }
      return updated;
    });
  };

  const handleRenameSubCategory = (
    categoryId: string,
    subCategoryId: string,
    names: ProductNames
  ) => {
    const displayName = names.en || names.sv || names.zh;
    setCategories(prev => {
      const updated = prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.map(sub =>
                sub.id === subCategoryId ? { ...sub, name: displayName, names } : sub
              ),
            }
          : cat
      );
      const cat = updated.find(c => c.id === categoryId);
      const sub = cat?.subCategories.find(s => s.id === subCategoryId);
      if (cat && sub) {
        const idx = cat.subCategories.indexOf(sub);
        saveDraftSubCategory(categoryId, sub, idx + 1);
        showSaveStatus();
      }
      return updated;
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setProducts(prev => prev.filter(p => p.categoryId !== categoryId));
    deleteDraftCategory(categoryId);
    showSaveStatus();
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(null);
      setSelectedSubCategoryId(null);
    }
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId),
            }
          : cat
      )
    );
    const productsToDelete = products.filter(p => p.subCategoryId === subCategoryId);
    setProducts(prev => prev.filter(p => p.subCategoryId !== subCategoryId));
    deleteDraftSubCategory(subCategoryId);
    if (productsToDelete.length > 0) {
      deleteDraftProducts(productsToDelete.map(p => p.id));
    }
    showSaveStatus();
    if (selectedSubCategoryId === subCategoryId) {
      setSelectedSubCategoryId(null);
    }
  };

  const handleCategoryImageUpload = useCallback(async (file: File) => {
    if (!selectedCategoryId) return;
    setCategoryImageUploading(true);
    try {
      const resized = await resizeCategoryImage(file);
      const path = `${selectedCategoryId}.jpg`;
      await supabase.storage
        .from('category-images')
        .remove([`${selectedCategoryId}.svg`]);
      const { error: uploadErr } = await supabase.storage
        .from('category-images')
        .upload(path, resized, { contentType: 'image/jpeg', upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('category-images')
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setCategories(prev => {
        const updated = prev.map(cat =>
          cat.id === selectedCategoryId ? { ...cat, imageUrl: publicUrl } : cat
        );
        const idx = updated.findIndex(c => c.id === selectedCategoryId);
        if (idx !== -1) {
          saveDraftCategory(updated[idx], idx + 1);
          showSaveStatus();
        }
        return updated;
      });
    } catch (err) {
      console.error('Category image upload failed:', err);
    } finally {
      setCategoryImageUploading(false);
    }
  }, [selectedCategoryId, showSaveStatus]);

  const handleCategoryImageRemove = useCallback(async () => {
    if (!selectedCategoryId) return;
    setCategoryImageUploading(true);
    try {
      await supabase.storage
        .from('category-images')
        .remove([`${selectedCategoryId}.jpg`, `${selectedCategoryId}.svg`]);
      setCategories(prev => {
        const updated = prev.map(cat =>
          cat.id === selectedCategoryId ? { ...cat, imageUrl: '' } : cat
        );
        const idx = updated.findIndex(c => c.id === selectedCategoryId);
        if (idx !== -1) {
          saveDraftCategory(updated[idx], idx + 1);
          showSaveStatus();
        }
        return updated;
      });
    } catch (err) {
      console.error('Category image remove failed:', err);
    } finally {
      setCategoryImageUploading(false);
    }
  }, [selectedCategoryId, showSaveStatus]);

  const handleToggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat
      )
    );
  };

  const handleToggleSubCategory = (categoryId: string, subCategoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.map(sub =>
                sub.id === subCategoryId
                  ? { ...sub, isCollapsed: !sub.isCollapsed }
                  : sub
              ),
            }
          : cat
      )
    );
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryId(null);
    setActiveView('categories');
  };

  const handleSelectSubCategory = (categoryId: string, subCategoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryId(subCategoryId);
    setActiveView('categories');
  };

  const handleSelectExpiryView = () => {
    setActiveView('expiry');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleSelectFlashSalesView = () => {
    setActiveView('flashSales');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleSelectUsersView = () => {
    setActiveView('users');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleSelectOrderSummaryView = () => {
    setActiveView('orderSummary');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleSelectDiagnosticsView = () => {
    setActiveView('diagnostics');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleSelectStoreSettingsView = () => {
    setActiveView('storeSettings');
    setSelectedCategoryId(null);
    setSelectedSubCategoryId(null);
  };

  const handleUpdateStoreSettings = useCallback((updates: Partial<AdminStoreSettings>) => {
    setStoreSettings(prev => {
      const next = { ...prev, ...updates };
      saveDraftStoreSettings(next);
      showSaveStatus();
      return next;
    });
  }, [showSaveStatus]);

  const handleSearchNavigate = useCallback((result: SearchResult) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    if (result.type === 'expiry') {
      setActiveView('expiry');
      setSelectedCategoryId(null);
      setSelectedSubCategoryId(null);
      setHighlightedProductId(result.id);
      highlightTimerRef.current = setTimeout(() => setHighlightedProductId(null), 3000);
      return;
    }

    if (result.type === 'flash') {
      setActiveView('flashSales');
      setSelectedCategoryId(null);
      setSelectedSubCategoryId(null);
      setHighlightedProductId(result.id);
      highlightTimerRef.current = setTimeout(() => setHighlightedProductId(null), 3000);
      return;
    }

    const target = result.parentProductId
      ? products.find(p => p.id === result.parentProductId) || result
      : result;

    setActiveView('categories');
    setSelectedCategoryId(target.categoryId);
    setSelectedSubCategoryId(target.subCategoryId);
    setHighlightedProductId(result.id);
    highlightTimerRef.current = setTimeout(() => setHighlightedProductId(null), 3000);
  }, [products]);

  const getFilteredProducts = (): Product[] => {
    if (!selectedCategoryId) return [];

    if (selectedSubCategoryId) {
      return products.filter(p => p.subCategoryId === selectedSubCategoryId && p.parentProductId === null);
    }

    return products.filter(p => p.categoryId === selectedCategoryId && p.parentProductId === null);
  };

  const getSubProducts = (parentProductId: string): Product[] => {
    return products
      .filter(p => p.parentProductId === parentProductId)
      .sort((a, b) => a.internalOrder - b.internalOrder);
  };

  const handleAddProduct = () => {
    if (!selectedCategoryId) return;

    const scopedProducts = selectedSubCategoryId
      ? products.filter(p => p.subCategoryId === selectedSubCategoryId && p.parentProductId === null)
      : products.filter(p => p.categoryId === selectedCategoryId && !p.subCategoryId && p.parentProductId === null);

    const newProduct: Product = {
      id: crypto.randomUUID(),
      names: { en: '', sv: '', zh: '' },
      price: '',
      newPrice: '',
      stock: '',
      preserve: 0,
      expiration: '',
      descriptions: { en: '', sv: '', zh: '' },
      photos: [],
      order: getNextOrder(scopedProducts),
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId,
      visible: true,
      trending: false,
      flash: false,
      parentProductId: null,
      internalOrder: 0,
    };
    setProducts(prev => [...prev, newProduct]);
    saveDraftProduct(newProduct);
    showSaveStatus();
  };

  const handleAddSubProduct = (parentProductId: string) => {
    const parent = products.find(p => p.id === parentProductId);
    if (!parent) return;

    const siblings = products.filter(p => p.parentProductId === parentProductId);

    const newSubProduct: Product = {
      id: crypto.randomUUID(),
      names: { ...parent.names },
      price: parent.price,
      newPrice: parent.newPrice,
      stock: parent.stock,
      preserve: parent.preserve,
      expiration: parent.expiration,
      descriptions: { ...parent.descriptions },
      photos: parent.photos.map(p => ({ ...p })),
      order: parent.order,
      categoryId: parent.categoryId,
      subCategoryId: parent.subCategoryId,
      visible: parent.visible,
      trending: parent.trending,
      flash: parent.flash,
      parentProductId: parentProductId,
      internalOrder: getNextOrder(siblings.map(s => ({ ...s, order: s.internalOrder }))),
    };
    setProducts(prev => [...prev, newSubProduct]);
    saveDraftProduct(newSubProduct);
    showSaveStatus();
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.parentProductId) {
      setProducts(prev => {
        const remaining = prev.filter(p => p.id !== productId);
        const siblings = remaining
          .filter(p => p.parentProductId === product.parentProductId)
          .sort((a, b) => a.internalOrder - b.internalOrder)
          .map((p, index) => ({ ...p, internalOrder: index + 1 }));

        const result = remaining.map(p => {
          const reordered = siblings.find(s => s.id === p.id);
          return reordered || p;
        });

        deleteDraftProduct(productId);
        if (siblings.length > 0) {
          saveDraftProducts(siblings);
        }
        showSaveStatus();
        return result;
      });
      return;
    }

    const childIds = products.filter(p => p.parentProductId === productId).map(p => p.id);

    setProducts(prev => {
      const remaining = prev.filter(p => p.id !== productId && p.parentProductId !== productId);
      const scopedProducts = product.subCategoryId
        ? remaining.filter(p => p.subCategoryId === product.subCategoryId && p.parentProductId === null)
        : remaining.filter(p => p.categoryId === product.categoryId && !p.subCategoryId && p.parentProductId === null);

      const reordered = scopedProducts
        .sort((a, b) => a.order - b.order)
        .map((p, index) => ({ ...p, order: index + 1 }));

      const otherProducts = remaining.filter(p => {
        if (p.parentProductId !== null) return true;
        if (product.subCategoryId) {
          return p.subCategoryId !== product.subCategoryId;
        }
        return !(p.categoryId === product.categoryId && !p.subCategoryId);
      });

      const result = [...otherProducts, ...reordered];
      deleteDraftProduct(productId);
      if (childIds.length > 0) {
        deleteDraftProducts(childIds);
      }
      if (reordered.length > 0) {
        saveDraftProducts(reordered);
      }
      showSaveStatus();
      return result;
    });
  };

  const handleOrderChange = (productId: string, newOrder: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const scopedProducts = product.subCategoryId
      ? products.filter(p => p.subCategoryId === product.subCategoryId && p.parentProductId === null)
      : products.filter(p => p.categoryId === product.categoryId && !p.subCategoryId && p.parentProductId === null);

    const reorderedScoped = reorderProducts(scopedProducts, productId, newOrder);

    setProducts(prev => {
      const otherProducts = prev.filter(p => {
        if (p.parentProductId !== null) return true;
        if (product.subCategoryId) {
          return p.subCategoryId !== product.subCategoryId;
        }
        return !(p.categoryId === product.categoryId && !p.subCategoryId);
      });
      return [...otherProducts, ...reorderedScoped];
    });
    saveDraftProducts(reorderedScoped);
    showSaveStatus();
  };

  const handleSubProductOrderChange = (subProductId: string, newOrder: number) => {
    const subProduct = products.find(p => p.id === subProductId);
    if (!subProduct || !subProduct.parentProductId) return;

    const siblings = products
      .filter(p => p.parentProductId === subProduct.parentProductId)
      .map(p => ({ ...p, order: p.internalOrder }));

    const reordered = reorderProducts(siblings, subProductId, newOrder);

    const reorderedWithInternal = reordered.map(r => ({ ...r, internalOrder: r.order }));

    setProducts(prev =>
      prev.map(p => {
        const updated = reorderedWithInternal.find(r => r.id === p.id);
        if (updated) {
          return { ...p, internalOrder: updated.internalOrder };
        }
        return p;
      })
    );
    saveDraftProducts(reorderedWithInternal);
    showSaveStatus();
  };

  const getSelectedCategoryName = (): string => {
    if (!selectedCategoryId) return 'Select a category';

    const category = categories.find(c => c.id === selectedCategoryId);
    if (!category) return 'Select a category';

    if (selectedSubCategoryId) {
      const subCategory = category.subCategories.find(
        s => s.id === selectedSubCategoryId
      );
      return subCategory ? `${category.name} / ${subCategory.name}` : category.name;
    }

    return category.name;
  };

  const renderMainContent = () => {
    if (activeView === 'expiry') {
      return (
        <ExpiryItemsPanel
          items={expiryItems}
          expirySettings={expirySettings}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          onAddItem={handleAddExpiryItem}
          onUpdateItem={handleUpdateExpiryItem}
          onUpdateChildItem={handleUpdateExpiryChildItem}
          onDeleteItem={handleDeleteExpiryItem}
          onOrderChange={handleExpiryOrderChange}
          onUpdateSettings={handleUpdateExpirySettings}
          onApplyDiscount={handleApplyDiscount}
          highlightedProductId={highlightedProductId}
        />
      );
    }

    if (activeView === 'users') {
      return (
        <UsersPanel onUserCountChange={setUserCount} />
      );
    }

    if (activeView === 'orderSummary') {
      return (
        <OrderSummaryPanel
          storeSettings={storeSettings}
          onOrderCountChange={setOrderCount}
        />
      );
    }

    if (activeView === 'diagnostics') {
      return <DiagnosticsPanel />;
    }

    if (activeView === 'storeSettings') {
      return (
        <StoreSettingsPanel
          settings={storeSettings}
          onUpdate={handleUpdateStoreSettings}
        />
      );
    }

    if (activeView === 'flashSales') {
      return (
        <FlashSalesPanel
          items={flashSaleItems}
          flashSaleSettings={flashSaleSettings}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          onAddItem={handleAddFlashSaleItem}
          onUpdateItem={handleUpdateFlashSaleItem}
          onUpdateChildItem={handleUpdateFlashSaleChildItem}
          onDeleteItem={handleDeleteFlashSaleItem}
          onOrderChange={handleFlashSaleOrderChange}
          onUpdateSettings={handleUpdateFlashSaleSettings}
          onApplyDiscount={handleApplyFlashDiscount}
          onResetAllDates={handleResetAllDates}
          onResetItemDate={handleResetItemDate}
          highlightedProductId={highlightedProductId}
        />
      );
    }

    if (selectedCategoryId) {
      return (
        <ProductTable
          products={getFilteredProducts()}
          allProducts={products}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onOrderChange={handleOrderChange}
          onAddSubProduct={handleAddSubProduct}
          onSubProductOrderChange={handleSubProductOrderChange}
          getSubProducts={getSubProducts}
          categoryName={getSelectedCategoryName()}
          subCategories={
            categories.find(c => c.id === selectedCategoryId)?.subCategories || []
          }
          isMainCategoryView={!selectedSubCategoryId}
          categoryImageUrl={categories.find(c => c.id === selectedCategoryId)?.imageUrl}
          categoryImageUploading={categoryImageUploading}
          onCategoryImageUpload={handleCategoryImageUpload}
          onCategoryImageRemove={handleCategoryImageRemove}
          highlightedProductId={highlightedProductId}
        />
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-6">
            <Package size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Product Management
          </h2>
          <p className="text-slate-500 mb-6">
            Select a category from the sidebar to view and manage products, or create a new category to get started.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
            <ArrowRight size={16} />
            <span>Choose a category to begin</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100">
      <CategorySidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        selectedSubCategoryId={selectedSubCategoryId}
        activeView={activeView}
        expiryItemCount={expiryItems.length}
        flashSaleItemCount={flashSaleItems.length}
        pushStatus={pushStatus}
        pushError={pushError}
        draftSaveStatus={draftSaveStatus}
        onSelectCategory={handleSelectCategory}
        onSelectSubCategory={handleSelectSubCategory}
        onSelectExpiryView={handleSelectExpiryView}
        onSelectFlashSalesView={handleSelectFlashSalesView}
        onSelectUsersView={handleSelectUsersView}
        onSelectOrderSummaryView={handleSelectOrderSummaryView}
        onSelectDiagnosticsView={handleSelectDiagnosticsView}
        onSelectStoreSettingsView={handleSelectStoreSettingsView}
        userCount={userCount}
        orderCount={orderCount}
        onAddCategory={handleAddCategory}
        onAddSubCategory={handleAddSubCategory}
        onRenameCategory={handleRenameCategory}
        onRenameSubCategory={handleRenameSubCategory}
        onDeleteCategory={handleDeleteCategory}
        onDeleteSubCategory={handleDeleteSubCategory}
        onToggleCategory={handleToggleCategory}
        onToggleSubCategory={handleToggleSubCategory}
        onPushUpdate={handlePushUpdate}
        products={products}
        expiryItems={expiryItems}
        flashSaleItems={flashSaleItems}
        onSearchNavigate={handleSearchNavigate}
        onSignOut={onSignOut}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  );
}
