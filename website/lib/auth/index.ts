/**
 * SpeedyMeals Authentication Library
 * Handles session tokens, cookies, role verification, and API auth calls.
 */

import { TokenResponse, AdminLoginPayload, RestaurantLoginPayload, OTPRequestPayload, OTPVerifyPayload, AuthSessionUser, UserRole } from '@/types/auth';
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
export async function loginAdmin(payload: AdminLoginPayload): Promise<TokenResponse> {
  const fallbackTokens: TokenResponse = {
    access_token: 'mock-admin-access-token-jwt',
    refresh_token: 'mock-admin-refresh-token',
    token_type: 'bearer',
  };

  const tokens = await apiClient<TokenResponse>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
    fallbackData: fallbackTokens,
  });

  const user: AuthSessionUser = {
    id: 'admin-1',
    email: payload.email,
    role: 'admin',
    name: 'Platform Admin',
  };

  saveSession(tokens, user);
  return tokens;
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

  const user: AuthSessionUser = {
    id: 'rest-1',
    email: payload.email,
    role: 'restaurant',
    name: 'Karachi Biryani House',
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

  const user: AuthSessionUser = {
    id: 'rest-1',
    phoneNumber: `${payload.country_code ?? '+92'}${payload.phone_number}`,
    role: 'restaurant',
    name: 'Karachi Biryani House',
  };

  saveSession(tokens, user);
  return tokens;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  if (refreshToken) {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
        skipAuth: true,
        fallbackData: { message: 'Logged out.' },
      });
    } catch {
      // Clean up locally regardless
    }
  }
  clearSession();
}
