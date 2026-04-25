/**
 * ConversationProfileCard Component
 *
 * Compact profile card shown at the top of every conversation view.
 * Displays the other participant's avatar, name, company, country, and role badge.
 * Clicking navigates to the user's profile page.
 */

'use client';

import Link from 'next/link';

/**
 * @param {Object} props
 * @param {string} props.otherUserId - The ID of the other participant (not current user)
 * @param {Object} props.participantDetails - Map of userId -> participant details
 * @param {Function} [props.onNavigate] - Optional callback when card is clicked (e.g. close widget)
 */
export function ConversationProfileCard({ otherUserId, participantDetails, onNavigate }) {
  if (!otherUserId || !participantDetails) return null;

  const user = participantDetails[otherUserId];
  if (!user) return null;

  const displayName = user.displayName || user.email || 'Unknown';
  const initial = displayName.charAt(0).toUpperCase();

  const formatRole = (role) => {
    if (!role) return null;
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  return (
    <Link
      href={`/profile/${otherUserId}`}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] transition-colors w-full"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#1E2D3D] flex items-center justify-center">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-semibold text-sm">{initial}</span>
        )}
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0">
        {/* Name + role badge on same line */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-semibold text-sm truncate leading-tight">
            {displayName}
          </span>
          {formatRole(user.role) && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded border bg-[rgba(255,215,0,0.1)] text-[#FFD700] border-[rgba(255,215,0,0.3)] leading-tight">
              {formatRole(user.role)}
            </span>
          )}
        </div>

        {/* Company name */}
        {user.companyName && (
          <span className="block text-[#94a3b8] text-xs truncate leading-tight mt-0.5">
            {user.companyName}
          </span>
        )}

        {/* Country — only shown if present */}
        {user.country && (
          <span className="block text-[#6b7a8d] text-xs leading-tight mt-0.5">
            {user.country}
          </span>
        )}
      </div>
    </Link>
  );
}

export default ConversationProfileCard;
