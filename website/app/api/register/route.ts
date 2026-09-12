import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

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
      vehicleType,
      businessName,
      cuisineType,
      devicePlatform,
      serviceInterest,
      agreed = true,
    } = body;

    const personName = (fullName || name || '').trim();
    const contactPhone = (phone || phoneNumber || '').trim();
    const contactEmail = (email || '').trim().toLowerCase();

    // Basic validation
    if (!personName || !contactEmail || !contactPhone || !persona) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, phone, and persona are required.' },
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
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (!isConfigured) {
      return NextResponse.json(
        {
          error:
            'Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
        },
        { status: 500 }
      );
    }

    // Generate letter-coded 8-digit unique ID: C-########, P-########, R-########
    const referenceCode = generateReferenceCode(persona);

    const insertPayload = {
      reference_code: referenceCode,
      persona_type: persona,
      full_name: personName,
      email: contactEmail,
      phone: contactPhone,
      country_code: countryCode,
      city,
      vehicle_type: persona === 'rider' ? vehicleType || null : null,
      business_name: persona === 'restaurant' ? businessName || null : null,
      cuisine_type: persona === 'restaurant' ? cuisineType || null : null,
      device_platform: persona === 'customer' ? devicePlatform || null : null,
      service_interest: persona === 'customer' ? serviceInterest || null : null,
      agreed: Boolean(agreed),
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('partner_registrations')
      .insert([insertPayload])
      .select('reference_code')
      .single();

    if (error) {
      console.error('[Supabase Register Error]:', error);
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
