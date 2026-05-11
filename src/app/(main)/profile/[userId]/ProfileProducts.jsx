'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProductList } from '@/presentation/components/features/product/ProductList/ProductList';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';

/**
 * ProfileProducts - Products section with pagination and add/edit modal.
 */
export function ProfileProducts({
  userId,
  products,
  productsLoading,
  canEdit,
  isOwnProfile,
  isAdmin,
  productPage,
  setProductPage,
  itemsPerPage,
  productModalOpen,
  editingProduct,
  // Handlers
  onOpenModal,
  onEditProduct,
  onDeleteProduct,
  onToggleProductStatus,
  onProductSubmit,
  onCloseModal,
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 bg-[#FFD700] rounded-full"></span>
          <h3 className="text-base font-bold text-white">
            {isOwnProfile ? 'My Products' : 'Products'}{' '}
            <span className="text-sm text-[#A0A0A0] font-normal">({products?.length || 0})</span>
          </h3>
        </div>
        {canEdit && (
          <Button
            onClick={onOpenModal}
            className="font-bold border-none text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ backgroundColor: '#FFD700', color: '#0F1B2B' }}
          >
            + Add Product
          </Button>
        )}
      </div>

      <ProductList
        products={products?.slice((productPage - 1) * itemsPerPage, productPage * itemsPerPage)}
        loading={productsLoading}
        isOwnProfile={canEdit}
        onEdit={onEditProduct}
        onDelete={onDeleteProduct}
        onToggleStatus={onToggleProductStatus}
      />

      {/* Pagination */}
      {products && products.length > itemsPerPage && (
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setProductPage((p) => Math.max(1, p - 1))}
            disabled={productPage === 1}
            aria-label="Previous products page"
            className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          >
            ← Previous
          </button>
          <span className="text-sm text-[#A0A0A0]" aria-live="polite" aria-atomic="true">
            Page <span className="text-white font-medium">{productPage}</span> of{' '}
            <span className="text-white font-medium">{Math.ceil(products.length / itemsPerPage)}</span>
          </span>
          <button
            onClick={() => setProductPage((p) => Math.min(Math.ceil(products.length / itemsPerPage), p + 1))}
            disabled={productPage >= Math.ceil(products.length / itemsPerPage)}
            aria-label="Next products page"
            className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          >
            Next →
          </button>
        </div>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={onCloseModal}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <ProductForm
          product={editingProduct}
          onSubmit={onProductSubmit}
          onCancel={onCloseModal}
          userId={userId}
        />
      </Modal>
    </div>
  );
}
