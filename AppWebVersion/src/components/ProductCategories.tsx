import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Shirt,
  Home,
  Zap,
  Laptop,
  Headphones,
  Sofa,
  Utensils,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryService, Category } from '../api/products';

export function ProductCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to map category names to emoji icons (same as Categories page)
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) {
      return '📱';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc') || name.includes('electronics')) {
      return '💻';
    }
    if (name.includes('clothing') || name.includes('fashion') || name.includes('shirt') || name.includes('dress')) {
      return '👕';
    }
    if (name.includes('home') || name.includes('furniture') || name.includes('house')) {
      return '🏠';
    }
    if (name.includes('car') || name.includes('vehicle') || name.includes('automotive')) {
      return '🚗';
    }
    if (name.includes('book') || name.includes('education') || name.includes('study')) {
      return '📚';
    }
    if (name.includes('food') || name.includes('restaurant') || name.includes('meal') || name.includes('kitchen')) {
      return '🍽️';
    }
    if (name.includes('sport') || name.includes('fitness') || name.includes('gym')) {
      return '🏃';
    }
    if (name.includes('beauty') || name.includes('cosmetic') || name.includes('makeup')) {
      return '💄';
    }
    if (name.includes('baby') || name.includes('child') || name.includes('toy')) {
      return '👶';
    }
    if (name.includes('pet') || name.includes('animal') || name.includes('dog') || name.includes('cat')) {
      return '🐾';
    }
    if (name.includes('garden') || name.includes('plant') || name.includes('flower')) {
      return '🌱';
    }
    if (name.includes('music') || name.includes('instrument') || name.includes('audio')) {
      return '🎵';
    }
    if (name.includes('art') || name.includes('craft') || name.includes('creative')) {
      return '🎨';
    }
    if (name.includes('jewelry') || name.includes('watch') || name.includes('accessory')) {
      return '💎';
    }
    if (name.includes('tool') || name.includes('hardware') || name.includes('diy')) {
      return '🔧';
    }
    if (name.includes('game') || name.includes('entertainment') || name.includes('toy')) {
      return '🎮';
    }
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) {
      return '🏥';
    }
    if (name.includes('office') || name.includes('business') || name.includes('work')) {
      return '💼';
    }
    
    // Default icon for unknown categories
    return '📦';
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await categoryService.getCategories();
      // Show only first 8 categories on home page
      setCategories(categoriesData.slice(0, 8));
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to static categories if API fails
      setCategories([
        { id: '1', name: 'Electronics', slug: 'electronics' },
        { id: '2', name: 'Fashion', slug: 'fashion' },
        { id: '3', name: 'Home', slug: 'home' },
        { id: '4', name: 'Sports', slug: 'sports' },
        { id: '5', name: 'Books', slug: 'books' },
        { id: '6', name: 'Toys', slug: 'toys' },
        { id: '7', name: 'Beauty', slug: 'beauty' },
        { id: '8', name: 'Automotive', slug: 'automotive' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <h3 className="text-xl font-semibold text-gray-800">Shop by Category</h3>
            <span className="ml-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-medium">
              Popular
            </span>
          </div>
          <Link to="/categories" className="text-sm text-blue-600 font-medium hover:text-blue-700">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-20 h-20 mb-3 bg-gray-200 rounded-2xl animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))
          ) : (
            categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className="flex flex-col items-center hover:opacity-80 transition-opacity group"
              >
                <div className="flex items-center justify-center w-20 h-20 mb-3 bg-gray-50 rounded-2xl group-hover:bg-blue-50 group-hover:scale-105 transition-all duration-200 shadow-sm">
                  <div className="text-4xl group-hover:scale-110 transition-transform duration-200">{getCategoryIcon(category.name)}</div>
                </div>
                <span className="text-sm text-center text-gray-800 font-semibold leading-tight">{category.name}</span>
              </Link>
            ))
          )}
        </div>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-center mb-3">
            <PlusCircle className="w-6 h-6 mr-3 text-blue-500" />
            <span className="text-base font-medium text-gray-800">Have something to sell?</span>
          </div>
          <Link
            to="/seller"
            className="w-full py-3 flex items-center justify-center bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            Post an Item for Sale
          </Link>
        </div>
      </div>
    </div>
  );
}
