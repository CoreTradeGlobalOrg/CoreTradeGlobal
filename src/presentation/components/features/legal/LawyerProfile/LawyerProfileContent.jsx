/**
 * LawyerProfileContent Component
 *
 * Role-adapted content section rendered when the viewed profile belongs to a lawyer.
 * Replaces the member-specific content (product/request lists) on the profile page.
 *
 * Sections:
 *  a) Overview stats row: years of experience, deals handled, average rating, response time
 *  b) About section: education, specializations, languages
 *  c) Availability & Pricing: status badge + $200/deal engagement card + Hire CTA
 *  d) Reviews: fetched from lawyer's reviews subcollection with star ratings
 *
 * Props:
 *  - profileUser: Object  - The lawyer's Firestore user document
 *  - isOwnProfile: boolean
 *  - currentUser: Object  - The currently logged-in user (may be null)
 */

'use client';

import { useState, useEffect } from 'react';
import { Star, CheckCircle, Clock, Briefcase, Award, MessageCircle, GraduationCap, Globe2, Gavel } from 'lucide-react';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-4 h-4 fill-[#FFD700] text-[#FFD700]" />
      ))}
      {half && <Star className="w-4 h-4 fill-[#FFD700]/50 text-[#FFD700]" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-4 h-4 text-[#A0A0A0]" />
      ))}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color = 'purple' }) {
  const colorMap = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gold: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  const cls = colorMap[color] || colorMap.purple;
  return (
    <div className="glass-card p-4 flex flex-col items-center text-center gap-2">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-white font-bold text-xl leading-tight">{value ?? '—'}</p>
      <p className="text-[#A0A0A0] text-xs">{label}</p>
    </div>
  );
}

// -----------------------------------------------------------------------
// Reviews Section
// -----------------------------------------------------------------------

function ReviewsSection({ lawyerId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      try {
        const userRepo = container.getUserRepository();
        const data = await userRepo.getLawyerReviews(lawyerId);
        if (!cancelled) setReviews(data || []);
      } catch (err) {
        console.error('[LawyerProfileContent] Failed to load reviews:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReviews();
    return () => { cancelled = true; };
  }, [lawyerId]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-1 h-5 bg-[#FFD700] rounded-full" />
        <h3 className="text-base font-bold text-white">Reviews</h3>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-[rgba(255,255,255,0.04)] rounded-xl p-4 space-y-2">
              <div className="h-3 bg-[rgba(255,255,255,0.07)] rounded w-1/4" />
              <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <p className="text-[#A0A0A0] text-sm text-center py-6">No reviews yet.</p>
      )}

      {!loading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => {
            const date = review.createdAt
              ? new Date(
                  review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt
                ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            return (
              <div
                key={review.id}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-white text-sm font-medium">
                      {review.reviewerName || 'Anonymous'}
                    </span>
                  </div>
                  {date && (
                    <span className="text-[#A0A0A0] text-xs">{date}</span>
                  )}
                </div>
                {review.comment && (
                  <p className="text-[#A0A0A0] text-sm leading-relaxed">{review.comment}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------

export function LawyerProfileContent({ profileUser, isOwnProfile }) {
  const {
    id,
    yearsOfExperience,
    dealsHandled,
    rating,
    reviewCount,
    education,
    specializations = [],
    languages = [],
    isAvailable,
    responseTime,
  } = profileUser || {};

  const handleHireClick = () => {
    toast('Select a deal first to hire this lawyer', {
      icon: 'ℹ️',
      style: {
        background: '#1c304a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
      },
    });
  };

  return (
    <div className="space-y-6">

      {/* a) Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          label="Years of Experience"
          value={yearsOfExperience != null ? yearsOfExperience : '—'}
          color="purple"
        />
        <StatCard
          icon={Gavel}
          label="Deals Handled"
          value={dealsHandled != null ? dealsHandled : '—'}
          color="blue"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={rating != null ? rating.toFixed(1) : '—'}
          color="gold"
        />
        <StatCard
          icon={Clock}
          label="Response Time"
          value={responseTime || '< 24h'}
          color="green"
        />
      </div>

      {/* b) About */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1 h-5 bg-purple-500 rounded-full" />
          <h3 className="text-base font-bold text-white">About</h3>
        </div>

        {/* Education */}
        {education && (
          <div className="flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-0.5">Education</p>
              <p className="text-white text-sm">{education}</p>
            </div>
          </div>
        )}

        {/* Specializations */}
        {specializations.length > 0 && (
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-2">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2.5 py-1 rounded-full"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Languages */}
        {languages.length > 0 && (
          <div className="flex items-start gap-3">
            <Globe2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-2">Languages</p>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {!education && specializations.length === 0 && languages.length === 0 && (
          <p className="text-[#A0A0A0] text-sm">No details added yet.</p>
        )}
      </div>

      {/* c) Availability & Pricing */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1 h-5 bg-emerald-500 rounded-full" />
          <h3 className="text-base font-bold text-white">Availability &amp; Pricing</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Availability status */}
          <div>
            {isAvailable ? (
              <span className="inline-flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle className="w-5 h-5" />
                Available for new engagements
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-[#A0A0A0]">
                <Clock className="w-5 h-5" />
                Currently unavailable
              </span>
            )}
            <p className="text-[#A0A0A0] text-sm mt-1">Flat fee per deal engagement</p>
          </div>

          {/* Pricing */}
          <div className="bg-[rgba(255,215,0,0.08)] border border-[#FFD700]/20 rounded-xl px-6 py-4 text-center">
            <p className="text-[#FFD700] text-2xl font-bold">$200</p>
            <p className="text-[#A0A0A0] text-xs">per deal</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.08)]">
          {isOwnProfile ? (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] text-sm font-medium cursor-default"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={handleHireClick}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold transition-all shadow-lg hover:shadow-purple-500/25"
            >
              Hire This Lawyer
            </button>
          )}
        </div>
      </div>

      {/* d) Reviews */}
      {id && <ReviewsSection lawyerId={id} />}

    </div>
  );
}

export default LawyerProfileContent;
