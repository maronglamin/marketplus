import React from 'react';
import { Search, Mic } from 'lucide-react';

export function SearchBar() {
  return (
    <div className="py-4 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center px-4 py-3 bg-gray-100 rounded-full">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search for products, brands, or categories..."
            className="flex-1 ml-2 bg-transparent border-none outline-none text-gray-800"
          />
          <Mic className="w-5 h-5 text-blue-500" />
        </div>
      </div>
    </div>
  );
}
