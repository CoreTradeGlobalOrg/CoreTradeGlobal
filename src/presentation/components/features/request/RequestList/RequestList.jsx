/**
 * RequestList Component
 *
 * Displays a grid of requests using the .rfq-card style (Dark Theme)
 * Matches FeaturedRFQs design with Edit/Delete actions for Profile
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { useCategories } from '@/presentation/hooks/category/useCategories';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  const country = COUNTRIES.find(c => c.value === countryCode);
  if (country) {
    return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }
  return countryCode;
};

// Helper to format relative time
const getRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const past = date?.toDate ? date.toDate() : new Date(date);
  const diffMs = now - past;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

export function RequestList({ requests = [], loading, isOwnProfile, onEdit, onDelete, onClose, onReopen }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const router = useRouter();
  const { categories } = useCategories();

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-[380px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-[rgba(255,255,255,0.05)] rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#A0A0A0]" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          {isOwnProfile ? 'No requests yet' : 'No requests available'}
        </h3>
        <p className="text-[#A0A0A0] mb-6 max-w-md">
          {isOwnProfile
            ? 'Create your first request to find the products you need.'
            : 'This user has not created any requests yet.'}
        </p>
      </div>
    );
  }

  // Request grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" onClick={() => setActiveMenu(null)}>
      {requests.map((request) => {
        const countryCode = request.targetCountry || request.country;
        const category = categories?.find(c => c.value === request.categoryId);
        const categoryName = category?.name || request.category || '';
        const timeAgo = getRelativeTime(request.updatedAt || request.createdAt);

        const handleCardClick = (e) => {
          // Don't navigate if clicking on the action menu area
          if (e.target.closest('.action-menu-area')) {
            return;
          }
          router.push(`/request/${request.id}`);
        };

        return (
          <div
            key={request.id}
            onClick={handleCardClick}
            className={`rfq-card relative group !w-auto !min-w-0 !max-w-none cursor-pointer ${request.status === 'closed' ? 'opacity-70' : ''}`}
          >
            {/* Action Menu (Only for Own Profile) */}
            {isOwnProfile && (
              <div className="action-menu-area absolute top-4 right-4 z-20">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenu(activeMenu === request.id ? null : request.id);
                  }}
                  className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>

                {activeMenu === request.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl overflow-hidden z-30">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(request); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                    >
                      <Edit size={14} className="text-[#3b82f6]" /> Edit
                    </button>

                    {request.status === 'active' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onClose(request.id); setActiveMenu(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                      >
                        <XCircle size={14} className="text-red-400" /> Close Request
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReopen(request.id); setActiveMenu(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                      >
                        <CheckCircle size={14} className="text-green-400" /> Reopen
                      </button>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(request.id); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Header: Country & Time */}
            <div className={`flex items-start mb-4 ${isOwnProfile ? 'justify-start' : 'justify-between'}`}>
              <div className="flex items-center gap-1.5 text-[13px] text-white">
                <CountryFlag countryCode={countryCode} size={16} />
                <span>{getCountryName(countryCode)}</span>
                {isOwnProfile && (
                  <>
                    <span className="text-[var(--text-grey)] mx-1">•</span>
                    <span className="text-xs text-[var(--text-grey)]">{timeAgo || 'ASAP'}</span>
                  </>
                )}
              </div>
              {!isOwnProfile && (
                <span className="text-xs text-[var(--text-grey)]">{timeAgo || request.deadline || 'ASAP'}</span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white mb-1 leading-snug pr-8">{request.productName || request.title}</h3>

            {/* Category */}
            {categoryName && (
              <span className="text-sm text-[#3b82f6] font-bold mb-3 block">{categoryName}</span>
            )}

            {/* Status Badge for Closed */}
            {request.status === 'closed' && (
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-gray-700/50 text-gray-400 border border-gray-600 mb-3">
                Closed
              </span>
            )}

            {/* Details Box */}
            <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 mb-4 flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-grey)]">Quantity:</span>
                <span className="text-white font-semibold">{request.quantity} {request.unit || 'PCE'}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-grey)]">Budget:</span>
                <span className="text-white font-semibold">
                  {request.budget === 0 || request.budget === '0' || !request.budget ? 'Negotiable' : `$ ${request.budget}`}
                </span>
              </div>
            </div>

            {/* Description */}
            {request.description && (
              <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 line-clamp-2 overflow-hidden">{request.description}</p>
            )}

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-end items-center">
              <span className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white border-0 px-5 py-2 rounded-full text-[13px] font-semibold shadow-lg hover:brightness-110 transition-all">
                View Details
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RequestList;
