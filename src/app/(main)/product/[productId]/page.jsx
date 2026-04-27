/**
 * Product Detail Page
 * URL: /product/[productId]
 * Orchestrates: ProductGallery, ProductSellerCard, recommended products
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useProduct } from '@/presentation/hooks/product/useProduct';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useUpdateProduct } from '@/presentation/hooks/product/useUpdateProduct';
import { useDeleteProduct } from '@/presentation/hooks/product/useDeleteProduct';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { ArrowLeft, Pencil, Trash2, Power, Star, Share2, Handshake } from 'lucide-react';
import { container } from '@/core/di/container';
import { useConversations } from '@/presentation/hooks/messaging/useConversations';
import { useRecommendedProducts } from '@/presentation/hooks/product/useRecommendedProducts';
import { ProductCard } from '@/presentation/components/homepage/Products/FeaturedProducts';
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { useFavoriteProduct } from '@/presentation/hooks/product/useFavoriteProduct';
import toast from 'react-hot-toast';
import { ProductGallery } from './ProductGallery';
import { ProductSellerCard } from './ProductSellerCard';

export default function ProductDetailPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { productId } = useParams();

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const { startDirectConversation } = useConversations();
  const { trackViewItem, trackContactSeller } = useTrackEvent();
  const { products: recommendedProducts, loading: recommendedLoading } = useRecommendedProducts(productId, product?.categoryId, 3);
  const { isFavorited, toggleFavorite } = useFavoriteProduct();

  const isAdmin = currentUser?.role === 'admin';
  const isOwnProduct = currentUser?.uid === product?.userId || isAdmin;
  const images = product?.images || [];

  useEffect(() => {
    if (product?.id && product?.name) trackViewItem(product.id, product.name, product.categoryId);
  }, [product?.id, product?.name, product?.categoryId, trackViewItem]);

  useEffect(() => {
    if (!product?.userId) return;
    container.getUserRepository().getById(product.userId)
      .then((data) => setSeller(data))
      .catch((err) => console.error('Error fetching seller:', err));
  }, [product]);

  const getCategory = () => {
    const cat = categories.find((c) => c.value === product?.categoryId);
    return { icon: cat?.icon || '', name: cat?.name || 'Unknown Category' };
  };

  const handleSendMessage = async () => {
    if (!currentUser?.uid) { toast.error('Please log in to send a message'); router.push(`/login?redirect=/product/${productId}`); return; }
    if (!seller?.id) { toast.error('Seller information not available'); return; }
    setSendingMessage(true);
    try {
      const priceText = product.price ? `${product.currency} ${product.price.toLocaleString()}` : 'Negotiable';
      const draftText = `Hi, I'm interested in your product "${product.name}" (${priceText}). Is it still available?`;
      await startDirectConversation(seller.id, { source: 'product_inquiry', productId: product.id, productName: product.name, productImage: images.length > 0 ? images[0] : null }, null, draftText);
      trackContactSeller(seller.id, product.id);
    } catch { toast.error('Failed to open conversation. Please try again.'); }
    finally { setSendingMessage(false); }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteProduct(productId, product.userId, { isAdmin });
      toast.success('Product deleted successfully');
      setDeleteModalOpen(false);
      router.push(`/profile/${product.userId}?tab=products`);
    } catch { toast.error('Failed to delete product'); }
    finally { setDeleting(false); }
  };

  const handleToggleStatus = async () => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProduct(productId, product.userId, { status: newStatus }, [], { isAdmin });
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      refetch();
    } catch { toast.error('Failed to update product status'); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // User cancelled share — no error needed
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  if (productLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-[#0a1628]"><div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-[var(--navbar-height)] pb-20 bg-radial-navy flex items-center justify-center px-4">
        <div className="glass-card max-w-lg w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/')} className="btn-signup text-white border-none w-full max-w-[200px]">Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[var(--navbar-height)] pb-20 bg-radial-navy">
      <div className="max-w-[1200px] mx-auto px-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column - Gallery & Seller */}
          <div className="flex flex-col gap-4">
            <ProductGallery
              images={images} currentImageIndex={currentImageIndex} imageLoading={imageLoading} productName={product.name}
              onNext={() => { setImageLoading(true); setCurrentImageIndex((p) => (p + 1) % images.length); }}
              onPrev={() => { setImageLoading(true); setCurrentImageIndex((p) => (p - 1 + images.length) % images.length); }}
              onThumbnailClick={(i) => { setImageLoading(true); setCurrentImageIndex(i); }}
              onImageLoad={() => setImageLoading(false)}
            />
            {seller && currentUser?.uid !== product?.userId && (
              <ProductSellerCard seller={seller} sendingMessage={sendingMessage} onSendMessage={handleSendMessage} />
            )}
          </div>

          {/* Right Column - Details */}
          <div className="flex flex-col gap-6">
            <div className="glass-card p-8 relative overflow-hidden">
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-4xl font-bold text-white leading-tight">{product.name}</h1>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {product.createdByAdmin && currentUser?.role === 'admin' && (
                      <span className="px-3 py-1.5 text-xs uppercase tracking-wider font-bold rounded-full border bg-purple-500/10 border-purple-500/30 text-purple-400">Admin Created</span>
                    )}
                    <span className={`px-4 py-1.5 text-xs uppercase tracking-wider font-bold rounded-full border ${product.status === 'active' ? 'border-green-500/30 text-green-400' : 'border-gray-500/30 text-gray-400'}`}>{product.status}</span>
                    {/* Share button */}
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      title="Share product"
                    >
                      <Share2 className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                    </button>
                    {/* Favorite star button */}
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      title={isFavorited(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className="w-5 h-5 transition-colors"
                        style={isFavorited(product.id) ? { fill: '#FFD700', color: '#FFD700' } : { color: '#9CA3AF' }}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  {product.price ? (
                    <><span className="text-lg text-gray-400 font-medium mb-1.5">{product.currency}</span><div className="text-4xl font-bold bg-gradient-to-r from-white to-[#A0A0A0] bg-clip-text text-transparent">{product.price.toLocaleString()}</div></>
                  ) : (
                    <div className="text-4xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent">Negotiable</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 flex flex-col gap-2">
                <div className="text-sm uppercase tracking-wider text-[#FFD700] font-semibold">Category</div>
                <div className="text-lg font-medium flex items-center gap-2">
                  {getCategory().icon && <span>{getCategory().icon}</span>}
                  <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{getCategory().name}</span>
                </div>
              </div>
              <div className="glass-card p-6 flex flex-col gap-2">
                <div className="text-sm uppercase tracking-wider text-[#FFD700] font-semibold">Stock Quantity</div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${product.stockQuantity > 0 ? 'bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent' : 'text-red-400'}`}>{product.stockQuantity || 0} {product.unit || 'units'}</span>
                  <span className="text-sm text-gray-400">available</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 cursor-pointer transition-all duration-300 hover:border-[#FFD700]/30 flex-1" onClick={() => product.description?.length > 400 && setDescriptionExpanded(!descriptionExpanded)}>
              <div className="text-sm uppercase tracking-wider text-[#FFD700] font-bold mb-4 flex items-center justify-between">
                <span>Description</span>
                {product.description?.length > 400 && <span className="text-xs normal-case tracking-normal font-medium text-gray-400">{descriptionExpanded ? 'Click to collapse' : 'Click to expand'}</span>}
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${descriptionExpanded ? 'max-h-[2000px]' : 'max-h-[200px]'}`}>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-lg font-light">{product.description}</p>
              </div>
              {product.description?.length > 400 && (
                <button className="mt-4 text-[#FFD700] font-semibold text-sm hover:text-white transition-colors flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setDescriptionExpanded(!descriptionExpanded); }}>
                  {descriptionExpanded ? <>Show Less <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></> : <>Read More <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>}
                </button>
              )}
            </div>

            {/* Start Deal button — shown to authenticated non-owners only */}
            {currentUser?.uid && !isOwnProduct && (
              <div className="pt-2">
                <Button
                  onClick={() => router.push(`/deals/new?productId=${product.id}&sellerId=${product.userId}`)}
                  className="w-full h-14 rounded-xl bg-[#FFD700] hover:brightness-110 !text-black font-semibold flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                >
                  <Handshake className="w-5 h-5" />
                  Start Deal
                </Button>
              </div>
            )}

            {isOwnProduct && (
              <div className="pt-4 space-y-4">
                <div className="flex gap-4">
                  <Button onClick={() => setEditModalOpen(true)} className="flex-1 h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2 transition-all group">
                    <Pencil className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" /> Edit Product
                  </Button>
                  <Button onClick={() => setDeleteModalOpen(true)} className="flex-1 h-14 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center gap-2 transition-all">
                    <Trash2 className="w-5 h-5" /> Delete
                  </Button>
                </div>
                <Button onClick={handleToggleStatus} className={`w-full h-14 rounded-xl flex items-center justify-center gap-3 font-bold transition-all ${product.status === 'active' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'}`}>
                  <Power className="w-5 h-5" /> {product.status === 'active' ? 'Deactivate Product' : 'Activate Product'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Products */}
        {(recommendedLoading || recommendedProducts.length > 0) && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent"></div>
              <h2 className="text-2xl font-bold text-white">Similar Products</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent"></div>
            </div>
            <div id="products" className="flex md:justify-center gap-6 overflow-x-auto pt-2 pb-4 px-4 md:px-0">
              {recommendedLoading
                ? [...Array(3)].map((_, i) => <div key={i} className="product-card" style={{ background: 'rgba(255,255,255,0.05)', width: '280px', height: '480px', flexShrink: 0 }}><div className="product-card-image animate-pulse" style={{ height: '280px' }} /><div className="product-card-content"><div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-3" /><div className="h-6 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" /><div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" /></div></div>)
                : recommendedProducts.map((p) => <ProductCard key={p.id} product={p} categories={categories} />)
              }
            </div>
          </div>
        )}

        {/* Edit Modal */}
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Product">
          <ProductForm product={product} userId={product?.userId} onSubmit={async (data, files) => { await updateProduct(productId, product.userId, data, files, { isAdmin }); setEditModalOpen(false); refetch(); }} onCancel={() => setEditModalOpen(false)} />
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} title="Delete Product">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-1">Are you sure you want to delete this product?</p>
                <p className="text-gray-400 text-sm">This action cannot be undone. The product "{product.name}" will be permanently removed.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {deleting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Product</>}
              </Button>
              <Button onClick={() => setDeleteModalOpen(false)} disabled={deleting} className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50">Cancel</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
