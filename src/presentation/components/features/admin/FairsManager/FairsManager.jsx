/**
 * FairsManager Component
 *
 * Admin interface orchestrator for managing trade fairs.
 * Owns data fetching, form state, and CRUD handlers.
 * Delegates rendering to FairsList (table/cards) and FairForm (modal).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { container } from '@/core/di/container';
import { useCreateFair } from '@/presentation/hooks/fairs/useCreateFair';
import { useUpdateFair } from '@/presentation/hooks/fairs/useUpdateFair';
import { useDeleteFair } from '@/presentation/hooks/fairs/useDeleteFair';
import { Plus } from 'lucide-react';
import { FairsList } from './FairsList';
import { FairForm } from './FairForm';

const EMPTY_FORM = {
  name: '',
  location: '',
  category: '',
  description: '',
  startDate: '',
  endDate: '',
  imageUrl: '',
  websiteUrl: '',
  status: 'upcoming',
};

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
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleCreate = () => {
    setEditingFair(null);
    setFormData(EMPTY_FORM);
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

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingFair(null);
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

      <FairsList
        fairs={fairs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
      />

      <FairForm
        isOpen={modalOpen}
        editingFair={editingFair}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default FairsManager;
