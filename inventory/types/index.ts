export type Language = 'en' | 'sv' | 'zh';

export type ActiveView = 'categories' | 'expiry' | 'flashSales' | 'users' | 'orderSummary' | 'diagnostics' | 'storeSettings';

export interface ProductNames {
  en: string;
  sv: string;
  zh: string;
}

export interface PhotoFile {
  id: string;
  file: File;
  url: string;
}

export interface Product {
  id: string;
  names: ProductNames;
  price: string;
  newPrice: string;
  stock: string;
  preserve: number;
  expiration: string;
  descriptions: ProductNames;
  photos: PhotoFile[];
  order: number;
  categoryId: string;
  subCategoryId: string | null;
  visible: boolean;
  trending: boolean;
  flash: boolean;
  parentProductId: string | null;
  internalOrder: number;
}

export interface ExpiryItem extends Product {
  sourceProductId: string | null;
  discountApplied: boolean;
  isStackParent?: boolean;
  childItems?: ExpiryItem[];
}

export interface ExpirySettings {
  thresholdDays: number;
  expiredDiscountPercentage: number;
  threshold1Days: number;
  threshold1DiscountPercentage: number;
  threshold2Days: number;
  threshold2DiscountPercentage: number;
}

export interface FlashSaleItem extends Product {
  sourceProductId: string | null;
  flashDays: number;
  flashStartDate: string;
  flashDiscountPercentage: number;
  isStackParent?: boolean;
  childItems?: FlashSaleItem[];
}

export interface FlashSaleSettings {
  defaultFlashDays: number;
  defaultDiscountPercentage: number;
}

export interface StoreAddress {
  street: string;
  postalCode: string;
  city: string;
  lat: number | null;
  lon: number | null;
}

export interface AdminStoreSettings {
  orderingMode: 'auto' | 'manual';
  orderingEnabled: boolean;
  autoOpenDay: number;
  autoOpenTime: string;
  autoCloseDay: number;
  autoCloseTime: string;
  closedMessageEn: string;
  closedMessageSv: string;
  closedMessageZh: string;
  storeAddress: StoreAddress;
}

export interface SubCategory {
  id: string;
  name: string;
  names: ProductNames;
  parentId: string;
  isCollapsed: boolean;
}

export interface Category {
  id: string;
  name: string;
  names: ProductNames;
  imageUrl: string;
  isCollapsed: boolean;
  subCategories: SubCategory[];
}
