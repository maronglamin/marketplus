import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Smartphone,
  Laptop,
  Shirt,
  Home,
  Car,
  Book,
  Utensils,
  Dumbbell,
  Gem,
  Dog,
  Leaf,
  Music,
  Palette,
  Wrench,
  Gamepad2,
  Briefcase,
  Heart,
  Sofa,
  Package,
} from 'lucide-react';
import { categoryService, type Category } from '../api/products';

export function ShopOnline() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    const iconClass = 'w-6 h-6 text-blue-700';
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone')) return <Smartphone className={iconClass} aria-hidden="true" />;
    if (name.includes('laptop') || name.includes('computer') || name.includes('pc') || name.includes('electronics')) return <Laptop className={iconClass} aria-hidden="true" />;
    if (name.includes('clothing') || name.includes('fashion') || name.includes('shirt') || name.includes('dress')) return <Shirt className={iconClass} aria-hidden="true" />;
    if (name.includes('home') || name.includes('house')) return <Home className={iconClass} aria-hidden="true" />;
    if (name.includes('furniture') || name.includes('sofa')) return <Sofa className={iconClass} aria-hidden="true" />;
    if (name.includes('car') || name.includes('vehicle') || name.includes('automotive')) return <Car className={iconClass} aria-hidden="true" />;
    if (name.includes('book') || name.includes('education') || name.includes('study')) return <Book className={iconClass} aria-hidden="true" />;
    if (name.includes('food') || name.includes('restaurant') || name.includes('meal') || name.includes('kitchen')) return <Utensils className={iconClass} aria-hidden="true" />;
    if (name.includes('sport') || name.includes('fitness') || name.includes('gym')) return <Dumbbell className={iconClass} aria-hidden="true" />;
    if (name.includes('beauty') || name.includes('cosmetic') || name.includes('makeup')) return <Sparkles className={iconClass} aria-hidden="true" />;
    if (name.includes('baby') || name.includes('child') || name.includes('toy')) return <Package className={iconClass} aria-hidden="true" />;
    if (name.includes('pet') || name.includes('animal') || name.includes('dog') || name.includes('cat')) return <Dog className={iconClass} aria-hidden="true" />;
    if (name.includes('garden') || name.includes('plant') || name.includes('flower')) return <Leaf className={iconClass} aria-hidden="true" />;
    if (name.includes('music') || name.includes('instrument') || name.includes('audio')) return <Music className={iconClass} aria-hidden="true" />;
    if (name.includes('art') || name.includes('craft') || name.includes('creative')) return <Palette className={iconClass} aria-hidden="true" />;
    if (name.includes('jewelry') || name.includes('watch') || name.includes('accessory')) return <Gem className={iconClass} aria-hidden="true" />;
    if (name.includes('tool') || name.includes('hardware') || name.includes('diy')) return <Wrench className={iconClass} aria-hidden="true" />;
    if (name.includes('game') || name.includes('entertainment')) return <Gamepad2 className={iconClass} aria-hidden="true" />;
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) return <Heart className={iconClass} aria-hidden="true" />;
    if (name.includes('office') || name.includes('business') || name.includes('work')) return <Briefcase className={iconClass} aria-hidden="true" />;
    return <Package className={iconClass} aria-hidden="true" />;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await categoryService.getCategories();
        setCategories(data.slice(0, 16));
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center">
              <ShoppingBag className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Shop Online</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Browse curated picks and the latest arrivals</p>
          </div>
          <Link
            to="/products"
            className="hidden sm:inline-flex items-center text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            View all products
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            to="/products/popular"
            className="relative min-h-[160px] rounded-2xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500" />
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                 style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 2px, transparent 2px), radial-gradient(circle at 80% 30%, white 2px, transparent 2px), radial-gradient(circle at 40% 80%, white 2px, transparent 2px)' }} />
            <div className="relative z-10 h-full p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-white/90">🔥 POPULAR</div>
                <div className="text-white font-semibold text-xl mt-1">Trending Products</div>
              </div>
              <div className="inline-flex items-center self-start bg-white/90 text-blue-700 font-medium rounded-lg px-3 py-2 group-hover:bg-white transition-colors">
                Explore
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>

          <Link
            to="/products/new"
            className="relative min-h-[160px] rounded-2xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500" />
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                 style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 2px, transparent 2px), radial-gradient(circle at 70% 40%, white 2px, transparent 2px), radial-gradient(circle at 60% 90%, white 2px, transparent 2px)' }} />
            <div className="relative z-10 h-full p-5 flex flex-col justify-between">
              <div className="flex items-center text-white/90 text-xs font-bold">
                <Sparkles className="w-4 h-4 mr-1" />
                NEW ARRIVALS
              </div>
              <div>
                <div className="text-white font-semibold text-xl">Just Added</div>
                <div className="inline-flex items-center mt-2 bg-white/90 text-indigo-700 font-medium rounded-lg px-3 py-2 group-hover:bg-white transition-colors">
                  See what's new
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h4 className="text-sm font-semibold text-gray-800">Shop by Category</h4>
          <Link to="/categories" className="text-sm text-blue-600 font-medium hover:text-blue-700 inline-flex items-center">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({ length: 16 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse mb-2" />
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-gray-500">No categories available</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center"
                title={category.name}
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors flex items-center justify-center shadow-sm">
                  {getCategoryIcon(category.name)}
                </div>
                <div className="text-xs text-gray-800 font-medium mt-2 text-center line-clamp-2 group-hover:text-blue-700 transition-colors">
                  {category.name}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 p-5 bg-gradient-to-r from-blue-50 to-blue-25 border border-blue-100 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                <PlusCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900">Have something to sell?</div>
                <div className="text-sm text-gray-600">Reach thousands of buyers instantly</div>
              </div>
            </div>
            <Link
              to="/seller"
              className="w-full sm:w-auto py-2.5 px-4 inline-flex items-center justify-center bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Post an Item for Sale
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


