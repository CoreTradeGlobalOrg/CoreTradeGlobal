/**
 * CategoriesManager Component
 *
 * Admin interface for managing categories
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CategoryForm } from '@/presentation/components/features/category/CategoryForm/CategoryForm';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useCreateCategory } from '@/presentation/hooks/category/useCreateCategory';
import { useUpdateCategory } from '@/presentation/hooks/category/useUpdateCategory';
import { useDeleteCategory } from '@/presentation/hooks/category/useDeleteCategory';
import { Pencil, Trash2, Plus } from 'lucide-react';

export function CategoriesManager() {
  const { categories, loading, refetch } = useCategories();
  const { createCategory } = useCreateCategory();
  const { updateCategory } = useUpdateCategory();
  const { deleteCategory } = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory({
      id: category.value,
      name: category.name,
      iconUrl: category.icon,
      parentId: null, // We don't have parent info in the current structure
    });
    setModalOpen(true);
  };

  const handleSubmit = async (categoryData) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, categoryData);
    } else {
      await createCategory(categoryData);
    }
    setModalOpen(false);
    setEditingCategory(null);
    refetch();
  };

  const handleDelete = async (categoryId, categoryName) => {
    const confirmed = confirm(`Delete category "${categoryName}"? This action cannot be undone.`);
    if (confirmed) {
      await deleteCategory(categoryId);
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Categories</h3>
          <p className="text-slate-600 mt-1">Manage product and request categories</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((category) => (
          <div
            key={category.value}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon}</span>
                <span className="font-medium text-gray-900">{category.name}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEdit(category)}
                className="flex-1 flex items-center justify-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(category.value, category.name)}
                className="flex items-center justify-center gap-1 px-3"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
          <p className="text-gray-600 mb-6">Start by creating your first category</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      )}

      {/* Category Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <CategoryForm
              category={editingCategory}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={() => {
                setModalOpen(false);
                setEditingCategory(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesManager;
