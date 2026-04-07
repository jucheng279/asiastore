import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchAllData, type FetchedData, type DbCategory, type DbSubcategory, type Language } from './api';
import type { Product } from '../types';
import { fetchStoreSettings, isStoreOpen, getClosedMessage, getNextOpenTime, type StoreSettings } from './storeStatus';

const CACHE_KEY_PREFIX = 'asian_market_products_';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedData {
  data: FetchedData;
  timestamp: number;
}

function getCachedData(lang: Language): FetchedData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + lang);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + lang);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedData(lang: Language, data: FetchedData) {
  try {
    const cached: CachedData = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY_PREFIX + lang, JSON.stringify(cached));
  } catch {}
}

interface ProductDataState {
  isLoading: boolean;
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  catalogProducts: Product[];
  expiryProducts: Product[];
  flashSaleProducts: Product[];
  bestSellerProducts: Product[];
  allProducts: Product[];
  productMap: Map<string, Product>;
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshData: () => Promise<FetchedData | null>;
  orderingOpen: boolean;
  closedMessage: string;
  nextOpenTime: string;
}

const ProductDataContext = createContext<ProductDataState>({
  isLoading: true,
  categories: [],
  subcategories: [],
  catalogProducts: [],
  expiryProducts: [],
  flashSaleProducts: [],
  bestSellerProducts: [],
  allProducts: [],
  productMap: new Map(),
  language: 'en',
  setLanguage: () => {},
  refreshData: () => Promise.resolve(null),
  orderingOpen: true,
  closedMessage: '',
  nextOpenTime: '',
});

export function useProductData() {
  return useContext(ProductDataContext);
}

export function ProductDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FetchedData | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const isFetchingRef = useRef(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [orderingOpen, setOrderingOpen] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const check = async () => {
      const settings = await fetchStoreSettings();
      setStoreSettings(settings);
      setOrderingOpen(isStoreOpen(settings));
    };
    check();
    interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (storeSettings) {
      setOrderingOpen(isStoreOpen(storeSettings));
    }
  }, [storeSettings]);

  const loadData = useCallback(async (lang: Language) => {
    const cached = getCachedData(lang);
    if (cached) {
      setData(cached);
      setIsLoading(false);

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const fresh = await fetchAllData(lang);
        setData(fresh);
        setCachedData(lang, fresh);
      } catch {}
      isFetchingRef.current = false;
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchAllData(lang);
      setData(result);
      setCachedData(lang, result);
    } catch (err) {
      console.error('Failed to load product data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(language);
  }, [language, loadData]);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  const refreshData = useCallback(async (): Promise<FetchedData | null> => {
    for (const lang of ['en', 'sv', 'zh'] as Language[]) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + lang);
    }
    isFetchingRef.current = false;
    if (data) {
      try {
        const fresh = await fetchAllData(language);
        setData(fresh);
        setCachedData(language, fresh);
        return fresh;
      } catch {
        return null;
      }
    } else {
      await loadData(language);
      return null;
    }
  }, [language, loadData, data]);

  const catalogProducts = data?.catalogProducts || [];
  const expiryProducts = data?.expiryProducts || [];
  const flashSaleProducts = data?.flashSaleProducts || [];
  const bestSellerProducts = data?.bestSellerProducts || [];

  const { allProducts, productMap } = useMemo(() => {
    const allChildProducts: Product[] = [];
    for (const list of [catalogProducts, expiryProducts, flashSaleProducts]) {
      for (const p of list) {
        if (p.children) {
          allChildProducts.push(...p.children);
        }
      }
    }

    const all = [...catalogProducts, ...allChildProducts, ...expiryProducts, ...flashSaleProducts];
    const map = new Map<string, Product>();
    for (const p of all) {
      map.set(p.id, p);
      if (p.sourceProductId && !map.has(p.sourceProductId)) {
        map.set(p.sourceProductId, p);
      }
    }
    return { allProducts: all, productMap: map };
  }, [catalogProducts, expiryProducts, flashSaleProducts]);

  const closedMessage = storeSettings ? getClosedMessage(storeSettings, language) : '';
  const nextOpenTime = storeSettings ? getNextOpenTime(storeSettings, language) : '';

  return (
    <ProductDataContext.Provider
      value={{
        isLoading,
        categories: data?.categories || [],
        subcategories: data?.subcategories || [],
        catalogProducts,
        expiryProducts,
        flashSaleProducts,
        bestSellerProducts,
        allProducts,
        productMap,
        language,
        setLanguage: handleSetLanguage,
        refreshData,
        orderingOpen,
        closedMessage,
        nextOpenTime,
      }}
    >
      {children}
    </ProductDataContext.Provider>
  );
}
