/**
 * useProduct Hook
 *
 * Custom hook for fetching a single product by ID
 * Used for product detail pages
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useProduct(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = async () => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productRepository = container.getProductRepository();
      const fetchedProduct = await productRepository.getById(productId);

      if (!fetchedProduct) {
        setError('Product not found');
        setProduct(null);
      } else {
        setProduct(fetchedProduct);
      }
    } catch (err) {
      console.error('useProduct error:', err);
      setError(err.message);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}

export default useProduct;
