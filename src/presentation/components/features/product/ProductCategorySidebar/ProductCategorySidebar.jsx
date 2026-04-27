'use client';

/**
 * ProductCategorySidebar
 *
 * Category navigation sidebar for the All Products page.
 * - Fetches parent + sub categories on mount
 * - Provides a search box to filter category names client-side
 * - Highlights the active category with a gold left border
 * - Calls onCategorySelect(categoryId) on click
 * - Hidden on mobile (< lg) — top SearchBar + category chip remain for mobile users
 */

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { container } from '@/core/di/container';

export function ProductCategorySidebar({ activeCategoryId, onCategorySelect }) {
    const [parents, setParents] = useState([]);
    const [subMap, setSubMap] = useState({}); // { [parentId]: [...subcategories] }
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedParents, setExpandedParents] = useState({});

    // Fetch categories on mount
    useEffect(() => {
        let cancelled = false;

        const fetchCategories = async () => {
            try {
                const repo = container.getCategoryRepository();
                const parentCategories = await repo.getParentCategories();

                if (cancelled) return;

                // Fetch sub-categories for all parents in parallel
                const subResults = await Promise.all(
                    parentCategories.map((parent) =>
                        repo.getSubCategories(parent.id).then((subs) => ({ parentId: parent.id, subs }))
                    )
                );

                if (cancelled) return;

                const newSubMap = {};
                subResults.forEach(({ parentId, subs }) => {
                    newSubMap[parentId] = subs;
                });

                setParents(parentCategories);
                setSubMap(newSubMap);

                // Auto-expand parent that contains the active category
                if (activeCategoryId) {
                    subResults.forEach(({ parentId, subs }) => {
                        if (subs.some((s) => s.id === activeCategoryId)) {
                            setExpandedParents((prev) => ({ ...prev, [parentId]: true }));
                        }
                    });
                }
            } catch (err) {
                console.error('ProductCategorySidebar: failed to fetch categories', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchCategories();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-expand parent when activeCategoryId changes
    useEffect(() => {
        if (!activeCategoryId) return;
        Object.entries(subMap).forEach(([parentId, subs]) => {
            if (subs.some((s) => s.id === activeCategoryId)) {
                setExpandedParents((prev) => ({ ...prev, [parentId]: true }));
            }
        });
    }, [activeCategoryId, subMap]);

    // Client-side search filtering
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return parents;
        const lower = searchTerm.toLowerCase();
        return parents.filter((parent) => {
            const parentMatch = parent.name.toLowerCase().includes(lower);
            const subMatch = (subMap[parent.id] || []).some((s) =>
                s.name.toLowerCase().includes(lower)
            );
            return parentMatch || subMatch;
        });
    }, [searchTerm, parents, subMap]);

    const toggleParent = (parentId) => {
        setExpandedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
    };

    const handleCategoryClick = (categoryId) => {
        onCategorySelect?.(categoryId);
    };

    const handleAllProducts = () => {
        onCategorySelect?.(null);
    };

    return (
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
            <div className="bg-[#1a2332] rounded-2xl border border-[rgba(255,255,255,0.07)] overflow-hidden flex flex-col sticky top-[calc(var(--navbar-height)+1rem)] max-h-[calc(100vh-var(--navbar-height)-3rem)]">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-[#FFD700] mb-3">
                        Categories
                    </h3>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search categories..."
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#64748b] focus:outline-none focus:border-[#FFD700]/40 transition-colors"
                        />
                    </div>
                </div>

                {/* Category list */}
                <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
                    {/* All Products item */}
                    <button
                        onClick={handleAllProducts}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 border-l-2 ${
                            !activeCategoryId
                                ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]'
                                : 'border-transparent text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                        }`}
                    >
                        All Products
                    </button>

                    {loading ? (
                        <div className="px-4 py-6 flex flex-col gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-3 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse"
                                    style={{ width: `${55 + i * 7}%` }}
                                />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-[#64748b]">No categories found.</p>
                    ) : (
                        filtered.map((parent) => {
                            const subs = subMap[parent.id] || [];
                            const isExpanded = expandedParents[parent.id];
                            const isParentActive = parent.id === activeCategoryId;

                            // When searching, show only matching subs
                            const visibleSubs = searchTerm.trim()
                                ? subs.filter((s) =>
                                      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                      parent.name.toLowerCase().includes(searchTerm.toLowerCase())
                                  )
                                : subs;

                            return (
                                <div key={parent.id}>
                                    {/* Parent category row */}
                                    <button
                                        onClick={() => {
                                            if (subs.length > 0) {
                                                toggleParent(parent.id);
                                            }
                                            handleCategoryClick(parent.id);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-all flex items-center justify-between border-l-2 ${
                                            isParentActive
                                                ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]'
                                                : 'border-transparent text-white hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFD700]'
                                        }`}
                                    >
                                        <span className="truncate">{parent.name}</span>
                                        {subs.length > 0 && (
                                            <svg
                                                className={`w-3 h-3 flex-shrink-0 transition-transform text-[#64748b] ${isExpanded || searchTerm ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Sub-categories */}
                                    {(isExpanded || searchTerm) && visibleSubs.length > 0 && (
                                        <div className="pl-2">
                                            {visibleSubs.map((sub) => {
                                                const isSubActive = sub.id === activeCategoryId;
                                                return (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => handleCategoryClick(sub.id)}
                                                        className={`w-full text-left px-4 py-2 text-xs transition-all border-l-2 ${
                                                            isSubActive
                                                                ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700] font-semibold'
                                                                : 'border-transparent text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                                                        }`}
                                                    >
                                                        {sub.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </nav>
            </div>
        </aside>
    );
}
