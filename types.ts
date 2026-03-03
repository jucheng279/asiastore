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
  total: number;
  items: OrderItem[];
  contactEmail: string;
  contactPhone: string;
  shippingAddress: Address;
  deliveryInstructions?: string;
  status: 'active' | 'cancelled';
  paidWithPoints?: boolean;
  pointsAmount?: number;
}

export type ViewState = 'HOME' | 'LISTING' | 'DETAILS' | 'CART' | 'CHECKOUT' | 'DEALS' | 'ACCOUNT' | 'FAVORITES' | 'ORDERS' | 'PAYMENT_METHODS' | 'ADDRESSES' | 'NOTIFICATIONS' | 'BEST_SELLERS' | 'POINTS' | 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'CONTACT_US';

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

export interface NavigationProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  cartCount: number;
  favorites?: Set<string>;
  onToggleFavorite?: (productId: string) => void;
  onAddToCart?: (product: Product) => void;
  cartQuantities?: Map<string, number>;
  onIncreaseQuantity?: (productId: string) => void;
  onDecreaseQuantity?: (productId: string) => void;
  onNavigateWithCategory?: (view: ViewState, category: string) => void;
  initialCategory?: string | null;
  onClearInitialCategory?: () => void;
  onNavigateToProduct?: (productId: string) => void;
  onAddQuantityToCart?: (productId: string, quantity: number) => void;
  orderingClosed?: boolean;
}