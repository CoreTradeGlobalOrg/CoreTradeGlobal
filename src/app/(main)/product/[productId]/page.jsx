/**
 * Product Detail Page
 *
 * URL: /product/[productId]
 * Public with view limits - guests can view up to 3 products
 *
 * Features:
 * - View product details with all information
 * - Image carousel
 * - Seller information
 * - Edit/Delete for own products (authenticated only)
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, memo } from 'react';
import { useProduct } from '@/presentation/hooks/product/useProduct';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useUpdateProduct } from '@/presentation/hooks/product/useUpdateProduct';
import { useDeleteProduct } from '@/presentation/hooks/product/useDeleteProduct';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { ViewLimitGuard } from '@/presentation/components/common/ViewLimitGuard/ViewLimitGuard';
import { ChevronLeft, ChevronRight, ArrowLeft, Pencil, Trash2, Power, User, MessageCircle } from 'lucide-react';
import { container } from '@/core/di/container';
import { useConversations } from '@/presentation/hooks/messaging/useConversations';
import toast from 'react-hot-toast';

// Thumbnail image with loading state
const ThumbnailImage = memo(function ThumbnailImage({ src, alt }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B]">
          <div className="w-4 h-4 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
      />
    </>
  );
});

// Seller avatar with loading state
const SellerAvatar = memo(function SellerAvatar({ src, alt }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <User className="w-8 h-8" />;
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B]">
          <div className="w-4 h-4 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

export default function ProductDetailPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId;

  const { product, loading: productLoading, error, refetch } = useProduct(productId);
  const { categories } = useCategories();
  const { updateProduct } = useUpdateProduct();
  const { deleteProduct } = useDeleteProduct();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seller, setSeller] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const { startDirectConversation } = useConversations();

  const isOwnProduct = currentUser?.uid === product?.userId;
  const images = product?.images || [];
  const hasImages = images.length > 0;

  // Fetch seller information
  useEffect(() => {
    const fetchSeller = async () => {
      if (!product?.userId) return;

      try {
        const userRepository = container.getUserRepository();
        const sellerData = await userRepository.getById(product.userId);
        setSeller(sellerData);
      } catch (err) {
        console.error('Error fetching seller:', err);
      }
    };

    fetchSeller();
  }, [product]);

  const nextImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteProduct(productId, currentUser.uid);
      toast.success('Product deleted successfully');
      setDeleteModalOpen(false);
      router.push(`/profile/${currentUser.uid}?tab=products`);
    } catch (err) {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProduct(productId, currentUser.uid, { status: newStatus });
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (err) {
      toast.error('Failed to update product status');
    }
  };

  const handleEditSubmit = async (data, imageFiles = []) => {
    await updateProduct(productId, currentUser.uid, data, imageFiles);
    setEditModalOpen(false);
    refetch();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = () => {
    const category = categories.find((cat) => cat.value === product?.categoryId);
    return category?.label || 'Unknown Category';
  };

  const handleSendMessage = async () => {
    if (!currentUser?.uid) {
      toast.error('Please log in to send a message');
      router.push(`/login?redirect=/product/${productId}`);
      return;
    }

    if (!seller?.id) {
      toast.error('Seller information not available');
      return;
    }

    setSendingMessage(true);
    try {
      // Check if conversation already exists
      const conversationRepo = container.getConversationRepository();
      const existingConversation = await conversationRepo.findDirectConversation(currentUser.uid, seller.id);

      // Prepare draft message
      const draftMessage = `Hi, I'm interested in your product "${product.name}" (${product.currency} ${product.price?.toLocaleString() || '0'}). Is it still available?`;

      if (existingConversation) {
        // Conversation exists - navigate with draft
        router.push(`/messages/${existingConversation.id}?draft=${encodeURIComponent(draftMessage)}`);
      } else {
        // New conversation - create and navigate with draft
        const conversation = await startDirectConversation(seller.id);
        router.push(`/messages/${conversation.id}?draft=${encodeURIComponent(draftMessage)}`);
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
      toast.error('Failed to open conversation. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (productLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a1628]">
        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy flex items-center justify-center px-4">
        <div className="glass-card max-w-lg w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/')} className="btn-signup text-white border-none w-full max-w-[200px]">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ViewLimitGuard itemId={productId} itemType="product">
    <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative glass-card rounded-2xl overflow-hidden group" style={{ height: '500px' }}>
              {hasImages ? (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0F1B2B]">
                      <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <img
                    src={images[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className={`w-full h-full object-contain p-4 transition-all duration-300 ${imageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                      }`}
                    onLoad={handleImageLoad}
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-[#FFD700] text-white hover:text-[#0F1B2B] rounded-full p-3 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white/90 text-sm font-medium px-4 py-1.5 rounded-full border border-white/10">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 bg-[#0F1B2B]">
                  <svg className="w-24 h-24 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setImageLoading(true);
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-24 h-24 rounded-xl border relative overflow-hidden transition-all duration-200 ${index === currentImageIndex
                      ? 'border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105 z-10'
                      : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <ThumbnailImage src={img} alt={`Thumbnail ${index + 1}`} />
                    {index === currentImageIndex && (
                      <div className="absolute inset-0 bg-[#FFD700]/10" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Header Card */}
            <div className="glass-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 blur-[50px] rounded-full pointer-events-none" />

              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-4xl font-bold text-white leading-tight">{product.name}</h1>
                  <span className={`px-4 py-1.5 text-xs uppercase tracking-wider font-bold rounded-full border ${product.status === 'active'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}>
                    {product.status}
                  </span>
                </div>

                <div className="flex items-end gap-2 mt-2">
                  <span className="text-lg text-gray-400 font-medium mb-1.5">{product.currency}</span>
                  <div className="text-4xl font-bold bg-gradient-to-r from-white to-[#A0A0A0] bg-clip-text text-transparent">
                    {product.price?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 flex flex-col gap-2">
                <div className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Category</div>
                <div className="text-lg font-medium text-[#FFD700]">{getCategoryName()}</div>
              </div>

              <div className="glass-card p-6 flex flex-col gap-2">
                <div className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Stock Quantity</div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${product.stockQuantity > 0 ? 'text-white' : 'text-red-400'}`}>
                    {product.stockQuantity || 0}
                  </span>
                  <span className="text-sm text-gray-400">{product.unit || 'units'} available</span>
                </div>
              </div>

              {product.unit && (
                <div className="glass-card p-6 flex flex-col gap-2">
                  <div className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Unit</div>
                  <div className="text-lg font-medium text-white">{product.unit}</div>
                  {product.unitCategory && (
                    <div className="text-sm text-gray-400">{product.unitCategory}</div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="glass-card p-8">
              <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4 flex items-center gap-2">
                Description
              </div>
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg font-light">
                {product.description}
              </p>
            </div>

            {/* Seller Info */}
            {seller && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A283B] to-[#0F1B2B] border border-white/10 flex items-center justify-center text-[#FFD700] shadow-lg overflow-hidden relative">
                      <SellerAvatar
                        src={seller.logoURL || seller.photoURL || seller.image || seller.avatar}
                        alt={seller.companyName || seller.displayName}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Seller</div>
                      <div className="font-bold text-xl text-white">{seller.companyName || seller.displayName || 'Unknown Seller'}</div>
                    </div>
                  </div>

                  {!isOwnProduct && (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage}
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] !text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {sendingMessage ? (
                          <>
                            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                            Opening...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4" />
                            Contact Seller
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => router.push(`/profile/${seller.id}`)}
                        className="px-6 py-3 rounded-full border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700] hover:text-[#0F1B2B] transition-all font-semibold text-sm"
                      >
                        View Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons (Owner Only) */}
            {isOwnProduct && (
              <div className="pt-4 space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => setEditModalOpen(true)}
                    className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2 transition-all group"
                  >
                    <Pencil className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    Edit Product
                  </Button>
                  <Button
                    onClick={handleDeleteClick}
                    className="flex-1 h-14 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </Button>
                </div>
                <Button
                  onClick={handleToggleStatus}
                  className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 font-bold transition-all ${product.status === 'active'
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                    }`}
                >
                  <Power className="w-5 h-5" />
                  {product.status === 'active' ? 'Deactivate Product' : 'Activate Product'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Product"
        >
          <ProductForm
            product={product}
            userId={currentUser?.uid}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditModalOpen(false)}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => !deleting && setDeleteModalOpen(false)}
          title="Delete Product"
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">
                  Are you sure you want to delete this product?
                </p>
                <p className="text-gray-400 text-sm">
                  This action cannot be undone. The product "{product.name}" will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Product
                  </>
                )}
              </Button>
              <Button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
    </ViewLimitGuard>
  );
}
