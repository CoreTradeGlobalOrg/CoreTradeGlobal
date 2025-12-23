/**
 * useCreateProduct Hook
 *
 * Custom hook for creating products
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { CreateProductUseCase } from '@/domain/usecases/product/CreateProductUseCase';

export function useCreateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProduct = async (productData, imageFiles = []) => {
    setLoading(true);
    setError(null);

    try {
      const productRepository = container.getProductRepository();
      const createProductUseCase = new CreateProductUseCase(productRepository);
      const product = await createProductUseCase.execute(productData, imageFiles);
      return product;
    } catch (err) {
      console.error('useCreateProduct error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProduct,
    loading,
    error,
  };
}

export default useCreateProduct;
