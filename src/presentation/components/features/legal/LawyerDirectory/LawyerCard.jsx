/**
 * LawyerCard Component
 *
 * Compact card for the lawyer directory listing.
 * Shows minimal info: profile photo/initials, name, specializations (first 2),
 * availability badge, rating, and pricing.
 *
 * The entire card links to /profile/[userId] for full lawyer details.
 */

'use client';

import Link from 'next/link';
import { Star, CheckCircle, Clock } from 'lucide-react';

/**
 * Render filled or empty stars for a rating
 */
function StarRating({ rating, count }) {
  if (!rating && !count) return null;

  const fullStars = Math.floor(rating || 0);
  const hasHalf = (rating || 0) - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
      ))}
      {hasHalf && (
        <Star className="w-3.5 h-3.5 fill-[#FFD700]/50 text-[#FFD700]" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-[#A0A0A0]" />
      ))}
      {count != null && (
        <span className="text-[#A0A0A0] text-xs ml-1">({count})</span>
      )}
    </div>
  );
}

/**
 * Initials avatar fallback when no profile photo
 */
function InitialsAvatar({ name }) {
  const initials = (name || 'L')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  );
}

/**
 * @param {{ lawyer: Object }} props
 */
export function LawyerCard({ lawyer }) {
  const {
    id,
    displayName,
    companyLogo,
    specializations = [],
    isAvailable,
    rating,
    reviewCount,
  } = lawyer;

  const shownSpecializations = specializations.slice(0, 2);

  return (
    <Link
      href={`/profile/${id}`}
      className="glass-card p-5 flex flex-col gap-4 group hover:border-[rgba(255,255,255,0.25)] hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Top row: avatar + name + availability */}
      <div className="flex items-start gap-3">
        {companyLogo ? (
          <img
            src={companyLogo}
            alt={displayName}
            className="w-14 h-14 rounded-xl object-cover border border-[rgba(255,255,255,0.1)] flex-shrink-0"
          />
        ) : (
          <InitialsAvatar name={displayName} />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base leading-tight truncate group-hover:text-[#FFD700] transition-colors">
            {displayName || 'Lawyer'}
          </h3>

          {/* Availability badge */}
          <div className="mt-1">
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[#A0A0A0] font-medium">
                <Clock className="w-3.5 h-3.5" />
                Unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Specializations */}
      {shownSpecializations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shownSpecializations.map((spec) => (
            <span
              key={spec}
              className="text-xs bg-[rgba(139,92,246,0.15)] text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full"
            >
              {spec}
            </span>
          ))}
          {specializations.length > 2 && (
            <span className="text-xs text-[#A0A0A0] px-2 py-0.5">
              +{specializations.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Footer: rating + pricing */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
        {rating != null ? (
          <StarRating rating={rating} count={reviewCount} />
        ) : (
          <span className="text-xs text-[#A0A0A0]">No reviews yet</span>
        )}
        <span className="text-xs text-[#FFD700] font-semibold">$200 / deal</span>
      </div>
    </Link>
  );
}

export default LawyerCard;
