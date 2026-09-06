// TODO: admin dashboard aggregate types
export interface AdminDashboardSummary {
  todayOrders: number;
  grossRevenue: number;
  netRevenue: number;
  pendingRestaurantPayouts: number;
  totalRiderWalletBalance: number;
  totalPendingCodCash: number;
}
