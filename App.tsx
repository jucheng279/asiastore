import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProductDataProvider } from './lib/ProductDataContext';
import { AuthProvider } from './lib/AuthContext';
import { ToastProvider } from './lib/ToastContext';
import { CartProvider } from './lib/CartContext';
import { LanguageSync } from './components/LanguageSync';
import AppShell from './components/AppShell';
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
import PrivacyPolicyView from './components/PrivacyPolicyView';
import AuthGuard from './components/AuthGuard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProductDataProvider>
          <ToastProvider>
            <CartProvider>
              <LanguageSync />
              <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/register" element={<RegisterView />} />
                <Route path="/forgot-password" element={<ForgotPasswordView />} />
                <Route path="/reset-password" element={<ResetPasswordView />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyView />} />
                <Route element={<AppShell />}>
                  <Route index element={<HomeView />} />
                  <Route path="/products" element={<ListingView />} />
                  <Route path="/products/:category" element={<ListingView />} />
                  <Route path="/product/:productId" element={<ProductDetailView />} />
                  <Route path="/cart" element={<CartView />} />
                  <Route path="/deals" element={<DealsView />} />
                  <Route path="/best-sellers" element={<BestSellersView />} />
                  <Route path="/contact" element={<ContactUsView />} />
                  <Route path="/checkout" element={<AuthGuard><CheckoutView /></AuthGuard>} />
                  <Route path="/account" element={<AuthGuard><AccountView /></AuthGuard>} />
                  <Route path="/favorites" element={<AuthGuard><FavoritesView /></AuthGuard>} />
                  <Route path="/orders" element={<AuthGuard><OrdersView /></AuthGuard>} />
                  <Route path="/payment-methods" element={<AuthGuard><PaymentMethodsView /></AuthGuard>} />
                  <Route path="/addresses" element={<AuthGuard><AddressesView /></AuthGuard>} />
                  <Route path="/notifications" element={<AuthGuard><NotificationsView /></AuthGuard>} />
                  <Route path="/points" element={<AuthGuard><PointsView /></AuthGuard>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CartProvider>
          </ToastProvider>
        </ProductDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
