/**
 * FairForm Component
 *
 * Modal form for creating or editing a trade fair.
 * Rendered as a full-screen overlay when modalOpen=true.
 */

'use client';

import { DatePicker } from '@/presentation/components/common/DatePicker/DatePicker';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Object|null} props.editingFair - Fair being edited, or null for create
 * @param {Object} props.formData - Controlled form state
 * @param {Function} props.setFormData
 * @param {Function} props.onSubmit - form submit handler (e)
 * @param {Function} props.onClose
 */
export function FairForm({ isOpen, editingFair, formData, setFormData, onSubmit, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0F1B2B] rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-[#FFD700]/20">
        <h2 className="text-2xl font-bold text-white mb-6">
          {editingFair ? 'Edit Fair' : 'Add New Fair'}
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
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
              <DatePicker
                value={formData.startDate || null}
                onChange={(dateStr) => setFormData({ ...formData, startDate: dateStr || '' })}
                placeholder="Select start date..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">End Date *</label>
              <DatePicker
                value={formData.endDate || null}
                onChange={(dateStr) => setFormData({ ...formData, endDate: dateStr || '' })}
                placeholder="Select end date..."
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
              onClick={onClose}
              className="flex-1 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FairForm;
