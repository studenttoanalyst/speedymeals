import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

  const normalizedUrl = backendUrl.replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${normalizedUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({ status: 'ok' }));
      return NextResponse.json({
        status: 'connected',
        backend: 'FastAPI Backend Active',
        data,
      });
    }

    return NextResponse.json(
      { status: 'fallback', backend: 'Backend Unhealthy' },
      { status: 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'fallback',
        backend: 'Offline / Local Data Mode',
        error: error.message || 'Connection failed',
      },
      { status: 200 }
    );
  }
}
