// TODO: mirror backend `riders` table schema
export interface Rider {
  id: string;
  name: string;
  walletBalance: number;
  pendingCashOwed: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
}
