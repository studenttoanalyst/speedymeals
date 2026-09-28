/**
 * SpeedyMeals Admin Domain Types
 * 1:1 match with backend `app/modules/admin/schemas.py`
 * Enhanced with promotions, media management, and SLA tracking.
 */

import { OrderStatus, PaymentMethod } from './order';
import { RiderAdmin, RiderPayout } from './rider';

export interface AdminDashboardSummary {
  date: string;
  total_orders_today: number;
  gross_revenue_today: number;
  net_revenue_today: number; // 10% platform commission
  pending_restaurant_settlements: number;
  total_rider_wallet_balance: number;
  total_pending_cod_cash: number; // Float risk metric
  active_deliveries_count: number;
  riders_exceeding_float_count: number;
  pending_restaurant_kyc_count: number;
  pending_rider_kyc_count: number;
}

export interface RestaurantAdmin {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  status: 'active' | 'inactive' | 'pending' | string;
  commission_rate: number;
  logo_url?: string | null;
  banner_url?: string | null;
  active_menu_items_count?: number;
  total_orders_count?: number;
  created_at: string;
}

export interface RestaurantCreatePayload {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  country_code?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  commission_rate?: number;
  currency?: string;
  logo_url?: string | null;
  banner_url?: string | null;
}

export interface RestaurantStatusUpdatePayload {
  is_active: boolean;
}

export interface RestaurantCommissionUpdatePayload {
  commission_rate: number;
}

export interface RestaurantCredentialsResetPayload {
  new_password?: string | null;
  new_email?: string | null;
  new_phone_number?: string | null;
}

export interface AdminOrderSummary {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  rider_id?: string | null;
  rider_name?: string | null;
  status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  total_amount: number;
  placed_at: string;
  elapsed_time_mins?: number;
}

export interface AdminOrderDetail {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  customer_name: string;
  customer_phone?: string;
  rider_id?: string | null;
  rider_name?: string | null;
  rider_phone?: string | null;
  status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  food_subtotal: number;
  delivery_distance_km: number;
  delivery_fee: number;
  total_amount: number;
  commission_amount: number;
  restaurant_payable: number;
  rider_earning: number;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  placed_at: string;
  delivered_at?: string | null;
}

export interface OrderCancelPayload {
  reason: string;
}

export interface OrderReassignPayload {
  rider_id: string;
}

export interface SettlementPeriodPayload {
  period_start: string;
  period_end: string;
}

export interface Settlement {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  commission_deducted: number;
  net_payable: number;
  status: 'Pending' | 'Settled' | string;
  paid_at?: string | null;
  reference_code?: string | null;
}

export interface CashDiscrepancy {
  id: string;
  rider_id: string;
  rider_name: string;
  expected_amount: number;
  amount_submitted: number;
  discrepancy: number;
  verified_by_admin: boolean;
  created_at: string;
}

export interface TopRestaurant {
  restaurant_id: string;
  restaurant_name: string;
  order_count: number;
  revenue: number;
}

export interface PromotionAdmin {
  id: string;
  code: string;
  title: string;
  description?: string;
  banner_url?: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_count: number;
}

export interface PromotionCreatePayload {
  code: string;
  title: string;
  description?: string;
  banner_url?: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export interface AdminReportsResponse {
  period_start: string;
  period_end: string;
  total_orders: number;
  total_revenue: number;
  top_restaurants: TopRestaurant[];
  total_rider_payouts: number;
  cash_discrepancy_total: number;
  average_delivery_distance_km: number;
  average_delivery_fee: number;
}

export interface CustomerAdmin {
  id: string;
  name?: string | null;
  phone_number: string;
  email?: string | null;
  wallet_balance: number;
  total_orders_count?: number;
  is_active: boolean;
  created_at: string;
}
