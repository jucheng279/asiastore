export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  image: string;
  tags?: string[];
  isBestSeller?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  unit?: string;
  description?: string;
  expiryDate?: string;
  isNearExpiry?: boolean;
  isFlashSale?: boolean;
  flashSaleEndsIn?: string;
  flashStartDate?: string;
  flashDays?: number;
  discountPercentage?: number;
  categoryId?: string;
  subcategoryId?: string;
  parentProductId?: string;
  children?: Product[];
  hasChildren?: boolean;
  sourceProductId?: string;
  stock?: number;
  availableStock?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  image: string;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  contactEmail: string;
  contactPhone: string;
  shippingAddress: Address;
  deliveryInstructions?: string;
  status: 'active' | 'cancelled' | 'completed';
  paidWithPoints?: boolean;
  pointsAmount?: number;
  paymentMethod?: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  email?: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}
