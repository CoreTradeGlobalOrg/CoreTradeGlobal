/**
 * Searchable Select Component
 *
 * Dropdown with search functionality
 * Used for Country and Category selection
 */

'use client';

import { useState, useRef, useEffect } from 'react';

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  error = false,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-left
          border-2 rounded-lg
          ${className.includes('dark-select')
            ? 'bg-[#0F1B2B] border-[rgba(255,255,255,0.1)] text-white hover:border-[#D4AF37]/50'
            : 'bg-white border-slate-300 text-slate-900'}
          ${error
            ? 'border-red-500 focus:border-red-600'
            : (className.includes('dark-select') ? 'focus:border-[#D4AF37]' : 'focus:border-blue-600')
          }
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
          focus:outline-none focus:ring-4
          ${error
            ? 'focus:ring-red-200'
            : (className.includes('dark-select') ? 'focus:ring-[#D4AF37]/20' : 'focus:ring-blue-200')
          }
          transition-all duration-200
          flex items-center justify-between
        `}
      >
        <span className={selectedOption ? (className.includes('dark-select') ? 'text-white' : 'text-slate-900') : (className.includes('dark-select') ? 'text-gray-500' : 'text-slate-400')}>
          {displayValue}
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''
            } ${className.includes('dark-select') ? 'text-gray-400' : 'text-slate-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute z-50 w-full mt-2 rounded-lg shadow-xl max-h-80 overflow-hidden border-2 ${className.includes('dark-select')
          ? 'bg-[#0F1B2B] border-[#D4AF37]/30 text-white'
          : 'bg-white border-slate-200 text-slate-900'
          }`}>
          {/* Search input */}
          <div className={`p-2 border-b ${className.includes('dark-select') ? 'border-white/10' : 'border-slate-200'
            }`}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${className.includes('dark-select')
                ? 'bg-[rgba(255,255,255,0.05)] border-white/10 text-white focus:ring-[#D4AF37] placeholder:text-gray-500'
                : 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                }`}
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-4 py-3 text-left
                    transition-colors duration-150
                    ${option.value === value
                      ? (className.includes('dark-select') ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-medium' : 'bg-blue-100 text-blue-900 font-medium')
                      : (className.includes('dark-select') ? 'text-gray-300 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-blue-50')
                    }
                  `}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className={`px-4 py-8 text-center ${className.includes('dark-select') ? 'text-gray-500' : 'text-slate-500'}`}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
