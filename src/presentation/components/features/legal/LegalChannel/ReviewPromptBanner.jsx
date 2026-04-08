/**
 * ReviewPromptBanner Component
 *
 * Displays a star-rating + optional comment form for clients to review a lawyer
 * after the legal engagement is completed.
 *
 * Rendered above the read-only notice in ChannelCenter when:
 *   - The engagement is completed (isReadOnly === true)
 *   - The current user is the client (!isLawyer)
 *   - The engagement has not been reviewed yet (!engagement.reviewedAt)
 *
 * Props:
 *   onSubmit(rating, comment) - Callback invoked when user submits the review
 *   loading                   - Whether a submission is in progress
 *   engagement                - LegalEngagement entity (for lawyer display name)
 */

'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export function ReviewPromptBanner({ onSubmit, loading, engagement }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (rating === 0 || loading) return;
    await onSubmit(rating, comment.trim());
  };

  const displayRating = hovered || rating;

  return (
    <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[#1A283B] px-4 py-4">
      <div className="max-w-lg mx-auto">
        {/* Heading */}
        <p className="text-sm font-semibold text-white mb-3">
          How was your experience with{' '}
          <span className="text-amber-400">{engagement?.lawyerDisplayName || 'your lawyer'}</span>?
        </p>

        {/* Star rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              disabled={loading}
              className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                size={24}
                className={
                  star <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[#4A5B6E]'
                }
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-xs text-[#8899AA]">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </span>
          )}
        </div>

        {/* Comment textarea */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 1000))}
          placeholder="Share your experience... (optional)"
          rows={2}
          disabled={loading}
          className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-amber-400/40 resize-none transition-colors disabled:opacity-50 mb-3"
          style={{ minHeight: '60px', maxHeight: '120px' }}
        />

        {/* Submit button */}
        <div className="flex items-center justify-between">
          {comment.length > 0 && (
            <span className="text-xs text-[#4A5B6E]">{comment.length}/1000</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            className="ml-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewPromptBanner;
