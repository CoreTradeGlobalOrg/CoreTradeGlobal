'use client';

import { useState } from 'react';

/**
 * CountryFlag Component
 *
 * Renders country flags as SVG images (works on all platforms including Windows)
 * Uses flagcdn.com for flag images
 */

export function CountryFlag({ countryCode, size = 20, className = '' }) {
  const [error, setError] = useState(false);

  // Validate country code - must be exactly 2 letters
  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
    return null;
  }

  // Normalize country code to lowercase for the CDN
  const code = countryCode.toLowerCase();

  if (error) {
    // Fallback: show a simple globe icon or nothing
    return (
      <span
        className={`inline-block text-center ${className}`}
        style={{ width: size, height: Math.round(size * 0.75), fontSize: size * 0.6, lineHeight: `${Math.round(size * 0.75)}px` }}
      >
        🌐
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={`${countryCode} flag`}
      className={`inline-block object-cover rounded-sm ${className}`}
      style={{ verticalAlign: 'middle' }}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

/**
 * Helper function to get country name without emoji flag
 * Use this when displaying country with CountryFlag component
 */
export function getCountryName(label) {
  if (!label) return '';
  // Remove emoji flag (first 2-4 characters including space)
  return label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
}

/**
 * Helper function to extract country code from COUNTRIES array item
 */
export function getCountryCode(countryValue) {
  return countryValue?.toUpperCase() || '';
}

export default CountryFlag;
