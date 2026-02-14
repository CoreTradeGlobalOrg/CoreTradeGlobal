/**
 * useDeleteProduct Hook
 *
 * Custom hook for deleting products
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { DeleteProductUseCase } from '@/domain/usecases/product/DeleteProductUseCase';

export function useDeleteProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteProduct = async (productId, userId, { isAdmin = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const productRepository = container.getProductRepository();
      const deleteProductUseCase = new DeleteProductUseCase(productRepository);
      await deleteProductUseCase.execute(productId, userId, { isAdmin });
    } catch (err) {
      console.error('useDeleteProduct error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteProduct,
    loading,
    error,
  };
}

export default useDeleteProduct;
