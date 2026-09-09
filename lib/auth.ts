import { supabase } from './supabase';

const SAFE_MESSAGES: [RegExp, string][] = [
  [/ordering is currently closed/i, 'Ordering is currently closed'],
  [/no longer available/i, 'This is no longer available for this order'],
  [/insufficient stock|product not found/i, 'Some items are no longer available in the requested quantity'],
  [/insufficient points/i, 'Insufficient points'],
  [/order not found/i, 'Order not found'],
  [/cannot be cancelled/i, 'This order can no longer be cancelled'],
  [/cannot be modified/i, 'This order can no longer be changed'],
  [/already cancelled/i, 'This order is already cancelled'],
  [/authentication required|not authorized/i, 'Please sign in again'],
  [/invalid quantity|no items provided|could not be priced/i, 'Please review the items in your cart'],
  [/address required/i, 'Please provide a delivery address'],
  [/invalid payment method/i, 'Invalid payment method'],
  [/cannot order group products/i, 'This item cannot be ordered directly'],
  [/item not in order/i, 'Item not found in your order'],
];

export function safeErrorMessage(
  raw?: string | null,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!raw) return fallback;
  for (const [pattern, message] of SAFE_MESSAGES) {
    if (pattern.test(raw)) return message;
  }
  console.error('[request failed]', raw);
  return fallback;
}

export async function signUp(
  email: string,
  password: string,
  nickname?: string
) {
  const resolvedNickname = nickname || email.split('@')[0];
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname: resolvedNickname },
    },
  });

  if (error) {
    if (/already registered|already exists|already been registered/i.test(error.message)) {
      return {
        user: null,
        error: 'We could not complete sign up with those details. Please try again or sign in.',
      };
    }
    return { user: null, error: safeErrorMessage(error.message) };
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        nickname: resolvedNickname,
        email,
      });

    if (profileError && profileError.code !== '23505') {
      return { user: data.user, error: safeErrorMessage(profileError.message) };
    }
  }

  return { user: data.user, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

export function getSiteUrl(): string {
  if (import.meta.env.VITE_SITE_URL) return import.meta.env.VITE_SITE_URL;
  return window.location.origin;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getSiteUrl(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export interface UserProfile {
  id: string;
  nickname: string | null;
  email: string;
  is_admin: boolean;
  preferred_language: 'en' | 'sv' | 'zh';
  created_at: string;
  updated_at: string;
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateProfile(
  userId: string,
  updates: { nickname?: string; email?: string; preferred_language?: 'en' | 'sv' | 'zh' }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) return { profile: null, error: safeErrorMessage(error.message) };
  return { profile: data as UserProfile, error: null };
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  email: string | null;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export async function fetchUserAddresses(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as UserAddress[];
}

export async function saveUserAddress(
  userId: string,
  address: {
    id?: string;
    label: string;
    full_name: string;
    phone: string;
    email?: string;
    street_address: string;
    city: string;
    postal_code: string;
    country: string;
    is_default: boolean;
  }
) {
  if (address.is_default) {
    await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  if (address.id) {
    const { data, error } = await supabase
      .from('user_addresses')
      .update({
        label: address.label,
        full_name: address.full_name,
        phone: address.phone,
        email: address.email || null,
        street_address: address.street_address,
        city: address.city,
        postal_code: address.postal_code,
        country: address.country,
        is_default: address.is_default,
      })
      .eq('id', address.id)
      .select()
      .maybeSingle();

    if (error) return { address: null, error: safeErrorMessage(error.message) };
    return { address: data as UserAddress, error: null };
  }

  const { data, error } = await supabase
    .from('user_addresses')
    .insert({
      user_id: userId,
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      email: address.email || null,
      street_address: address.street_address,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    })
    .select()
    .maybeSingle();

  if (error) return { address: null, error: safeErrorMessage(error.message) };
  return { address: data as UserAddress, error: null };
}

export async function deleteUserAddress(addressId: string) {
  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', addressId);

  return { error: error?.message || null };
}

export async function fetchUserFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map(row => row.product_id);
}

async function resolveSourceProductId(productId: string): Promise<string> {
  const { data: flashItem } = await supabase
    .from('flash_sale_items')
    .select('source_product_id')
    .eq('id', productId)
    .maybeSingle();
  if (flashItem?.source_product_id) return flashItem.source_product_id;

  const { data: expiryItem } = await supabase
    .from('expiry_items')
    .select('source_product_id')
    .eq('id', productId)
    .maybeSingle();
  if (expiryItem?.source_product_id) return expiryItem.source_product_id;

  return productId;
}

export async function addUserFavorite(userId: string, productId: string) {
  const resolvedId = await resolveSourceProductId(productId);
  const { error } = await supabase
    .from('user_favorites')
    .upsert(
      { user_id: userId, product_id: resolvedId },
      { onConflict: 'user_id,product_id' }
    );

  return { error: error?.message || null, resolvedId };
}

export async function removeUserFavorite(userId: string, productId: string) {
  const resolvedId = await resolveSourceProductId(productId);

  const idsToDelete = [resolvedId];
  if (productId !== resolvedId) {
    idsToDelete.push(productId);
  }

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .in('product_id', idsToDelete);

  return { error: error?.message || null, resolvedId };
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface DbOrder {
  id: string;
  user_id: string;
  total: number;
  contact_email: string;
  contact_phone: string;
  shipping_address: Record<string, unknown>;
  delivery_instructions: string | null;
  created_at: string;
  status: string;
  paid_with_points: boolean;
  points_amount: number;
  payment_method: string;
}

export async function fetchUserOrders(userId: string): Promise<{ order: DbOrder; items: DbOrderItem[] }[]> {
  await supabase.rpc('finalize_and_cleanup_orders');

  const { data: orders, error: ordersError } = await supabase
    .from('user_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError || !orders || orders.length === 0) return [];

  const orderIds = orders.map(o => o.id);
  const { data: items, error: itemsError } = await supabase
    .from('user_order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsError) return orders.map(o => ({ order: o as DbOrder, items: [] }));

  const itemsByOrder = new Map<string, DbOrderItem[]>();
  for (const item of (items || [])) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item as DbOrderItem);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map(o => ({
    order: o as DbOrder,
    items: itemsByOrder.get(o.id) || [],
  }));
}

export interface UserPoints {
  user_id: string;
  balance: number;
  total_earned: number;
  updated_at: string;
}

export async function fetchUserPoints(userId: string): Promise<UserPoints | null> {
  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserPoints;
}

export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('user_checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle();

  return !!data;
}

export async function dailyCheckin(userId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('user_checkins')
    .insert({ user_id: userId });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Already checked in today' };
    }
    return { success: false, error: safeErrorMessage(error.message, 'Check-in is unavailable right now. Please try again later.') };
  }

  return { success: true, error: null };
}

export async function deductPoints(
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance?: number; error: string | null }> {
  const { data, error } = await supabase.rpc('deduct_user_points', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) return { success: false, error: safeErrorMessage(error.message) };
  if (data === -1) return { success: false, error: 'Insufficient points' };
  return { success: true, newBalance: data as number, error: null };
}

// ---- Weekly Order API ----

export async function addToWeeklyOrder(
  items: { productId: string; name: string; image: string; quantity: number }[],
  shippingAddress?: Record<string, unknown>,
  contactPhone?: string,
  contactEmail?: string,
  deliveryInstructions?: string,
): Promise<{ orderId: string | null; subtotal: number; error: string | null }> {
  const itemsPayload = items.map(item => ({
    product_id: item.productId,
    name: item.name,
    image: item.image,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc('add_to_weekly_order', {
    p_items: itemsPayload,
    p_shipping_address: shippingAddress || null,
    p_contact_phone: contactPhone || '',
    p_contact_email: contactEmail || '',
    p_delivery_instructions: deliveryInstructions || null,
  });

  if (error) return { orderId: null, subtotal: 0, error: safeErrorMessage(error.message) };
  return {
    orderId: data?.order_id || null,
    subtotal: data?.subtotal || 0,
    error: null,
  };
}

export async function removeFromWeeklyOrder(
  productId: string,
  quantity?: number,
): Promise<{ subtotal: number; cancelled: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('remove_from_weekly_order', {
    p_product_id: productId,
    p_quantity: quantity ?? null,
  });

  if (error) return { subtotal: 0, cancelled: false, error: safeErrorMessage(error.message) };
  return {
    subtotal: data?.subtotal || 0,
    cancelled: data?.cancelled || false,
    error: null,
  };
}

export async function modifyWeeklyOrder(
  orderId: string,
  items: { product_id: string; name: string; image: string; price: number; quantity: number }[],
): Promise<{ newTotal: number; wasCancelled: boolean; error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { newTotal: 0, wasCancelled: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('modify_order_atomic', {
    p_user_id: userData.user.id,
    p_order_id: orderId,
    p_items: items,
  });

  if (error) return { newTotal: 0, wasCancelled: false, error: safeErrorMessage(error.message) };
  return {
    newTotal: data?.new_total || 0,
    wasCancelled: data?.was_cancelled || false,
    error: null,
  };
}

export async function updateWeeklyOrderAddress(
  orderId: string,
  shippingAddress: Record<string, unknown>,
  contactPhone?: string,
  contactEmail?: string,
  deliveryInstructions?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_weekly_order_address', {
    p_order_id: orderId,
    p_shipping_address: shippingAddress,
    p_contact_phone: contactPhone || null,
    p_contact_email: contactEmail || null,
    p_delivery_instructions: deliveryInstructions || null,
  });

  if (error) return { error: safeErrorMessage(error.message) };
  return { error: null };
}

export async function setOrderPaymentMethod(
  orderId: string,
  paymentMethod: string,
): Promise<{ subtotal: number; shipping: number; total: number; error: string | null }> {
  const { data, error } = await supabase.rpc('set_order_payment_method', {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
  });

  if (error) return { subtotal: 0, shipping: 0, total: 0, error: safeErrorMessage(error.message) };
  return {
    subtotal: data?.subtotal || 0,
    shipping: data?.shipping || 0,
    total: data?.total || 0,
    error: null,
  };
}

export async function cancelUserOrder(
  userId: string,
  orderId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('cancel_order_atomic', {
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (error) return { success: false, error: safeErrorMessage(error.message) };
  return { success: true, error: null };
}
