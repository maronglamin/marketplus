import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function WelcomeBanner() {
  const { user } = useAuth();
  
  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <h2 className="mb-2 text-2xl font-medium text-gray-800">
          Hello, {user?.firstName || 'User'} 👋
        </h2>
        <p className="mb-6 text-gray-500">What are you shopping for today?</p>
        <div className="flex flex-col">
          <Link 
            to="/products"
            className="flex flex-col items-center justify-center p-6 bg-blue-50 text-blue-900 rounded-xl shadow-sm hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <ShoppingBag className="w-10 h-10 mb-3 text-blue-600" />
            <span className="text-lg font-medium">Shop Online</span>
            <span className="text-sm text-blue-700 mt-2 text-center">
              Discover thousands of products from trusted sellers
            </span>
            <div className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors">
              Start Shopping
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
