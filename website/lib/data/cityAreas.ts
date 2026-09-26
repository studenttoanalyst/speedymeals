import rawCitiesData from './pakistan_cities.json';

/**
 * City and Area catalog with regex-based autocomplete matching.
 * Covers all Pakistan cities (excluding Balochistan) and operational hubs with granular, specific areas.
 */

export interface CityInfo {
  name: string;
  province?: string;
  country: string;
  countryCode: string;
  flag: string;
  aliases: string[];
  areas: string[];
}

export const CITIES_DATA: CityInfo[] = rawCitiesData as CityInfo[];

/**
 * Safely create a regex from user input string (escaping special regex characters).
 */
export function buildSafeRegex(query: string): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    return new RegExp(escaped, 'i');
  } catch {
    return null;
  }
}

/**
 * Search cities using regex across city name, country, province, and aliases.
 * Strictly returns an empty array if query has fewer than 1 non-whitespace character.
 * Prioritizes exact and prefix matches so typing "lah" puts "Lahore" at index 0.
 */
export function searchCities(query: string): CityInfo[] {
  const trimmed = (query || '').trim();
  if (trimmed.length < 1) {
    return [];
  }
  const regex = buildSafeRegex(trimmed);
  if (!regex) {
    return [];
  }
  const matches = CITIES_DATA.filter((city) => {
    if (regex.test(city.name)) return true;
    if (city.province && regex.test(city.province)) return true;
    if (regex.test(city.country)) return true;
    return city.aliases.some((alias) => regex.test(alias));
  });

  const lowerQuery = trimmed.toLowerCase();
  const sorted = matches.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    const aExact = aLower === lowerQuery;
    const bExact = bLower === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = aLower.startsWith(lowerQuery);
    const bStarts = bLower.startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.name.localeCompare(b.name);
  });

  const seen = new Set<string>();
  return sorted.filter((c) => {
    const key = `${c.name.toLowerCase()}-${c.countryCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get all configured areas for a given city name (case-insensitive lookup).
 */
export function getAreasForCity(cityName: string): string[] {
  if (!cityName) return [];
  const normalized = cityName.trim().toLowerCase();
  const city = CITIES_DATA.find(
    (c) =>
      c.name.toLowerCase() === normalized ||
      c.aliases.some((a) => a.toLowerCase() === normalized)
  );
  return city ? city.areas : [];
}

/**
 * Search areas within a specific city using regex.
 * Strictly returns an empty array if query has fewer than 1 non-whitespace character.
 * Prioritizes exact and prefix matches for responsive keyboard selection.
 */
export function searchAreas(cityName: string, query: string): string[] {
  const trimmed = (query || '').trim();
  if (trimmed.length < 1) {
    return [];
  }
  const areas = getAreasForCity(cityName);
  const regex = buildSafeRegex(trimmed);
  if (!regex) {
    return [];
  }
  const matches = areas.filter((area) => regex.test(area));
  const lowerQuery = trimmed.toLowerCase();
  const sorted = matches.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aExact = aLower === lowerQuery;
    const bExact = bLower === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = aLower.startsWith(lowerQuery);
    const bStarts = bLower.startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.localeCompare(b);
  });

  const seen = new Set<string>();
  return sorted.filter((a) => {
    const key = a.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

