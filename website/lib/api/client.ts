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
    const res = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

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

      throw new ApiError(res.status, errorMessage, errorBody);
    }

    if (res.status === 204) {
      return null as T;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    // If backend is offline / network refused and fallback data is provided, use it gracefully in development
    if (
      fallbackData !== undefined &&
      (err.name === 'TypeError' || err.message?.includes('fetch failed') || err.message?.includes('NetworkError'))
    ) {
      console.warn(`[SpeedyMeals API] Backend unreachable at ${url}. Using local fallback data.`, err);
      return fallbackData as T;
    }

    throw err;
  }
}
