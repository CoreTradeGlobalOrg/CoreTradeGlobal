'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function SearchBar({ placeholder = "Search...", initialValue = "", onSearch, variant = "gold", instant = false }) {
    const [query, setQuery] = useState(initialValue);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        if (instant) {
            onSearch(value);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    const buttonStyles = variant === "blue"
        ? "w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white flex items-center justify-center transition-all hover:brightness-110"
        : "search-btn";

    return (
        <form onSubmit={handleSubmit} className="w-full relative">
            <div className="search-bar">
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
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

                <button type="submit" className={buttonStyles}>
                    <Search size={22} strokeWidth={2.5} />
                </button>
            </div>
        </form>
    );
}

export default SearchBar;
