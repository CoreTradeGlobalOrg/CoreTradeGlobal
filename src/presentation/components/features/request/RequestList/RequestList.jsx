/**
 * RequestList Component
 *
 * Displays a grid of requests using the .rfq-card style (Dark Theme)
 * Matches FeaturedRFQs EXACTLY but adds Edit/Delete actions for Profile
 */

'use client';

import Link from 'next/link';
import { FileText, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { COUNTRIES } from '@/core/constants/countries';

// Helper to get flag and name
const getCountryInfo = (countryValue) => {
  if (!countryValue) return { flag: '🌍', name: 'Global' };
  const country = COUNTRIES.find(c =>
    c.value === countryValue ||
    c.label.toLowerCase().includes(countryValue.toLowerCase())
  );
  if (country) {
    const flag = country.label.split(' ')[0];
    const name = country.label.substring(flag.length + 1);
    return { flag, name };
  }
  return { flag: '🌍', name: countryValue };
};

export function RequestList({ requests = [], loading, isOwnProfile, onEdit, onDelete, onClose, onReopen }) {
  const [activeMenu, setActiveMenu] = useState(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-[300px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
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
        const countryInfo = getCountryInfo(request.targetCountry || request.country);

        return (
          <div
            key={request.id}
            className={`rfq-card relative group ${request.status === 'closed' ? 'opacity-70 grayscale' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Menu (Only for Own Profile) */}
            {isOwnProfile && (
              <div className="absolute top-4 right-4 z-20">
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
                      onClick={() => { onEdit(request); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                    >
                      <Edit size={14} className="text-[#D4AF37]" /> Edit
                    </button>

                    {request.status === 'active' ? (
                      <button
                        onClick={() => { onClose(request.id); setActiveMenu(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                      >
                        <XCircle size={14} className="text-red-400" /> Close Request
                      </button>
                    ) : (
                      <button
                        onClick={() => { onReopen(request.id); setActiveMenu(null); }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                      >
                        <CheckCircle size={14} className="text-green-400" /> Reopen
                      </button>
                    )}

                    <button
                      onClick={() => { onDelete(request.id); setActiveMenu(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[rgba(239,68,68,0.1)] flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${request.status === 'active' ? 'bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)]' : 'bg-gray-700/50 text-gray-400 border border-gray-600'}`}>
                {request.status === 'active' ? (request.badge || 'New') : 'Closed'}
              </span>
              <span className="text-xs text-[var(--text-grey)]">{request.deadline || 'ASAP'}</span>
            </div>

            <h3 className="text-lg font-bold text-white mb-3 leading-snug pr-8">{request.productName || request.title}</h3>

            <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 mb-4 flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-grey)]">Quantity:</span>
                <span className="text-white font-semibold">{request.quantity}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-grey)]">Budget:</span>
                <span className="text-white font-semibold">{request.budget || 'Negotiable'}</span>
              </div>
            </div>

            {request.description && (
              <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 line-clamp-2 overflow-hidden min-h-[40px]">{request.description}</p>
            )}

            <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[13px] text-white">
                <span>{countryInfo.flag}</span>
                <span>{countryInfo.name}</span>
              </div>
              <Link href={`/request/${request.id}`}>
                <button className="bg-[rgba(255,255,255,0.1)] text-white hover:bg-white hover:text-black hover:font-bold border-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all">
                  View Details
                </button>
              </Link>
            </div>

          </div>
        );
      })}
    </div>
  );
}

export default RequestList;
