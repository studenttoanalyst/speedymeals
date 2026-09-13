/**
 * SpeedyMeals Admin Domain Types
 * 1:1 match with backend `app/modules/admin/schemas.py`
 */

import { OrderStatus, PaymentMethod } from './order';
import { RiderAdmin, RiderPayout } from './rider';

export interface AdminDashboardSummary {
  date: string;
  total_orders_today: number;
  gross_revenue_today: number;
  net_revenue_today: number;
  pending_restaurant_settlements: number;
  total_rider_wallet_balance: number;
  total_pending_cod_cash: number;
}

export interface RestaurantAdmin {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  status: 'active' | 'inactive' | string;
  commission_rate: number;
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
  status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  total_amount: number;
  placed_at: string;
}

export interface AdminOrderDetail {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  customer_name: string;
  rider_id?: string | null;
  rider_name?: string | null;
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
  is_active: boolean;
  created_at: string;
}
