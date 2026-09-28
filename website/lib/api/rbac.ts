import { apiClient } from './client';

export interface Permission {
  id: string;
  key: string;
  label: string;
  domain: string;
  description: string;
  risk_level: string; // 'low' | 'medium' | 'high' | 'critical'
}

export interface AdminRole {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  icon?: string | null;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  permissions: Permission[];
  admin_count: number;
}

export interface CreateAdminRolePayload {
  name: string;
  color?: string;
  icon?: string;
  permission_keys: string[];
}

export interface UpdateAdminRolePayload {
  name?: string;
  color?: string;
  icon?: string;
  permission_keys?: string[];
}

export interface AdminAccount {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role_id?: string;
  role_name?: string;
  role_icon?: string;
  role_color?: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface CreateAdminAccountPayload {
  first_name: string;
  last_name: string;
  phone?: string;
  personal_email?: string;
  role_id: string;
  corporate_email?: string;
}

export interface CreatedAdminAccountResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  temporary_password: string;
  invitation_token: string;
  invitation_expires_at: string;
  role_name: string;
  message: string;
}

// Fallback Mock Data matching exact backend schemas
const FALLBACK_PERMISSIONS: Permission[] = [
  { id: '1', key: 'restaurants.view', label: 'View Restaurants', domain: 'restaurants', description: 'Browse restaurant list, contact numbers, ratings, and open or closed status.', risk_level: 'low' },
  { id: '2', key: 'restaurants.create', label: 'Add New Restaurant', domain: 'restaurants', description: 'Register new restaurant partner and set up their owner login account.', risk_level: 'medium' },
  { id: '3', key: 'restaurants.edit_profile', label: 'Edit Restaurant Details', domain: 'restaurants', description: 'Update restaurant name, phone, address, and kitchen opening hours.', risk_level: 'medium' },
  { id: '4', key: 'restaurants.toggle_status', label: 'Open or Close Restaurant', domain: 'restaurants', description: 'Temporarily pause or open a restaurant for customer orders.', risk_level: 'high' },
  { id: '5', key: 'restaurants.commission.view', label: 'View Commission Rate', domain: 'restaurants', description: 'See how much commission the platform charges this restaurant (e.g. 10%).', risk_level: 'low' },
  { id: '6', key: 'restaurants.commission.edit', label: 'Change Commission Rate', domain: 'restaurants', description: 'Update the commission percentage charged to this restaurant.', risk_level: 'critical' },
  { id: '7', key: 'restaurants.menu.view', label: 'View Food Menu', domain: 'restaurants', description: 'See food dishes, prices, categories, and item options.', risk_level: 'low' },
  { id: '8', key: 'restaurants.menu.manage', label: 'Edit Food Menu', domain: 'restaurants', description: 'Add new dishes, update food prices, upload food photos, or mark items sold out.', risk_level: 'medium' },
  { id: '9', key: 'restaurants.credentials.reset', label: 'Reset Restaurant Password', domain: 'restaurants', description: 'Send a password reset link to the restaurant owner.', risk_level: 'high' },

  { id: '10', key: 'riders.view', label: 'View Rider Fleet', domain: 'riders', description: 'See list of delivery riders, phone numbers, motorbike info, and wallet cash.', risk_level: 'low' },
  { id: '11', key: 'riders.approve', label: 'Approve or Reject Rider', domain: 'riders', description: 'Check rider CNIC ID card, driving license, and approve them to start working.', risk_level: 'high' },
  { id: '12', key: 'riders.toggle_status', label: 'Activate or Block Rider', domain: 'riders', description: 'Allow a rider to take delivery jobs or temporarily block their account.', risk_level: 'high' },
  { id: '13', key: 'riders.kit.manage', label: 'Issue Uniform & Bag', domain: 'riders', description: 'Give delivery shirts and food box to rider, and record Rs. 5,000 security deposit.', risk_level: 'medium' },
  { id: '14', key: 'riders.live_fleet.view', label: 'Live Rider Map', domain: 'riders', description: 'See live GPS map of where riders are driving and who is currently available.', risk_level: 'low' },
  { id: '15', key: 'riders.documents.view_private', label: 'View Rider ID & License', domain: 'riders', description: 'View private photos of rider CNIC card and driving license documents.', risk_level: 'high' },

  { id: '16', key: 'orders.view', label: 'View Customer Orders', domain: 'orders', description: 'See all customer food orders, food items ordered, and delivery addresses.', risk_level: 'low' },
  { id: '17', key: 'orders.cancel', label: 'Cancel Customer Order', domain: 'orders', description: 'Cancel an ongoing order and return payment to the customer.', risk_level: 'high' },
  { id: '18', key: 'orders.reassign_rider', label: 'Change Assigned Rider', domain: 'orders', description: 'Pick a different rider for an order if the first rider cannot deliver it.', risk_level: 'high' },
  { id: '19', key: 'orders.live_tracking.view', label: 'Track Live Delivery', domain: 'orders', description: 'Follow order progress step-by-step from kitchen cooking to customer doorstep.', risk_level: 'low' },
  { id: '20', key: 'orders.status.override', label: 'Manual Order Status Fix', domain: 'orders', description: 'Manually fix an order status if a rider or restaurant device has internet problems.', risk_level: 'critical' },

  { id: '21', key: 'finance.settlements.view', label: 'View Restaurant Payouts', domain: 'finance', description: 'Check how much money the platform owes each restaurant for weekly sales.', risk_level: 'low' },
  { id: '22', key: 'finance.settlements.generate', label: 'Create Weekly Payout Bills', domain: 'finance', description: 'Calculate weekly earnings and create payout sheets for restaurants.', risk_level: 'high' },
  { id: '23', key: 'finance.settlements.mark_paid', label: 'Confirm Restaurant Paid', domain: 'finance', description: 'Mark that the bank transfer has been sent to the restaurant bank account.', risk_level: 'critical' },
  { id: '24', key: 'finance.rider_payouts.view', label: 'View Rider Earnings', domain: 'finance', description: 'See delivery fees earned by riders (Rs. 100 base fee + Rs. 25 per kilometer).', risk_level: 'low' },
  { id: '25', key: 'finance.rider_payouts.generate', label: 'Create Rider Pay Sheets', domain: 'finance', description: 'Calculate weekly delivery earnings for all riders.', risk_level: 'high' },
  { id: '26', key: 'finance.rider_payouts.mark_paid', label: 'Confirm Rider Paid', domain: 'finance', description: 'Record payment sent to rider via Bank transfer, Easypaisa, or JazzCash.', risk_level: 'critical' },
  { id: '27', key: 'finance.cash_discrepancies.view', label: 'Check Cash on Delivery', domain: 'finance', description: 'Compare cash collected from customers with cash deposited by riders at the office.', risk_level: 'medium' },
  { id: '28', key: 'finance.cash_discrepancies.resolve', label: 'Resolve Cash Difference', domain: 'finance', description: 'Approve or adjust small cash differences when a rider deposits collected cash.', risk_level: 'critical' },
  { id: '29', key: 'finance.wallet.adjust', label: 'Adjust Rider Wallet Balance', domain: 'finance', description: 'Add or deduct balance in rider app wallet (for bonus, deduction, or kit refund).', risk_level: 'critical' },

  { id: '30', key: 'customers.view', label: 'View Customers', domain: 'customers', description: 'See registered customer names, phone numbers, and past order history.', risk_level: 'low' },
  { id: '31', key: 'customers.toggle_status', label: 'Block or Unblock Customer', domain: 'customers', description: 'Block fake or abusive customer accounts from placing orders.', risk_level: 'high' },
  { id: '32', key: 'customers.ratings.view', label: 'View Customer Reviews', domain: 'customers', description: 'Read customer ratings and star reviews for food and delivery speed.', risk_level: 'low' },
  { id: '33', key: 'customers.ratings.moderate', label: 'Hide Abusive Reviews', domain: 'customers', description: 'Remove inappropriate or insulting words from publicly visible reviews.', risk_level: 'medium' },

  { id: '34', key: 'marketing.promotions.view', label: 'View Discount Codes', domain: 'marketing', description: 'See active discount vouchers, coupon codes, and promotional banners.', risk_level: 'low' },
  { id: '35', key: 'marketing.promotions.manage', label: 'Create Discount Code', domain: 'marketing', description: 'Create new coupon codes, percentage discounts, and minimum order rules.', risk_level: 'medium' },
  { id: '36', key: 'pricing.delivery_fee.view', label: 'View Delivery Charges', domain: 'pricing', description: 'See current delivery fee pricing formula (Rs. 100 base + Rs. 25 per kilometer).', risk_level: 'low' },
  { id: '37', key: 'pricing.delivery_fee.edit', label: 'Change Delivery Charges', domain: 'pricing', description: 'Update base delivery price or kilometer rate charged to customers.', risk_level: 'critical' },

  { id: '38', key: 'analytics.dashboard.view', label: 'View Main Dashboard', domain: 'analytics', description: 'See daily sales numbers, active deliveries, and platform performance graphs.', risk_level: 'low' },
  { id: '39', key: 'analytics.reports.export', label: 'Download Excel/CSV Reports', domain: 'analytics', description: 'Download sales, payout, and order records to open in Microsoft Excel.', risk_level: 'medium' },
  { id: '40', key: 'analytics.audit_logs.view', label: 'View Staff Activity Log', domain: 'analytics', description: 'See who changed what on the platform, with exact dates and operator names.', risk_level: 'high' },

  { id: '41', key: 'admins.roles.manage', label: 'Create & Edit Staff Roles', domain: 'admins', description: 'Create job roles, pick role icons, and choose what actions each role can perform.', risk_level: 'critical' },
  { id: '42', key: 'admins.accounts.view', label: 'View Staff Directory', domain: 'admins', description: 'See all office staff accounts, their job roles, and login activity.', risk_level: 'medium' },
  { id: '43', key: 'admins.accounts.create', label: 'Add New Staff Member', domain: 'admins', description: 'Create account for new office staff and give them their first-time login password.', risk_level: 'critical' },
  { id: '44', key: 'admins.accounts.manage', label: 'Edit Staff Member', domain: 'admins', description: 'Update staff phone number, assign a different role, or pause their account.', risk_level: 'high' },
  { id: '45', key: 'admins.accounts.reset_credentials', label: 'Reset Staff Password', domain: 'admins', description: 'Create a new temporary password for a staff member and log them out of all devices.', risk_level: 'critical' },
];

const FALLBACK_ROLES: AdminRole[] = [
  {
    id: 'role-superadmin',
    name: 'Superadmin',
    slug: 'superadmin',
    icon: 'Crown',
    color: '#0F172A',
    is_system: true,
    created_at: new Date().toISOString(),
    permissions: FALLBACK_PERMISSIONS,
    admin_count: 1,
  },
  {
    id: 'role-support',
    name: 'Support',
    slug: 'support',
    icon: 'Headset',
    color: '#2563EB',
    is_system: true,
    created_at: new Date().toISOString(),
    permissions: FALLBACK_PERMISSIONS.filter((p) => p.risk_level === 'low'),
    admin_count: 0,
  },
];

const FALLBACK_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-super-1',
    email: 'admin@speedymealservices.com',
    first_name: 'Platform',
    last_name: 'Administrator',
    phone: '+923001234567',
    role_id: 'role-superadmin',
    role_name: 'Superadmin',
    role_icon: 'Crown',
    role_color: '#0F172A',
    is_active: true,
    must_change_password: false,
    created_at: new Date().toISOString(),
  },
];

/**
 * Fetch all available permissions grouped by domain
 */
export async function getPermissions(): Promise<Permission[]> {
  return apiClient<Permission[]>('/admin/permissions', {
    method: 'GET',
    fallbackData: FALLBACK_PERMISSIONS,
  });
}

/**
 * Fetch all administrative roles
 */
export async function getAdminRoles(): Promise<AdminRole[]> {
  return apiClient<AdminRole[]>('/admin/roles', {
    method: 'GET',
    fallbackData: FALLBACK_ROLES,
  });
}

/**
 * Create a new custom role with custom symbol and permissions
 */
export async function createAdminRole(payload: CreateAdminRolePayload): Promise<AdminRole> {
  return apiClient<AdminRole>('/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing role
 */
export async function updateAdminRole(roleId: string, payload: UpdateAdminRolePayload): Promise<AdminRole> {
  return apiClient<AdminRole>(`/admin/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a custom role
 */
export async function deleteAdminRole(roleId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/admin/roles/${roleId}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch all administrative accounts
 */
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  return apiClient<AdminAccount[]>('/admin/accounts', {
    method: 'GET',
    fallbackData: FALLBACK_ACCOUNTS,
  });
}

/**
 * Provision a new admin account with one-time credentials
 */
export async function createAdminAccount(payload: CreateAdminAccountPayload): Promise<CreatedAdminAccountResponse> {
  return apiClient<CreatedAdminAccountResponse>('/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Reassign an admin account to a different role
 */
export async function assignAdminRole(adminId: string, roleId: string): Promise<AdminAccount> {
  return apiClient<AdminAccount>(`/admin/accounts/${adminId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role_id: roleId }),
  });
}

/**
 * Reset an admin's password and issue a temporary one-time password
 */
export async function resetAdminStaffPassword(adminId: string): Promise<{ temporary_password: string; must_change_password: boolean; message: string }> {
  return apiClient<{ temporary_password: string; must_change_password: boolean; message: string }>(`/admin/accounts/${adminId}/reset-password`, {
    method: 'POST',
  });
}

/**
 * Update admin account details or active status
 */
export async function updateAdminAccount(adminId: string, payload: { first_name?: string; last_name?: string; phone?: string; is_active?: boolean }): Promise<AdminAccount> {
  return apiClient<AdminAccount>(`/admin/accounts/${adminId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
