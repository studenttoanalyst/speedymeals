/**
 * SpeedyMeals Security & Sanitization Utilities
 * Implements defensive input handling, Unicode normalization,
 * reserved identifier blocking, and XSS sanitization.
 */

// Reserved administrative & system identifiers
const RESERVED_IDENTIFIERS = new Set([
  'admin',
  'administrator',
  'root',
  'superuser',
  'system',
  'sysadmin',
  'speedymeals',
  'speedy_meals',
  'speedymeals_admin',
  'support',
  'helpdesk',
  'moderator',
  'official',
  'security',
  'billing',
  'finance',
  'owner',
]);

export interface SanitizeOptions {
  maxLength?: number;
  minLength?: number;
  stripHtml?: boolean;
  allowEmojis?: boolean;
}

/**
 * Normalizes and sanitizes text input:
 * 1. Unicode NFKC normalization (prevents visual homoglyph / normalization attacks)
 * 2. Strips ASCII control characters and null bytes (\0)
 * 3. Strips or encodes HTML tags to prevent stored XSS
 * 4. Trims leading/trailing whitespace
 * 5. Enforces max length limits
 */
export function sanitizeTextInput(
  input: unknown,
  options: SanitizeOptions = {}
): string {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 120,
    stripHtml = true,
  } = options;

  // 1. Unicode Normalization (NFKC standard)
  let cleaned = input.normalize('NFKC');

  // 2. Remove null bytes and dangerous control characters (ASCII 0-31 except tab/newline)
  // Preserves multi-byte UTF-8 emojis and international characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Strip HTML tags to prevent stored XSS
  if (stripHtml) {
    cleaned = cleaned.replace(/<[^>]*>?/gm, '');
  }

  // 4. Trim whitespace
  cleaned = cleaned.trim();

  // 5. Enforce max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Checks whether a given username, name, or handle matches reserved administrative identifiers.
 * Prevents "root admin" privilege confusion or impersonation.
 */
export function isReservedIdentifier(input: string): boolean {
  if (!input) return false;

  // Normalize: lowercased, spaces/hyphens/underscores collapsed
  const normalized = input
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

  // Direct match or exact token match
  if (RESERVED_IDENTIFIERS.has(normalized)) {
    return true;
  }

  // Check individual words (e.g. "Root Admin", "SpeedyMeals Support")
  const tokens = input
    .normalize('NFKC')
    .toLowerCase()
    .split(/[\s_\-.]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (RESERVED_IDENTIFIERS.has(token)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that an email does not use reserved administrative aliases.
 */
export function isReservedEmail(email: string): boolean {
  if (!email) return false;
  const localPart = email.split('@')[0]?.toLowerCase().trim() || '';
  return isReservedIdentifier(localPart);
}
