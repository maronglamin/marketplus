import React, { useState } from 'react';
import {
  Package,
  TrendingUp,
  Star,
  Clock,
  Plus,
  Wrench,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function QuickActions() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>('Please log in to continue.');

  const actions = [
    {
      icon: <Wrench className="w-10 h-10" />,
      label: 'Home Services',
      link: '/home-services',
      color: 'bg-sky-100 text-sky-600',
    },
    {
      icon: <Building2 className="w-10 h-10" />,
      label: 'Properties',
      link: '/real-estate',
      color: 'bg-violet-100 text-violet-600',
    },
    {
      icon: <Package className="w-10 h-10" />,
      label: 'My Orders',
      link: '/orders',
      color: 'bg-green-100 text-green-600',
      requiresAuthPrompt: true,
      promptMessage: 'Please log in to view your orders.',
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
      requiresAuthPrompt: true,
      promptMessage: 'Please log in to post an item for sale.',
    },
  ];

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <h3 className="mb-4 text-lg font-medium text-gray-800">
          Quick Access
        </h3>
        <div className="flex gap-8 overflow-x-auto">
          {actions.map((action, index) => {
            const isAuthRequired = (action as any).requiresAuthPrompt === true;
            const onClick = (e: React.MouseEvent) => {
              if (isAuthRequired && !isAuthenticated) {
                e.preventDefault();
                setLoginPromptMessage((action as any).promptMessage || 'Please log in to continue.');
                setShowLoginModal(true);
                return;
              }
              navigate(action.link);
            };

            return (
              <button
                key={index}
                onClick={onClick}
                className="flex-none flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`flex items-center justify-center w-16 h-16 mb-2 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-xs text-center text-gray-700 font-medium">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLoginModal(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h4>
            <p className="text-sm text-gray-600 mb-6">
              {loginPromptMessage}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  navigate('/login');
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
