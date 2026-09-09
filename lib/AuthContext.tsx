import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  fetchProfile,
  updateProfile as authUpdateProfile,
  fetchUserAddresses,
  saveUserAddress as authSaveAddress,
  deleteUserAddress as authDeleteAddress,
  addUserFavorite,
  removeUserFavorite,
  fetchUserFavorites,
  fetchUserOrders,
  addToWeeklyOrder,
  removeFromWeeklyOrder,
  modifyWeeklyOrder,
  updateWeeklyOrderAddress,
  setOrderPaymentMethod,
  cancelUserOrder,
  dailyCheckin,
  deductPoints,
  fetchUserPoints,
  hasCheckedInToday,
  type UserProfile,
  type UserAddress,
} from './auth';
import type { User } from '@supabase/supabase-js';
import type { Address, Order } from '../types';

function toLocalAddress(ua: UserAddress): Address {
  return {
    id: ua.id,
    label: ua.label,
    fullName: ua.full_name,
    phone: ua.phone,
    email: ua.email || undefined,
    streetAddress: ua.street_address,
    city: ua.city,
    postalCode: ua.postal_code,
    country: ua.country,
    isDefault: ua.is_default,
  };
}

function dbOrderToLocal(dbOrder: { order: { id: string; total: number; contact_email: string; contact_phone: string; shipping_address: Record<string, unknown>; delivery_instructions: string | null; created_at: string; status?: string; paid_with_points?: boolean; points_amount?: number; payment_method?: string }; items: { product_id: string; name: string; image: string; price: number; quantity: number }[] }): Order {
  const o = dbOrder.order;
  const addr = o.shipping_address as Record<string, string | boolean | undefined>;
  return {
    id: o.id,
    date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAt: o.created_at,
    total: o.total,
    items: dbOrder.items.map(item => ({
      id: item.product_id,
      name: item.name,
      qty: item.quantity,
      image: item.image,
      price: item.price,
    })),
    contactEmail: o.contact_email,
    contactPhone: o.contact_phone,
    shippingAddress: {
      id: (addr.id as string) || '',
      label: (addr.label as string) || '',
      fullName: (addr.fullName as string) || '',
      phone: (addr.phone as string) || '',
      email: (addr.email as string) || undefined,
      streetAddress: (addr.streetAddress as string) || '',
      city: (addr.city as string) || '',
      postalCode: (addr.postalCode as string) || '',
      country: (addr.country as string) || '',
      isDefault: (addr.isDefault as boolean) || false,
    },
    deliveryInstructions: o.delivery_instructions || undefined,
    status: (o.status as 'active' | 'cancelled' | 'completed') || 'active',
    paidWithPoints: o.paid_with_points || false,
    pointsAmount: o.points_amount || 0,
    paymentMethod: o.payment_method || '',
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  addresses: Address[];
  favorites: Set<string>;
  orders: Order[];
  points: number;
  checkedInToday: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string, nickname?: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
  clearPasswordRecovery: () => void;
  updateProfile: (updates: { nickname?: string; email?: string }) => Promise<string | null>;
  saveLanguagePreference: (lang: 'en' | 'sv' | 'zh') => void;
  loadAddresses: () => Promise<void>;
  saveAddress: (addressData: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  toggleFavorite: (productId: string) => void;
  performDailyCheckin: () => Promise<{ success: boolean; error: string | null }>;
  deductUserPoints: (amount: number) => Promise<{ success: boolean; error: string | null }>;
  addToOrder: (
    items: { productId: string; name: string; image: string; quantity: number }[],
    shippingAddress?: Address,
    contactPhone?: string,
    contactEmail?: string,
    deliveryInstructions?: string,
  ) => Promise<{ orderId: string | null; error: string | null }>;
  removeFromOrder: (productId: string, quantity?: number) => Promise<{ error: string | null }>;
  modifyOrder: (orderId: string, items: { product_id: string; name: string; image: string; price: number; quantity: number }[]) => Promise<{ wasCancelled: boolean; error: string | null }>;
  updateOrderAddress: (orderId: string, address: Address, contactPhone?: string, contactEmail?: string, deliveryInstructions?: string) => Promise<{ error: string | null }>;
  setPaymentMethod: (orderId: string, method: string) => Promise<{ error: string | null }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error: string | null }>;
  refreshOrders: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const FAVORITE_DEBOUNCE_MS = 400;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const favoriteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const favoritesRef = useRef<Set<string>>(favorites);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const loadProfile = async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
  };

  const loadOrders = async (userId: string) => {
    const ordersData = await fetchUserOrders(userId);
    setOrders(ordersData.map(dbOrderToLocal));
  };

  const loadAllUserData = async (userId: string) => {
    const [profileData, addrs, favIds, ordersData, pts, checkedIn] = await Promise.all([
      fetchProfile(userId),
      fetchUserAddresses(userId),
      fetchUserFavorites(userId),
      fetchUserOrders(userId),
      fetchUserPoints(userId),
      hasCheckedInToday(userId),
    ]);

    setProfile(profileData);
    setAddresses(addrs.map(toLocalAddress));
    setFavorites(new Set(favIds));
    setOrders(ordersData.map(dbOrderToLocal));
    setPoints(pts?.balance || 0);
    setCheckedInToday(checkedIn);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        (async () => {
          await loadAllUserData(currentUser.id);
          setIsLoading(false);
        })();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        (async () => {
          await loadAllUserData(currentUser.id);
        })();
      } else {
        setProfile(null);
        setAddresses([]);
        setFavorites(new Set());
        setOrders([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (email: string, password: string, nickname?: string) => {
    const result = await authSignUp(email, password, nickname);
    return result.error;
  };

  const handleSignIn = async (email: string, password: string) => {
    const result = await authSignIn(email, password);
    return result.error;
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setAddresses([]);
    setFavorites(new Set());
    setOrders([]);
    setPoints(0);
    setCheckedInToday(false);
    setIsPasswordRecovery(false);
  };

  const handleResetPassword = async (email: string) => {
    const result = await authResetPassword(email);
    return result.error;
  };

  const handleUpdatePassword = async (newPassword: string) => {
    const result = await authUpdatePassword(newPassword);
    if (!result.error) setIsPasswordRecovery(false);
    return result.error;
  };

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  const handleUpdateProfile = async (updates: { nickname?: string; email?: string }) => {
    if (!user) return 'Not authenticated';
    const result = await authUpdateProfile(user.id, updates);
    if (result.error) return result.error;
    if (result.profile) setProfile(result.profile);
    return null;
  };

  const handleSaveLanguagePreference = useCallback((lang: 'en' | 'sv' | 'zh') => {
    if (!user) return;
    authUpdateProfile(user.id, { preferred_language: lang }).then(res => {
      if (res.profile) setProfile(res.profile);
    });
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    const addrs = await fetchUserAddresses(user.id);
    setAddresses(addrs.map(toLocalAddress));
  };

  const handleSaveAddress = async (addressData: Omit<Address, 'id'> & { id?: string }) => {
    if (!user) return;

    const dbAddress = {
      id: addressData.id,
      label: addressData.label,
      full_name: addressData.fullName,
      phone: addressData.phone,
      email: addressData.email,
      street_address: addressData.streetAddress,
      city: addressData.city,
      postal_code: addressData.postalCode,
      country: addressData.country,
      is_default: addressData.isDefault,
    };

    await authSaveAddress(user.id, dbAddress);
    const addrs = await fetchUserAddresses(user.id);
    setAddresses(addrs.map(toLocalAddress));
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    await authDeleteAddress(addressId);
    const addrs = await fetchUserAddresses(user.id);
    setAddresses(addrs.map(toLocalAddress));
  };

  const handleToggleFavorite = useCallback((productId: string) => {
    if (!user) return;

    const existing = favoriteTimers.current.get(productId);
    if (existing) {
      clearTimeout(existing);
      favoriteTimers.current.delete(productId);
    }

    const isFav = favoritesRef.current.has(productId);
    setFavorites(prev => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    const timer = setTimeout(() => {
      favoriteTimers.current.delete(productId);
      if (isFav) {
        (async () => {
          const result = await removeUserFavorite(user.id, productId);
          if (result.resolvedId && result.resolvedId !== productId) {
            setFavorites(prev => {
              const next = new Set(prev);
              next.delete(result.resolvedId);
              return next;
            });
          }
        })();
      } else {
        (async () => {
          const result = await addUserFavorite(user.id, productId);
          if (result.resolvedId && result.resolvedId !== productId) {
            setFavorites(prev => {
              const next = new Set(prev);
              next.delete(productId);
              next.add(result.resolvedId);
              return next;
            });
          }
        })();
      }
    }, FAVORITE_DEBOUNCE_MS);

    favoriteTimers.current.set(productId, timer);
  }, [user]);

  const handleDailyCheckin = async (): Promise<{ success: boolean; error: string | null }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = await dailyCheckin(user.id);
    if (result.success) {
      setPoints(prev => prev + 1);
      setCheckedInToday(true);
    }
    return result;
  };

  const handleDeductPoints = async (amount: number): Promise<{ success: boolean; error: string | null }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = await deductPoints(user.id, amount);
    if (result.success && result.newBalance !== undefined) {
      setPoints(result.newBalance);
    }
    return { success: result.success, error: result.error };
  };

  const handleAddToOrder = async (
    items: { productId: string; name: string; image: string; quantity: number }[],
    shippingAddress?: Address,
    contactPhone?: string,
    contactEmail?: string,
    deliveryInstructions?: string,
  ): Promise<{ orderId: string | null; error: string | null }> => {
    if (!user) return { orderId: null, error: 'Not authenticated' };

    const addressPayload = shippingAddress ? {
      id: shippingAddress.id,
      label: shippingAddress.label,
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      email: shippingAddress.email,
      streetAddress: shippingAddress.streetAddress,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
      isDefault: shippingAddress.isDefault,
    } : undefined;

    const result = await addToWeeklyOrder(
      items,
      addressPayload,
      contactPhone,
      contactEmail,
      deliveryInstructions,
    );

    if (result.error) return { orderId: null, error: result.error };

    await loadOrders(user.id);
    return { orderId: result.orderId, error: null };
  };

  const handleRemoveFromOrder = async (productId: string, quantity?: number): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const result = await removeFromWeeklyOrder(productId, quantity);
    if (result.error) return { error: result.error };
    await loadOrders(user.id);
    return { error: null };
  };

  const handleModifyOrder = async (
    orderId: string,
    items: { product_id: string; name: string; image: string; price: number; quantity: number }[],
  ): Promise<{ wasCancelled: boolean; error: string | null }> => {
    if (!user) return { wasCancelled: false, error: 'Not authenticated' };
    const result = await modifyWeeklyOrder(orderId, items);
    if (result.error) return { wasCancelled: false, error: result.error };
    await loadOrders(user.id);
    if (result.wasCancelled) {
      const pts = await fetchUserPoints(user.id);
      setPoints(pts?.balance || 0);
    }
    return { wasCancelled: result.wasCancelled, error: null };
  };

  const handleUpdateOrderAddress = async (
    orderId: string,
    address: Address,
    contactPhone?: string,
    contactEmail?: string,
    deliveryInstructions?: string,
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const addressPayload = {
      id: address.id,
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      email: address.email,
      streetAddress: address.streetAddress,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    };
    const result = await updateWeeklyOrderAddress(orderId, addressPayload, contactPhone, contactEmail, deliveryInstructions);
    if (result.error) return { error: result.error };
    await loadOrders(user.id);
    return { error: null };
  };

  const handleSetPaymentMethod = async (orderId: string, method: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const result = await setOrderPaymentMethod(orderId, method);
    if (result.error) return { error: result.error };
    await loadOrders(user.id);
    const pts = await fetchUserPoints(user.id);
    setPoints(pts?.balance || 0);
    return { error: null };
  };

  const handleCancelOrder = async (orderId: string): Promise<{ success: boolean; error: string | null }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = await cancelUserOrder(user.id, orderId);
    if (result.success) {
      await loadOrders(user.id);
      const pts = await fetchUserPoints(user.id);
      setPoints(pts?.balance || 0);
    }
    return result;
  };

  const handleRefreshOrders = async () => {
    if (!user) return;
    await loadOrders(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isAdmin: profile?.is_admin ?? false,
        isLoading,
        isPasswordRecovery,
        addresses,
        favorites,
        orders,
        points,
        checkedInToday,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        updatePassword: handleUpdatePassword,
        clearPasswordRecovery,
        updateProfile: handleUpdateProfile,
        saveLanguagePreference: handleSaveLanguagePreference,
        loadAddresses,
        saveAddress: handleSaveAddress,
        deleteAddress: handleDeleteAddress,
        toggleFavorite: handleToggleFavorite,
        performDailyCheckin: handleDailyCheckin,
        deductUserPoints: handleDeductPoints,
        addToOrder: handleAddToOrder,
        removeFromOrder: handleRemoveFromOrder,
        modifyOrder: handleModifyOrder,
        updateOrderAddress: handleUpdateOrderAddress,
        setPaymentMethod: handleSetPaymentMethod,
        cancelOrder: handleCancelOrder,
        refreshOrders: handleRefreshOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
