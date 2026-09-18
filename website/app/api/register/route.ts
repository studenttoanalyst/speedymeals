import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { validatePhoneForRegion } from '@/lib/validation/phone';
import { sanitizeTextInput, isReservedIdentifier, isReservedEmail } from '@/lib/security/sanitization';
import { containsPromptInjection } from '@/lib/security/promptGuard';

// Use service role key if available on server (bypasses RLS), otherwise fallback to standard client
const getDbClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceRoleKey && url) {
    return createClient(url, serviceRoleKey);
  }
  return supabase;
};

// Simple sliding window in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = rateLimitMap.get(ip) || [];

  // Prune expired timestamps
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

/**
 * Generate letter-coded 8-digit unique ID:
 * - C-######## : Customer
 * - P-######## : Partner (Restaurant)
 * - R-######## : Rider
 */
export function generateReferenceCode(persona: string): string {
  const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
  switch (persona) {
    case 'customer':
      return `C-${digits}`;
    case 'restaurant':
      return `P-${digits}`;
    case 'rider':
      return `R-${digits}`;
    default:
      return `C-${digits}`;
  }
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
        {
          error:
            'Too many registration attempts from this network. Please wait 10 minutes before trying again.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      persona,
      fullName,
      name,
      email,
      phone,
      phoneNumber,
      countryCode = '+92',
      city = 'Karachi',
      customCity,
      vehicleType,
      businessName,
      cuisineType,
      devicePlatform,
      serviceInterest,
      agreed = false,
      // Anti-bot security parameters
      website_url,
      honeypot,
      company_fax,
      formLoadedAt,
    } = body;

    // 2. Anti-Bot: Honeypot trap validation
    // Automated bots inspect the DOM and blindly populate hidden input fields.
    const botTrap = website_url || honeypot || company_fax;
    if (botTrap) {
      console.warn(`[Anti-Bot Alert] Honeypot triggered by IP ${clientIp}:`, botTrap);
      return NextResponse.json(
        { error: 'Security verification failed. Automated submission detected.' },
        { status: 400 }
      );
    }

    // 3. Anti-Bot: Minimum submission duration check
    // Real humans take at least 1.5 seconds to fill or review the form.
    if (formLoadedAt) {
      const durationMs = Date.now() - Number(formLoadedAt);
      if (durationMs > 0 && durationMs < 1200) {
        console.warn(`[Anti-Bot Alert] Inhuman submission speed (${durationMs}ms) by IP ${clientIp}`);
        return NextResponse.json(
          { error: 'Submission submitted too quickly. Please review your details and submit again.' },
          { status: 400 }
        );
      }
    }

    // 4. Input sanitization & Unicode normalization (NFKC)
    const personName = sanitizeTextInput(fullName || name, { maxLength: 80 });
    const contactPhone = (phone || phoneNumber || '').trim();
    const contactEmail = sanitizeTextInput(email, { maxLength: 254 }).toLowerCase();

    // Resolve city: Strictly save the actual user-typed city name and NEVER "Other" or "Others"
    const rawCityStr = typeof city === 'string' ? city.trim() : '';
    const rawCustomCityStr = typeof customCity === 'string' ? customCity.trim() : '';

    const isOtherChoice =
      rawCityStr.toLowerCase() === 'other' ||
      rawCityStr.toLowerCase() === 'others' ||
      rawCityStr.toLowerCase().startsWith('other');

    let resolvedCity = rawCityStr || 'Karachi';

    if (isOtherChoice) {
      if (!rawCustomCityStr || rawCustomCityStr.toLowerCase() === 'other' || rawCustomCityStr.toLowerCase() === 'others') {
        return NextResponse.json(
          {
            error: 'Please specify your actual city or district name.',
            field: 'customCity',
          },
          { status: 400 }
        );
      }
      resolvedCity = rawCustomCityStr;
    } else if (rawCustomCityStr && rawCustomCityStr.toLowerCase() !== 'other' && rawCustomCityStr.toLowerCase() !== 'others') {
      resolvedCity = rawCustomCityStr;
    }

    // Safety defense: if resolvedCity still ends up being "other" or "others", reject it
    if (resolvedCity.toLowerCase() === 'other' || resolvedCity.toLowerCase() === 'others') {
      return NextResponse.json(
        {
          error: 'Please specify your actual city or district name.',
          field: 'customCity',
        },
        { status: 400 }
      );
    }

    const sanitizedCity = sanitizeTextInput(resolvedCity, { maxLength: 50 }) || 'Karachi';
    const sanitizedBusinessName = businessName ? sanitizeTextInput(businessName, { maxLength: 100 }) : null;
    const sanitizedCuisineType = cuisineType ? sanitizeTextInput(cuisineType, { maxLength: 50 }) : null;
    const sanitizedVehicleType = vehicleType ? sanitizeTextInput(vehicleType, { maxLength: 50 }) : null;
    const sanitizedDevicePlatform = devicePlatform ? sanitizeTextInput(devicePlatform, { maxLength: 50 }) : null;
    const sanitizedServiceInterest = serviceInterest ? sanitizeTextInput(serviceInterest, { maxLength: 100 }) : null;

    // 5. Basic field presence & minimum length validation
    if (!personName || personName.length < 2 || !contactEmail || !contactPhone || !persona) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: name, email, phone, and persona are required.' },
        { status: 400 }
      );
    }

    // 6. Security: Prohibit Prompt Injection and SQL drop patterns
    if (
      containsPromptInjection(personName) ||
      containsPromptInjection(sanitizedBusinessName || '') ||
      containsPromptInjection(sanitizedCuisineType || '')
    ) {
      console.warn(`[Security Alert] Prompt injection / SQL attack pattern detected from IP ${clientIp}`);
      return NextResponse.json(
        { error: 'Security validation failed. Prohibited commands or instruction patterns detected in input.' },
        { status: 400 }
      );
    }

    // 7. Security: Block Reserved Identifiers (Prevent "root admin" privilege escalation/impersonation)
    if (isReservedIdentifier(personName)) {
      return NextResponse.json(
        {
          error: 'The name or handle provided is reserved for platform administration. Please enter your real name.',
          field: 'name',
        },
        { status: 400 }
      );
    }

    if (isReservedEmail(contactEmail)) {
      return NextResponse.json(
        {
          error: 'Administrative email aliases cannot be used for registration.',
          field: 'email',
        },
        { status: 400 }
      );
    }

    // 8. Email format check (RFC 5322 compliant standard check)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.', field: 'email' },
        { status: 400 }
      );
    }

    // 9. Regional phone format verification
    const phoneValidation = validatePhoneForRegion(contactPhone, countryCode);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        {
          error: phoneValidation.error || 'Invalid phone number format for the selected region.',
          field: 'phone',
        },
        { status: 400 }
      );
    }

    if (!agreed) {
      return NextResponse.json(
        { error: 'You must review and accept the agreement terms to proceed.' },
        { status: 400 }
      );
    }

    if (!['rider', 'restaurant', 'customer'].includes(persona)) {
      return NextResponse.json(
        { error: 'Invalid persona type. Expected rider, restaurant, or customer.' },
        { status: 400 }
      );
    }

    // Check if Supabase credentials are populated
    const isConfigured =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));

    if (!isConfigured) {
      return NextResponse.json(
        {
          error:
            'Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
        },
        { status: 500 }
      );
    }

    const db = getDbClient();

    // 10. Uniqueness Enforcement: Check if Email already exists
    const { data: existingEmail, error: emailCheckError } = await db
      .from('partner_registrations')
      .select('id, email')
      .ilike('email', contactEmail)
      .limit(1)
      .maybeSingle();

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      console.warn('[Supabase Email Check Warning]:', emailCheckError.message);
    }

    if (existingEmail) {
      return NextResponse.json(
        {
          error: 'This email address is already registered. Please use another email or sign in.',
          field: 'email',
        },
        { status: 409 }
      );
    }

    // 11. Uniqueness Enforcement: Check if Phone already exists for this country code
    // Using parameterized .in('phone', [...]) to prevent filter injection
    const phoneLookupValues = [phoneValidation.formatted, phoneValidation.cleanedDigits].filter(Boolean);
    const { data: existingPhone, error: phoneCheckError } = await db
      .from('partner_registrations')
      .select('id, phone, country_code')
      .eq('country_code', countryCode)
      .in('phone', phoneLookupValues)
      .limit(1)
      .maybeSingle();

    if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
      console.warn('[Supabase Phone Check Warning]:', phoneCheckError.message);
    }

    if (existingPhone) {
      return NextResponse.json(
        {
          error: `This phone number is already registered for ${countryCode}. Each account requires a unique mobile number.`,
          field: 'phone',
        },
        { status: 409 }
      );
    }

    // 12. Insert new registration record with strict allowlisted payload (Mass Assignment defense)
    const referenceCode = generateReferenceCode(persona);

    const insertPayload = {
      reference_code: referenceCode,
      persona_type: persona,
      full_name: personName,
      email: contactEmail,
      phone: phoneValidation.formatted,
      country_code: countryCode,
      city: sanitizedCity,
      vehicle_type: persona === 'rider' ? sanitizedVehicleType : null,
      business_name: persona === 'restaurant' ? sanitizedBusinessName : null,
      cuisine_type: persona === 'restaurant' ? sanitizedCuisineType : null,
      device_platform: persona === 'customer' ? sanitizedDevicePlatform : null,
      service_interest: persona === 'customer' ? sanitizedServiceInterest : null,
      agreed: Boolean(agreed),
      status: 'pending',
    };

    const { data, error } = await db
      .from('partner_registrations')
      .insert([insertPayload])
      .select('reference_code')
      .single();

    if (error) {
      console.error('[Supabase Register Error]:', error);

      // Handle PostgreSQL 23505 Unique Constraint Violation (race condition fallback)
      if (error.code === '23505') {
        const detail = (error.details || error.message || '').toLowerCase();
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
        { error: error.message || 'Database error while saving registration.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      referenceCode: data?.reference_code || referenceCode,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[API Register Exception]:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
