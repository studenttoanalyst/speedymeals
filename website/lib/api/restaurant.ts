/**
 * SpeedyMeals Restaurant API Client
 * 1:1 mapping with backend `app/modules/food_delivery/routes.py`
 */

import { apiClient } from './client';
import {
  MenuItem,
  MenuItemAvailabilityPayload,
  MenuItemCreatePayload,
  MenuItemUpdatePayload,
  RestaurantDashboardMetrics,
  RestaurantOrderDetail,
  RestaurantOrderSummary,
  RestaurantProfile,
  RestaurantSettlement,
} from '@/types/restaurant';
import {
  mockMenuItems,
  mockRestaurantOrders,
  mockRestaurants,
  mockSettlements,
} from './fixtures';

/**
 * Menu Items Management
 */
export async function listRestaurantMenuItems(): Promise<MenuItem[]> {
  return apiClient<MenuItem[]>('/restaurants/me/menu-items', {
    fallbackData: mockMenuItems,
  });
}

export async function createRestaurantMenuItem(payload: MenuItemCreatePayload): Promise<MenuItem> {
  const fallback: MenuItem = {
    id: `m1-${Date.now()}`,
    restaurant_id: mockRestaurants[0].id,
    name: payload.name,
    description: payload.description ?? null,
    price: payload.price,
    category: payload.category ?? null,
    photo_url: null,
    variants: payload.variants ?? null,
    is_available: payload.is_available ?? true,
  };

  return apiClient<MenuItem>('/restaurants/me/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function updateRestaurantMenuItem(
  itemId: string,
  payload: MenuItemUpdatePayload
): Promise<MenuItem> {
  const base = mockMenuItems.find((m) => m.id === itemId) ?? mockMenuItems[0];
  const fallback: MenuItem = {
    ...base,
    name: payload.name ?? base.name,
    price: payload.price ?? base.price,
    description: payload.description !== undefined ? payload.description : base.description,
    category: payload.category !== undefined ? payload.category : base.category,
    variants: payload.variants !== undefined ? payload.variants : base.variants,
    is_available: payload.is_available !== undefined && payload.is_available !== null ? payload.is_available : base.is_available,
  };

  return apiClient<MenuItem>(`/restaurants/me/menu-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function deleteRestaurantMenuItem(itemId: string): Promise<void> {
  return apiClient<void>(`/restaurants/me/menu-items/${itemId}`, {
    method: 'DELETE',
    fallbackData: undefined,
  });
}

export async function setRestaurantMenuItemAvailability(
  itemId: string,
  payload: MenuItemAvailabilityPayload
): Promise<MenuItem> {
  const base = mockMenuItems.find((m) => m.id === itemId) ?? mockMenuItems[0];
  const fallback: MenuItem = {
    ...base,
    is_available: payload.is_available,
  };

  return apiClient<MenuItem>(`/restaurants/me/menu-items/${itemId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function uploadRestaurantMenuItemPhoto(
  itemId: string,
  file: File
): Promise<MenuItem> {
  const base = mockMenuItems.find((m) => m.id === itemId) ?? mockMenuItems[0];
  const fallback: MenuItem = {
    ...base,
    photo_url: URL.createObjectURL(file),
  };

  const formData = new FormData();
  formData.append('file', file);

  const token = typeof window !== 'undefined' ? localStorage.getItem('sm_access_token') : null;
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

  try {
    const res = await fetch(`${API_BASE_URL}/restaurants/me/menu-items/${itemId}/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()) as MenuItem;
  } catch (err) {
    console.warn('[SpeedyMeals API] Photo upload fallback triggered:', err);
    return fallback;
  }
}

/**
 * Restaurant Orders Management
 */
export async function listRestaurantOrders(params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<RestaurantOrderSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.date_from) query.append('date_from', params.date_from);
  if (params?.date_to) query.append('date_to', params.date_to);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const fallback = params?.status
    ? mockRestaurantOrders.filter((o) => o.status === params.status)
    : mockRestaurantOrders;

  return apiClient<RestaurantOrderSummary[]>(`/restaurants/me/orders${qs}`, {
    fallbackData: fallback,
  });
}

export async function getRestaurantOrder(orderId: string): Promise<RestaurantOrderDetail> {
  const fallback: RestaurantOrderDetail = {
    id: orderId,
    status: 'Preparing',
    payment_method: 'COD',
    food_subtotal: 1350.0,
    delivery_distance_km: 3.2,
    delivery_fee: 100.0,
    total_amount: 1450.0,
    commission_amount: 135.0,
    restaurant_payable: 1215.0,
    rider_earning: 100.0,
    special_instructions: 'Please pack raita and salad separately.',
    placed_at: '2026-09-13T02:15:00Z',
    delivered_at: null,
    customer_name: 'Ahmed Faraz',
    delivery_address: {
      label: 'Home',
      full_address: 'Flat 402, Al-Ghafoor Heights, Block 13-D, Gulshan-e-Iqbal, Karachi',
      latitude: 24.9123,
      longitude: 67.0891,
    },
    items: [
      {
        menu_item_id: mockMenuItems[0].id,
        name: mockMenuItems[0].name,
        quantity: 2,
        selected_variant: null,
        price_at_order: 450.0,
      },
      {
        menu_item_id: mockMenuItems[3].id,
        name: mockMenuItems[3].name,
        quantity: 3,
        selected_variant: null,
        price_at_order: 80.0,
      },
    ],
  };

  return apiClient<RestaurantOrderDetail>(`/restaurants/me/orders/${orderId}`, {
    fallbackData: fallback,
  });
}

export async function updateRestaurantOrderStatus(
  orderId: string,
  newStatus: string
): Promise<RestaurantOrderDetail> {
  const base = await getRestaurantOrder(orderId);
  const fallback: RestaurantOrderDetail = {
    ...base,
    status: newStatus,
  };

  return apiClient<RestaurantOrderDetail>(`/restaurants/me/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
    fallbackData: fallback,
  });
}

/**
 * Restaurant Settlements & Profile (Portal Extensions)
 */
export async function listRestaurantSettlements(): Promise<RestaurantSettlement[]> {
  const fallback: RestaurantSettlement[] = mockSettlements.map((s) => ({
    id: s.id,
    restaurant_id: s.restaurant_id,
    period_start: s.period_start,
    period_end: s.period_end,
    total_sales: s.total_sales,
    commission_deducted: s.commission_deducted,
    net_payable: s.net_payable,
    status: s.status,
    paid_at: s.paid_at,
  }));

  return apiClient<RestaurantSettlement[]>('/restaurants/me/settlements', {
    fallbackData: fallback,
  });
}

export async function getRestaurantMetrics(): Promise<RestaurantDashboardMetrics> {
  const fallback: RestaurantDashboardMetrics = {
    active_orders_count: 3,
    today_orders_count: 24,
    today_sales_gross: 31200.0,
    net_payable_estimate: 28080.0, // 90% net after 10% commission
    pending_settlement_estimate: 28080.0,
    avg_prep_time_mins: 16.4,
    cancellation_rate_pct: 1.8,
  };

  return apiClient<RestaurantDashboardMetrics>('/restaurants/me/metrics', {
    fallbackData: fallback,
  });
}

export async function getRestaurantProfile(): Promise<RestaurantProfile> {
  const fallback: RestaurantProfile = {
    id: mockRestaurants[0].id,
    name: mockRestaurants[0].name,
    email: mockRestaurants[0].email,
    phone_number: mockRestaurants[0].phone_number,
    address: 'Shop # 4, Main Boat Basin, Clifton Block 5, Karachi',
    latitude: 24.8234,
    longitude: 67.0345,
    commission_rate: 10.0,
    currency: 'PKR',
    opening_time: '11:00',
    closing_time: '23:30',
    status: 'active',
  };

  return apiClient<RestaurantProfile>('/restaurants/me/profile', {
    fallbackData: fallback,
  });
}
