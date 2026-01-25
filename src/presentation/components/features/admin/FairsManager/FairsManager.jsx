/**
 * FairsManager Component
 *
 * Admin interface for managing trade fairs
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useFairs } from '@/presentation/hooks/fairs/useFairs';
import { useCreateFair } from '@/presentation/hooks/fairs/useCreateFair';
import { useUpdateFair } from '@/presentation/hooks/fairs/useUpdateFair';
import { useDeleteFair } from '@/presentation/hooks/fairs/useDeleteFair';
import { Pencil, Trash2, Plus, Calendar, MapPin, Globe } from 'lucide-react';

export function FairsManager() {
  const { fairs, loading, refetch } = useFairs();
  const { createFair } = useCreateFair();
  const { updateFair } = useUpdateFair();
  const { deleteFair } = useDeleteFair();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFair, setEditingFair] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
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
      refetch();
    } catch (err) {
      // Error is handled in hook
    }
  };

  const handleDelete = async (fairId, fairName) => {
    const confirmed = confirm(`"${fairName}" fuarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`);
    if (confirmed) {
      await deleteFair(fairId);
      refetch();
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-blue-900/40 text-blue-400 border border-blue-900/50',
      ongoing: 'bg-green-900/40 text-green-400 border border-green-900/50',
      past: 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-[rgba(255,255,255,0.1)]',
    };
    const labels = {
      upcoming: 'Yaklaşan',
      ongoing: 'Devam Eden',
      past: 'Geçmiş',
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
    return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D4AF37] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Fuarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">Fuarlar</h3>
          <p className="text-[#A0A0A0] mt-1">Ticaret fuarlarını yönetin</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B5952F] text-black font-semibold">
          <Plus className="w-4 h-4" />
          Fuar Ekle
        </Button>
      </div>

      {/* Fairs Table */}
      <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#D4AF37]/20 backdrop-blur-md overflow-hidden">
        <table className="min-w-full divide-y divide-[rgba(255,255,255,0.05)]">
          <thead className="bg-[#0F1B2B]/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Fuar</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Konum</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Tarih</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Durum</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-[#D4AF37] uppercase tracking-wider">İşlemler</th>
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
                      <div className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{fair.name}</div>
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

        {fairs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎪</div>
            <h3 className="text-lg font-semibold text-white mb-2">Henüz fuar yok</h3>
            <p className="text-[#A0A0A0] mb-6">İlk fuarınızı ekleyerek başlayın</p>
            <Button onClick={handleCreate} className="bg-[#D4AF37] hover:bg-[#B5952F] text-black">
              <Plus className="w-4 h-4 mr-2" />
              Fuar Ekle
            </Button>
          </div>
        )}
      </div>

      {/* Fair Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0F1B2B] rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto border border-[#D4AF37]/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingFair ? 'Fuarı Düzenle' : 'Yeni Fuar Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Fuar Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="Istanbul Trade Expo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Konum *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="İstanbul, Türkiye"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  rows={3}
                  placeholder="Fuar hakkında kısa açıklama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Görsel URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                >
                  <option value="upcoming">Yaklaşan</option>
                  <option value="ongoing">Devam Eden</option>
                  <option value="past">Geçmiş</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold">
                  {editingFair ? 'Güncelle' : 'Ekle'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingFair(null);
                  }}
                  className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white"
                >
                  İptal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FairsManager;
