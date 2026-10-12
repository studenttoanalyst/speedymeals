/**
 * Functional Result Type & Registration Validation Pipeline
 * Provides monadic-style Result<T, E> handling (fp-style) for input validation,
 * sanitization, and security constraints without large imperative nested if/else blocks.
 */

import { sanitizeTextInput, isReservedIdentifier, isReservedEmail } from '@/lib/security/sanitization';
import { containsPromptInjection } from '@/lib/security/promptGuard';
import { validatePhoneForRegion, PhoneValidationResult } from '@/lib/validation/phone';

export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
export const err = <E>(error: E): Result<never, E> => ({ success: false, error });

export interface ValidationError {
  message: string;
  field?: string;
  status?: number;
}

export interface RawRegistrationInput {
  persona?: unknown;
  fullName?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  phoneNumber?: unknown;
  countryCode?: unknown;
  city?: unknown;
  customCity?: unknown;
  area?: unknown;
  areaLocality?: unknown;
  address?: unknown;
  streetAddress?: unknown;
  partnerType?: unknown;
  businessType?: unknown;
  vehicleType?: unknown;
  businessName?: unknown;
  cuisineType?: unknown;
  primaryCategory?: unknown;
  devicePlatform?: unknown;
  serviceInterest?: unknown;
  agreed?: unknown;
  website_url?: unknown;
  honeypot?: unknown;
  company_fax?: unknown;
  formLoadedAt?: unknown;
}

export interface ValidatedRegistrationData {
  referenceCode: string;
  persona: 'rider' | 'restaurant' | 'customer';
  fullName: string;
  email: string | null;
  phone: string;
  countryCode: string;
  city: string;
  area: string | null;
  address: string | null;
  partnerType: string | null;
  vehicleType: string | null;
  businessName: string | null;
  cuisineType: string | null;
  devicePlatform: string | null;
  serviceInterest: string | null;
  agreed: boolean;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates bot detection traps (honeypot fields and submission speed)
 */
export function validateBotTraps(body: RawRegistrationInput, clientIp: string): Result<void, ValidationError> {
  const botTrap = body.website_url || body.honeypot || body.company_fax;
  if (botTrap) {
    console.warn(`[Anti-Bot Alert] Honeypot triggered by IP ${clientIp}:`, botTrap);
    return err({ message: 'Security verification failed. Automated submission detected.', status: 400 });
  }

  if (body.formLoadedAt) {
    const durationMs = Date.now() - Number(body.formLoadedAt);
    if (durationMs > 0 && durationMs < 1200) {
      console.warn(`[Anti-Bot Alert] Inhuman submission speed (${durationMs}ms) by IP ${clientIp}`);
      return err({ message: 'Submission submitted too quickly. Please review your details and submit again.', status: 400 });
    }
  }

  return ok(undefined);
}

/**
 * Pure city resolution logic
 */
export function resolveCity(rawCity: string, rawCustomCity: string): Result<string, ValidationError> {
  const cityLower = rawCity.toLowerCase();
  const isOther = cityLower === 'other' || cityLower === 'others' || cityLower.startsWith('other');

  let resolved = rawCity;
  if (isOther) {
    if (!rawCustomCity || rawCustomCity.toLowerCase() === 'other' || rawCustomCity.toLowerCase() === 'others') {
      return err({ message: 'Please specify your actual city or district name.', field: 'city', status: 400 });
    }
    resolved = rawCustomCity;
  } else if (rawCustomCity && rawCustomCity.toLowerCase() !== 'other' && rawCustomCity.toLowerCase() !== 'others') {
    resolved = rawCustomCity;
  }

  if (resolved.toLowerCase() === 'other' || resolved.toLowerCase() === 'others') {
    return err({ message: 'Please specify your actual city or district name.', field: 'city', status: 400 });
  }

  return ok(sanitizeTextInput(resolved, { maxLength: 50 }));
}

/**
 * Validates core schema, constraints, sanitization, and security rules
 */
export function validateRegistrationPayload(
  body: RawRegistrationInput,
  clientIp: string
): Result<ValidatedRegistrationData, ValidationError> {
  // 1. Anti-bot checks
  const botResult = validateBotTraps(body, clientIp);
  if (!botResult.success) return botResult;

  // 2. Persona validation
  const rawPersona = typeof body.persona === 'string' ? body.persona.trim().toLowerCase() : '';
  if (!['rider', 'restaurant', 'customer'].includes(rawPersona)) {
    return err({ message: 'Invalid persona type. Expected rider, restaurant, or customer.', status: 400 });
  }
  const persona = rawPersona as 'rider' | 'restaurant' | 'customer';

  // 3. Terms agreement check
  if (!body.agreed) {
    return err({ message: 'You must review and accept the agreement terms to proceed.', status: 400 });
  }

  // 4. Name validation & sanitization
  const rawName = typeof body.fullName === 'string' ? body.fullName : typeof body.name === 'string' ? body.name : '';
  const fullName = sanitizeTextInput(rawName, { maxLength: 80 });
  if (!fullName || fullName.length < 2) {
    return err({ message: 'Missing or invalid required fields: name, phone, and persona are required.', field: 'name', status: 400 });
  }
  if (isReservedIdentifier(fullName)) {
    return err({ message: 'The name or handle provided is reserved for platform administration. Please enter your real name.', field: 'name', status: 400 });
  }

  // 5. City & Area resolution
  const rawCityStr = typeof body.city === 'string' ? body.city.trim() : '';
  const rawCustomCityStr = typeof body.customCity === 'string' ? body.customCity.trim() : '';
  const cityResult = resolveCity(rawCityStr, rawCustomCityStr);
  if (!cityResult.success) return cityResult;
  const city = cityResult.value;

  const areaInput = body.areaLocality || body.area;
  const rawAreaStr = typeof areaInput === 'string' ? areaInput.trim() : '';
  const addressInput = body.streetAddress || body.address;
  const rawAddressStr = typeof addressInput === 'string' ? addressInput.trim() : '';
  const area = rawAreaStr ? sanitizeTextInput(rawAreaStr, { maxLength: 100 }) : '';
  const address = rawAddressStr ? sanitizeTextInput(rawAddressStr, { maxLength: 200 }) : null;

  if (persona === 'restaurant') {
    if (!city || city.length < 2) {
      return err({ message: 'City is compulsory for restaurant onboarding. Please enter or select your operating city.', field: 'city', status: 400 });
    }
    if (!area || area.length < 2) {
      return err({ message: 'Area is compulsory for restaurant onboarding. Please select or enter your specific operating area/locality.', field: 'area', status: 400 });
    }
  } else {
    if (!city || city.length < 2) {
      return err({ message: 'Please select or enter your city.', field: 'city', status: 400 });
    }
  }

  // 6. Optional & persona-specific fields
  const businessName = typeof body.businessName === 'string' && body.businessName.trim()
    ? sanitizeTextInput(body.businessName, { maxLength: 100 })
    : null;
  const rawPartnerType = typeof body.businessType === 'string' && body.businessType.trim()
    ? body.businessType
    : typeof body.partnerType === 'string' && body.partnerType.trim()
      ? body.partnerType
      : 'Restaurant';
  const partnerType = sanitizeTextInput(rawPartnerType, { maxLength: 50 }) || 'Restaurant';
  const rawCuisine = typeof body.primaryCategory === 'string' && body.primaryCategory.trim()
    ? body.primaryCategory
    : typeof body.cuisineType === 'string' && body.cuisineType.trim()
      ? body.cuisineType
      : null;
  const cuisineType = rawCuisine ? sanitizeTextInput(rawCuisine, { maxLength: 100 }) : null;
  const vehicleType = typeof body.vehicleType === 'string' && body.vehicleType.trim()
    ? sanitizeTextInput(body.vehicleType, { maxLength: 50 })
    : null;
  const devicePlatform = typeof body.devicePlatform === 'string' && body.devicePlatform.trim()
    ? sanitizeTextInput(body.devicePlatform, { maxLength: 50 })
    : null;
  const serviceInterest = typeof body.serviceInterest === 'string' && body.serviceInterest.trim()
    ? sanitizeTextInput(body.serviceInterest, { maxLength: 100 })
    : null;

  // 7. Security: Prompt injection and SQL patterns
  const textFieldsToCheck = [fullName, businessName || '', partnerType || '', cuisineType || '', city, area, address || ''];
  if (textFieldsToCheck.some(containsPromptInjection)) {
    console.warn(`[Security Alert] Prompt injection / SQL attack pattern detected from IP ${clientIp}`);
    return err({ message: 'Security validation failed. Prohibited commands or instruction patterns detected in input.', status: 400 });
  }

  // 8. Email validation
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  let email: string | null = null;
  if (rawEmail) {
    const sanitizedEmail = sanitizeTextInput(rawEmail, { maxLength: 254 }).toLowerCase();
    if (isReservedEmail(sanitizedEmail)) {
      return err({ message: 'Administrative email aliases cannot be used for registration.', field: 'email', status: 400 });
    }
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      return err({ message: 'Please provide a valid email address.', field: 'email', status: 400 });
    }
    email = sanitizedEmail;
  }

  // 9. Phone number validation
  const rawPhone = typeof body.phone === 'string' ? body.phone : typeof body.phoneNumber === 'string' ? body.phoneNumber : '';
  const countryCode = typeof body.countryCode === 'string' && body.countryCode.trim() ? body.countryCode.trim() : '+92';
  const phoneValidation = validatePhoneForRegion(rawPhone.trim(), countryCode);
  if (!phoneValidation.isValid) {
    return err({ message: phoneValidation.error || 'Invalid phone number format for the selected region.', field: 'phone', status: 400 });
  }

  // Generate Reference Code (e.g. C-12345678, P-12345678, R-12345678)
  const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
  const prefix = persona === 'restaurant' ? 'P' : persona === 'rider' ? 'R' : 'C';
  const referenceCode = `${prefix}-${digits}`;

  return ok({
    referenceCode,
    persona,
    fullName,
    email,
    phone: phoneValidation.formatted,
    countryCode,
    city,
    area: persona === 'restaurant' ? area : null,
    address: persona === 'restaurant' ? address : null,
    partnerType: persona === 'restaurant' ? partnerType : null,
    vehicleType: persona === 'rider' ? vehicleType : null,
    businessName: persona === 'restaurant' ? businessName : null,
    cuisineType: persona === 'restaurant' ? cuisineType : null,
    devicePlatform: persona === 'customer' ? devicePlatform : null,
    serviceInterest: persona === 'customer' ? serviceInterest : null,
    agreed: Boolean(body.agreed),
  });
}
