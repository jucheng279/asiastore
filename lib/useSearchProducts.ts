import { useMemo } from 'react';
import type { Product } from '../types';

interface SearchParams {
  lang?: string;
  category?: string | null;
  subcategory?: string | null;
  search?: string;
  priceRanges?: { min: number; max: number }[];
  onSale?: boolean;
  bestSellers?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
  fallbackProducts?: Product[];
}

interface SearchResult {
  products: Product[];
  totalCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
}

export function useSearchProducts(params: SearchParams): SearchResult {
  return useMemo(() => {
    const allProducts = params.fallbackProducts || [];
    if (allProducts.length === 0) {
      return { products: [], totalCount: 0, page: 1, totalPages: 0, isLoading: false };
    }

    let result = allProducts;

    if (params.category) {
      result = result.filter(p => p.categoryId === params.category);
    }

    if (params.subcategory) {
      result = result.filter(p => p.subcategoryId === params.subcategory);
    }

    if (params.search?.trim()) {
      const q = params.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    if (params.priceRanges && params.priceRanges.length > 0) {
      const min = Math.min(...params.priceRanges.map(r => r.min));
      const max = Math.max(...params.priceRanges.map(r => r.max));
      result = result.filter(p => p.price >= min && (max >= 1000 || p.price < max));
    }

    if (params.onSale) {
      result = result.filter(p => p.isSale || p.isFlashSale);
    }

    if (params.bestSellers) {
      result = result.filter(p => p.isBestSeller);
    }

    const totalCount = result.length;

    switch (params.sortBy) {
      case 'price-low':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result = [...result].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'popular':
      default:
        result = [...result].sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
    }

    const page = params.page || 1;
    const limit = params.limit || 40;
    const offset = (page - 1) * limit;
    const paged = result.slice(offset, offset + limit);

    return {
      products: paged,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      isLoading: false,
    };
  }, [
    params.fallbackProducts,
    params.category,
    params.subcategory,
    params.search,
    JSON.stringify(params.priceRanges),
    params.onSale,
    params.bestSellers,
    params.sortBy,
    params.page,
    params.limit,
  ]);
}
