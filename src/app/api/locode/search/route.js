/**
 * UN/LOCODE Search API Route
 *
 * Server-side endpoint for searching UN/LOCODE locations.
 * The @geoapify/un-locode package uses Node.js `fs` to read CSV data,
 * so it must run server-side — this route provides autocomplete to the client.
 *
 * GET /api/locode/search?q=istanbul
 * Returns up to 10 matching UN/LOCODE locations.
 */

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Cache parsed country data to avoid re-reading files on every request
const countryCache = new Map();

/**
 * Read and parse a country's CSV data from the @geoapify/un-locode package.
 * Returns an array of location objects.
 */
function getCountryData(countryCode) {
  if (countryCache.has(countryCode)) {
    return countryCache.get(countryCode);
  }

  // Try JSON data first (faster parse)
  const jsonPath = path.join(
    process.cwd(),
    'node_modules',
    '@geoapify',
    'un-locode',
    'dist',
    'json-data',
    `${countryCode}.json`
  );

  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    countryCache.set(countryCode, data);
    return data;
  } catch {
    countryCache.set(countryCode, []);
    return [];
  }
}

/**
 * Get list of available country codes from the json-data directory
 */
function getAvailableCountries() {
  const dataDir = path.join(
    process.cwd(),
    'node_modules',
    '@geoapify',
    'un-locode',
    'dist',
    'json-data'
  );
  try {
    return fs
      .readdirSync(dataDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

// Pre-load the list of countries once
let availableCountries = null;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  if (!availableCountries) {
    availableCountries = getAvailableCountries();
  }

  const results = [];

  // Search across all countries — stop once we have 10 results
  for (const countryCode of availableCountries) {
    if (results.length >= 10) break;

    const locations = getCountryData(countryCode);

    for (const loc of locations) {
      if (results.length >= 10) break;

      const name = (loc.nameWoDiacritics || loc.name || '').toLowerCase();
      const locCode = (loc.location || '').toLowerCase();
      const country = (loc.country || countryCode).toLowerCase();

      if (
        name.includes(query) ||
        locCode.includes(query) ||
        `${country} ${name}`.includes(query)
      ) {
        results.push({
          code: `${loc.country || countryCode} ${loc.location}`,
          name: loc.nameWoDiacritics || loc.name || '',
          country: loc.country || countryCode,
          location: loc.location,
          label: `${loc.nameWoDiacritics || loc.name}, ${loc.country || countryCode} — ${loc.location}`,
        });
      }
    }
  }

  return NextResponse.json(results);
}
