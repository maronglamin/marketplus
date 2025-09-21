import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid, List } from 'lucide-react';
import { categoryService, Category } from '../api/products';
import { useAuth } from '../contexts/AuthContext';

export function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Function to map category names to icons (same as mobile app)
  const getCategoryIcon = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) {
      return '📱';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc')) {
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
    if (name.includes('food') || name.includes('restaurant') || name.includes('meal')) {
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
      setError(null);
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Categories</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadCategories}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                to="/home"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">All Categories</h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {categories.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Found</h3>
            <p className="text-gray-600">There are no categories available at the moment.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
              : 'space-y-4'
          }>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group ${
                  viewMode === 'list' ? 'flex items-center p-6' : 'p-6 text-center'
                }`}
              >
                {viewMode === 'grid' ? (
                  // Grid View
                  <>
                    <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                      <span className="text-3xl">{getCategoryIcon(category.name)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-100 transition-colors">
                      <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {category.name}
                      </h3>
                    </div>
                    <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                      →
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
