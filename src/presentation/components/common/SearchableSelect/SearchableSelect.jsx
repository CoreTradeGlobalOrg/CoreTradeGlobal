/**
 * Searchable Select Component
 *
 * Dropdown with search functionality
 * Used for Country and Category selection
 * Supports SVG flags for country selection (showFlags prop)
 * Supports color variants: dark-select (gold) and dark-select-blue (blue)
 */

'use client';

import { useState, useRef, useEffect } from 'react';

// Inline flag component to avoid circular dependency issues
function FlagImage({ countryCode, size = 20 }) {
  const [error, setError] = useState(false);

  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
    return null;
  }

  const code = countryCode.toLowerCase();

  if (error) {
    return null;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      className="inline-block object-cover rounded-sm flex-shrink-0"
      style={{ verticalAlign: 'middle' }}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  error = false,
  disabled = false,
  className = '',
  showFlags = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Determine color variant
  const isBlue = className.includes('dark-select-blue');
  const isDark = className.includes('dark-select');
  const accentColor = isBlue ? '#3b82f6' : '#FFD700';
  const accentColorRgba = isBlue ? 'rgba(59,130,246,' : 'rgba(255,215,0,';

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected option
  const selectedOption = options.find((opt) => opt.value === value);

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

  // Render option content (with or without flag)
  const renderOptionContent = (option, isSelected = false) => {
    if (showFlags) {
      return (
        <span className="flex items-center gap-2">
          <FlagImage countryCode={option.value} size={18} />
          <span>{option.label}</span>
        </span>
      );
    }
    return option.label;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full text-left flex items-center justify-between transition-all duration-200
          ${isDark
            ? `px-4 py-3 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-base hover:border-[rgba(255,255,255,0.2)] focus:border-[${accentColor}] focus:ring-4 focus:ring-[${accentColor}]/20`
            : 'px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900'}
          ${error ? 'border-red-500 focus:border-red-600' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none
        `}
        style={isDark ? {
          '--focus-color': accentColor,
        } : {}}
      >
        <span className={selectedOption ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-gray-500' : 'text-slate-400')}>
          {selectedOption ? renderOptionContent(selectedOption, true) : placeholder}
        </span>
        <svg
          className={`w-5 h-5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''
            } ${isDark ? 'text-gray-400' : 'text-slate-400'}`}
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
        <div className={`absolute z-50 w-full mt-2 rounded-lg shadow-xl max-h-80 overflow-hidden ${isDark
          ? 'bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] text-white'
          : 'bg-white border-2 border-slate-200 text-slate-900'
          }`}>
          {/* Search input */}
          <div className={`p-2 border-b ${isDark ? 'border-[rgba(255,255,255,0.1)]' : 'border-slate-200'
            }`}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none ${isDark
                ? 'bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-gray-500'
                : 'bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500'
                }`}
              style={isDark ? {
                '--tw-ring-color': `${accentColorRgba}0.2)`,
              } : {}}
              onFocus={(e) => {
                if (isDark) {
                  e.target.style.borderColor = accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${accentColorRgba}0.2)`;
                }
              }}
              onBlur={(e) => {
                if (isDark) {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }
              }}
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
                    w-full px-4 py-3 text-left text-[15px]
                    transition-colors duration-150
                    ${option.value === value
                      ? (isDark ? 'font-medium' : 'bg-blue-100 text-blue-900 font-medium')
                      : (isDark ? 'text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.05)] hover:text-white' : 'text-slate-700 hover:bg-blue-50')
                    }
                  `}
                  style={option.value === value && isDark ? {
                    backgroundColor: `${accentColorRgba}0.15)`,
                    color: accentColor,
                  } : {}}
                >
                  {renderOptionContent(option)}
                </button>
              ))
            ) : (
              <div className={`px-4 py-8 text-center ${isDark ? 'text-[#A0A0A0]' : 'text-slate-500'}`}>
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
