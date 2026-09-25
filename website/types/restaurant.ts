/**
 * SpeedyMeals Restaurant Domain Types
 * Matches backend `app/modules/food_delivery` and `restaurants` table.
 * Enhanced with modifier groups, media support (logos, banners, dish photos), and operational metrics.
 */

import { RestaurantOrderDetail, RestaurantOrderSummary } from './order';

export type { RestaurantOrderDetail, RestaurantOrderSummary };

export interface ModifierOption {
  id: string;
  name: string;
  price_delta: number; // e.g. +150 PKR
  is_default?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g. "Size", "Crust", "Toppings"
  min_selection: number; // 1 = mandatory, 0 = optional
  max_selection: number; // 1 = radio button, >1 = checkbox limit
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  photo_url?: string | null;
  image_url?: string | null; // Alias for photo_url for media pipeline consistency
  variants?: Record<string, any> | null;
  modifier_groups?: ModifierGroup[] | null;
  is_available: boolean;
  is_popular?: boolean;
  dietary_type?: 'veg' | 'non-veg' | 'vegan' | 'halal' | string;
}

export interface MenuItemCreatePayload {
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  variants?: Record<string, any> | null;
  modifier_groups?: ModifierGroup[] | null;
  is_available?: boolean;
  is_popular?: boolean;
  dietary_type?: string;
}

export interface MenuItemUpdatePayload {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  variants?: Record<string, any> | null;
  modifier_groups?: ModifierGroup[] | null;
  is_available?: boolean | null;
  is_popular?: boolean | null;
  dietary_type?: string | null;
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
  banner_url?: string | null; // Unified storefront banner
  opening_time?: string | null;
  closing_time?: string | null;
  prep_time_minutes?: number; // Kitchen prep SLA in minutes
  rating?: number;
  total_reviews?: number;
  is_open?: boolean;
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
  reference_code?: string | null;
}

export interface RestaurantDashboardMetrics {
  active_orders_count: number;
  today_orders_count: number;
  today_sales_gross: number;
  net_payable_estimate: number;
  pending_settlement_estimate: number;
  avg_prep_time_mins: number;
  cancellation_rate_pct: number;
}
