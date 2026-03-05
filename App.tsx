import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HomeView from './components/HomeView';
import ListingView from './components/ListingView';
import ProductDetailView from './components/ProductDetailView';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import DealsView from './components/DealsView';
import AccountView from './components/AccountView';
import FavoritesView from './components/FavoritesView';
import OrdersView from './components/OrdersView';
import PaymentMethodsView from './components/PaymentMethodsView';
import AddressesView from './components/AddressesView';
import NotificationsView from './components/NotificationsView';
import BestSellersView from './components/BestSellersView';
import PointsView from './components/PointsView';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ForgotPasswordView from './components/ForgotPasswordView';
import ResetPasswordView from './components/ResetPasswordView';
import ContactUsView from './components/ContactUsView';
import DesktopSidebar from './components/DesktopSidebar';
import { ProductDataProvider, useProductData } from './lib/ProductDataContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ViewState, Product, Order, CartItem, Address } from './types';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, POINTS_DISCOUNT_RATE } from './lib/businessConstants';

const CART_STORAGE_KEY = 'asian_market_cart';

function loadCartFromStorage(): Map<string, number> {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string, number][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveCartToStorage(cart: Map<string, number>) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
  } catch {}
}

const AUTH_REQUIRED_VIEWS = new Set<ViewState>([
  'ACCOUNT', 'FAVORITES', 'ORDERS', 'PAYMENT_METHODS',
  'ADDRESSES', 'NOTIFICATIONS', 'POINTS', 'CHECKOUT',
]);

function AppContent() {
  const { t } = useTranslation();
  const { isLoading: productsLoading, allProducts, productMap, refreshData, orderingOpen, closedMessage, nextOpenTime } = useProductData();
  const orderingClosed = !orderingOpen;
  const {
    isAuthenticated, isLoading: authLoading, isPasswordRecovery,
    addresses, saveAddress, deleteAddress, signOut,
    favorites, toggleFavorite, orders, createOrder,
    points,
  } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [cartQuantities, setCartQuantities] = useState<Map<string, number>>(loadCartFromStorage);
  const [emailNewsletter, setEmailNewsletter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>('HOME');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'warning'>('success');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<ViewState | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const scrollPositionRef = useRef(0);
  const pendingScrollRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveCartToStorage(cartQuantities);
  }, [cartQuantities]);

  useEffect(() => {
    if (productMap.size === 0 || cartQuantities.size === 0) return;
    let needsUpdate = false;
    const clamped = new Map(cartQuantities);
    clamped.forEach((qty, productId) => {
      const product = productMap.get(productId);
      const available = product?.availableStock;
      if (available === undefined) return;
      if (available <= 0) {
        clamped.delete(productId);
        needsUpdate = true;
      } else if (qty > available) {
        clamped.set(productId, available);
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      setCartQuantities(clamped);
      showToast(t('toast.cartAdjustedToStock'), 'warning');
    }
  }, [productMap]);

  useEffect(() => {
    if (isPasswordRecovery) {
      setCurrentView('RESET_PASSWORD');
    }
  }, [isPasswordRecovery]);

  const requireAuth = (targetView: ViewState): boolean => {
    if (isAuthenticated) return false;
    setRedirectAfterAuth(targetView);
    setCurrentView('LOGIN');
    return true;
  };

  const guardedNavigate = (view: ViewState) => {
    if (AUTH_REQUIRED_VIEWS.has(view) && requireAuth(view)) return;
    setCurrentView(view);
  };

  const cartCount = Array.from(cartQuantities.values()).reduce((sum: number, qty: number) => sum + qty, 0);

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastType(type);
    setToastMessage(message);
    requestAnimationFrame(() => setToastVisible(true));
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToastMessage(null), 300);
    }, type === 'warning' ? 4000 : 2500);
  };

  useEffect(() => {
    if (pendingScrollRef.current !== null && currentView !== 'DETAILS') {
      const scrollTo = pendingScrollRef.current;
      pendingScrollRef.current = null;
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTo);
      });
    }
  }, [currentView]);

  const handleSignOut = async () => {
    await signOut();
    setCartQuantities(new Map());
    setCurrentView('HOME');
  };

  const getCartItems = (): CartItem[] => {
    const items: CartItem[] = [];
    cartQuantities.forEach((quantity, productId) => {
      const product = productMap.get(productId);
      if (product) {
        items.push({ ...product, id: productId, quantity });
      }
    });
    return items;
  };

  const removeFromCart = (productId: string) => {
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  const clearCart = () => {
    setCartQuantities(new Map());
  };

  const goToCheckout = () => {
    if (orderingClosed) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }
    if (getCartItems().length === 0) return;
    if (requireAuth('CHECKOUT')) return;
    setCurrentView('CHECKOUT');
  };

  const adjustCartToStock = async () => {
    await refreshData();
  };

  const confirmOrder = async (shippingAddress: Address, deliveryInstructions?: string, payWithPoints?: boolean) => {
    if (orderingClosed) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }
    if (isSubmittingOrder) return;
    const cartItems = getCartItems();
    if (cartItems.length === 0) return;

    setIsSubmittingOrder(true);

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      const tax = subtotal * TAX_RATE;
      const totalBeforeDiscount = subtotal + shipping + tax;
      const pointsDiscount = payWithPoints ? totalBeforeDiscount * POINTS_DISCOUNT_RATE : 0;
      const total = Math.round((totalBeforeDiscount - pointsDiscount) * 100) / 100;

      const { order, error } = await createOrder({
        total,
        contactEmail: shippingAddress.email || '',
        contactPhone: shippingAddress.phone,
        shippingAddress,
        deliveryInstructions,
        paidWithPoints: payWithPoints,
        pointsAmount: payWithPoints ? total : 0,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      if (!order) {
        if (error && error.toLowerCase().includes('insufficient stock')) {
          await adjustCartToStock();
          const productNameMatch = error.match(/product:\s*(.+)/i);
          if (productNameMatch) {
            showToast(t('toast.orderFailedStockItem', { name: productNameMatch[1] }), 'warning');
          } else {
            showToast(t('toast.orderFailedStock'), 'warning');
          }
          setCurrentView('CART');
        } else {
          showToast(t('toast.orderFailed'), 'warning');
          setCurrentView('CART');
        }
        return;
      }

      clearCart();
      await refreshData();
      setCurrentView('ORDERS');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSaveAddress = async (addressData: Omit<Address, 'id'> & { id?: string }) => {
    await saveAddress(addressData);
  };

  const handleDeleteAddress = async (addressId: string) => {
    await deleteAddress(addressId);
  };

  const buyAgain = (orderItems: Order['items']) => {
    if (orderingClosed) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      orderItems.forEach(item => {
        const product = productMap.get(item.id);
        const available = product?.availableStock;
        if (available !== undefined && available <= 0) return;
        const currentQty: number = (newMap.get(item.id) as number) || 0;
        const maxAdd = available !== undefined ? Math.max(0, available - currentQty) : item.qty;
        if (maxAdd > 0) {
          newMap.set(item.id, currentQty + Math.min(item.qty, maxAdd));
        }
      });
      return newMap;
    });
    setCurrentView('CART');
  };

  const toggleEmailNewsletter = () => setEmailNewsletter(prev => !prev);

  const navigateWithCategory = (view: ViewState, category: string) => {
    setSelectedCategory(category);
    guardedNavigate(view);
  };

  const clearInitialCategory = () => setSelectedCategory(null);

  const handleToggleFavorite = (productId: string) => {
    if (!isAuthenticated) {
      setRedirectAfterAuth(currentView);
      setCurrentView('LOGIN');
      return;
    }
    toggleFavorite(productId);
  };

  const increaseQuantity = (productId: string) => {
    if (orderingClosed) return;
    const product = productMap.get(productId);
    const available = product?.availableStock;
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current = (newMap.get(productId) as number) || 0;
      if (available !== undefined && current >= available) return prev;
      newMap.set(productId, current + 1);
      return newMap;
    });
  };

  const decreaseQuantity = (productId: string) => {
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current: number = (newMap.get(productId) as number) || 0;
      if (current <= 1) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, current - 1);
      }
      return newMap;
    });
  };

  const addToCart = (product: Product) => {
    increaseQuantity(product.id);
  };

  const addQuantityToCart = (productId: string, quantity: number) => {
    if (orderingClosed) return;
    const product = productMap.get(productId);
    const available = product?.availableStock;
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current = (newMap.get(productId) as number) || 0;
      const maxAdd = available !== undefined ? Math.max(0, available - current) : quantity;
      const toAdd = Math.min(quantity, maxAdd);
      if (toAdd > 0) {
        newMap.set(productId, current + toAdd);
      }
      return newMap;
    });
    const name = product?.name || t('common.item', { count: 1 });
    showToast(quantity > 1 ? t('toast.addedToCartQty', { qty: quantity, name }) : t('toast.addedToCart', { name }));
    pendingScrollRef.current = scrollPositionRef.current;
    goBackFromDetail();
  };

  const navigateToProduct = (productId: string) => {
    scrollPositionRef.current = window.scrollY;
    setPreviousView(currentView);
    setSelectedProductId(productId);
    setCurrentView('DETAILS');
  };

  const goBackFromDetail = () => {
    setCurrentView(previousView);
  };

  const handleAuthSuccess = () => {
    const dest = redirectAfterAuth || 'HOME';
    setRedirectAfterAuth(null);
    setCurrentView(dest);
  };

  if (authLoading || productsLoading) {
    return (
      <div className="min-h-screen w-full bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-sub text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const isAuthView = currentView === 'LOGIN' || currentView === 'REGISTER' || currentView === 'FORGOT_PASSWORD' || currentView === 'RESET_PASSWORD';

  const renderView = () => {
    switch (currentView) {
      case 'LOGIN':
        return <LoginView onNavigate={setCurrentView} onAuthSuccess={handleAuthSuccess} />;
      case 'REGISTER':
        return <RegisterView onNavigate={setCurrentView} onAuthSuccess={handleAuthSuccess} />;
      case 'FORGOT_PASSWORD':
        return <ForgotPasswordView onNavigate={setCurrentView} />;
      case 'RESET_PASSWORD':
        return <ResetPasswordView onNavigate={setCurrentView} />;
      case 'HOME':
        return <HomeView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} favorites={favorites} onToggleFavorite={handleToggleFavorite} cartQuantities={cartQuantities} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} onNavigateWithCategory={navigateWithCategory} onNavigateToProduct={navigateToProduct} orderingClosed={orderingClosed} />;
      case 'LISTING':
        return <ListingView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} favorites={favorites} onToggleFavorite={handleToggleFavorite} cartQuantities={cartQuantities} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} initialCategory={selectedCategory} onClearInitialCategory={clearInitialCategory} onNavigateToProduct={navigateToProduct} orderingClosed={orderingClosed} />;
      case 'DETAILS':
        return <ProductDetailView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} selectedProductId={selectedProductId} onGoBack={goBackFromDetail} cartQuantities={cartQuantities} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} favorites={favorites} onToggleFavorite={handleToggleFavorite} onAddQuantityToCart={addQuantityToCart} orderingClosed={orderingClosed} />;
      case 'CART':
        return <CartView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} cartItems={getCartItems()} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} onRemoveItem={removeFromCart} onClearCart={clearCart} onPlaceOrder={goToCheckout} cartQuantities={cartQuantities} favorites={favorites} onToggleFavorite={handleToggleFavorite} onNavigateToProduct={navigateToProduct} orderingClosed={orderingClosed} />;
      case 'CHECKOUT':
        return <CheckoutView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} cartItems={getCartItems()} addresses={addresses} userPoints={points} onConfirmOrder={confirmOrder} onSaveAddress={handleSaveAddress} isSubmitting={isSubmittingOrder} orderingClosed={orderingClosed} />;
      case 'DEALS':
        return <DealsView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} favorites={favorites} onToggleFavorite={handleToggleFavorite} cartQuantities={cartQuantities} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} onNavigateToProduct={navigateToProduct} orderingClosed={orderingClosed} />;
      case 'ACCOUNT':
        return <AccountView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} onSignOut={handleSignOut} />;
      case 'FAVORITES':
        return <FavoritesView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} favorites={favorites} onToggleFavorite={handleToggleFavorite} onAddToCart={addToCart} onNavigateToProduct={navigateToProduct} />;
      case 'ORDERS':
        return <OrdersView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} orders={orders} onBuyAgain={buyAgain} />;
      case 'PAYMENT_METHODS':
        return <PaymentMethodsView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} />;
      case 'ADDRESSES':
        return <AddressesView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} addresses={addresses} onSaveAddress={handleSaveAddress} onDeleteAddress={handleDeleteAddress} />;
      case 'NOTIFICATIONS':
        return <NotificationsView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} emailNewsletter={emailNewsletter} onToggleEmailNewsletter={toggleEmailNewsletter} />;
      case 'BEST_SELLERS':
        return <BestSellersView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} favorites={favorites} onToggleFavorite={handleToggleFavorite} cartQuantities={cartQuantities} onIncreaseQuantity={increaseQuantity} onDecreaseQuantity={decreaseQuantity} onNavigateToProduct={navigateToProduct} orderingClosed={orderingClosed} />;
      case 'POINTS':
        return <PointsView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} />;
      case 'CONTACT_US':
        return <ContactUsView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} />;
      default:
        return <HomeView currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-background-light dark:bg-background-dark flex">
      {!isAuthView && <DesktopSidebar currentView={currentView} onNavigate={guardedNavigate} cartCount={cartCount} />}
      <main className={`flex-1 h-screen overflow-y-auto overflow-x-hidden ${isAuthView ? '' : 'max-w-md lg:max-w-none mx-auto lg:mx-0 shadow-2xl lg:shadow-none'} relative`}>
        {orderingClosed && !isAuthView && (
          <div className="sticky top-0 z-[60] bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
            <div className="px-4 py-2.5 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-snug">{closedMessage || t('store.orderingClosed')}</p>
                {nextOpenTime && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{t('store.nextOpening', { datetime: nextOpenTime })}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {renderView()}
      </main>
      {toastMessage && (
        <div
          className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className={`flex items-center gap-2.5 ${toastType === 'warning' ? 'bg-amber-600 dark:bg-amber-700' : 'bg-gray-900 dark:bg-gray-800'} text-white px-5 py-3 rounded-xl shadow-xl max-w-[90vw]`}>
            <span className={`material-symbols-outlined ${toastType === 'warning' ? 'text-white' : 'text-emerald-400'} text-[20px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{toastType === 'warning' ? 'warning' : 'check_circle'}</span>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProductDataProvider>
        <AppContent />
      </ProductDataProvider>
    </AuthProvider>
  );
};

export default App;
