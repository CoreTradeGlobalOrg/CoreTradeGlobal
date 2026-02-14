/**
 * useUpdateProduct Hook
 *
 * Custom hook for updating products
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { UpdateProductUseCase } from '@/domain/usecases/product/UpdateProductUseCase';

export function useUpdateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProduct = async (productId, userId, updateData, newImageFiles = [], { isAdmin = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const productRepository = container.getProductRepository();
      const updateProductUseCase = new UpdateProductUseCase(productRepository);
      const product = await updateProductUseCase.execute(
        productId,
        userId,
        updateData,
        newImageFiles,
        { isAdmin }
      );
      return product;
    } catch (err) {
      console.error('useUpdateProduct error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateProduct,
    loading,
    error,
  };
}

export default useUpdateProduct;
