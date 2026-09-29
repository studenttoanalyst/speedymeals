/**
 * SpeedyMeals Authentication Library
 * Handles session tokens, cookies, role verification, and API auth calls.
 */

import { TokenResponse, AdminTokenResponse, AdminLoginPayload, RestaurantLoginPayload, OTPRequestPayload, OTPVerifyPayload, AuthSessionUser, UserRole, ChangeInitialPasswordPayload } from '@/types/auth';

import { apiClient } from '../api/client';

const ACCESS_TOKEN_KEY = 'sm_access_token';
const REFRESH_TOKEN_KEY = 'sm_refresh_token';
const USER_ROLE_KEY = 'sm_user_role';
const USER_DATA_KEY = 'sm_user_data';

// Helper to set cookie for Edge middleware
function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function saveSession(tokens: TokenResponse, user: AuthSessionUser) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  localStorage.setItem(USER_ROLE_KEY, user.role);
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));

  // Sync to cookies for Next.js middleware and SSR
  setCookie(ACCESS_TOKEN_KEY, tokens.access_token);
  setCookie(USER_ROLE_KEY, user.role);
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_DATA_KEY);

  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(USER_ROLE_KEY);
}

export function getStoredUser(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_DATA_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthSessionUser;
  } catch {
    return null;
  }
}

export function getStoredRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(USER_ROLE_KEY) as UserRole) || null;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Decode role from JWT if user object is not cached
 */
export function parseJwtRole(token: string): UserRole | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return (parsed.role as UserRole) || null;
  } catch {
    return null;
  }
}

/**
 * Admin Login via email & password
 */
export async function loginAdmin(payload: AdminLoginPayload): Promise<AdminTokenResponse> {
  const isMockMode = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
  const fallbackTokens: AdminTokenResponse | undefined = isMockMode
    ? {
        access_token: 'mock-admin-access-token-jwt',
        refresh_token: 'mock-admin-refresh-token',
        token_type: 'bearer',
        must_change_password: false,
        permissions: ['*'],
        role_name: 'Superadmin',
      }
    : undefined;

  const tokens = await apiClient<AdminTokenResponse>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
    fallbackData: fallbackTokens,
  });

  const user: AuthSessionUser = {
    id: tokens.admin_id || 'admin-1',
    email: tokens.email || payload.email,
    role: 'admin',
    name: tokens.role_name ? `Admin (${tokens.role_name})` : 'Platform Admin',
    must_change_password: tokens.must_change_password,
    permissions: tokens.permissions || [],
    role_name: tokens.role_name,
  };

  saveSession(tokens, user);
  return tokens;
}

/**
 * Change Initial Password (mandatory first-login rotation)
 */
export async function changeInitialPassword(payload: ChangeInitialPasswordPayload): Promise<{ message: string; access_token: string; refresh_token: string }> {
  const res = await apiClient<{ message: string; access_token: string; refresh_token: string }>('/auth/admin/change-initial-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Update local session with new tokens and clear must_change_password flag
  const currentUser = getStoredUser();
  if (currentUser) {
    currentUser.must_change_password = false;
    localStorage.setItem('sm_user_data', JSON.stringify(currentUser));
  }
  if (res.access_token && res.refresh_token) {
    saveSession(
      { access_token: res.access_token, refresh_token: res.refresh_token, token_type: 'bearer' },
      currentUser || { id: 'admin', role: 'admin' }
    );
  }

  return res;
}


/**
 * Restaurant Login via email & password
 */
export async function loginRestaurant(payload: RestaurantLoginPayload): Promise<TokenResponse> {
  const fallbackTokens: TokenResponse = {
    access_token: 'mock-restaurant-access-token-jwt',
    refresh_token: 'mock-restaurant-refresh-token',
    token_type: 'bearer',
  };

  const tokens = await apiClient<TokenResponse>('/auth/restaurant/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
    fallbackData: fallbackTokens,
  });

  let decodedSub = 'restaurant';
  let decodedName = payload.email ? payload.email.split('@')[0] : 'Restaurant Partner';
  try {
    const payloadPart = tokens.access_token.split('.')[1];
    if (payloadPart) {
      const decoded = JSON.parse(atob(payloadPart));
      if (decoded.sub) decodedSub = decoded.sub;
      if (decoded.name) decodedName = decoded.name;
    }
  } catch {}

  const user: AuthSessionUser = {
    id: decodedSub,
    email: payload.email,
    role: 'restaurant',
    name: decodedName || 'Restaurant Partner',
  };

  saveSession(tokens, user);
  return tokens;
}

/**
 * Restaurant OTP Request
 */
export async function requestRestaurantOTP(payload: OTPRequestPayload): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({
      phone_number: payload.phone_number,
      country_code: payload.country_code ?? '+92',
    }),
    skipAuth: true,
    fallbackData: { message: 'OTP sent (Dev mode).' },
  });
}

/**
 * Restaurant OTP Verify & Login
 */
export async function verifyRestaurantOTP(payload: OTPVerifyPayload): Promise<TokenResponse> {
  const fallbackTokens: TokenResponse = {
    access_token: 'mock-restaurant-otp-access-token',
    refresh_token: 'mock-restaurant-otp-refresh-token',
    token_type: 'bearer',
  };

  const tokens = await apiClient<TokenResponse>('/auth/restaurant/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      phone_number: payload.phone_number,
      country_code: payload.country_code ?? '+92',
      otp_code: payload.otp_code,
    }),
    skipAuth: true,
    fallbackData: fallbackTokens,
  });

  let decodedSub = 'restaurant';
  let decodedName = 'Restaurant Partner';
  try {
    const payloadPart = tokens.access_token.split('.')[1];
    if (payloadPart) {
      const decoded = JSON.parse(atob(payloadPart));
      if (decoded.sub) decodedSub = decoded.sub;
      if (decoded.name) decodedName = decoded.name;
    }
  } catch {}

  const user: AuthSessionUser = {
    id: decodedSub,
    phoneNumber: `${payload.country_code ?? '+92'}${payload.phone_number}`,
    role: 'restaurant',
    name: decodedName,
  };

  saveSession(tokens, user);
  return tokens;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  if (refreshToken && !refreshToken.startsWith('mock-')) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
      await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Local session is cleared regardless
    }
  }
  clearSession();
}

/**
 * Admin Forgot Password
 */
export async function requestAdminForgotPassword(email: string): Promise<{ message: string; reset_token?: string; reset_url?: string }> {
  return apiClient<{ message: string; reset_token?: string; reset_url?: string }>('/auth/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

/**
 * Admin Reset Password with Token
 */
export async function resetAdminPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
    skipAuth: true,
  });
}

/**
 * Restaurant Forgot Password
 */
export async function requestRestaurantForgotPassword(email: string): Promise<{ message: string; reset_token?: string; reset_url?: string }> {
  return apiClient<{ message: string; reset_token?: string; reset_url?: string }>('/auth/restaurant/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

/**
 * Restaurant Reset Password with Token
 */
export async function resetRestaurantPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/restaurant/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
    skipAuth: true,
  });
}
