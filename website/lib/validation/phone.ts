export interface RegionConfig {
  code: string;
  country: string;
  shortName: string;
  flag: string;
  placeholder: string;
  example: string;
  nationalLength: number;
  pattern: RegExp;
  helper: string;
  cities: string[];
  format: (digits: string) => string;
}

export const SUPPORTED_REGIONS: Record<string, RegionConfig> = {
  '+92': {
    code: '+92',
    country: 'Pakistan',
    shortName: 'PK',
    flag: '🇵🇰',
    placeholder: '300 1234567',
    example: '300 1234567',
    nationalLength: 10,
    pattern: /^3\d{9}$/,
    helper: '10 digits starting with 3 (e.g. 300 1234567)',
    cities: [
      'Karachi',
      'Lahore',
      'Islamabad',
      'Rawalpindi',
      'Faisalabad',
      'Multan',
      'Peshawar',
      'Gujranwala',
      'Sialkot',
      'Hyderabad',
      'Khaniwal',
      'Jehlam',
      'Kamoki',
    ],
    format: (digits: string) => {
      if (digits.length <= 3) return digits;
      return `${digits.slice(0, 3)} ${digits.slice(3, 10)}`;
    },
  },
  '+966': {
    code: '+966',
    country: 'Saudi Arabia',
    shortName: 'KSA',
    flag: '🇸🇦',
    placeholder: '50 123 4567',
    example: '50 123 4567',
    nationalLength: 9,
    pattern: /^5\d{8}$/,
    helper: '9 digits starting with 5 (e.g. 50 123 4567)',
    cities: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Taif'],
    format: (digits: string) => {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
    },
  },
};

// Reverse mapping from City name to default country code
export const CITY_TO_COUNTRY_CODE: Record<string, string> = {
  // Pakistan
  Karachi: '+92',
  Lahore: '+92',
  Islamabad: '+92',
  Rawalpindi: '+92',
  Faisalabad: '+92',
  Faisalababad: '+92',
  Multan: '+92',
  Peshawar: '+92',
  Gujranwala: '+92',
  Sialkot: '+92',
  Hyderabad: '+92',
  Khaniwal: '+92',
  Khanewal: '+92',
  Jehlam: '+92',
  Jhelum: '+92',
  Kamoki: '+92',
  Kamoke: '+92',

  // Saudi Arabia
  Riyadh: '+966',
  Jeddah: '+966',
  Makkah: '+966',
  Madinah: '+966',
  Dammam: '+966',
  Taif: '+966',
};

/**
 * Clean phone input:
 * - Strips any non-digit characters (except leading + for country code auto-detection)
 * - Detects if a full international number was pasted (e.g., +923001234567 or 00923001234567)
 *   and strips the prefix if it matches the current region code.
 * - Handles leading zeros: in regions where local mobile numbers are typically typed with a '0'
 *   prefix (e.g., Pakistan '0300...', UAE '050...'), strips the leading zero so it formats cleanly.
 */
export function sanitizePhoneDigits(raw: string, countryCode: string): string {
  if (!raw) return '';

  let clean = raw.trim();

  // If user pasted a full international number with + or 00
  const cleanPrefixCode = countryCode.replace('+', '');
  if (clean.startsWith(`+${cleanPrefixCode}`)) {
    clean = clean.slice(`+${cleanPrefixCode}`.length);
  } else if (clean.startsWith(`00${cleanPrefixCode}`)) {
    clean = clean.slice(`00${cleanPrefixCode}`.length);
  } else if (clean.startsWith(cleanPrefixCode) && clean.length > (SUPPORTED_REGIONS[countryCode]?.nationalLength || 8)) {
    clean = clean.slice(cleanPrefixCode.length);
  }

  // Retain digits only
  let digits = clean.replace(/\D/g, '');

  // Strip leading 0 if region allows and national length is expected without 0
  const region = SUPPORTED_REGIONS[countryCode];
  if (region && digits.startsWith('0') && digits.length > 1) {
    digits = digits.replace(/^0+/, '');
  }

  // Cap at national length
  if (region && digits.length > region.nationalLength) {
    digits = digits.slice(0, region.nationalLength);
  }

  return digits;
}

/**
 * Format phone digits according to the region's preferred spacing
 */
export function formatPhoneForRegion(raw: string, countryCode: string): string {
  const region = SUPPORTED_REGIONS[countryCode] || SUPPORTED_REGIONS['+92'];
  const digits = sanitizePhoneDigits(raw, countryCode);
  return region.format(digits);
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleanedDigits: string;
  formatted: string;
  fullInternational: string;
}

/**
 * Validates a phone number against the specified country code
 */
export function validatePhoneForRegion(raw: string, countryCode: string): PhoneValidationResult {
  const region = SUPPORTED_REGIONS[countryCode];
  if (!region) {
    return {
      isValid: false,
      error: `Unsupported country code: ${countryCode}`,
      cleanedDigits: raw.replace(/\D/g, ''),
      formatted: raw,
      fullInternational: `${countryCode} ${raw}`.trim(),
    };
  }

  const cleaned = sanitizePhoneDigits(raw, countryCode);
  const formatted = region.format(cleaned);
  const fullInternational = `${countryCode} ${formatted}`.trim();

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Phone number is required.',
      cleanedDigits: '',
      formatted: '',
      fullInternational,
    };
  }

  if (cleaned.length < region.nationalLength) {
    return {
      isValid: false,
      error: `Phone number too short for ${region.country}. Expected ${region.nationalLength} digits (${region.helper}).`,
      cleanedDigits: cleaned,
      formatted,
      fullInternational,
    };
  }

  if (!region.pattern.test(cleaned)) {
    return {
      isValid: false,
      error: `Invalid phone format for ${region.country}. ${region.helper}.`,
      cleanedDigits: cleaned,
      formatted,
      fullInternational,
    };
  }

  return {
    isValid: true,
    cleanedDigits: cleaned,
    formatted,
    fullInternational,
  };
}
