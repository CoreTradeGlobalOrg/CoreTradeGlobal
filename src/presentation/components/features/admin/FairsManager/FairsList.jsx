/**
 * FairsList Component
 *
 * Renders the responsive table (desktop) and card grid (mobile) for trade fairs.
 * Includes empty state when no fairs exist.
 */

'use client';

import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, Plus, Calendar, MapPin, Globe, Tag } from 'lucide-react';

const STATUS_STYLES = {
  upcoming: 'bg-blue-900/40 text-blue-400 border border-blue-900/50',
  ongoing: 'bg-green-900/40 text-green-400 border border-green-900/50',
  past: 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-[rgba(255,255,255,0.1)]',
};

const STATUS_LABELS = { upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Past' };

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * @param {Object} props
 * @param {Array} props.fairs
 * @param {Function} props.onEdit
 * @param {Function} props.onDelete
 * @param {Function} props.onCreate
 */
export function FairsList({ fairs, onEdit, onDelete, onCreate }) {
  if (fairs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎪</div>
        <h3 className="text-lg font-semibold text-white mb-2">No fairs yet</h3>
        <p className="text-[#A0A0A0] mb-6">Get started by adding your first fair</p>
        <Button onClick={onCreate} className="bg-[#FFD700] hover:bg-[#B5952F] text-black">
          <Plus className="w-4 h-4 mr-2" />
          Add Fair
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#FFD700]/20 backdrop-blur-md">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[700px] w-full divide-y divide-[rgba(255,255,255,0.05)]">
          <thead className="bg-[#0F1B2B]/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Fair</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-[#FFD700] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {fairs.map((fair) => (
              <tr key={fair.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {fair.imageUrl && (
                      <img src={fair.imageUrl} alt={fair.name} className="w-10 h-10 rounded object-cover mr-3 border border-[rgba(255,255,255,0.1)]" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-[#FFD700] transition-colors">{fair.name}</div>
                      {fair.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#FFD700]/80 mt-0.5">
                          <Tag className="w-3 h-3" />{fair.category}
                        </span>
                      )}
                      {fair.websiteUrl && (
                        <a href={fair.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          <Globe className="w-3 h-3" />Website
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {fair.category ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[#FFD700]/20">
                      <Tag className="w-3 h-3" />{fair.category}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 italic">No category</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-[#A0A0A0]">
                    <MapPin className="w-4 h-4 mr-1" />{fair.location}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-[#A0A0A0]">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(fair.startDate)} - {formatDate(fair.endDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={fair.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(fair)}
                      className="flex items-center justify-center p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(fair.id, fair.name)}
                      title="Delete Fair"
                      className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors border border-red-900/30 text-xs font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {fairs.map((fair) => (
          <div key={fair.id} className="bg-[rgba(255,255,255,0.03)] border border-[#FFD700]/20 rounded-xl overflow-hidden hover:border-[#FFD700]/40 transition-colors">
            {fair.imageUrl && (
              <div className="aspect-video w-full overflow-hidden">
                <img src={fair.imageUrl} alt={fair.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-base font-semibold text-white">{fair.name}</h4>
                <StatusBadge status={fair.status} />
              </div>
              <div className="space-y-2 mb-4">
                {fair.category && (
                  <div className="flex items-center gap-2 text-sm text-[#FFD700]/80">
                    <Tag className="w-4 h-4 flex-shrink-0" /><span>{fair.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                  <MapPin className="w-4 h-4 flex-shrink-0" /><span>{fair.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(fair.startDate)} - {formatDate(fair.endDate)}</span>
                </div>
                {fair.websiteUrl && (
                  <a href={fair.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                    <Globe className="w-4 h-4 flex-shrink-0" /><span>Website</span>
                  </a>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  onClick={() => onEdit(fair)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors text-sm"
                >
                  <Pencil className="w-4 h-4" />Edit
                </button>
                <button
                  onClick={() => onDelete(fair.id, fair.name)}
                  title="Delete Fair"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors border border-red-900/30 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Fair
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FairsList;
