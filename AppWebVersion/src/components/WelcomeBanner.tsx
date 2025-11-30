import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function WelcomeBanner() {
  const { user } = useAuth();
  // Serve from web public assets: place the image at AppWebVersion/public/assets/ecommerce-image.jpeg
  const shoppingImage = `${process.env.PUBLIC_URL || ''}/assets/ecommerce-image.jpeg`;
  
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
            className="relative overflow-hidden rounded-xl group"
            aria-label="Start shopping"
          >
            <div
              className="w-full h-64 sm:h-72 md:h-80 rounded-xl bg-cover bg-center"
              style={{
                backgroundImage: `url('${shoppingImage}')`,
                backgroundPosition: '50% 35%',
              }}
              role="img"
              aria-label="Shop Online"
            />
            <div className="absolute inset-0 rounded-xl bg-black/30 group-hover:bg-black/25 transition-colors" />
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-end">
              <div className="text-center">
                <div className="text-white text-xl font-semibold drop-shadow-sm">Shop Online</div>
                <div className="text-white/90 text-sm mt-1 drop-shadow-sm">
                  Buy and sell from trusted sellers
                </div>
                <div className="mt-3 inline-flex items-center px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Start Shopping
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
