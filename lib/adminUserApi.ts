import { supabase } from './supabase';
import type { UserProfile, UserAddress } from './auth';

export interface UserWithAddresses extends UserProfile {
  addresses: UserAddress[];
  points: number;
}

export async function fetchAllUsersWithAddresses(): Promise<UserWithAddresses[]> {
  const [profilesRes, addressesRes, pointsRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('user_addresses').select('*').order('created_at', { ascending: true }),
    supabase.from('user_points').select('user_id, balance'),
  ]);

  if (profilesRes.error || !profilesRes.data) return [];

  const addressMap = new Map<string, UserAddress[]>();
  for (const addr of addressesRes.data ?? []) {
    const list = addressMap.get(addr.user_id) ?? [];
    list.push(addr as UserAddress);
    addressMap.set(addr.user_id, list);
  }

  const pointsMap = new Map<string, number>();
  for (const p of pointsRes.data ?? []) {
    pointsMap.set(p.user_id, p.balance ?? 0);
  }

  return profilesRes.data.map((profile) => ({
    ...(profile as UserProfile),
    addresses: addressMap.get(profile.id) ?? [],
    points: pointsMap.get(profile.id) ?? 0,
  }));
}

export async function adminAdjustUserPoints(
  userId: string,
  amount: number,
  operation: 'add' | 'subtract'
): Promise<{ error: string | null; newBalance: number | null }> {
  const { data, error } = await supabase.rpc('admin_adjust_user_points', {
    p_user_id: userId,
    p_amount: amount,
    p_operation: operation,
  });

  if (error) return { error: error.message, newBalance: null };
  return { error: null, newBalance: data as number };
}

export async function adminDeleteUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}
