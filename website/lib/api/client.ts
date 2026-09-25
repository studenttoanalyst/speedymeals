/**
 * SpeedyMeals API Client Wrapper
 * Handles base URL, auth token injection, JSON parsing, error throwing,
 * and seamless fallback to offline mock fixtures when backend is unavailable.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
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

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    let res = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // 1. If 401 Unauthorized, automatically attempt refresh with refresh_token
    if (res.status === 401 && !skipAuth && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('sm_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data?.access_token) {
              localStorage.setItem('sm_access_token', data.access_token);
              if (data.refresh_token) {
                localStorage.setItem('sm_refresh_token', data.refresh_token);
              }
              document.cookie = `sm_access_token=${encodeURIComponent(data.access_token)}; path=/; max-age=2592000; SameSite=Lax`;

              // Retry original request with freshly minted access token
              requestHeaders['Authorization'] = `Bearer ${data.access_token}`;
              res = await fetch(url, {
                ...restOptions,
                headers: requestHeaders,
              });
            }
          }
        } catch (refreshErr) {
          console.warn('[SpeedyMeals API] Automatic token refresh attempt failed:', refreshErr);
        }
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
