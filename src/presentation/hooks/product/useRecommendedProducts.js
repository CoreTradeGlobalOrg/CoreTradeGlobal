/**
 * useRecommendedProducts Hook
 *
 * Fetches recommended products based on category
 * Falls back to random products if not enough in same category
 */

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useRecommendedProducts(currentProductId, categoryId, limit = 3) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      if (!currentProductId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const productRepository = container.getProductRepository();
        const categoryRepository = container.getCategoryRepository();
        let recommended = [];

        // 1. Try to get products from same category
        if (categoryId) {
          const categoryProducts = await productRepository.getByCategoryId(categoryId, {
            limit: limit + 1, // Get one extra in case current product is included
          });

          // Filter out current product
          recommended = categoryProducts.filter(p => p.id !== currentProductId);
        }

        // 2. If not enough products, get random products
        if (recommended.length < limit) {
          const allProducts = await productRepository.getAllActive({ limit: 20 });

          // Filter out current product and already recommended ones
          const existingIds = new Set([currentProductId, ...recommended.map(p => p.id)]);
          const availableProducts = allProducts.filter(p => !existingIds.has(p.id));

          // Shuffle and pick remaining needed
          const shuffled = availableProducts.sort(() => Math.random() - 0.5);
          const remaining = limit - recommended.length;
          recommended = [...recommended, ...shuffled.slice(0, remaining)];
        }

        // 3. Get category names for products
        const categories = await categoryRepository.getAll();
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        // Add category names to products
        const productsWithCategories = recommended.slice(0, limit).map(product => ({
          ...product,
          categoryName: categoryMap.get(product.categoryId) || 'Product',
        }));

        setProducts(productsWithCategories);
      } catch (err) {
        console.error('useRecommendedProducts error:', err);
        setError(err.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedProducts();
  }, [currentProductId, categoryId, limit]);

  return {
    products,
    loading,
    error,
  };
}

export default useRecommendedProducts;
