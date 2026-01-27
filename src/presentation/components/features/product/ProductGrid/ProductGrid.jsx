/**
 * ProductGrid Component
 *
 * Displays a grid of products using the .product-grid-card style
 * Matches anasyf design
 * Supports filtering props
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
    if (!countryCode) return 'Global';
    const country = COUNTRIES.find(c => c.value === countryCode);
    if (country) {
        return country.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
    }
    return countryCode;
};

const DEFAULT_PRODUCTS = [
    {
        id: '1',
        name: 'Luxury Marble Block - Carrara White',
        price: 450,
        currency: '$',
        unit: 'Ton',
        country: 'Turkey',
        images: ['https://images.unsplash.com/photo-1618516086847-7597b9195d2b?q=80&w=600&auto=format&fit=crop'],
        category: 'Construction'
    },
    {
        id: '2',
        name: 'Industrial Steel Pipes (Seamless)',
        price: 850,
        currency: '$',
        unit: 'Ton',
        country: 'Germany',
        images: ['https://images.unsplash.com/photo-1535063073385-d5e8b4e76a66?q=80&w=600&auto=format&fit=crop'],
        category: 'Industrial'
    },
    {
        id: '3',
        name: '100% Organic Silk Fabric',
        price: 25,
        currency: '$',
        unit: 'Meter',
        country: 'China',
        images: ['https://images.unsplash.com/photo-1620799140408-ed5341cd2431?q=80&w=600&auto=format&fit=crop'],
        category: 'Textile'
    },
    {
        id: '4',
        name: 'Extra Virgin Olive Oil (Cold Pressed)',
        price: 6.50,
        currency: '€',
        unit: 'Liter',
        country: 'Italy',
        images: ['https://images.unsplash.com/photo-1474979266404-7caddbed77a5?q=80&w=600&auto=format&fit=crop'],
        category: 'Food'
    },
    {
        id: '5',
        name: 'Solar Panel Monocrystalline 450W',
        price: 180,
        currency: '$',
        unit: 'Pc',
        country: 'S. Korea',
        images: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=600&auto=format&fit=crop'],
        category: 'Energy'
    },
    {
        id: '6',
        name: 'Ceramic Floor Tiles (60x60)',
        price: 12,
        currency: '$',
        unit: 'm²',
        country: 'Spain',
        images: ['https://images.unsplash.com/photo-1615971677499-54678ab563ce?q=80&w=600&auto=format&fit=crop'],
        category: 'Construction'
    },
    {
        id: '7',
        name: 'Natural Gas Valve Set',
        price: 45,
        currency: '$',
        unit: 'Set',
        country: 'Ukraine',
        images: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=600&auto=format&fit=crop'],
        category: 'Industrial'
    },
    {
        id: '8',
        name: 'Cotton Yarn 30/1 Combed',
        price: 3.20,
        currency: '$',
        unit: 'kg',
        country: 'India',
        images: ['https://images.unsplash.com/photo-1605218427306-022248cebf77?q=80&w=600&auto=format&fit=crop'],
        category: 'Textile'
    }
];

export function ProductGrid({ searchQuery, categoryFilter, categoryIdFilter }) {
    const [products, setProducts] = useState(DEFAULT_PRODUCTS);
    const [filteredProducts, setFilteredProducts] = useState(DEFAULT_PRODUCTS);
    const [loading, setLoading] = useState(true);

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const firestoreDS = container.getFirestoreDataSource();
                // TODO: Optimize to use server-side filtering with 'where' clauses if data grows
                const allProducts = await firestoreDS.query('products', { limit: 50 });

                if (allProducts && allProducts.length > 0) {
                    const active = allProducts.filter(p => p.status === 'active');
                    const sorted = active.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                        return dateB - dateA;
                    });

                    if (sorted.length > 0) {
                        setProducts(sorted);
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = products;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerQ) ||
                (p.category && p.category.toLowerCase().includes(lowerQ)) ||
                (p.country && p.country.toLowerCase().includes(lowerQ))
            );
        }

        if (categoryFilter) {
            const lowerC = categoryFilter.toLowerCase();
            result = result.filter(p =>
                (p.category && p.category.toLowerCase() === lowerC)
            );
        }

        if (categoryIdFilter) {
            result = result.filter(p => p.categoryId === categoryIdFilter);
        }

        setFilteredProducts(result);

    }, [products, searchQuery, categoryFilter, categoryIdFilter]);


    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-[420px] bg-[rgba(255,255,255,0.05)] rounded-[20px] animate-pulse" />
                ))}
            </div>
        );
    }

    if (filteredProducts.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
                <p className="text-[#A0A0A0]">Try adjusting your search or filters.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}

function ProductCard({ product }) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <Link
            href={`/product/${product.id}`}
            className="product-grid-card group"
        >
            {/* Image Area */}
            <div className="aspect-[4/3] w-full bg-[#1A283B] rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
                {product.images && product.images[0] ? (
                    <>
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B] z-10">
                                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        <img
                            src={product.images[0]}
                            alt={product.name}
                            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setImageLoading(false)}
                        />
                    </>
                ) : (
                    <div className="text-4xl">📦</div>
                )}
                <div className="absolute top-3 right-3 bg-[rgba(15,27,43,0.8)] backdrop-blur-md px-3 py-1 rounded-full border border-[rgba(255,255,255,0.1)] z-20">
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">{product.category || 'Product'}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1">
                {product.country && (
                    <div className="flex items-center gap-2 mb-2 text-[#A0A0A0] text-sm">
                        <CountryFlag countryCode={product.country} size={16} />
                        <span>{getCountryName(product.country)}</span>
                    </div>
                )}

                <h3 className="text-lg font-bold text-white mb-2 leading-tight line-clamp-2 min-h-[44px]">
                    {product.name}
                </h3>

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex justify-between items-end">
                    <div>
                        <span className="block text-xs text-[#A0A0A0] mb-1">Price</span>
                        <div className="text-[#D4AF37] font-bold text-xl">
                            {product.currency || '$'}{product.price}
                            <span className="text-sm text-[#A0A0A0] font-normal ml-1">/ {product.unit}</span>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-[#0F1B2B] transition-all">
                        →
                    </button>
                </div>
            </div>
        </Link>
    );
}

