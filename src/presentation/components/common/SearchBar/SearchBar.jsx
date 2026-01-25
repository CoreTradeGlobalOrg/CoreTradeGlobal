'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function SearchBar({ placeholder = "Search...", initialValue = "", onSearch }) {
    const [query, setQuery] = useState(initialValue);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <form onSubmit={handleSubmit} className="w-full relative">
            <div className="search-bar">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="search-input"
                />

                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-[#A0A0A0] hover:text-white mr-2"
                    >
                        <X size={18} />
                    </button>
                )}

                <button type="submit" className="search-btn">
                    <Search size={22} strokeWidth={2.5} />
                </button>
            </div>
        </form>
    );
}

export default SearchBar;
