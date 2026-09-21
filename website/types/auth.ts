/**
 * SpeedyMeals Authentication Types
 * Direct 1:1 mapping with backend Pydantic models in `app/platform/auth/schemas.py`
 */

export type UserRole = 'admin' | 'restaurant' | 'rider' | 'customer';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface RestaurantLoginPayload {
  email: string;
  password: string;
}

export interface OTPRequestPayload {
  phone_number: string;
  country_code?: string;
}

export interface OTPVerifyPayload {
  phone_number: string;
  country_code?: string;
  otp_code: string;
}

export interface AuthSessionUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  name?: string;
}

export interface AuthState {
  user: AuthSessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
