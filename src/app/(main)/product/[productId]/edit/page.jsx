/**
 * Edit Product Page
 *
 * URL: /product/[productId]/edit
 * Standalone replacement for the former "Edit Product" modal. Only the product
 * owner or an admin may edit; others are redirected away.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useUpdateProduct } from '@/presentation/hooks/product/useUpdateProduct';
import { container } from '@/core/di/container';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

export default function EditProductPage() {
  const router = useRouter();
  const { productId } = useParams();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { updateProduct } = useUpdateProduct();

  const [product, setProduct] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=/product/${productId}/edit`);
    }
  }, [authLoading, isAuthenticated, productId, router]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid || !productId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await container.getProductRepository().getById(productId);
        if (cancelled) return;
        if (!data) {
          toast.error('Product not found.');
          router.replace(`/profile/${user.uid}`);
          return;
        }
        const isAdmin = user.role === 'admin';
        if (data.userId !== user.uid && !isAdmin) {
          router.replace('/forbidden');
          return;
        }
        setProduct(data);
      } catch (err) {
        console.error('EditProductPage fetch error:', err);
        toast.error('Failed to load product.');
        router.replace(`/profile/${user.uid}`);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.uid, user?.role, productId, router]);

  if (authLoading || loadingData || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  const ownerId = product.userId;
  const isAdmin = user.role === 'admin' && user.uid !== ownerId;
  const profileHref = `/profile/${ownerId}`;

  const handleSubmit = async (data, imageFiles) => {
    try {
      await updateProduct(product.id, ownerId, data, imageFiles, { isAdmin });
      toast.success('Product updated!');
      router.push(profileHref);
    } catch {
      /* hook surfaces the error */
    }
  };

  return (
    <FormPageShell title="Edit Product" backHref={profileHref} backLabel="Back to profile">
      <ProductForm
        product={product}
        onSubmit={handleSubmit}
        onCancel={() => router.push(profileHref)}
        userId={ownerId}
      />
    </FormPageShell>
  );
}
