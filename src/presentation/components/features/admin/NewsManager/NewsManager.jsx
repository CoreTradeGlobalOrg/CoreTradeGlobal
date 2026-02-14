/**
 * NewsManager Component
 *
 * Admin interface for managing news articles
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useNews } from '@/presentation/hooks/news/useNews';
import { useCreateNews } from '@/presentation/hooks/news/useCreateNews';
import { useUpdateNews } from '@/presentation/hooks/news/useUpdateNews';
import { useDeleteNews } from '@/presentation/hooks/news/useDeleteNews';
import { Pencil, Trash2, Plus, Eye, EyeOff, ExternalLink } from 'lucide-react';

const NEWS_CATEGORIES = [
  'Logistics',
  'Regulations',
  'Trends',
  'Technology',
  'Markets',
  'General',
];

export function NewsManager() {
  const { news, loading, refetch } = useNews();
  const { createNews } = useCreateNews();
  const { updateNews, publishNews, unpublishNews } = useUpdateNews();
  const { deleteNews } = useDeleteNews();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'General',
    imageUrl: '',
    sourceUrl: '',
    sourceName: '',
    status: 'draft',
  });

  const handleCreate = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'General',
      imageUrl: '',
      sourceUrl: '',
      sourceName: '',
      status: 'draft',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingNews(item);
    setFormData({
      title: item.title || '',
      excerpt: item.excerpt || '',
      content: item.content || '',
      category: item.category || 'General',
      imageUrl: item.imageUrl || '',
      sourceUrl: item.sourceUrl || '',
      sourceName: item.sourceName || '',
      status: item.status || 'draft',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newsData = {
      ...formData,
      publishedAt: formData.status === 'published' ? new Date() : null,
    };

    try {
      if (editingNews) {
        await updateNews(editingNews.id, newsData);
      } else {
        await createNews(newsData);
      }
      setModalOpen(false);
      setEditingNews(null);
      refetch();
    } catch (err) {
      // Error is handled in hook
    }
  };

  const handleDelete = async (newsId, title) => {
    const confirmed = confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`);
    if (confirmed) {
      await deleteNews(newsId);
      refetch();
    }
  };

  const handleTogglePublish = async (item) => {
    if (item.status === 'published') {
      await unpublishNews(item.id);
    } else {
      await publishNews(item.id);
    }
    refetch();
  };

  const getStatusBadge = (status) => {
    const styles = {
      published: 'bg-green-900/40 text-green-400 border border-green-900/50',
      draft: 'bg-yellow-900/40 text-yellow-400 border border-yellow-900/50',
    };
    const labels = {
      published: 'Published',
      draft: 'Draft',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      'Logistics': 'bg-blue-900/40 text-blue-400 border border-blue-900/50',
      'Regulations': 'bg-red-900/40 text-red-400 border border-red-900/50',
      'Trends': 'bg-green-900/40 text-green-400 border border-green-900/50',
      'Technology': 'bg-purple-900/40 text-purple-400 border border-purple-900/50',
      'Markets': 'bg-orange-900/40 text-orange-400 border border-orange-900/50',
      'General': 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-[rgba(255,255,255,0.1)]',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category] || colors['General']}`}>
        {category}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#FFD700] border-r-transparent"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading news...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-white">News</h3>
          <p className="text-sm text-[#A0A0A0] mt-1">Manage trade news and articles</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center justify-center gap-2 bg-[#FFD700] hover:bg-[#B5952F] text-black font-semibold text-sm w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add News
        </Button>
      </div>

      {/* News Table & Cards */}
      <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[#FFD700]/20 backdrop-blur-md">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[800px] w-full divide-y divide-[rgba(255,255,255,0.05)]">
            <thead className="bg-[#0F1B2B]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Article</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">Views</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#FFD700] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {news.map((item) => (
                <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="w-16 h-12 rounded object-cover mr-3 flex-shrink-0 border border-[rgba(255,255,255,0.1)]" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white group-hover:text-[#FFD700] transition-colors truncate max-w-xs">{item.title}</div>
                        <div className="text-xs text-[#A0A0A0] truncate max-w-xs mt-1">{item.excerpt}</div>
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3" />
                            {item.sourceName || 'Source'}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(item.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A0A0A0]">
                    {formatDate(item.publishedAt || item.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#A0A0A0]">
                    {item.viewCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleTogglePublish(item)}
                        className="flex items-center justify-center p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors"
                        title={item.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {item.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center justify-center p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
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
          {news.map((item) => (
            <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-[#FFD700]/20 rounded-xl overflow-hidden hover:border-[#FFD700]/40 transition-colors">
              {/* Card Image */}
              {item.imageUrl && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Card Body */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-base font-semibold text-white line-clamp-2">{item.title}</h4>
                  {getStatusBadge(item.status)}
                </div>

                {/* Category Badge */}
                <div className="mb-3">
                  {getCategoryBadge(item.category)}
                </div>

                {/* Excerpt */}
                {item.excerpt && (
                  <p className="text-sm text-[#A0A0A0] line-clamp-2 mb-3">{item.excerpt}</p>
                )}

                {/* Info Lines */}
                <div className="flex items-center gap-4 text-sm text-[#A0A0A0] mb-4">
                  <span>{formatDate(item.publishedAt || item.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {item.viewCount || 0}
                  </span>
                </div>

                {/* Source Link */}
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>{item.sourceName || 'Source'}</span>
                  </a>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <button
                    onClick={() => handleTogglePublish(item)}
                    className="flex items-center justify-center p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors"
                    title={item.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {item.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white transition-colors text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="flex items-center justify-center p-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 transition-colors border border-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {news.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-lg font-semibold text-white mb-2">No news yet</h3>
            <p className="text-[#A0A0A0] mb-6">Get started by adding your first article</p>
            <Button onClick={handleCreate} className="bg-[#FFD700] hover:bg-[#B5952F] text-black">
              <Plus className="w-4 h-4 mr-2" />
              Add News
            </Button>
          </div>
        )}
      </div>

      {/* News Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0F1B2B] rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-[#FFD700]/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingNews ? 'Edit Article' : 'Add New Article'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="Article title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Excerpt *</label>
                <textarea
                  required
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  rows={2}
                  placeholder="Short summary (shown in list view)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  rows={6}
                  placeholder="Full article content"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors [&>option]:bg-[#1a2a3a] [&>option]:text-white"
                  >
                    {NEWS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1a2a3a] text-white">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a2a3a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors [&>option]:bg-[#1a2a3a] [&>option]:text-white"
                  >
                    <option value="draft" className="bg-[#1a2a3a] text-white">Draft</option>
                    <option value="published" className="bg-[#1a2a3a] text-white">Published</option>
                  </select>
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Source URL</label>
                  <input
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="https://example.com/news"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Source Name</label>
                  <input
                    type="text"
                    value={formData.sourceName}
                    onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                    placeholder="Source website name"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-[#FFD700] hover:bg-[#B5952F] text-black font-bold py-2 px-4 rounded-lg transition-colors">
                  {editingNews ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingNews(null);
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

export default NewsManager;
