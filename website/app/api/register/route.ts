import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { validateRegistrationPayload } from '@/lib/validation/registration';

// Use service role key if available on server (bypasses RLS), otherwise fallback to standard client
const getDbClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceRoleKey && url) {
    return createClient(url, serviceRoleKey);
  }
  return supabase;
};

// Sliding window in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

export async function POST(request: Request) {
  try {
    // 1. IP extraction & Rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many registration attempts from this network. Please wait 10 minutes before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 2. Pure Functional Validation Pipeline
    const validationResult = validateRegistrationPayload(body, clientIp);
    if (!validationResult.success) {
      const { message, field, status = 400 } = validationResult.error;
      return NextResponse.json({ error: message, field }, { status });
    }

    const data = validationResult.value;

    // 3. Check Supabase environment configuration
    const isConfigured =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));

    if (!isConfigured) {
      return NextResponse.json(
        { error: 'Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
        { status: 500 }
      );
    }

    const db = getDbClient();

    // 4. Duplicate checks (Email & Phone) - gracefully handled if client lacks SELECT permission
    if (data.email) {
      try {
        const { data: existingEmail, error: emailErr } = await db
          .from('partner_registrations')
          .select('id, email')
          .ilike('email', data.email)
          .limit(1)
          .maybeSingle();

        if (emailErr && emailErr.code !== 'PGRST116' && emailErr.code !== '42501') {
          console.warn('[Supabase Email Check Warning]:', emailErr.message);
        }

        if (existingEmail) {
          return NextResponse.json(
            { error: 'This email address is already registered. Please use another email or sign in.', field: 'email' },
            { status: 409 }
          );
        }
      } catch (err) {
        console.warn('[Supabase Email Check Skipped]:', err);
      }
    }

    try {
      const { data: existingPhone, error: phoneErr } = await db
        .from('partner_registrations')
        .select('id, phone, country_code')
        .eq('country_code', data.countryCode)
        .eq('phone', data.phone)
        .limit(1)
        .maybeSingle();

      if (phoneErr && phoneErr.code !== 'PGRST116' && phoneErr.code !== '42501') {
        console.warn('[Supabase Phone Check Warning]:', phoneErr.message);
      }

      if (existingPhone) {
        return NextResponse.json(
          { error: `This phone number is already registered for ${data.countryCode}. Each account requires a unique mobile number.`, field: 'phone' },
          { status: 409 }
        );
      }
    } catch (err) {
      console.warn('[Supabase Phone Check Skipped]:', err);
    }

    // 5. Database Insert
    const formattedBusinessName = data.businessName && data.partnerType
      ? `[${data.partnerType}] ${data.businessName}`
      : data.businessName;

    const insertPayload = {
      reference_code: data.referenceCode,
      persona_type: data.persona,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      country_code: data.countryCode,
      city: data.city,
      area: data.area,
      address: data.address,
      vehicle_type: data.vehicleType,
      business_name: formattedBusinessName,
      cuisine_type: data.cuisineType,
      device_platform: data.devicePlatform,
      service_interest: data.serviceInterest,
      agreed: data.agreed,
      status: 'pending',
    };

    let insertErr: { code?: string; message?: string; details?: string } | null = null;
    let insertedRef = data.referenceCode;

    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (hasServiceRole) {
      // With service role key, RLS is bypassed and SELECT RETURNING is fully permitted
      const resWithSelect = await db
        .from('partner_registrations')
        .insert([insertPayload])
        .select('reference_code')
        .maybeSingle();

      if (resWithSelect.error) {
        insertErr = resWithSelect.error;
      } else if (resWithSelect.data?.reference_code) {
        insertedRef = resWithSelect.data.reference_code;
      }
    } else {
      // When using anon key, anon only has INSERT privilege (SELECT is protected for PII privacy).
      // Plain insert avoids the "new row violates row-level security policy" / 42501 error from RETURNING clause.
      const plainRes = await db
        .from('partner_registrations')
        .insert([insertPayload]);

      if (plainRes.error) {
        insertErr = plainRes.error;
      }
    }

    if (insertErr) {
      console.error('[Supabase Register Error]:', insertErr);

      if (insertErr.code === '23505') {
        const detail = (insertErr.details || insertErr.message || '').toLowerCase();
        const isEmailConflict = detail.includes('email');
        const isPhoneConflict = detail.includes('phone');

        return NextResponse.json(
          {
            error: isEmailConflict
              ? 'This email address is already registered. Please use another email.'
              : isPhoneConflict
              ? 'This phone number is already registered. Please use a unique mobile number.'
              : 'A registration with this email or phone number already exists.',
            field: isEmailConflict ? 'email' : isPhoneConflict ? 'phone' : undefined,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: insertErr.message || 'Database error while saving registration.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      referenceCode: insertedRef,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[API Register Exception]:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

