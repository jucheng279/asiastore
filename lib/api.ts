import { supabase } from './supabase';
import type { Product } from '../types';

export type Language = 'en' | 'sv' | 'zh';

export interface DbCategory {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
}

export interface DbSubcategory {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
}

export interface FetchedData {
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  catalogProducts: Product[];
  expiryProducts: Product[];
  flashSaleProducts: Product[];
  bestSellerProducts: Product[];
}

interface DbProduct {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  parent_product_id: string | null;
  name_en: string;
  name_sv: string;
  name_zh: string;
  description_en: string;
  description_sv: string;
  description_zh: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  brand: string | null;
  stock: number;
  preserve: number;
  expiration: string | null;
  display_order: number;
  internal_order: number;
  visible: boolean;
  trending: boolean;
  flash: boolean;
  unit: string | null;
  tags: string[] | null;
  is_best_seller: boolean;
  is_new: boolean;
}

interface DbExpiryItem {
  id: string;
  source_product_id: string | null;
  parent_expiry_item_id: string | null;
  name_en: string;
  name_sv: string;
  name_zh: string;
  description_en: string;
  description_sv: string;
  description_zh: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  brand: string | null;
  expiration: string;
  display_order: number;
  internal_order: number;
  visible: boolean;
  discount_percentage: number | null;
  tags: string[] | null;
  stock: number;
  preserve: number;
}

interface DbFlashItem {
  id: string;
  source_product_id: string | null;
  parent_flash_item_id: string | null;
  name_en: string;
  name_sv: string;
  name_zh: string;
  description_en: string;
  description_sv: string;
  description_zh: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  brand: string | null;
  display_order: number;
  internal_order: number;
  visible: boolean;
  flash_days: number;
  flash_start_date: string;
  flash_discount_percentage: number;
  tags: string[] | null;
  stock: number;
  preserve: number;
}

function getName(row: { name_en: string; name_sv: string; name_zh: string }, lang: Language): string {
  return row[`name_${lang}`] || row.name_en || '';
}

function getDesc(row: { description_en: string; description_sv: string; description_zh: string }, lang: Language): string {
  return row[`description_${lang}`] || row.description_en || '';
}

function computeDiscount(price: number, salePrice: number | null): number | undefined {
  if (salePrice != null && price > 0 && salePrice < price) {
    return Math.round((1 - salePrice / price) * 100);
  }
  return undefined;
}

function applyChildAggregates(parent: Product, kids: Product[]): void {
  if (kids.length === 0) return;
  let lowestEffective = Infinity;
  let bestChild: Product | null = null;
  let totalStock = 0;
  let totalAvailable = 0;

  for (const k of kids) {
    const effective = k.price;
    if (effective < lowestEffective) {
      lowestEffective = effective;
      bestChild = k;
    }
    totalStock += k.stock ?? 0;
    totalAvailable += k.availableStock ?? 0;
  }

  if (bestChild) {
    parent.price = bestChild.price;
    parent.originalPrice = bestChild.originalPrice;
    parent.isSale = bestChild.isSale;
    parent.discountPercentage = bestChild.discountPercentage;
  }
  parent.stock = totalStock;
  parent.availableStock = totalAvailable;
}

function mapDbProduct(row: DbProduct, lang: Language): Product {
  const hasSale = row.sale_price != null && row.sale_price < row.price;
  const stock = row.stock || 0;
  const preserve = row.preserve || 0;
  return {
    id: row.id,
    name: getName(row, lang),
    brand: row.brand || undefined,
    price: hasSale ? row.sale_price! : row.price,
    originalPrice: hasSale ? row.price : undefined,
    image: row.image_url,
    tags: row.tags || undefined,
    isBestSeller: row.is_best_seller || row.trending,
    isNew: row.is_new,
    isSale: hasSale,
    unit: row.unit || undefined,
    description: getDesc(row, lang),
    expiryDate: row.expiration || undefined,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id || undefined,
    parentProductId: row.parent_product_id || undefined,
    discountPercentage: computeDiscount(row.price, row.sale_price),
    hasChildren: false,
    stock,
    availableStock: Math.max(0, stock - preserve),
  };
}

function mapExpiry(row: DbExpiryItem, lang: Language): Product {
  const hasSale = row.sale_price != null && row.sale_price < row.price;
  const stock = row.stock || 0;
  const preserve = row.preserve || 0;
  return {
    id: row.id,
    name: getName(row, lang),
    brand: row.brand || undefined,
    price: hasSale ? row.sale_price! : row.price,
    originalPrice: hasSale ? row.price : undefined,
    image: row.image_url,
    tags: row.tags || undefined,
    expiryDate: row.expiration,
    isNearExpiry: true,
    description: getDesc(row, lang),
    discountPercentage: computeDiscount(row.price, row.sale_price),
    sourceProductId: row.source_product_id || undefined,
    parentProductId: row.parent_expiry_item_id || undefined,
    hasChildren: false,
    stock,
    availableStock: Math.max(0, stock - preserve),
  };
}

function mapFlash(row: DbFlashItem, lang: Language): Product {
  const hasSale = row.sale_price != null && row.sale_price < row.price;
  const endDate = new Date(row.flash_start_date);
  endDate.setDate(endDate.getDate() + row.flash_days);
  const isExpired = endDate.getTime() < Date.now();
  const stock = row.stock || 0;
  const preserve = row.preserve || 0;

  return {
    id: row.id,
    name: getName(row, lang),
    brand: row.brand || undefined,
    price: hasSale ? row.sale_price! : row.price,
    originalPrice: hasSale ? row.price : undefined,
    image: row.image_url,
    tags: row.tags || undefined,
    isFlashSale: !isExpired,
    flashStartDate: row.flash_start_date,
    flashDays: row.flash_days,
    discountPercentage: row.flash_discount_percentage,
    description: getDesc(row, lang),
    sourceProductId: row.source_product_id || undefined,
    parentProductId: row.parent_flash_item_id || undefined,
    hasChildren: false,
    stock,
    availableStock: Math.max(0, stock - preserve),
  };
}

export async function fetchAllData(lang: Language): Promise<FetchedData> {
  const [catRes, subRes, prodRes, expiryRes, flashRes] = await Promise.all([
    supabase.from('categories').select('*').order('display_order'),
    supabase.from('subcategories').select('*').order('display_order'),
    supabase.from('products').select('*').order('display_order'),
    supabase.from('expiry_items').select('*').order('display_order'),
    supabase.from('flash_sale_items').select('*').order('display_order'),
  ]);

  const categories: DbCategory[] = (catRes.data || []).map(
    (r: { id: string; name_en: string; name_sv: string; name_zh: string; image_url: string; display_order: number }) => ({
      id: r.id,
      name: r[`name_${lang}`] || r.name_en || '',
      image_url: r.image_url,
      display_order: r.display_order,
    }),
  );

  const subcategories: DbSubcategory[] = (subRes.data || []).map(
    (r: { id: string; category_id: string; name_en: string; name_sv: string; name_zh: string; display_order: number }) => ({
      id: r.id,
      category_id: r.category_id,
      name: r[`name_${lang}`] || r.name_en || '',
      display_order: r.display_order,
    }),
  );

  const allDbProducts: DbProduct[] = prodRes.data || [];
  const parentProducts = allDbProducts.filter((p) => !p.parent_product_id && p.visible);
  const childProducts = allDbProducts.filter((p) => p.parent_product_id);

  const catalogParents = parentProducts;

  const activeFlashMap = new Map<string, DbFlashItem>();
  const standaloneFlashItems: DbFlashItem[] = [];
  const allFlashRows: DbFlashItem[] = flashRes.data || [];
  allFlashRows.forEach((f: DbFlashItem) => {
    if (!f.visible || f.parent_flash_item_id) return;
    const endDate = new Date(f.flash_start_date);
    endDate.setDate(endDate.getDate() + f.flash_days);
    if (endDate.getTime() > Date.now()) {
      if (f.source_product_id) {
        activeFlashMap.set(f.source_product_id, f);
      } else {
        standaloneFlashItems.push(f);
      }
    }
  });

  const catalogProducts: Product[] = catalogParents.map((p) => {
    const fp = mapDbProduct(p, lang);
    const flashItem = activeFlashMap.get(p.id);
    if (flashItem) {
      fp.isFlashSale = true;
      fp.flashStartDate = flashItem.flash_start_date;
      fp.flashDays = flashItem.flash_days;
      fp.discountPercentage = flashItem.flash_discount_percentage;
      if (flashItem.sale_price != null && flashItem.sale_price < flashItem.price) {
        fp.price = flashItem.sale_price;
        fp.originalPrice = flashItem.price;
      }
    }
    const kids = childProducts
      .filter((c) => c.parent_product_id === p.id)
      .sort((a, b) => a.internal_order - b.internal_order)
      .map((c) => mapDbProduct(c, lang));
    if (kids.length > 0) {
      fp.hasChildren = true;
      fp.children = kids;
      applyChildAggregates(fp, kids);
    }
    return fp;
  });

  const allExpiryRows: DbExpiryItem[] = (expiryRes.data || []).filter((r: DbExpiryItem) => r.visible);
  const expiryParents = allExpiryRows.filter((r) => !r.parent_expiry_item_id);
  const expiryChildren = allExpiryRows.filter((r) => r.parent_expiry_item_id);
  const expiryProducts: Product[] = expiryParents.map((r) => {
    const fp = mapExpiry(r, lang);
    const kids = expiryChildren
      .filter((c) => c.parent_expiry_item_id === r.id)
      .sort((a, b) => a.internal_order - b.internal_order)
      .map((c) => mapExpiry(c, lang));
    if (kids.length > 0) {
      fp.hasChildren = true;
      fp.children = kids;
      applyChildAggregates(fp, kids);
    }
    return fp;
  });

  const flashChildren = allFlashRows.filter((f) => f.visible && f.parent_flash_item_id);
  const flashSaleProducts: Product[] = [
    ...Array.from(activeFlashMap.values()).map((r) => {
      const fp = mapFlash(r, lang);
      const kids = flashChildren
        .filter((c) => c.parent_flash_item_id === r.id)
        .sort((a, b) => a.internal_order - b.internal_order)
        .map((c) => mapFlash(c, lang));
      if (kids.length > 0) {
        fp.hasChildren = true;
        fp.children = kids;
        applyChildAggregates(fp, kids);
      }
      return fp;
    }),
    ...standaloneFlashItems.map((r) => {
      const fp = mapFlash(r, lang);
      const kids = flashChildren
        .filter((c) => c.parent_flash_item_id === r.id)
        .sort((a, b) => a.internal_order - b.internal_order)
        .map((c) => mapFlash(c, lang));
      if (kids.length > 0) {
        fp.hasChildren = true;
        fp.children = kids;
        applyChildAggregates(fp, kids);
      }
      return fp;
    }),
  ];

  const bestSellerProducts: Product[] = catalogProducts.filter((p) => {
    const dbProd = allDbProducts.find((d) => d.id === p.id);
    return dbProd?.trending;
  });

  return {
    categories,
    subcategories,
    catalogProducts,
    expiryProducts,
    flashSaleProducts,
    bestSellerProducts,
  };
}
