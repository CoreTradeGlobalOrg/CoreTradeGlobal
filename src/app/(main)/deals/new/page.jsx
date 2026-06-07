/**
 * Deal Creation Page
 *
 * Allows a member to initiate a deal from a product-based conversation.
 * Fetches product data and conversation context to pre-fill the offer form.
 *
 * Route: /deals/new?conversationId=...&productId=...
 * Auth: requires authenticated member
 *
 * Note: useSearchParams() requires Suspense boundary in Next.js app router.
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, AlertCircle } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { DealForm } from '@/presentation/components/features/deal/DealForm/DealForm';
import { useCreateDeal } from '@/presentation/hooks/deal/useCreateDeal';
import { container } from '@/core/di/container';
import { UNECE_TO_DEAL_UNIT } from '@/core/constants/dealConstants';
import toast from 'react-hot-toast';

// ── Loading fallback ──────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#64748b] text-sm">Loading deal context...</p>
        </div>
      </div>
    </main>
  );
}

// ── Inner component that uses useSearchParams ─────────────────────────────────
function NewDealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');
  const productId = searchParams.get('productId');
  const sellerId = searchParams.get('sellerId');

  // Entry modes:
  //   A) conversationId + productId  — classic path from conversation
  //   B) productId + sellerId         — direct "Start Deal" path from product detail
  const isDirectPath = !conversationId && !!productId && !!sellerId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { createDeal, loading: creating, error: createError } = useCreateDeal();

  const [product, setProduct] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const redirectBase = isDirectPath
        ? `/deals/new?productId=${productId}&sellerId=${sellerId}`
        : `/deals/new?conversationId=${conversationId}&productId=${productId}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectBase)}`);
    }
  }, [authLoading, isAuthenticated, router, conversationId, productId, sellerId, isDirectPath]);

  // Validate required query params — accept EITHER path A or path B
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const hasConversationPath = conversationId && productId;
      const hasDirectPath = productId && sellerId;
      if (!hasConversationPath && !hasDirectPath) {
        setFetchError(
          'Missing deal context. Please use the "Initiate Deal" button from a product conversation or the "Start Deal" button on a product page.'
        );
        setLoadingData(false);
      }
    }
  }, [authLoading, isAuthenticated, conversationId, productId, sellerId]);

  // Fetch product and conversation data (path A — classic)
  useEffect(() => {
    if (!isAuthenticated || !conversationId || !productId) return;

    const fetchData = async () => {
      setLoadingData(true);
      setFetchError(null);

      try {
        const [productRepo, conversationRepo] = [
          container.getProductRepository(),
          container.getConversationRepository(),
        ];

        const [productData, conversationData] = await Promise.all([
          productRepo.getById(productId),
          conversationRepo.getById(conversationId),
        ]);

        if (!productData) {
          setFetchError('Product not found.');
          return;
        }

        setProduct(productData);
        setConversation(conversationData);
      } catch (err) {
        console.error('NewDealPage fetch error:', err);
        setFetchError('Failed to load deal context. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isAuthenticated, conversationId, productId]);

  // Fetch product and seller data (path B — direct "Start Deal")
  useEffect(() => {
    if (!isAuthenticated || !isDirectPath) return;

    const fetchData = async () => {
      setLoadingData(true);
      setFetchError(null);

      try {
        const [productRepo, userRepo] = [
          container.getProductRepository(),
          container.getUserRepository(),
        ];

        const [productData, sellerData] = await Promise.all([
          productRepo.getById(productId),
          userRepo.getById(sellerId),
        ]);

        if (!productData) {
          setFetchError('Product not found.');
          return;
        }

        setProduct(productData);
        setSellerName(
          sellerData?.companyName || sellerData?.displayName || sellerData?.email || null
        );
      } catch (err) {
        console.error('NewDealPage (direct) fetch error:', err);
        setFetchError('Failed to load deal context. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isDirectPath, productId, sellerId]);

  const handleSubmit = async (formData) => {
    try {
      await createDeal({
        // Pass null for conversationId on direct path — CF accepts it as optional
        conversationId: conversationId || null,
        productId,
        initialOffer: formData,
      });
      // Navigation handled by useCreateDeal on success
    } catch (err) {
      toast.error(err?.message || 'Failed to submit offer. Please try again.');
    }
  };

  // ── Loading State ──
  if (authLoading || loadingData) {
    return <LoadingFallback />;
  }

  // ── Error State ──
  if (fetchError) {
    return (
      <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 text-sm">{fetchError}</p>
            <Link href="/messages" className="text-[#FFD700] text-sm hover:underline">
              Back to Messages
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Determine other party info ──
  // Path A: derive from conversation participants
  // Path B: use fetched seller name
  const otherPartyInfo = (() => {
    if (isDirectPath) {
      return sellerName ? { name: sellerName, uid: sellerId } : null;
    }
    if (!conversation || !user?.uid) return null;
    const otherUserId = conversation.participants?.find((id) => id !== user.uid);
    if (!otherUserId) return null;
    const details = conversation.participantDetails?.[otherUserId];
    return {
      name:
        details?.companyName || details?.displayName || details?.email || 'Other Party',
      uid: otherUserId,
    };
  })();

  // ── Default form values from product ──
  const defaultValues = {
    price: product?.price && product.price > 0 ? product.price : undefined,
    currency: product?.currency || 'USD',
    quantity: product?.stockQuantity && product.stockQuantity > 0 ? product.stockQuantity : undefined,
    unit: UNECE_TO_DEAL_UNIT[product?.unit] || product?.unit || '',
  };

  // ── Back link target ──
  const backHref = isDirectPath
    ? `/product/${productId}`
    : conversationId
      ? `/messages/${conversationId}`
      : '/messages';
  const backLabel = isDirectPath ? 'Back to product' : 'Back to conversation';

  return (
    <main className="min-h-screen bg-radial-navy pt-[calc(var(--navbar-height)+24px)] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* ── Back Link ── */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-[#FFD700] hover:text-white text-sm font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        {/* ── Header Card ── */}
        <div className="mb-6 p-5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
          <h1 className="text-2xl font-bold text-white mb-1">Create New Deal</h1>

          {/* Product context */}
          {product && (
            <div className="flex items-center gap-3 mt-3">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[rgba(255,255,255,0.1)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#FFD700]" />
                </div>
              )}
              <div>
                <p className="text-white font-semibold">{product.name}</p>
                {otherPartyInfo && (
                  <p className="text-[#64748b] text-sm">
                    with <span className="text-[#94a3b8]">{otherPartyInfo.name}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Create Error Banner ── */}
        {createError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {createError}
          </div>
        )}

        {/* ── Form Card ── */}
        <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
          <DealForm
            defaultValues={defaultValues}
            productCurrency={product?.currency || 'USD'}
            onSubmit={handleSubmit}
            loading={creating}
            submitLabel="Submit Offer"
          />
        </div>
      </div>
    </main>
  );
}

// ── Page export — wraps inner component with Suspense ─────────────────────────
export default function NewDealPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewDealContent />
    </Suspense>
  );
}
