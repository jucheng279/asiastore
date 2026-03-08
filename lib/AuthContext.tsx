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
  createUserOrder,
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
    paymentMethod: (o.payment_method as 'cashOrSwish' | 'points' | 'payAtStore') || 'cashOrSwish',
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
  loadAddresses: () => Promise<void>;
  saveAddress: (addressData: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  toggleFavorite: (productId: string) => void;
  performDailyCheckin: () => Promise<{ success: boolean; error: string | null }>;
  deductUserPoints: (amount: number) => Promise<{ success: boolean; error: string | null }>;
  createOrder: (orderData: {
    total: number;
    contactEmail: string;
    contactPhone: string;
    shippingAddress: Address;
    deliveryInstructions?: string;
    paidWithPoints?: boolean;
    pointsAmount?: number;
    paymentMethod?: 'cashOrSwish' | 'points' | 'payAtStore';
    items: { id: string; name: string; image: string; price: number; quantity: number }[];
  }) => Promise<{ order: Order | null; error: string | null }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error: string | null }>;
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

  const loadAddresses = async () => {
    if (!user) return;
    const addrs = await fetchUserAddresses(user.id);
    setAddresses(addrs.map(toLocalAddress));
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

  const handleCreateOrder = async (orderData: {
    total: number;
    contactEmail: string;
    contactPhone: string;
    shippingAddress: Address;
    deliveryInstructions?: string;
    paidWithPoints?: boolean;
    pointsAmount?: number;
    paymentMethod?: 'cashOrSwish' | 'points' | 'payAtStore';
    items: { id: string; name: string; image: string; price: number; quantity: number }[];
  }): Promise<{ order: Order | null; error: string | null }> => {
    if (!user) return { order: null, error: 'Not authenticated' };

    const result = await createUserOrder(user.id, {
      total: orderData.total,
      contactEmail: orderData.contactEmail,
      contactPhone: orderData.contactPhone,
      shippingAddress: orderData.shippingAddress as unknown as Record<string, unknown>,
      deliveryInstructions: orderData.deliveryInstructions,
      paidWithPoints: orderData.paidWithPoints,
      pointsAmount: orderData.pointsAmount,
      paymentMethod: orderData.paymentMethod,
      items: orderData.items.map(item => ({
        productId: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    if (result.error || !result.orderId) {
      return { order: null, error: result.error || 'Order failed' };
    }

    if (orderData.paidWithPoints && orderData.pointsAmount) {
      setPoints(prev => Math.max(0, prev - orderData.pointsAmount!));
    }

    const newOrder: Order = {
      id: result.orderId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      total: orderData.total,
      items: orderData.items.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.quantity,
        image: item.image,
        price: item.price,
      })),
      contactEmail: orderData.contactEmail,
      contactPhone: orderData.contactPhone,
      shippingAddress: orderData.shippingAddress,
      deliveryInstructions: orderData.deliveryInstructions,
      status: 'active',
      paidWithPoints: orderData.paidWithPoints,
      pointsAmount: orderData.pointsAmount,
      paymentMethod: orderData.paymentMethod || 'cashOrSwish',
    };

    setOrders(prev => [newOrder, ...prev]);
    return { order: newOrder, error: null };
  };

  const handleCancelOrder = async (orderId: string): Promise<{ success: boolean; error: string | null }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = await cancelUserOrder(user.id, orderId);
    if (result.success) {
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' as const } : o
      ));
      const order = orders.find(o => o.id === orderId);
      if (order?.paidWithPoints && order.pointsAmount) {
        setPoints(prev => prev + order.pointsAmount!);
      }
    }
    return result;
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
        loadAddresses,
        saveAddress: handleSaveAddress,
        deleteAddress: handleDeleteAddress,
        toggleFavorite: handleToggleFavorite,
        performDailyCheckin: handleDailyCheckin,
        deductUserPoints: handleDeductPoints,
        createOrder: handleCreateOrder,
        cancelOrder: handleCancelOrder,
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
