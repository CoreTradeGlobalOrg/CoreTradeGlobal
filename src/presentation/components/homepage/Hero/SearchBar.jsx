/**
 * SearchBar Component
 *
 * Hero section search bar for products and RFQs
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, FileText } from 'lucide-react';

export function SearchBar({ className = '' }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('products');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Navigate to search results
      router.push(`/search?q=${encodeURIComponent(query)}&type=${searchType}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={`w-full max-w-2xl ${className}`}>
      <div className="relative">
        {/* Search Type Selector */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="h-full pl-4 pr-2 bg-transparent text-[var(--hp-text-secondary)] text-sm border-r border-[var(--hp-border)] focus:outline-none cursor-pointer"
          >
            <option value="products" className="bg-[var(--hp-bg-secondary)] text-[var(--hp-text-primary)]">
              Ürünler
            </option>
            <option value="rfqs" className="bg-[var(--hp-bg-secondary)] text-[var(--hp-text-primary)]">
              RFQ
            </option>
            <option value="all" className="bg-[var(--hp-bg-secondary)] text-[var(--hp-text-primary)]">
              Tümü
            </option>
          </select>
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchType === 'products'
              ? 'Ürün ara... (örn: elektronik, tekstil)'
              : searchType === 'rfqs'
              ? 'RFQ ara... (örn: hammadde, makine)'
              : 'Ürün veya RFQ ara...'
          }
          className="w-full py-4 pl-32 pr-14 bg-[var(--hp-bg-secondary)] border border-[var(--hp-border)] rounded-xl text-[var(--hp-text-primary)] placeholder:text-[var(--hp-text-muted)] focus:outline-none focus:border-[var(--hp-gold)] transition-colors"
        />

        {/* Search Button */}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--hp-gold)] rounded-lg flex items-center justify-center hover:bg-[var(--hp-gold-light)] transition-colors"
        >
          <Search className="w-5 h-5 text-[var(--hp-bg-primary)]" />
        </button>
      </div>

      {/* Quick Search Tags */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="text-xs text-[var(--hp-text-muted)]">Popüler:</span>
        {['Elektronik', 'Tekstil', 'Gıda', 'Makine'].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              setSearchType('products');
            }}
            className="px-3 py-1 text-xs bg-[var(--hp-bg-secondary)] border border-[var(--hp-border)] rounded-full text-[var(--hp-text-secondary)] hover:border-[var(--hp-gold)] hover:text-[var(--hp-gold)] transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </form>
  );
}

export default SearchBar;
