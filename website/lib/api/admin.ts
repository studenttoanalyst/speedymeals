/**
 * SpeedyMeals Admin API Client
 * 1:1 mapping with backend `app/modules/admin/routes.py`
 * Enhanced with Promotions, Customer Management, and KYC operations.
 */

import { apiClient } from './client';
import {
  AdminDashboardSummary,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminReportsResponse,
  CashDiscrepancy,
  CustomerAdmin,
  OrderCancelPayload,
  OrderReassignPayload,
  PromotionAdmin,
  PromotionCreatePayload,
  RestaurantAdmin,
  RestaurantCommissionUpdatePayload,
  RestaurantCreatePayload,
  RestaurantCredentialsResetPayload,
  RestaurantStatusUpdatePayload,
  Settlement,
  SettlementPeriodPayload,
} from '@/types/admin';
import {
  RiderAdmin,
  RiderApprovalUpdatePayload,
  RiderPayout,
  RiderStatusUpdatePayload,
} from '@/types/rider';
import {
  mockAdminDashboard,
  mockAdminOrders,
  mockCashDiscrepancies,
  mockCustomers,
  mockPromotions,
  mockRestaurants,
  mockRiderPayouts,
  mockRiders,
  mockSettlements,
} from './fixtures';

/**
 * Step 1 — Dashboard summary
 */
export async function getAdminDashboard(): Promise<AdminDashboardSummary> {
  return apiClient<AdminDashboardSummary>('/admin/dashboard', {
    fallbackData: mockAdminDashboard,
  });
}

/**
 * Step 2 — Restaurants Management
 */
export async function listAdminRestaurants(status?: 'active' | 'inactive' | 'pending'): Promise<RestaurantAdmin[]> {
  const query = status ? `?status=${status}` : '';
  const fallback = status
    ? mockRestaurants.filter((r) => r.status === status)
    : mockRestaurants;

  return apiClient<RestaurantAdmin[]>(`/admin/restaurants${query}`, {
    fallbackData: fallback,
  });
}

export async function getAdminRestaurant(restaurantId: string): Promise<RestaurantAdmin> {
  const fallback = mockRestaurants.find((r) => r.id === restaurantId) ?? mockRestaurants[0];
  return apiClient<RestaurantAdmin>(`/admin/restaurants/${restaurantId}`, {
    fallbackData: fallback,
  });
}

export async function createAdminRestaurant(payload: RestaurantCreatePayload): Promise<RestaurantAdmin> {
  const fallback: RestaurantAdmin = {
    id: `rest-${Date.now()}`,
    name: payload.name,
    email: payload.email,
    phone_number: payload.phone_number,
    status: 'active',
    commission_rate: payload.commission_rate ?? 10.0,
    logo_url: payload.logo_url ?? null,
    banner_url: payload.banner_url ?? null,
    created_at: new Date().toISOString(),
  };

  return apiClient<RestaurantAdmin>('/admin/restaurants', {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function updateAdminRestaurantStatus(
  restaurantId: string,
  payload: RestaurantStatusUpdatePayload
): Promise<RestaurantAdmin> {
  const base = mockRestaurants.find((r) => r.id === restaurantId) ?? mockRestaurants[0];
  const fallback: RestaurantAdmin = {
    ...base,
    status: payload.is_active ? 'active' : 'inactive',
  };

  return apiClient<RestaurantAdmin>(`/admin/restaurants/${restaurantId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function updateAdminRestaurantCommission(
  restaurantId: string,
  payload: RestaurantCommissionUpdatePayload
): Promise<RestaurantAdmin> {
  const base = mockRestaurants.find((r) => r.id === restaurantId) ?? mockRestaurants[0];
  const fallback: RestaurantAdmin = {
    ...base,
    commission_rate: payload.commission_rate,
  };

  return apiClient<RestaurantAdmin>(`/admin/restaurants/${restaurantId}/commission`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function resetAdminRestaurantCredentials(
  restaurantId: string,
  payload: RestaurantCredentialsResetPayload
): Promise<void> {
  return apiClient<void>(`/admin/restaurants/${restaurantId}/credentials`, {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: undefined,
  });
}

/**
 * Step 3 — Riders Management
 */
export async function listAdminRiders(params?: {
  approval_status?: string;
  is_online?: boolean;
}): Promise<RiderAdmin[]> {
  const query = new URLSearchParams();
  if (params?.approval_status) query.append('approval_status', params.approval_status);
  if (params?.is_online !== undefined) query.append('is_online', String(params.is_online));

  const qs = query.toString() ? `?${query.toString()}` : '';
  let fallback = [...mockRiders];
  if (params?.approval_status) {
    fallback = fallback.filter((r) => r.approval_status === params.approval_status);
  }
  if (params?.is_online !== undefined) {
    fallback = fallback.filter((r) => r.is_online === params.is_online);
  }

  return apiClient<RiderAdmin[]>(`/admin/riders${qs}`, {
    fallbackData: fallback,
  });
}

export async function getAdminRider(riderId: string): Promise<RiderAdmin> {
  const fallback = mockRiders.find((r) => r.id === riderId) ?? mockRiders[0];
  return apiClient<RiderAdmin>(`/admin/riders/${riderId}`, {
    fallbackData: fallback,
  });
}

export async function updateAdminRiderApproval(
  riderId: string,
  payload: RiderApprovalUpdatePayload
): Promise<RiderAdmin> {
  const base = mockRiders.find((r) => r.id === riderId) ?? mockRiders[0];
  const fallback: RiderAdmin = {
    ...base,
    approval_status: payload.approval_status,
  };

  return apiClient<RiderAdmin>(`/admin/riders/${riderId}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function updateAdminRiderStatus(
  riderId: string,
  payload: RiderStatusUpdatePayload
): Promise<RiderAdmin> {
  const base = mockRiders.find((r) => r.id === riderId) ?? mockRiders[0];
  const fallback: RiderAdmin = {
    ...base,
    is_active: payload.is_active,
  };

  return apiClient<RiderAdmin>(`/admin/riders/${riderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

/**
 * Step 4 — Global Orders Management
 */
export async function listAdminOrders(params?: {
  status?: string;
  restaurant_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<AdminOrderSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.restaurant_id) query.append('restaurant_id', params.restaurant_id);
  if (params?.date_from) query.append('date_from', params.date_from);
  if (params?.date_to) query.append('date_to', params.date_to);

  const qs = query.toString() ? `?${query.toString()}` : '';
  let fallback = [...mockAdminOrders];
  if (params?.status) {
    fallback = fallback.filter((o) => o.status === params.status);
  }
  if (params?.restaurant_id) {
    fallback = fallback.filter((o) => o.restaurant_id === params.restaurant_id);
  }

  return apiClient<AdminOrderSummary[]>(`/admin/orders${qs}`, {
    fallbackData: fallback,
  });
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail> {
  const summary = mockAdminOrders.find((o) => o.id === orderId) ?? mockAdminOrders[0];
  const fallback: AdminOrderDetail = {
    id: orderId,
    restaurant_id: summary.restaurant_id,
    restaurant_name: summary.restaurant_name,
    customer_name: 'Ahmed Faraz',
    customer_phone: '+923001239876',
    rider_id: summary.rider_id ?? null,
    rider_name: summary.rider_name ?? 'Unassigned',
    rider_phone: '+923011234567',
    status: summary.status,
    payment_method: summary.payment_method,
    food_subtotal: 1350.0,
    delivery_distance_km: 3.2,
    delivery_fee: 100.0,
    total_amount: summary.total_amount,
    commission_amount: 135.0, // 10%
    restaurant_payable: 1215.0,
    rider_earning: 100.0, // 100% of delivery fee
    placed_at: summary.placed_at,
    delivered_at: null,
  };

  return apiClient<AdminOrderDetail>(`/admin/orders/${orderId}`, {
    fallbackData: fallback,
  });
}

export async function cancelAdminOrder(orderId: string, payload: OrderCancelPayload): Promise<AdminOrderDetail> {
  const base = await getAdminOrder(orderId);
  const fallback: AdminOrderDetail = {
    ...base,
    status: 'Cancelled',
    cancellation_reason: payload.reason,
    cancelled_by: 'Admin',
  };

  return apiClient<AdminOrderDetail>(`/admin/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function reassignAdminOrder(orderId: string, payload: OrderReassignPayload): Promise<AdminOrderDetail> {
  const base = await getAdminOrder(orderId);
  const rider = mockRiders.find((r) => r.id === payload.rider_id) ?? mockRiders[0];
  const fallback: AdminOrderDetail = {
    ...base,
    rider_id: rider.id,
    rider_name: rider.name,
    status: 'Rider Assigned',
  };

  return apiClient<AdminOrderDetail>(`/admin/orders/${orderId}/reassign`, {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

/**
 * Step 5 — Settlements Management
 */
export async function generateAdminSettlements(payload: SettlementPeriodPayload): Promise<Settlement[]> {
  return apiClient<Settlement[]>('/admin/settlements/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: mockSettlements,
  });
}

export async function listAdminSettlements(status?: string): Promise<Settlement[]> {
  const query = status ? `?status=${status}` : '';
  const fallback = status ? mockSettlements.filter((s) => s.status === status) : mockSettlements;

  return apiClient<Settlement[]>(`/admin/settlements${query}`, {
    fallbackData: fallback,
  });
}

export async function markAdminSettlementPaid(settlementId: string): Promise<Settlement> {
  const base = mockSettlements.find((s) => s.id === settlementId) ?? mockSettlements[0];
  const fallback: Settlement = {
    ...base,
    status: 'Settled',
    paid_at: new Date().toISOString(),
    reference_code: `TXN-${Date.now().toString().slice(-6)}`,
  };

  return apiClient<Settlement>(`/admin/settlements/${settlementId}/mark-paid`, {
    method: 'POST',
    fallbackData: fallback,
  });
}

/**
 * Step 6 — Rider Payouts & Cash Discrepancies
 */
export async function generateAdminRiderPayouts(payload: SettlementPeriodPayload): Promise<RiderPayout[]> {
  return apiClient<RiderPayout[]>('/admin/rider-payouts/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: mockRiderPayouts,
  });
}

export async function listAdminRiderPayouts(status?: string): Promise<RiderPayout[]> {
  const query = status ? `?status=${status}` : '';
  const fallback = status ? mockRiderPayouts.filter((p) => p.status === status) : mockRiderPayouts;

  return apiClient<RiderPayout[]>(`/admin/rider-payouts${query}`, {
    fallbackData: fallback,
  });
}

export async function markAdminRiderPayoutPaid(payoutId: string): Promise<RiderPayout> {
  const base = mockRiderPayouts.find((p) => p.id === payoutId) ?? mockRiderPayouts[0];
  const fallback: RiderPayout = {
    ...base,
    status: 'Paid',
    paid_at: new Date().toISOString(),
    reference_code: `RDR-${Date.now().toString().slice(-6)}`,
  };

  return apiClient<RiderPayout>(`/admin/rider-payouts/${payoutId}/mark-paid`, {
    method: 'POST',
    fallbackData: fallback,
  });
}

export async function listAdminCashDiscrepancies(unresolvedOnly = true): Promise<CashDiscrepancy[]> {
  return apiClient<CashDiscrepancy[]>(`/admin/cash-discrepancies?unresolved_only=${unresolvedOnly}`, {
    fallbackData: mockCashDiscrepancies,
  });
}

/**
 * Step 7 — Promotions Management
 */
export async function listAdminPromotions(): Promise<PromotionAdmin[]> {
  return apiClient<PromotionAdmin[]>('/admin/promotions', {
    fallbackData: mockPromotions,
  });
}

export async function createAdminPromotion(payload: PromotionCreatePayload): Promise<PromotionAdmin> {
  const fallback: PromotionAdmin = {
    id: `promo-${Date.now()}`,
    code: payload.code.toUpperCase(),
    title: payload.title,
    description: payload.description,
    banner_url: payload.banner_url,
    discount_type: payload.discount_type,
    discount_value: payload.discount_value,
    min_order_value: payload.min_order_value,
    max_discount_amount: payload.max_discount_amount,
    valid_from: payload.valid_from,
    valid_until: payload.valid_until,
    is_active: payload.is_active,
    usage_count: 0,
  };

  return apiClient<PromotionAdmin>('/admin/promotions', {
    method: 'POST',
    body: JSON.stringify(payload),
    fallbackData: fallback,
  });
}

export async function toggleAdminPromotionStatus(promotionId: string, isActive: boolean): Promise<PromotionAdmin> {
  const base = mockPromotions.find((p) => p.id === promotionId) ?? mockPromotions[0];
  const fallback: PromotionAdmin = {
    ...base,
    is_active: isActive,
  };

  return apiClient<PromotionAdmin>(`/admin/promotions/${promotionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
    fallbackData: fallback,
  });
}

/**
 * Step 8 — Customers Management
 */
export async function listAdminCustomers(): Promise<CustomerAdmin[]> {
  return apiClient<CustomerAdmin[]>('/admin/customers', {
    fallbackData: mockCustomers,
  });
}

export async function toggleAdminCustomerStatus(customerId: string, isActive: boolean): Promise<CustomerAdmin> {
  const base = mockCustomers.find((c) => c.id === customerId) ?? mockCustomers[0];
  const fallback: CustomerAdmin = {
    ...base,
    is_active: isActive,
  };

  return apiClient<CustomerAdmin>(`/admin/customers/${customerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
    fallbackData: fallback,
  });
}

/**
 * Step 9 — Reports
 */
export async function getAdminReports(periodStart: string, periodEnd: string): Promise<AdminReportsResponse> {
  const fallback: AdminReportsResponse = {
    period_start: periodStart,
    period_end: periodEnd,
    total_orders: 890,
    total_revenue: 114500.0,
    top_restaurants: [
      {
        restaurant_id: mockRestaurants[0].id,
        restaurant_name: mockRestaurants[0].name,
        order_count: 340,
        revenue: 450000.0,
      },
      {
        restaurant_id: mockRestaurants[1].id,
        restaurant_name: mockRestaurants[1].name,
        order_count: 280,
        revenue: 380000.0,
      },
    ],
    total_rider_payouts: 78500.0,
    cash_discrepancy_total: 3500.0,
    average_delivery_distance_km: 3.4,
    average_delivery_fee: 118.0,
  };

  return apiClient<AdminReportsResponse>(
    `/admin/reports?period_start=${periodStart}&period_end=${periodEnd}`,
    {
      fallbackData: fallback,
    }
  );
}
