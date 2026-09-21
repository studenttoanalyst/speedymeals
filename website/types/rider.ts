/**
 * SpeedyMeals Rider Types
 * Matches backend `riders` and `rider_payouts` models and `app/modules/admin/schemas.py`.
 */

export type RiderApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface RiderAdmin {
  id: string;
  name: string;
  phone_number: string;
  cnic_number: string;
  vehicle_type?: string | null;
  vehicle_registration?: string | null;
  approval_status: RiderApprovalStatus | string;
  wallet_balance: number;
  pending_cash_owed: number;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RiderApprovalUpdatePayload {
  approval_status: 'approved' | 'rejected';
}

export interface RiderStatusUpdatePayload {
  is_active: boolean;
}

export interface RiderPayout {
  id: string;
  rider_id: string;
  rider_name: string;
  period_start: string;
  period_end: string;
  total_earning: number;
  status: 'Pending' | 'Paid' | string;
  paid_at?: string | null;
}
