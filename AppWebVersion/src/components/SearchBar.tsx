import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const goToProductsSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const url = `/products?search=${encodeURIComponent(trimmed)}`;
    navigate(url);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToProductsSearch();
    }
  };

  return (
    <div className="py-4 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center px-4 py-3 bg-gray-100 rounded-full border border-blue-700 ring-2 ring-blue-700/30">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search for products, brands, or categories..."
            className="flex-1 ml-2 bg-transparent border-none outline-none text-gray-800"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="p-1 -mr-1"
            disabled={!query.trim()}
            onClick={() => {
              goToProductsSearch();
            }}
          >
            <ArrowRight className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
