import React from 'react';
import {
  Package,
  TrendingUp,
  Star,
  Clock,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuickActions() {
  const actions = [
    {
      icon: <Package className="w-10 h-10" />,
      label: 'My Orders',
      link: '/orders',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      label: 'Popular',
      link: '/products/popular',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: <Star className="w-10 h-10" />,
      label: 'All Products',
      link: '/products',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: <Clock className="w-10 h-10" />,
      label: 'New Arrivals',
      link: '/products/new',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: <Plus className="w-10 h-10" />,
      label: 'Sell Item',
      link: '/seller',
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <h3 className="mb-4 text-lg font-medium text-gray-800">
          Quick Access
        </h3>
        <div className="flex gap-8 overflow-x-auto">
          {actions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex-none flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className={`flex items-center justify-center w-16 h-16 mb-2 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <span className="text-xs text-center text-gray-700 font-medium">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
