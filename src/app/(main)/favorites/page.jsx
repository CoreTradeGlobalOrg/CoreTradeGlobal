'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useFavoriteProduct } from '@/presentation/hooks/product/useFavoriteProduct';
import { container } from '@/core/di/container';
import { ProductCard } from '@/presentation/components/features/product/ProductCard/ProductCard';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { favoriteIds, isFavorited, toggleFavorite } = useFavoriteProduct();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/favorites');
    }
  }, [authLoading, user, router]);

  // Fetch favorited products whenever favoriteIds change
  useEffect(() => {
    if (!user?.uid) return;
    if (favoriteIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const productRepository = container.getProductRepository();
        const results = await Promise.all(
          favoriteIds.map((id) => productRepository.getById(id).catch(() => null))
        );
        // Filter out deleted / null results
        setProducts(results.filter(Boolean));
      } catch (err) {
        console.error('FavoritesPage: error fetching favorites', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favoriteIds, user?.uid]);

  // While auth resolves, show spinner
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a1628]">
        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen pt-[var(--navbar-height)] pb-20 px-6 bg-radial-navy">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-10">
          <h1
            className="text-4xl font-bold mb-3"
            style={{
              background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            My Favorites
          </h1>
          <p className="text-[#A0A0A0]">Products you've saved for quick access.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[380px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="flex justify-center mb-6">
              <Heart className="w-16 h-16 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No favorites yet</h3>
            <p className="text-[#A0A0A0] mb-8">
              Browse products to add some!
            </p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full hover:brightness-110 transition-all"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorited={isFavorited(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
