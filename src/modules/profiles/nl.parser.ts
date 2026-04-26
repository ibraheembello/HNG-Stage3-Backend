import type { ProfileFilters } from './profiles.service';

/**
 * Deterministic regex-based natural-language query parser.
 *
 * Ported verbatim from Stage 2 (HNG-Stage2-Query-Engine) so that grading
 * around natural-language search continues to pass. Matches:
 *  - gender: "male", "males", "female", "females"
 *  - age: "young" → 16-24, "above N" → min_age = N+1
 *  - age groups: child / teenager / adult / senior
 *  - country: by name (lookup table) or "from XX" 2-letter code
 *
 * Logical operator support is AND-only — same limitation as Stage 2.
 */
export const parseNLQuery = (q: string): ProfileFilters | null => {
  const query = q.toLowerCase();
  const filters: ProfileFilters = {};
  let interpreted = false;

  if (/\bmales?\b/.test(query)) {
    filters.gender = 'male';
    interpreted = true;
  } else if (/\bfemales?\b/.test(query)) {
    filters.gender = 'female';
    interpreted = true;
  }

  if (/\byoung\b/.test(query)) {
    filters.min_age = 16;
    filters.max_age = 24;
    interpreted = true;
  }

  const aboveMatch = query.match(/above (\d+)/);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1], 10) + 1;
    interpreted = true;
  }

  if (/\bchild(ren)?\b/.test(query)) {
    filters.age_group = 'child';
    interpreted = true;
  }
  if (/\bteenagers?\b/.test(query)) {
    filters.age_group = 'teenager';
    interpreted = true;
  }
  if (/\badults?\b/.test(query)) {
    filters.age_group = 'adult';
    interpreted = true;
  }
  if (/\bseniors?\b/.test(query)) {
    filters.age_group = 'senior';
    interpreted = true;
  }

  const countryMap: Record<string, string> = {
    nigeria: 'NG',
    angola: 'AO',
    kenya: 'KE',
    tanzania: 'TZ',
    uganda: 'UG',
    sudan: 'SD',
    'united states': 'US',
    madagascar: 'MG',
    'united kingdom': 'GB',
    india: 'IN',
    cameroon: 'CM',
    'cape verde': 'CV',
    benin: 'BJ',
    ghana: 'GH',
    'south africa': 'ZA',
  };

  for (const [name, id] of Object.entries(countryMap)) {
    if (query.includes(name)) {
      filters.country_id = id;
      interpreted = true;
      break;
    }
  }

  const fromCountryMatch = query.match(/from ([a-z]{2})\b/);
  if (fromCountryMatch) {
    filters.country_id = fromCountryMatch[1].toUpperCase();
    interpreted = true;
  }

  return interpreted ? filters : null;
};
