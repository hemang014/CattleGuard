import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

interface LocationSearchBarProps {
  onSelectLocation: (lat: number, lon: number, name: string) => void;
  className?: string;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({ 
  onSelectLocation,
  className = '' 
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search using OpenStreetMap Nominatim
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Geocoding search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      onSelectLocation(lat, lon, item.display_name);
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={dropdownRef} className={`relative z-[600] ${className}`}>
      <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] overflow-hidden focus-within:ring-2 focus-within:ring-[#21865B] transition-all">
        <Search className="w-4 h-4 text-gray-400 ml-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search village, college, road, city..."
          className="w-48 sm:w-64 px-2.5 py-1.5 text-xs text-[#202B26] placeholder-gray-400 bg-transparent focus:outline-none"
        />
        {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#21865B] animate-spin mr-2 shrink-0" />}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="p-1 mr-1.5 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-[#E3E8E3] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in-50">
          <div className="p-1.5 space-y-0.5">
            {results.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-2 rounded-lg hover:bg-[#E8F4EC] transition-colors flex items-start gap-2 group"
              >
                <MapPin className="w-3.5 h-3.5 text-[#21865B] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-[#202B26] line-clamp-2 leading-tight">
                  {item.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
