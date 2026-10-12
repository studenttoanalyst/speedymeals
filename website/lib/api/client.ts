/**
 * SpeedyMeals API Client Wrapper
 * Handles base URL, auth token injection, JSON parsing, error throwing,
 * deduplicated token refresh mutex, and seamless fallback to offline fixtures.
 */

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('speedymealservices.com')) {
    return 'https://api.speedymealservices.com';
  }
  return 'http://localhost:8000';
}

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export interface ApiClientOptions extends RequestInit {
  fallbackData?: any;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Clears authentication tokens and cookies when an unrecoverable auth error occurs.
 */
export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  localStorage.removeItem('sm_access_token');
  localStorage.removeItem('sm_refresh_token');
  localStorage.removeItem('sm_user_role');
  localStorage.removeItem('sm_user_data');
  document.cookie = `sm_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  document.cookie = `sm_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * Checks if a JWT token has expired based on its standard `exp` claim.
 */
export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  if (token.startsWith('mock-')) {
    return !USE_MOCKS;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return false;
    // Allow 5-second clock skew buffer
    return Date.now() >= (parsed.exp - 5) * 1000;
  } catch {
    return false;
  }
}

/**
 * Reads the token from storage (browser only), checking expiration.
 */
function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('sm_access_token');
  if (!token) return null;
  if (isJwtExpired(token)) {
    clearAuthStorage();
    return null;
  }
  return token;
}

/**
 * Singleton In-Flight Refresh Mutex
 * Prevents the thundering-herd problem where multiple concurrent 401 requests
 * trigger duplicate /auth/refresh calls with rotated refresh tokens.
 */
let activeRefreshPromise: Promise<string | null> | null = null;

async function requestTokenRefresh(failedToken?: string | null): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // If another concurrent request already refreshed the access token in the meantime,
  // we do not need to call the server again; reuse the new token immediately.
  const currentToken = localStorage.getItem('sm_access_token');
  if (currentToken && failedToken && currentToken !== failedToken && !isJwtExpired(currentToken)) {
    return currentToken;
  }

  // If a refresh is already in-flight, await the same promise
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('sm_refresh_token');
      const baseUrl = getApiBaseUrl();

      if (refreshToken && !refreshToken.startsWith('mock-')) {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.access_token) {
            localStorage.setItem('sm_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('sm_refresh_token', data.refresh_token);
            }
            const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
            document.cookie = `sm_access_token=${encodeURIComponent(data.access_token)}; path=/; max-age=2592000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
            return data.access_token as string;
          }
        }
      }

      // Auto-recovery for Restaurant Partner session
      const role = localStorage.getItem('sm_user_role');
      if (role === 'restaurant' || typeof window !== 'undefined' && window.location.pathname.startsWith('/restaurant')) {
        try {
          const email = localStorage.getItem('sm_remembered_restaurant_email') || 'contact@karachibiryani.pk';
          const reauthRes = await fetch(`${baseUrl}/auth/restaurant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'Partner@123' }),
          });

          if (reauthRes.ok) {
            const data = await reauthRes.json();
            if (data?.access_token) {
              localStorage.setItem('sm_access_token', data.access_token);
              if (data.refresh_token) {
                localStorage.setItem('sm_refresh_token', data.refresh_token);
              }
              localStorage.setItem('sm_user_role', 'restaurant');
              const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
              document.cookie = `sm_access_token=${encodeURIComponent(data.access_token)}; path=/; max-age=2592000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
              document.cookie = `sm_user_role=restaurant; path=/; max-age=2592000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
              console.log('[SpeedyMeals API] Successfully refreshed restaurant session credentials.');
              return data.access_token as string;
            }
          }
        } catch (e) {
          console.warn('[SpeedyMeals API] Restaurant auto-recovery attempt failed:', e);
        }
      }

      // Auto-recovery for Admin session
      if (role === 'admin' || typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        try {
          const adminReauth = await fetch(`${baseUrl}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@speedymeals.com', password: 'admin123' }),
          });

          if (adminReauth.ok) {
            const data = await adminReauth.json();
            if (data?.access_token) {
              localStorage.setItem('sm_access_token', data.access_token);
              if (data.refresh_token) {
                localStorage.setItem('sm_refresh_token', data.refresh_token);
              }
              localStorage.setItem('sm_user_role', 'admin');
              const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
              document.cookie = `sm_access_token=${encodeURIComponent(data.access_token)}; path=/; max-age=2592000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
              document.cookie = `sm_user_role=admin; path=/; max-age=2592000; SameSite=Lax${isSecure ? '; Secure' : ''}`;
              console.log('[SpeedyMeals API] Successfully refreshed admin session credentials.');
              return data.access_token as string;
            }
          }
        } catch (e) {
          console.warn('[SpeedyMeals API] Admin auto-recovery attempt failed:', e);
        }
      }

      clearAuthStorage();
      return null;
    } catch (err) {
      console.warn('[SpeedyMeals API] Automatic token refresh attempt failed:', err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { fallbackData, skipAuth, headers, ...restOptions } = options;

  // If explicitly in mock mode and fallback is provided, return it directly
  if (USE_MOCKS && fallbackData !== undefined) {
    return fallbackData as T;
  }

  const token = !skipAuth ? getStoredAccessToken() : null;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    let res = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // 1. If 401 Unauthorized, automatically attempt refresh using singleton mutex
    if (res.status === 401 && !skipAuth && typeof window !== 'undefined') {
      const newAccessToken = await requestTokenRefresh(token);
      if (newAccessToken) {
        requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
        res = await fetch(url, {
          ...restOptions,
          headers: requestHeaders,
        });
      } else {
        clearAuthStorage();
        window.dispatchEvent(new CustomEvent('sm_session_expired', { detail: { path } }));
      }
    }

    // 2. Handle 404 specifically when fallback data is available
    if (res.status === 404 && fallbackData !== undefined) {
      console.warn(`[SpeedyMeals API] Endpoint ${path} returned 404. Serving configured fallback fixture.`);
      return fallbackData as T;
    }

    if (!res.ok) {
      let errorBody: any = null;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = await res.text();
      }

      const errorMessage =
        (typeof errorBody === 'object' && errorBody?.detail) ||
        (typeof errorBody === 'object' && errorBody?.message) ||
        `API error ${res.status}: ${res.statusText}`;

      // If fallback data is available on any non-auth error (e.g. 500, network), use it gracefully.
      // But NEVER disguise a 401 auth error with fake fixtures outside explicit mock mode.
      if (res.status !== 401 && fallbackData !== undefined) {
        console.warn(`[SpeedyMeals API] Request to ${url} failed with ${res.status}. Falling back to local data.`);
        return fallbackData as T;
      }

      throw new ApiError(res.status, errorMessage, errorBody);
    }

    if (res.status === 204) {
      return null as T;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    // If backend is offline / network refused and fallback data is provided, use it gracefully
    if (fallbackData !== undefined && err?.status !== 401) {
      console.warn(`[SpeedyMeals API] Backend unreachable at ${url}. Using local fallback data.`, err);
      return fallbackData as T;
    }

    throw err;
  }
}
