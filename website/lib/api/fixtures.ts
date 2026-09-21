/**
 * SpeedyMeals Fixtures
 * Realistic mock data strictly matching backend models.
 * Used for development preview, storybook, and offline fallback.
 */

import { AdminDashboardSummary, AdminOrderDetail, AdminOrderSummary, CashDiscrepancy, RestaurantAdmin, Settlement, AdminReportsResponse } from '@/types/admin';
import { RiderAdmin, RiderPayout } from '@/types/rider';
import { MenuItem, RestaurantOrderDetail, RestaurantOrderSummary, RestaurantProfile, RestaurantSettlement } from '@/types/restaurant';

export const mockAdminDashboard: AdminDashboardSummary = {
  date: new Date().toISOString().split('T')[0],
  total_orders_today: 142,
  gross_revenue_today: 184500.0,
  net_revenue_today: 19870.0, // 10% commission + Rs 10 per delivered order
  pending_restaurant_settlements: 432100.0,
  total_rider_wallet_balance: 68500.0,
  total_pending_cod_cash: 52400.0,
};

export const mockRestaurants: RestaurantAdmin[] = [
  {
    id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    name: 'Karachi Biryani House',
    email: 'contact@karachibiryani.pk',
    phone_number: '+923001112233',
    status: 'active',
    commission_rate: 10.0,
    created_at: '2026-08-10T12:00:00Z',
  },
  {
    id: 'b1f4c728-1122-48ea-8b43-982c7f0a1002',
    name: 'Burger Lab Clifton',
    email: 'clifton@burgerlab.pk',
    phone_number: '+923004445566',
    status: 'active',
    commission_rate: 12.5,
    created_at: '2026-08-14T09:30:00Z',
  },
  {
    id: 'b1f4c728-1122-48ea-8b43-982c7f0a1003',
    name: 'Ginsoy Extreme Chinese',
    email: 'orders@ginsoy.pk',
    phone_number: '+923219998877',
    status: 'inactive',
    commission_rate: 10.0,
    created_at: '2026-08-20T16:15:00Z',
  },
  {
    id: 'b1f4c728-1122-48ea-8b43-982c7f0a1004',
    name: 'Pizza Max Gulshan',
    email: 'gulshan@pizzamax.com.pk',
    phone_number: '+923337776655',
    status: 'active',
    commission_rate: 8.0,
    created_at: '2026-08-25T11:00:00Z',
  },
];

export const mockRiders: RiderAdmin[] = [
  {
    id: 'd2e3f4a5-6789-40ab-bcde-f12345678901',
    name: 'Tariq Mahmood',
    phone_number: '+923011234567',
    cnic_number: '42101-1234567-1',
    vehicle_type: 'Motorcycle',
    vehicle_registration: 'KHI-7890',
    approval_status: 'approved',
    wallet_balance: 1450.0,
    pending_cash_owed: 3200.0,
    is_online: true,
    is_active: true,
    created_at: '2026-08-12T10:00:00Z',
  },
  {
    id: 'd2e3f4a5-6789-40ab-bcde-f12345678902',
    name: 'Zubair Ahmed',
    phone_number: '+923029876543',
    cnic_number: '42201-7654321-3',
    vehicle_type: 'Motorcycle',
    vehicle_registration: 'KHI-2341',
    approval_status: 'pending',
    wallet_balance: 500.0,
    pending_cash_owed: 0.0,
    is_online: false,
    is_active: true,
    created_at: '2026-09-01T14:20:00Z',
  },
  {
    id: 'd2e3f4a5-6789-40ab-bcde-f12345678903',
    name: 'Kashif Ali',
    phone_number: '+923453332211',
    cnic_number: '42301-4455667-5',
    vehicle_type: 'Motorcycle',
    vehicle_registration: 'KHI-9988',
    approval_status: 'rejected',
    wallet_balance: 200.0,
    pending_cash_owed: 1500.0,
    is_online: false,
    is_active: false,
    created_at: '2026-08-18T08:10:00Z',
  },
];

export const mockAdminOrders: AdminOrderSummary[] = [
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abc',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    restaurant_name: 'Karachi Biryani House',
    rider_id: 'd2e3f4a5-6789-40ab-bcde-f12345678901',
    status: 'On the Way',
    payment_method: 'COD',
    total_amount: 1450.0,
    placed_at: '2026-09-13T01:45:00Z',
  },
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abd',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1002',
    restaurant_name: 'Burger Lab Clifton',
    rider_id: null,
    status: 'Preparing',
    payment_method: 'Digital',
    total_amount: 2150.0,
    placed_at: '2026-09-13T02:10:00Z',
  },
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abe',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    restaurant_name: 'Karachi Biryani House',
    rider_id: 'd2e3f4a5-6789-40ab-bcde-f12345678901',
    status: 'Delivered',
    payment_method: 'COD',
    total_amount: 980.0,
    placed_at: '2026-09-13T00:30:00Z',
  },
];

export const mockSettlements: Settlement[] = [
  {
    id: 'f5a6b7c8-9012-43de-f012-34567890abcd',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    restaurant_name: 'Karachi Biryani House',
    period_start: '2026-09-01',
    period_end: '2026-09-07',
    total_sales: 125000.0,
    commission_deducted: 12500.0,
    net_payable: 112500.0,
    status: 'Settled',
    paid_at: '2026-09-08T15:00:00Z',
  },
  {
    id: 'f5a6b7c8-9012-43de-f012-34567890abce',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1002',
    restaurant_name: 'Burger Lab Clifton',
    period_start: '2026-09-01',
    period_end: '2026-09-07',
    total_sales: 184000.0,
    commission_deducted: 23000.0,
    net_payable: 161000.0,
    status: 'Pending',
    paid_at: null,
  },
];

export const mockRiderPayouts: RiderPayout[] = [
  {
    id: 'a1b2c3d4-e5f6-47a8-b901-234567890123',
    rider_id: 'd2e3f4a5-6789-40ab-bcde-f12345678901',
    rider_name: 'Tariq Mahmood',
    period_start: '2026-09-01',
    period_end: '2026-09-07',
    total_earning: 14850.0,
    status: 'Paid',
    paid_at: '2026-09-08T12:00:00Z',
  },
  {
    id: 'a1b2c3d4-e5f6-47a8-b901-234567890124',
    rider_id: 'd2e3f4a5-6789-40ab-bcde-f12345678903',
    rider_name: 'Kashif Ali',
    period_start: '2026-09-01',
    period_end: '2026-09-07',
    total_earning: 8200.0,
    status: 'Pending',
    paid_at: null,
  },
];

export const mockCashDiscrepancies: CashDiscrepancy[] = [
  {
    id: 'c3d4e5f6-a7b8-49c0-d123-456789012345',
    rider_id: 'd2e3f4a5-6789-40ab-bcde-f12345678903',
    rider_name: 'Kashif Ali',
    expected_amount: 8500.0,
    amount_submitted: 7000.0,
    discrepancy: -1500.0,
    verified_by_admin: false,
    created_at: '2026-09-10T22:30:00Z',
  },
];

export const mockMenuItems: MenuItem[] = [
  {
    id: 'm1-1111-2222-3333-444455556666',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    name: 'Special Chicken Biryani (Double)',
    description: 'Fragrant basmati rice served with two tender chicken pieces and potato.',
    price: 450.0,
    category: 'Rice & Biryani',
    photo_url: null,
    variants: null,
    is_available: true,
  },
  {
    id: 'm1-1111-2222-3333-444455556667',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    name: 'Mutton Pulao Kabab',
    description: 'Traditional Degi mutton pulao served with 2 seekh kababs and raita.',
    price: 780.0,
    category: 'Rice & Biryani',
    photo_url: null,
    variants: null,
    is_available: true,
  },
  {
    id: 'm1-1111-2222-3333-444455556668',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    name: 'Chicken Malai Boti (8 pcs)',
    description: 'Boneless chicken cubes marinated in heavy cream and mild spices.',
    price: 650.0,
    category: 'BBQ & Grills',
    photo_url: null,
    variants: null,
    is_available: false,
  },
  {
    id: 'm1-1111-2222-3333-444455556669',
    restaurant_id: 'b1f4c728-1122-48ea-8b43-982c7f0a1001',
    name: 'Roghni Naan',
    description: 'Soft tandoori naan topped with sesame seeds and butter.',
    price: 80.0,
    category: 'Tandoor',
    photo_url: null,
    variants: null,
    is_available: true,
  },
];

export const mockRestaurantOrders: RestaurantOrderSummary[] = [
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abc',
    status: 'Preparing',
    payment_method: 'COD',
    food_subtotal: 1350.0,
    delivery_fee: 100.0,
    total_amount: 1450.0,
    placed_at: '2026-09-13T02:15:00Z',
    customer_name: 'Ahmed Faraz',
  },
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abd',
    status: 'Ready for Pickup',
    payment_method: 'Digital',
    food_subtotal: 900.0,
    delivery_fee: 110.0,
    total_amount: 1010.0,
    placed_at: '2026-09-13T01:50:00Z',
    customer_name: 'Sara Khan',
  },
  {
    id: 'e4f5a6b7-8901-42cd-ef01-234567890abe',
    status: 'Delivered',
    payment_method: 'COD',
    food_subtotal: 450.0,
    delivery_fee: 70.0,
    total_amount: 520.0,
    placed_at: '2026-09-13T00:40:00Z',
    customer_name: 'Usman Ghani',
  },
];
