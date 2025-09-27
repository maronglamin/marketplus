import React from 'react';
import {
  Home,
  ShoppingBag,
  Flame,
  Clock,
  User,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function BottomNavigation() {
  const location = useLocation();

  const tabs = [
    {
      icon: <Home className="w-6 h-6" />,
      label: 'Home',
      path: '/',
    },
    {
      icon: <Flame className="w-6 h-6" />,
      label: 'Popular',
      path: '/products/popular',
    },
    {
      icon: <ShoppingBag className="w-6 h-6" />,
      label: 'Shop',
      path: '/products',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: 'New Arrivals',
      path: '/products/new',
    },
    {
      icon: <User className="w-6 h-6" />,
      label: 'Seller',
      path: '/seller',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center bg-white border-t border-gray-200 px-2 py-1 z-10">
      {tabs.map((tab, index) => (
        <Link
          key={index}
          to={tab.path}
          className={`flex flex-col items-center justify-center py-2 flex-1 hover:bg-gray-50 rounded transition-colors ${
            isActive(tab.path) ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          {tab.icon}
          <span className="text-xs mt-1">{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
