/**
 * useProducts Hook
 *
 * Custom hook for fetching products
 * Fetches products by user ID with real-time updates
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';
import { GetProductsUseCase } from '@/domain/usecases/product/GetProductsUseCase';

export function useProducts(userId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    if (!userId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productRepository = container.getProductRepository();
      const getProductsUseCase = new GetProductsUseCase(productRepository);
      const fetchedProducts = await getProductsUseCase.getByUserId(userId);
      setProducts(fetchedProducts);
    } catch (err) {
      console.error('useProducts error:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}

export default useProducts;
