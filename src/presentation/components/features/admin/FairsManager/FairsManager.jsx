/**
 * FairsManager Component
 *
 * Admin interface for managing trade fairs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { container } from '@/core/di/container';
import { useCreateFair } from '@/presentation/hooks/fairs/useCreateFair';
import { useUpdateFair } from '@/presentation/hooks/fairs/useUpdateFair';
import { useDeleteFair } from '@/presentation/hooks/fairs/useDeleteFair';
import { Pencil, Trash2, Plus, Calendar, MapPin, Globe, Tag } from 'lucide-react';

export function FairsManager() {
  const [fairs, setFairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const firestoreDS = container.getFirestoreDataSource();
      const fetchedFairs = await firestoreDS.getAll('fairs');
      // Sort client-side by startDate ascending
      const sorted = (fetchedFairs || []).sort((a, b) => {
        const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || 0);
        const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || 0);
        return dateA - dateB;
      });
      setFairs(sorted);
    } catch (err) {
      console.error('FairsManager fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFairs();
  }, [fetchFairs]);

  const { createFair } = useCreateFair();
  const { updateFair } = useUpdateFair();
  const { deleteFair } = useDeleteFair();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFair, setEditingFair] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    category: '',
    description: '',
    startDate: '',
    endDate: '',
    imageUrl: '',
    websiteUrl: '',
    status: 'upcoming',
  });

  const handleCreate = () => {
    setEditingFair(null);
    setFormData({
      name: '',
      location: '',
      category: '',
      description: '',
      startDate: '',
      endDate: '',
      imageUrl: '',
      websiteUrl: '',
      status: 'upcoming',
    });
    setModalOpen(true);
  };

  const handleEdit = (fair) => {
    setEditingFair(fair);
    const startDate = fair.startDate?.toDate ? fair.startDate.toDate() : new Date(fair.startDate);
    const endDate = fair.endDate?.toDate ? fair.endDate.toDate() : new Date(fair.endDate);

    setFormData({
      name: fair.name || '',
      location: fair.location || '',
      category: fair.category || '',
      description: fair.description || '',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      imageUrl: fair.imageUrl || '',
      websiteUrl: fair.websiteUrl || '',
      status: fair.status || 'upcoming',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fairData = {
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    };

    try {
      if (editingFair) {
        await updateFair(editingFair.id, fairData);
      } else {
        await createFair(fairData);
      }
      setModalOpen(false);
      setEditingFair(null);
      await fetchFairs();
    } catch (err) {
      // Error is handled in hook
    }
  };

  const handleDelete = async (fairId, fairName) => {
    const confirmed = confirm(`Are you sure you want to delete "${fairName}"? This action cannot be undone.`);
    if (confirmed) {
      await deleteFair(fairId);
      await fetchFairs();
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-blue-900/40 text-blue-400 border border-blue-900/50',
      ongoing: 'bg-green-900/40 text-green-400 border border-green-900/50',
      past: 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-[rgba(255,255,255,0.1)]',
    };
    const labels = {
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      past: 'Past',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading fairs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load fairs</h3>
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <Button onClick={fetchFairs} className="bg-[#FFD700] hover:bg-[#B5952F] text-black">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-white">Trade Fairs</h3>
          <p className="text-sm text-[#A0A0A0] mt-1">Manage trade fairs and exhibitions</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center justify-center gap-2 bg-[#FFD700] hover:bg-[#B5952F] text-black font-semibold text-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Fair
        </Button>
      </div>

      {/* Fairs Table & Cards */}
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
                            <Tag className="w-3 h-3" />
                            {fair.category}
                          </span>
                        )}
                        {fair.websiteUrl && (
                          <a href={fair.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {fair.category ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[rgba(255,215,0,0.1)] text-[#FFD700] border border-[#FFD700]/20">
                        <Tag className="w-3 h-3" />
                        {fair.category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">No category</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-[#A0A0A0]">
                      <MapPin className="w-4 h-4 mr-1" />
                      {fair.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-[#A0A0A0]">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(fair.startDate)} - {formatDate(fair.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(fair.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(fair)}
                        className="flex items-center justify-center p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(fair.id, fair.name)}
                        className="flex items-center justify-center p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors border border-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
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
              {/* Card Image */}
              {fair.imageUrl && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={fair.imageUrl} alt={fair.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Card Body */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="text-base font-semibold text-white">{fair.name}</h4>
                  {getStatusBadge(fair.status)}
                </div>

                {/* Info Lines */}
                <div className="space-y-2 mb-4">
                  {fair.category && (
                    <div className="flex items-center gap-2 text-sm text-[#FFD700]/80">
                      <Tag className="w-4 h-4 flex-shrink-0" />
                      <span>{fair.category}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{fair.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatDate(fair.startDate)} - {formatDate(fair.endDate)}</span>
                  </div>
                  {fair.websiteUrl && (
                    <a href={fair.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <button
                    onClick={() => handleEdit(fair)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(fair.id, fair.name)}
                    className="flex items-center justify-center p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors border border-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {fairs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎪</div>
            <h3 className="text-lg font-semibold text-white mb-2">No fairs yet</h3>
            <p className="text-[#A0A0A0] mb-6">Get started by adding your first fair</p>
            <Button onClick={handleCreate} className="bg-[#FFD700] hover:bg-[#B5952F] text-black">
              <Plus className="w-4 h-4 mr-2" />
              Add Fair
            </Button>
          </div>
        )}
      </div>

      {/* Fair Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0F1B2B] rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-[#FFD700]/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingFair ? 'Edit Fair' : 'Add New Fair'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Fair Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Istanbul Trade Expo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Istanbul, Turkey"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="e.g. Technology, Food & Beverage, Textiles"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  rows={3}
                  placeholder="Brief description about the fair"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors [&>option]:bg-[#1a2a3a] [&>option]:text-white"
                >
                  <option value="upcoming" className="bg-[#1a2a3a] text-white">Upcoming</option>
                  <option value="ongoing" className="bg-[#1a2a3a] text-white">Ongoing</option>
                  <option value="past" className="bg-[#1a2a3a] text-white">Past</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-[#FFD700] hover:bg-[#B5952F] text-black font-bold py-2 px-4 rounded-lg transition-colors">
                  {editingFair ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingFair(null);
                  }}
                  className="flex-1 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FairsManager;
