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
 * Reads the token from storage (browser only).
 */
function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sm_access_token');
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
  if (currentToken && failedToken && currentToken !== failedToken) {
    return currentToken;
  }

  // If a refresh is already in-flight, await the same promise
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('sm_refresh_token');
      if (!refreshToken || refreshToken.startsWith('mock-')) {
        return null;
      }

      const baseUrl = getApiBaseUrl();
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
      } else if (res.status === 401) {
        // Clear storage only when the refresh endpoint explicitly rejects the refresh token
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        localStorage.removeItem('sm_access_token');
        localStorage.removeItem('sm_refresh_token');
        localStorage.removeItem('sm_user_role');
        localStorage.removeItem('sm_user_data');
        document.cookie = `sm_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        document.cookie = `sm_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      }
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

      // If fallback data is available on any error, use it gracefully
      if (fallbackData !== undefined) {
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
    if (fallbackData !== undefined) {
      console.warn(`[SpeedyMeals API] Backend unreachable at ${url}. Using local fallback data.`, err);
      return fallbackData as T;
    }

    throw err;
  }
}
