/**
 * SpeedyMeals Order Types
 * 1:1 match with backend DB models and schemas in `app/modules/food_delivery`
 * NOTE: Frontend never recomputes money math; trust snapshot fields from backend.
 */

export type OrderStatus =
  | 'Placed'
  | 'Accepted'
  | 'Preparing'
  | 'Ready for Pickup'
  | 'Rider Assigned'
  | 'Accepted by Rider'
  | 'Arrived at Restaurant'
  | 'Picked Up'
  | 'On the Way'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected';

export type PaymentMethod = 'COD' | 'Digital';

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  selected_variant?: string | null;
  price_at_order: number;
}

export interface DeliveryAddress {
  label?: string | null;
  full_address?: string | null;
  latitude: number;
  longitude: number;
}

export interface RestaurantOrderSummary {
  id: string;
  status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  food_subtotal: number;
  delivery_fee: number;
  total_amount: number;
  placed_at: string;
  customer_name: string;
}

export interface RestaurantOrderDetail {
  id: string;
  status: OrderStatus | string;
  payment_method: PaymentMethod | string;
  food_subtotal: number;
  delivery_distance_km: number;
  delivery_fee: number;
  total_amount: number;
  commission_amount: number;
  restaurant_payable: number;
  rider_earning: number;
  special_instructions?: string | null;
  placed_at: string;
  delivered_at?: string | null;
  customer_name: string;
  delivery_address?: DeliveryAddress | null;
  items: OrderItem[];
}

export interface OrderStatusUpdatePayload {
  status: string;
}
