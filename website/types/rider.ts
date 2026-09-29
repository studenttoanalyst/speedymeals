/**
 * SpeedyMeals Rider Types
 * Matches backend `riders` and `rider_payouts` models and `app/modules/admin/schemas.py`.
 * Enhanced with document verification media and COD cash float limits.
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
  pending_cash_owed: number; // Unremitted COD cash in hand
  max_cash_float_limit: number; // e.g. 15,000 PKR threshold
  is_online: boolean;
  is_active: boolean;
  cnic_front_url?: string | null;
  cnic_back_url?: string | null;
  license_url?: string | null;
  rating?: number;
  completed_deliveries_count?: number;
  created_at: string;
}

export interface RiderApprovalUpdatePayload {
  approval_status: 'approved' | 'rejected';
  rejection_reason?: string | null;
}

export interface RiderStatusUpdatePayload {
  is_active: boolean;
}

export interface RiderCashLimitUpdatePayload {
  max_cash_float_limit: number;
}

export interface RiderPayout {
  id: string;
  rider_id: string;
  rider_name: string;
  period_start: string;
  period_end: string;
  total_earning: number;
  cod_cash_deducted?: number;
  net_payout: number;
  status: 'Pending' | 'Paid' | string;
  paid_at?: string | null;
  reference_code?: string | null;
}
