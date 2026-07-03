/**
 * Add Product Page
 *
 * URL: /product/new
 * Standalone replacement for the former "Add Product" modal. Requires login;
 * creates a product for the current user, then returns to their profile.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

export default function NewProductPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { createProduct } = useCreateProduct();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?redirect=/product/new');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  const profileHref = `/profile/${user.uid}`;

  const handleSubmit = async (data, imageFiles) => {
    try {
      await createProduct(data, imageFiles);
      toast.success('Product created!');
      router.push(profileHref);
    } catch {
      /* hook surfaces the error */
    }
  };

  return (
    <FormPageShell title="Add New Product" backHref={profileHref} backLabel="Back to profile">
      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => router.push(profileHref)}
        userId={user.uid}
      />
    </FormPageShell>
  );
}
