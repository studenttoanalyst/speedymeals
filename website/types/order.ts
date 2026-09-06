// TODO: mirror backend `orders` table schema
export interface Order {
  id: string;
  status: 'placed' | 'accepted' | 'preparing' | 'rider_assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  paymentMethod: 'cod' | 'digital';
  deliveryDistanceKm: number;
  commissionAmount: number;
  restaurantPayable: number;
  riderEarning: number;
}
