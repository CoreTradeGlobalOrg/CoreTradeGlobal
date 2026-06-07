'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { Star, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/presentation/components/common/ConfirmDialog/ConfirmDialog';

function TestimonialForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    author: initial?.author || '',
    info: initial?.info || '',
    quote: initial?.quote || '',
    rating: initial?.rating || 5,
    order: initial?.order ?? 0,
    active: initial?.active ?? true,
  });

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#A0A0A0] uppercase tracking-wide mb-1">Author Name *</label>
          <input
            value={form.author}
            onChange={(e) => set('author', e.target.value)}
            placeholder="Ahmet Y."
            className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A0A0A0] uppercase tracking-wide mb-1">Position & Location *</label>
          <input
            value={form.info}
            onChange={(e) => set('info', e.target.value)}
            placeholder="Export Manager · Istanbul, Turkey"
            className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#A0A0A0] uppercase tracking-wide mb-1">Quote *</label>
        <textarea
          value={form.quote}
          onChange={(e) => set('quote', e.target.value)}
          rows={3}
          placeholder="Within 2 weeks of joining..."
          className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#A0A0A0] uppercase tracking-wide mb-1">Rating (1-5)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('rating', s)}
                className="transition-colors"
              >
                <Star className={`w-6 h-6 ${s <= form.rating ? 'text-[#FFD700] fill-[#FFD700]' : 'text-[#64748b]'}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#A0A0A0] uppercase tracking-wide mb-1">Display Order</label>
          <input
            type="number"
            value={form.order}
            onChange={(e) => set('order', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={loading || !form.author || !form.quote || !form.info}
          className="px-6 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
        >
          {loading ? 'Saving...' : initial ? 'Update' : 'Add Testimonial'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 border border-[rgba(255,255,255,0.15)] text-white text-sm rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, item: null });
  const [deleting, setDeleting] = useState(false);

  const fetchTestimonials = async () => {
    try {
      const q = query(collection(db, 'testimonials'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setTestimonials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to fetch testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'testimonials', editingId), { ...form, updatedAt: serverTimestamp() });
        toast.success('Testimonial updated');
      } else {
        await addDoc(collection(db, 'testimonials'), { ...form, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success('Testimonial added');
      }
      setShowForm(false);
      setEditingId(null);
      await fetchTestimonials();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'testimonials', deleteDialog.item.id));
      toast.success('Deleted');
      setDeleteDialog({ isOpen: false, item: null });
      await fetchTestimonials();
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await updateDoc(doc(db, 'testimonials', item.id), { active: !item.active, updatedAt: serverTimestamp() });
      toast.success(item.active ? 'Hidden' : 'Visible');
      await fetchTestimonials();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
        <div className="h-48 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      </div>
    );
  }

  const editingItem = editingId ? testimonials.find((t) => t.id === editingId) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Success Stories</h3>
          <p className="text-sm text-[#A0A0A0]">{testimonials.length} testimonials</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-sm rounded-lg hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Testimonial
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
          <h4 className="text-white font-semibold mb-4">{editingId ? 'Edit Testimonial' : 'New Testimonial'}</h4>
          <TestimonialForm
            initial={editingItem}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
            loading={saving}
          />
        </div>
      )}

      {/* Table */}
      {testimonials.length === 0 ? (
        <div className="text-center py-12 text-[#A0A0A0]">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No testimonials yet. Add your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.03)] text-left text-xs text-[#A0A0A0] uppercase tracking-wide">
                  <th className="p-3">Order</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Quote</th>
                  <th className="p-3">Rating</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map((t) => (
                  <tr key={t.id} className="border-t border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="p-3 text-white font-medium">{t.order}</td>
                    <td className="p-3">
                      <p className="text-white font-medium">{t.author}</p>
                      <p className="text-xs text-[#A0A0A0]">{t.info}</p>
                    </td>
                    <td className="p-3 text-[#cbd5e1] max-w-[300px] truncate">{t.quote}</td>
                    <td className="p-3">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < (t.rating || 5) ? 'text-[#FFD700] fill-[#FFD700]' : 'text-[#64748b]'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${t.active !== false ? 'text-green-400 bg-green-900/20' : 'text-gray-400 bg-gray-900/20'}`}>
                        {t.active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleActive(t)} className="text-[#A0A0A0] hover:text-white transition-colors" title={t.active !== false ? 'Hide' : 'Show'}>
                          {t.active !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => startEdit(t)} className="text-[#A0A0A0] hover:text-[#FFD700] transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteDialog({ isOpen: true, item: t })} className="text-[#A0A0A0] hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, item: null })}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Testimonial"
        message={`Are you sure you want to delete the testimonial from "${deleteDialog.item?.author}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

export default TestimonialsManager;
