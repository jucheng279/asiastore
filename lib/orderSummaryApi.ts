import { supabase } from './supabase';

export interface OrderSummaryItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface OrderSummaryRow {
  userId: string;
  nickname: string;
  items: OrderSummaryItem[];
  address: {
    streetAddress: string;
    postalCode: string;
    city: string;
    country: string;
    fullName: string;
    label: string;
  };
  deliveryInstructions?: string;
  contactPhone: string;
  contactEmail: string;
  paymentMethod: string;
  total: number;
  orderIds: string[];
  createdAt: string;
}

export interface OrderingWindow {
  start: Date;
  end: Date;
  label: string;
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWindowDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${DAY_NAMES[d.getDay() === 0 ? 7 : d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

export function calculateOrderingWindow(
  openDay: number,
  openTime: string,
  closeDay: number,
  closeTime: string,
  weekOffset: number = 0
): OrderingWindow {
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })
  );

  const currentIsoDay = now.getDay() === 0 ? 7 : now.getDay();

  let daysToOpen = openDay - currentIsoDay;
  if (daysToOpen > 0) daysToOpen -= 7;

  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() + daysToOpen);
  windowStart.setHours(openH, openM, 0, 0);

  if (windowStart > now) {
    windowStart.setDate(windowStart.getDate() - 7);
  }

  windowStart.setDate(windowStart.getDate() + weekOffset * 7);

  let daysFromOpenToClose = closeDay - openDay;
  if (daysFromOpenToClose <= 0) daysFromOpenToClose += 7;

  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + daysFromOpenToClose);
  windowEnd.setHours(closeH, closeM, 0, 0);

  const label = `${formatWindowDate(windowStart)} ${openTime} – ${formatWindowDate(windowEnd)} ${closeTime}`;

  return { start: windowStart, end: windowEnd, label };
}

function addressKey(addr: Record<string, unknown>): string {
  const street = ((addr.streetAddress as string) || '').trim().toLowerCase();
  const postal = ((addr.postalCode as string) || '').trim().toLowerCase();
  const city = ((addr.city as string) || '').trim().toLowerCase();
  return `${street}|${postal}|${city}`;
}

function consolidationKey(order: {
  contactPhone: string;
  contactEmail: string;
  paymentMethod: string;
  addressStr: string;
}): string {
  return `${order.contactPhone.trim()}|${order.contactEmail.trim().toLowerCase()}|${order.paymentMethod}|${order.addressStr}`;
}

export async function fetchOrderSummary(
  windowStart: Date,
  windowEnd: Date
): Promise<{ rows: OrderSummaryRow[]; totalOrders: number }> {
  await supabase.rpc('finalize_and_cleanup_orders');

  const { data: orders, error: ordersErr } = await supabase
    .from('user_orders')
    .select('*')
    .in('status', ['active', 'completed'])
    .gte('created_at', windowStart.toISOString())
    .lt('created_at', windowEnd.toISOString())
    .order('created_at', { ascending: true });

  if (ordersErr || !orders || orders.length === 0) {
    return { rows: [], totalOrders: 0 };
  }

  const orderIds = orders.map(o => o.id);
  const userIds = [...new Set(orders.map(o => o.user_id))];

  const [itemsRes, profilesRes] = await Promise.all([
    supabase.from('user_order_items').select('*').in('order_id', orderIds),
    supabase.from('profiles').select('id, nickname, email').in('id', userIds),
  ]);

  const itemsByOrder = new Map<string, OrderSummaryItem[]>();
  for (const item of itemsRes.data || []) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push({
      productId: item.product_id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
    });
    itemsByOrder.set(item.order_id, list);
  }

  const profileMap = new Map<string, { nickname: string; email: string }>();
  for (const p of profilesRes.data || []) {
    profileMap.set(p.id, {
      nickname: p.nickname || p.email.split('@')[0],
      email: p.email,
    });
  }

  const grouped = new Map<string, {
    userId: string;
    nickname: string;
    items: OrderSummaryItem[];
    addr: Record<string, unknown>;
    deliveryInstructions?: string;
    contactPhone: string;
    contactEmail: string;
    paymentMethod: string;
    total: number;
    orderIds: string[];
    createdAt: string;
  }>();

  for (const order of orders) {
    const profile = profileMap.get(order.user_id);
    const nickname = profile?.nickname || 'Unknown User';
    const addr = (order.shipping_address || {}) as Record<string, unknown>;
    const addrStr = addressKey(addr);
    const pm = order.payment_method || (order.paid_with_points ? 'points' : 'cashOrSwish');

    const key = `${order.user_id}|${consolidationKey({
      contactPhone: order.contact_phone,
      contactEmail: order.contact_email,
      paymentMethod: pm,
      addressStr: addrStr,
    })}`;

    const existing = grouped.get(key);
    if (existing) {
      const orderItems = itemsByOrder.get(order.id) || [];
      for (const item of orderItems) {
        const match = existing.items.find(i => i.productId === item.productId && i.price === item.price);
        if (match) {
          match.quantity += item.quantity;
        } else {
          existing.items.push({ ...item });
        }
      }
      existing.total += order.total;
      existing.orderIds.push(order.id);
      if (order.delivery_instructions && !existing.deliveryInstructions) {
        existing.deliveryInstructions = order.delivery_instructions;
      }
    } else {
      grouped.set(key, {
        userId: order.user_id,
        nickname,
        items: [...(itemsByOrder.get(order.id) || [])],
        addr,
        deliveryInstructions: order.delivery_instructions || undefined,
        contactPhone: order.contact_phone,
        contactEmail: order.contact_email,
        paymentMethod: pm,
        total: order.total,
        orderIds: [order.id],
        createdAt: order.created_at,
      });
    }
  }

  const rows: OrderSummaryRow[] = [];
  for (const g of grouped.values()) {
    rows.push({
      userId: g.userId,
      nickname: g.nickname,
      items: g.items,
      address: {
        streetAddress: (g.addr.streetAddress as string) || '',
        postalCode: (g.addr.postalCode as string) || '',
        city: (g.addr.city as string) || '',
        country: (g.addr.country as string) || '',
        fullName: (g.addr.fullName as string) || '',
        label: (g.addr.label as string) || '',
      },
      deliveryInstructions: g.deliveryInstructions,
      contactPhone: g.contactPhone,
      contactEmail: g.contactEmail,
      paymentMethod: g.paymentMethod,
      total: g.total,
      orderIds: g.orderIds,
      createdAt: g.createdAt,
    });
  }

  rows.sort((a, b) => a.nickname.localeCompare(b.nickname));

  return { rows, totalOrders: orders.length };
}
