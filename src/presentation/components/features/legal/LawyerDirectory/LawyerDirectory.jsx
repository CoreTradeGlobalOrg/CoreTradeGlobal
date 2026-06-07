/**
 * LawyerDirectory Component
 *
 * Full directory listing with search bar, filter pills, and a responsive card grid.
 * Uses the useLawyerDirectory hook for data fetching and client-side filtering.
 *
 * Filter UI:
 *  - Search input (by name / company)
 *  - Specialization filter pills
 *  - "Available Now" availability toggle
 *  - Language dropdown
 *  - Active filter tags + "Clear all" link
 */

'use client';

import { Search, X, ChevronDown } from 'lucide-react';
import { useLawyerDirectory } from '@/presentation/hooks/legal/useLawyerDirectory';
import { LawyerCard } from './LawyerCard';

const SPECIALIZATIONS = [
  'Trade Law',
  'Maritime Law',
  'Contract Law',
  'International Law',
  'Corporate Law',
];

const LANGUAGES = [
  'English',
  'Turkish',
  'Arabic',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Russian',
];

/**
 * Skeleton placeholder while lawyers are loading
 */
function LawyerCardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-[rgba(255,255,255,0.07)] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[rgba(255,255,255,0.07)] rounded w-3/4" />
          <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-1/3" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-[rgba(255,255,255,0.07)] rounded-full w-20" />
        <div className="h-5 bg-[rgba(255,255,255,0.07)] rounded-full w-24" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
        <div className="h-3 bg-[rgba(255,255,255,0.07)] rounded w-24" />
        <div className="h-3 bg-[rgba(255,255,255,0.07)] rounded w-16" />
      </div>
    </div>
  );
}

export function LawyerDirectory({ dealId }) {
  const { lawyers, loading, error, filters, setFilter, clearFilters } =
    useLawyerDirectory();

  const hasActiveFilters =
    filters.search ||
    filters.specialization ||
    filters.availability === true ||
    filters.language;

  return (
    <div className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Find a Lawyer</h1>
          <p className="text-[#A0A0A0] mt-1 text-sm">
            Browse our verified legal professionals
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0] pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search by name or company..."
            className="w-full pl-12 pr-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder-[#A0A0A0] focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Specialization pills */}
          {SPECIALIZATIONS.map((spec) => (
            <button
              key={spec}
              onClick={() =>
                setFilter(
                  'specialization',
                  filters.specialization === spec ? null : spec
                )
              }
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filters.specialization === spec
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
              }`}
            >
              {spec}
            </button>
          ))}

          {/* Available Now toggle */}
          <button
            onClick={() =>
              setFilter('availability', filters.availability === true ? null : true)
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filters.availability === true
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
            }`}
          >
            Available Now
          </button>

          {/* Language dropdown */}
          <div className="relative">
            <select
              value={filters.language || ''}
              onChange={(e) => setFilter('language', e.target.value || null)}
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium border transition-all bg-[rgba(255,255,255,0.04)] focus:outline-none cursor-pointer ${
                filters.language
                  ? 'border-blue-500/50 text-blue-300 bg-blue-500/10'
                  : 'border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
              }`}
            >
              <option value="">Language</option>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A0A0A0] pointer-events-none" />
          </div>
        </div>

        {/* Active filter tags + Clear all */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#A0A0A0]">Active filters:</span>

            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-full text-xs text-white">
                &quot;{filters.search}&quot;
                <button onClick={() => setFilter('search', '')}>
                  <X className="w-3 h-3 text-[#A0A0A0] hover:text-white" />
                </button>
              </span>
            )}

            {filters.specialization && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/15 border border-purple-500/30 rounded-full text-xs text-purple-300">
                {filters.specialization}
                <button onClick={() => setFilter('specialization', null)}>
                  <X className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}

            {filters.availability === true && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-300">
                Available Now
                <button onClick={() => setFilter('availability', null)}>
                  <X className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}

            {filters.language && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-300">
                {filters.language}
                <button onClick={() => setFilter('language', null)}>
                  <X className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-xs text-[#A0A0A0] underline hover:text-white transition-colors ml-1"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && (
          <p className="text-sm text-[#A0A0A0]">
            <span className="text-white font-medium">{lawyers.length}</span>{' '}
            {lawyers.length === 1 ? 'lawyer' : 'lawyers'} found
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="glass-card p-6 text-center border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LawyerCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Lawyer grid */}
        {!loading && !error && lawyers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} dealId={dealId} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && lawyers.length === 0 && (
          <div className="glass-card p-12 text-center">
            <p className="text-white font-medium mb-2">No lawyers match your criteria</p>
            <p className="text-[#A0A0A0] text-sm mb-4">
              Try adjusting or clearing your filters to see more results.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm hover:bg-[rgba(255,255,255,0.12)] transition-all"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default LawyerDirectory;
