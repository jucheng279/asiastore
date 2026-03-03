import { supabase } from './supabase';
import type {
  Category,
  SubCategory,
  Product,
  ExpiryItem,
  ExpirySettings,
  FlashSaleItem,
  FlashSaleSettings,
} from '../inventory/types';

function productToDbRow(p: Product) {
  return {
    id: p.id,
    category_id: p.categoryId,
    subcategory_id: p.subCategoryId || null,
    parent_product_id: p.parentProductId || null,
    name_en: p.names.en,
    name_sv: p.names.sv,
    name_zh: p.names.zh,
    description_en: p.descriptions.en,
    description_sv: p.descriptions.sv,
    description_zh: p.descriptions.zh,
    price: p.price ? parseFloat(p.price) : 0,
    sale_price: p.newPrice ? parseFloat(p.newPrice) : null,
    image_url: p.photos.length > 0 ? p.photos[0].url : '',
    stock: p.stock ? parseInt(p.stock, 10) : 0,
    preserve: p.preserve || 0,
    expiration: p.expiration || null,
    display_order: p.order,
    internal_order: p.internalOrder,
    visible: p.visible,
    trending: p.trending,
    flash: p.flash,
  };
}

function expiryItemToDbRow(item: ExpiryItem) {
  return {
    id: item.id,
    source_product_id: item.sourceProductId || null,
    parent_expiry_item_id: item.parentProductId || null,
    name_en: item.names.en,
    name_sv: item.names.sv,
    name_zh: item.names.zh,
    description_en: item.descriptions.en,
    description_sv: item.descriptions.sv,
    description_zh: item.descriptions.zh,
    price: item.price ? parseFloat(item.price) : 0,
    sale_price: item.newPrice ? parseFloat(item.newPrice) : null,
    image_url: item.photos.length > 0 ? item.photos[0].url : '',
    expiration: item.expiration || new Date().toISOString().split('T')[0],
    display_order: item.order,
    internal_order: item.internalOrder,
    visible: item.visible,
    stock: item.stock ? parseInt(item.stock, 10) : 0,
    preserve: item.preserve || 0,
  };
}

function flashItemToDbRow(item: FlashSaleItem) {
  return {
    id: item.id,
    source_product_id: item.sourceProductId || null,
    parent_flash_item_id: item.parentProductId || null,
    name_en: item.names.en,
    name_sv: item.names.sv,
    name_zh: item.names.zh,
    description_en: item.descriptions.en,
    description_sv: item.descriptions.sv,
    description_zh: item.descriptions.zh,
    price: item.price ? parseFloat(item.price) : 0,
    sale_price: item.newPrice ? parseFloat(item.newPrice) : null,
    image_url: item.photos.length > 0 ? item.photos[0].url : '',
    display_order: item.order,
    internal_order: item.internalOrder,
    visible: item.visible,
    stock: item.stock ? parseInt(item.stock, 10) : 0,
    preserve: item.preserve || 0,
    flash_days: item.flashDays,
    flash_start_date: item.flashStartDate || new Date().toISOString().split('T')[0],
    flash_discount_percentage: item.flashDiscountPercentage,
  };
}

function flattenExpiryItems(items: ExpiryItem[]): ExpiryItem[] {
  const flat: ExpiryItem[] = [];
  for (const item of items) {
    const copy = { ...item };
    delete (copy as any).childItems;
    delete (copy as any).isStackParent;
    flat.push(copy);
    if (item.childItems) {
      for (const child of item.childItems) {
        const childCopy = { ...child, parentProductId: item.id };
        delete (childCopy as any).childItems;
        delete (childCopy as any).isStackParent;
        flat.push(childCopy);
      }
    }
  }
  return flat;
}

function flattenFlashItems(items: FlashSaleItem[]): FlashSaleItem[] {
  const flat: FlashSaleItem[] = [];
  for (const item of items) {
    const copy = { ...item };
    delete (copy as any).childItems;
    delete (copy as any).isStackParent;
    flat.push(copy);
    if (item.childItems) {
      for (const child of item.childItems) {
        const childCopy = { ...child, parentProductId: item.id };
        delete (childCopy as any).childItems;
        delete (childCopy as any).isStackParent;
        flat.push(childCopy);
      }
    }
  }
  return flat;
}

function dbRowToProduct(row: any): Product {
  return {
    id: row.id,
    names: { en: row.name_en || '', sv: row.name_sv || '', zh: row.name_zh || '' },
    descriptions: { en: row.description_en || '', sv: row.description_sv || '', zh: row.description_zh || '' },
    price: row.price != null ? String(row.price) : '',
    newPrice: row.sale_price != null ? String(row.sale_price) : '',
    stock: row.stock != null ? String(row.stock) : '',
    preserve: row.preserve || 0,
    expiration: row.expiration || '',
    photos: row.image_url ? [{ id: 'db-photo', file: new File([], ''), url: row.image_url }] : [],
    order: row.display_order || 0,
    categoryId: row.category_id,
    subCategoryId: row.subcategory_id || null,
    visible: row.visible ?? true,
    trending: row.trending ?? false,
    flash: row.flash ?? false,
    parentProductId: row.parent_product_id || null,
    internalOrder: row.internal_order || 0,
  };
}

function dbRowToExpiryItem(row: any): ExpiryItem {
  return {
    ...dbRowToProduct({
      ...row,
      category_id: '',
      parent_product_id: row.parent_expiry_item_id,
      trending: false,
      flash: false,
    }),
    sourceProductId: row.source_product_id || null,
  };
}

function dbRowToFlashItem(row: any): FlashSaleItem {
  return {
    ...dbRowToProduct({
      ...row,
      category_id: '',
      parent_product_id: row.parent_flash_item_id,
      trending: false,
      flash: false,
    }),
    sourceProductId: row.source_product_id || null,
    flashDays: row.flash_days || 7,
    flashStartDate: row.flash_start_date || new Date().toISOString().split('T')[0],
    flashDiscountPercentage: row.flash_discount_percentage || 0,
  };
}

function assembleLoadedData(
  catRes: any, subRes: any, prodRes: any,
  expiryRes: any, flashRes: any,
  expirySettRes: any, flashSettRes: any
): LoadedData {
  const categories: Category[] = (catRes.data || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name_en || '',
    names: { en: cat.name_en || '', sv: cat.name_sv || '', zh: cat.name_zh || '' },
    imageUrl: cat.image_url || '',
    isCollapsed: true,
    subCategories: (subRes.data || [])
      .filter((s: any) => s.category_id === cat.id)
      .map((s: any) => ({
        id: s.id,
        name: s.name_en || '',
        names: { en: s.name_en || '', sv: s.name_sv || '', zh: s.name_zh || '' },
        parentId: cat.id,
        isCollapsed: true,
      })),
  }));

  const products: Product[] = (prodRes.data || []).map(dbRowToProduct);

  const expiryRows = expiryRes.data || [];
  const expiryParents = expiryRows.filter((r: any) => !r.parent_expiry_item_id);
  const expiryChildren = expiryRows.filter((r: any) => r.parent_expiry_item_id);
  const expiryItems: ExpiryItem[] = expiryParents.map((r: any) => {
    const item = dbRowToExpiryItem(r);
    const kids = expiryChildren
      .filter((c: any) => c.parent_expiry_item_id === r.id)
      .map(dbRowToExpiryItem);
    if (kids.length > 0) {
      (item as any).isStackParent = true;
      (item as any).childItems = kids;
    }
    return item;
  });

  const flashRows = flashRes.data || [];
  const flashParents = flashRows.filter((r: any) => !r.parent_flash_item_id);
  const flashChildrenRows = flashRows.filter((r: any) => r.parent_flash_item_id);
  const flashSaleItems: FlashSaleItem[] = flashParents.map((r: any) => {
    const item = dbRowToFlashItem(r);
    const kids = flashChildrenRows
      .filter((c: any) => c.parent_flash_item_id === r.id)
      .map(dbRowToFlashItem);
    if (kids.length > 0) {
      (item as any).isStackParent = true;
      (item as any).childItems = kids;
    }
    return item;
  });

  const expirySettings: ExpirySettings = {
    thresholdDays: expirySettRes.data?.threshold_days ?? 30,
    discountPercentage: expirySettRes.data?.discount_percentage ?? 50,
  };

  const flashSaleSettings: FlashSaleSettings = {
    defaultFlashDays: flashSettRes.data?.default_flash_days ?? 7,
    defaultDiscountPercentage: flashSettRes.data?.default_discount_percentage ?? 30,
  };

  return { categories, products, expiryItems, expirySettings, flashSaleItems, flashSaleSettings };
}

export interface LoadedData {
  categories: Category[];
  products: Product[];
  expiryItems: ExpiryItem[];
  expirySettings: ExpirySettings;
  flashSaleItems: FlashSaleItem[];
  flashSaleSettings: FlashSaleSettings;
}

export function normalizeProductOrders(products: Product[]): { normalized: Product[]; changed: Product[] } {
  const parents = products.filter(p => p.parentProductId === null);
  const children = products.filter(p => p.parentProductId !== null);

  const groups = new Map<string, Product[]>();
  for (const p of parents) {
    const key = p.subCategoryId || `__no_sub__${p.categoryId}`;
    const group = groups.get(key) || [];
    group.push(p);
    groups.set(key, group);
  }

  const changed: Product[] = [];
  const allNormalized: Product[] = [...children];

  for (const [, group] of groups) {
    group.sort((a, b) => a.order - b.order);
    for (let i = 0; i < group.length; i++) {
      const correctOrder = i + 1;
      if (group[i].order !== correctOrder) {
        group[i] = { ...group[i], order: correctOrder };
        changed.push(group[i]);
      }
    }
    allNormalized.push(...group);
  }

  return { normalized: allNormalized, changed };
}

export async function loadFromDb(): Promise<LoadedData> {
  const [catRes, subRes, prodRes, expiryRes, flashRes, expirySettRes, flashSettRes] = await Promise.all([
    supabase.from('categories').select('*').order('display_order'),
    supabase.from('subcategories').select('*').order('display_order'),
    supabase.from('products').select('*').order('display_order'),
    supabase.from('expiry_items').select('*').order('display_order'),
    supabase.from('flash_sale_items').select('*').order('display_order'),
    supabase.from('expiry_settings').select('*').maybeSingle(),
    supabase.from('flash_sale_settings').select('*').maybeSingle(),
  ]);
  return assembleLoadedData(catRes, subRes, prodRes, expiryRes, flashRes, expirySettRes, flashSettRes);
}

export async function fetchLivePreserveMap(): Promise<Map<string, number>> {
  const [prodsRes, expiryRes, flashRes] = await Promise.all([
    supabase.from('products').select('id, preserve'),
    supabase.from('expiry_items').select('id, preserve'),
    supabase.from('flash_sale_items').select('id, preserve'),
  ]);
  const map = new Map<string, number>();
  for (const row of (prodsRes.data || [])) map.set(row.id, row.preserve || 0);
  for (const row of (expiryRes.data || [])) map.set(row.id, row.preserve || 0);
  for (const row of (flashRes.data || [])) map.set(row.id, row.preserve || 0);
  return map;
}

function applyPreserveToProducts(products: Product[], preserveMap: Map<string, number>): Product[] {
  return products.map(p => {
    const live = preserveMap.get(p.id);
    return live !== undefined ? { ...p, preserve: live } : p;
  });
}

function applyPreserveToExpiryItems(items: ExpiryItem[], preserveMap: Map<string, number>): ExpiryItem[] {
  return items.map(item => {
    const live = preserveMap.get(item.id);
    const updated = live !== undefined ? { ...item, preserve: live } : item;
    if ((item as any).childItems) {
      (updated as any).childItems = (item as any).childItems.map((child: ExpiryItem) => {
        const childLive = preserveMap.get(child.id);
        return childLive !== undefined ? { ...child, preserve: childLive } : child;
      });
    }
    return updated;
  });
}

function applyPreserveToFlashItems(items: FlashSaleItem[], preserveMap: Map<string, number>): FlashSaleItem[] {
  return items.map(item => {
    const live = preserveMap.get(item.id);
    const updated = live !== undefined ? { ...item, preserve: live } : item;
    if ((item as any).childItems) {
      (updated as any).childItems = (item as any).childItems.map((child: FlashSaleItem) => {
        const childLive = preserveMap.get(child.id);
        return childLive !== undefined ? { ...child, preserve: childLive } : child;
      });
    }
    return updated;
  });
}

export async function loadDraftFromDb(): Promise<LoadedData> {
  const [draftRes, preserveMap] = await Promise.all([
    Promise.all([
      supabase.from('draft_categories').select('*').order('display_order'),
      supabase.from('draft_subcategories').select('*').order('display_order'),
      supabase.from('draft_products').select('*').order('display_order'),
      supabase.from('draft_expiry_items').select('*').order('display_order'),
      supabase.from('draft_flash_sale_items').select('*').order('display_order'),
      supabase.from('draft_expiry_settings').select('*').maybeSingle(),
      supabase.from('draft_flash_sale_settings').select('*').maybeSingle(),
    ]),
    fetchLivePreserveMap(),
  ]);
  const [catRes, subRes, prodRes, expiryRes, flashRes, expirySettRes, flashSettRes] = draftRes;
  const data = assembleLoadedData(catRes, subRes, prodRes, expiryRes, flashRes, expirySettRes, flashSettRes);
  return {
    ...data,
    products: applyPreserveToProducts(data.products, preserveMap),
    expiryItems: applyPreserveToExpiryItems(data.expiryItems, preserveMap),
    flashSaleItems: applyPreserveToFlashItems(data.flashSaleItems, preserveMap),
  };
}

export async function saveDraftCategory(cat: Category, displayOrder: number) {
  try {
    await supabase.from('draft_categories').upsert({
      id: cat.id,
      name_en: cat.names.en,
      name_sv: cat.names.sv,
      name_zh: cat.names.zh,
      image_url: cat.imageUrl || '',
      display_order: displayOrder,
    });
  } catch (e) {
    console.error('saveDraftCategory failed:', e);
  }
}

export async function saveDraftCategories(categories: Category[]) {
  try {
    const rows = categories.map((cat, idx) => ({
      id: cat.id,
      name_en: cat.names.en,
      name_sv: cat.names.sv,
      name_zh: cat.names.zh,
      image_url: cat.imageUrl || '',
      display_order: idx + 1,
    }));
    if (rows.length > 0) {
      await supabase.from('draft_categories').upsert(rows);
    }
  } catch (e) {
    console.error('saveDraftCategories failed:', e);
  }
}

export async function deleteDraftCategory(categoryId: string) {
  try {
    await supabase.from('draft_categories').delete().eq('id', categoryId);
  } catch (e) {
    console.error('deleteDraftCategory failed:', e);
  }
}

export async function saveDraftSubCategory(categoryId: string, sub: SubCategory, displayOrder: number) {
  try {
    await supabase.from('draft_subcategories').upsert({
      id: sub.id,
      category_id: categoryId,
      name_en: sub.names.en,
      name_sv: sub.names.sv,
      name_zh: sub.names.zh,
      display_order: displayOrder,
    });
  } catch (e) {
    console.error('saveDraftSubCategory failed:', e);
  }
}

export async function deleteDraftSubCategory(subCategoryId: string) {
  try {
    await supabase.from('draft_subcategories').delete().eq('id', subCategoryId);
  } catch (e) {
    console.error('deleteDraftSubCategory failed:', e);
  }
}

export async function saveDraftProduct(product: Product) {
  try {
    await supabase.from('draft_products').upsert(productToDbRow(product));
  } catch (e) {
    console.error('saveDraftProduct failed:', e);
  }
}

export async function saveDraftProducts(products: Product[]) {
  try {
    if (products.length === 0) return;
    await supabase.from('draft_products').upsert(products.map(productToDbRow));
  } catch (e) {
    console.error('saveDraftProducts failed:', e);
  }
}

export async function deleteDraftProduct(productId: string) {
  try {
    await supabase.from('draft_products').delete().eq('id', productId);
  } catch (e) {
    console.error('deleteDraftProduct failed:', e);
  }
}

export async function deleteDraftProducts(productIds: string[]) {
  try {
    if (productIds.length === 0) return;
    await supabase.from('draft_products').delete().in('id', productIds);
  } catch (e) {
    console.error('deleteDraftProducts failed:', e);
  }
}

export async function replaceDraftExpiryItems(items: ExpiryItem[]) {
  try {
    await supabase.from('draft_expiry_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    const flat = flattenExpiryItems(items);
    if (flat.length > 0) {
      const parents = flat.filter(e => !e.parentProductId);
      const children = flat.filter(e => e.parentProductId);
      if (parents.length > 0) {
        await supabase.from('draft_expiry_items').insert(parents.map(expiryItemToDbRow));
      }
      if (children.length > 0) {
        await supabase.from('draft_expiry_items').insert(children.map(expiryItemToDbRow));
      }
    }
  } catch (e) {
    console.error('replaceDraftExpiryItems failed:', e);
  }
}

export async function saveDraftExpirySettings(settings: ExpirySettings) {
  try {
    await supabase.from('draft_expiry_settings').upsert({
      id: 1,
      threshold_days: settings.thresholdDays,
      discount_percentage: settings.discountPercentage,
    });
  } catch (e) {
    console.error('saveDraftExpirySettings failed:', e);
  }
}

export async function replaceDraftFlashSaleItems(items: FlashSaleItem[]) {
  try {
    await supabase.from('draft_flash_sale_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    const flat = flattenFlashItems(items);
    if (flat.length > 0) {
      const parents = flat.filter(f => !f.parentProductId);
      const children = flat.filter(f => f.parentProductId);
      if (parents.length > 0) {
        await supabase.from('draft_flash_sale_items').insert(parents.map(flashItemToDbRow));
      }
      if (children.length > 0) {
        await supabase.from('draft_flash_sale_items').insert(children.map(flashItemToDbRow));
      }
    }
  } catch (e) {
    console.error('replaceDraftFlashSaleItems failed:', e);
  }
}

export async function saveDraftFlashSaleSettings(settings: FlashSaleSettings) {
  try {
    await supabase.from('draft_flash_sale_settings').upsert({
      id: 1,
      default_flash_days: settings.defaultFlashDays,
      default_discount_percentage: settings.defaultDiscountPercentage,
    });
  } catch (e) {
    console.error('saveDraftFlashSaleSettings failed:', e);
  }
}

export async function pushUpdate(): Promise<{ success: boolean; error?: string }> {
  try {
    const draft = await loadDraftFromDb();

    const [liveProdsRes, liveExpiryRes, liveFlashRes] = await Promise.all([
      supabase.from('products').select('id, preserve'),
      supabase.from('expiry_items').select('id, preserve'),
      supabase.from('flash_sale_items').select('id, preserve'),
    ]);
    const livePreserveMap = new Map<string, number>();
    for (const row of (liveProdsRes.data || [])) livePreserveMap.set(row.id, row.preserve || 0);
    for (const row of (liveExpiryRes.data || [])) livePreserveMap.set(row.id, row.preserve || 0);
    for (const row of (liveFlashRes.data || [])) livePreserveMap.set(row.id, row.preserve || 0);

    const applyLivePreserve = (dbRow: Record<string, unknown>) => ({
      ...dbRow,
      preserve: livePreserveMap.get(dbRow.id as string) ?? (dbRow.preserve as number) ?? 0,
    });

    await supabase.from('flash_sale_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expiry_items').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().not('parent_product_id', 'is', null);
    await supabase.from('products').delete().is('parent_product_id', null);
    await supabase.from('subcategories').delete().gte('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    if (draft.categories.length > 0) {
      const catRows = draft.categories.map((cat, idx) => ({
        id: cat.id,
        name_en: cat.names.en,
        name_sv: cat.names.sv,
        name_zh: cat.names.zh,
        image_url: cat.imageUrl || '',
        display_order: idx + 1,
      }));
      const { error: catErr } = await supabase.from('categories').insert(catRows);
      if (catErr) return { success: false, error: `Categories: ${catErr.message}` };

      const subRows: any[] = [];
      for (const cat of draft.categories) {
        for (const sub of cat.subCategories) {
          subRows.push({
            id: sub.id,
            category_id: cat.id,
            name_en: sub.names.en,
            name_sv: sub.names.sv,
            name_zh: sub.names.zh,
            display_order: subRows.filter(s => s.category_id === cat.id).length + 1,
          });
        }
      }
      if (subRows.length > 0) {
        const { error: subErr } = await supabase.from('subcategories').insert(subRows);
        if (subErr) return { success: false, error: `Subcategories: ${subErr.message}` };
      }
    }

    if (draft.products.length > 0) {
      const parents = draft.products.filter(p => !p.parentProductId);
      const children = draft.products.filter(p => p.parentProductId);

      if (parents.length > 0) {
        const { error: pErr } = await supabase.from('products').insert(parents.map(productToDbRow).map(applyLivePreserve));
        if (pErr) return { success: false, error: `Products (parents): ${pErr.message}` };
      }
      if (children.length > 0) {
        const { error: cErr } = await supabase.from('products').insert(children.map(productToDbRow).map(applyLivePreserve));
        if (cErr) return { success: false, error: `Products (children): ${cErr.message}` };
      }
    }

    const flatExpiry = flattenExpiryItems(draft.expiryItems);
    if (flatExpiry.length > 0) {
      const expiryParents = flatExpiry.filter(e => !e.parentProductId);
      const expiryChildren = flatExpiry.filter(e => e.parentProductId);
      if (expiryParents.length > 0) {
        const { error: eErr } = await supabase.from('expiry_items').insert(expiryParents.map(expiryItemToDbRow).map(applyLivePreserve));
        if (eErr) return { success: false, error: `Expiry items (parents): ${eErr.message}` };
      }
      if (expiryChildren.length > 0) {
        const { error: ecErr } = await supabase.from('expiry_items').insert(expiryChildren.map(expiryItemToDbRow).map(applyLivePreserve));
        if (ecErr) return { success: false, error: `Expiry items (children): ${ecErr.message}` };
      }
    }

    const flatFlash = flattenFlashItems(draft.flashSaleItems);
    if (flatFlash.length > 0) {
      const flashParents = flatFlash.filter(f => !f.parentProductId);
      const flashChildren = flatFlash.filter(f => f.parentProductId);
      if (flashParents.length > 0) {
        const { error: fErr } = await supabase.from('flash_sale_items').insert(flashParents.map(flashItemToDbRow).map(applyLivePreserve));
        if (fErr) return { success: false, error: `Flash items (parents): ${fErr.message}` };
      }
      if (flashChildren.length > 0) {
        const { error: fcErr } = await supabase.from('flash_sale_items').insert(flashChildren.map(flashItemToDbRow).map(applyLivePreserve));
        if (fcErr) return { success: false, error: `Flash items (children): ${fcErr.message}` };
      }
    }

    await supabase.from('expiry_settings').upsert({
      id: 1,
      threshold_days: draft.expirySettings.thresholdDays,
      discount_percentage: draft.expirySettings.discountPercentage,
    });

    await supabase.from('flash_sale_settings').upsert({
      id: 1,
      default_flash_days: draft.flashSaleSettings.defaultFlashDays,
      default_discount_percentage: draft.flashSaleSettings.defaultDiscountPercentage,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}
