import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { gsap } from '../../lib/gsap';

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search by name, phone...',
  debounceMs = 300,
  className = '',
}) {
  const [innerValue, setInnerValue] = useState(value);
  const clearBtnRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange) {
        onChange(innerValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [innerValue, debounceMs]);

  // Pop the clear (X) button in the moment it appears, instead of a hard cut.
  useEffect(() => {
    if (innerValue && clearBtnRef.current) {
      gsap.fromTo(
        clearBtnRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }
      );
    }
  }, [Boolean(innerValue)]);

  const handleClear = () => {
    setInnerValue('');
    if (onChange) onChange('');
    if (wrapperRef.current) {
      // A quick, reassuring "cleared" nudge on the whole field.
      gsap.fromTo(wrapperRef.current, { x: -3 }, { x: 0, duration: 0.25, ease: 'elastic.out(1, 0.5)' });
    }
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
        <Search className="h-4 w-4 shrink-0" />
      </div>
      <input
        type="text"
        inputMode="search"
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        placeholder={placeholder}
        className="block w-full min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-800/80 py-2.5 pl-10 pr-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-sm transition-smooth focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30"
      />
      {innerValue && (
        <button
          ref={clearBtnRef}
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4 shrink-0" />
        </button>
      )}
    </div>
  );
}
