/**
 * SpeedyMeals Restaurant Domain Types
 * Matches backend `app/modules/food_delivery` and `restaurants` table.
 */

import { RestaurantOrderDetail, RestaurantOrderSummary } from './order';

export type { RestaurantOrderDetail, RestaurantOrderSummary };
export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  photo_url?: string | null;
  variants?: Record<string, any> | null;
  is_available: boolean;
}

export interface MenuItemCreatePayload {
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  variants?: Record<string, any> | null;
  is_available?: boolean;
}

export interface MenuItemUpdatePayload {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  variants?: Record<string, any> | null;
  is_available?: boolean | null;
}

export interface MenuItemAvailabilityPayload {
  is_available: boolean;
}

export interface RestaurantProfile {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  commission_rate: number;
  currency?: string;
  logo_url?: string | null;
  cover_photo_url?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  status: string;
}

export interface RestaurantSettlement {
  id: string;
  restaurant_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  commission_deducted: number;
  net_payable: number;
  status: 'Pending' | 'Settled' | string;
  paid_at?: string | null;
}

export interface RestaurantDashboardMetrics {
  active_orders_count: number;
  today_orders_count: number;
  today_sales_gross: number;
  pending_settlement_estimate: number;
}
