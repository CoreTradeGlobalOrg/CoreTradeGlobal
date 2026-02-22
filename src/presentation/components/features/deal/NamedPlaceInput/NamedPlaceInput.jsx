/**
 * NamedPlaceInput Component
 *
 * Autocomplete input for the deal named place field.
 * Label and placeholder change dynamically based on the selected Incoterm.
 * Searches UN/LOCODE dataset via /api/locode/search (server-side route).
 * Allows freeform text if no match is found.
 *
 * Props:
 *   value       {string}   - Current input value
 *   onChange    {Function} - Called with string value on change
 *   incoterm    {Object}   - Full Incoterm entry from INCOTERMS_2020 (has namedPlaceLabel, namedPlacePlaceholder)
 *   disabled    {boolean}  - Disables the input
 *   error       {boolean}  - Shows error state
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function NamedPlaceInput({
  value,
  onChange,
  incoterm,
  disabled = false,
  error = false,
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/locode/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setOpen(data.length > 0);
          setHighlighted(-1);
        }
      } catch {
        // Silently fall back to freeform text on API failure
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200),
    []
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // always update parent with typed text
    fetchSuggestions(val);
  };

  const handleSelect = (suggestion) => {
    const label = suggestion.label;
    setInputValue(label);
    onChange(label);
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) {
        handleSelect(suggestions[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const label = incoterm?.namedPlaceLabel || 'Named Place';
  const placeholder = incoterm?.namedPlacePlaceholder || 'Enter location';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          className={`
            w-full pl-9 pr-9 py-3 rounded-xl border text-white text-sm
            bg-[#0A1628] placeholder:text-[#4a5568]
            focus:outline-none focus:ring-2 transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[rgba(255,255,255,0.1)] focus:border-[#FFD700] focus:ring-[#FFD700]/20'
            }
          `}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] animate-spin"
            aria-hidden
          />
        )}
      </div>

      {/* Autocomplete dropdown */}
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="
            absolute z-50 left-0 right-0 top-full mt-1
            bg-[#0F1B2B] border border-[rgba(255,255,255,0.12)]
            rounded-xl shadow-2xl overflow-hidden
            max-h-60 overflow-y-auto
          "
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.code}
              type="button"
              role="option"
              aria-selected={index === highlighted}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlighted(index)}
              className={`
                w-full text-left px-4 py-2.5 text-sm transition-colors
                flex items-start gap-2
                ${
                  index === highlighted
                    ? 'bg-[rgba(255,215,0,0.1)] text-white'
                    : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.05)]'
                }
              `}
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#64748b]" />
              <span>
                <span className="text-white font-medium">{suggestion.name}</span>
                <span className="text-[#64748b]"> — {suggestion.country} {suggestion.location}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NamedPlaceInput;
