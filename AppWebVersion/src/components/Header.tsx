import React from 'react';
import { Bell, User, LogOut, Package, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white shadow-sm">
      <div className="flex items-center">
        <Link to="/home" className="flex items-center">
          <img
            src="/assets/icon.png"
            alt="SNAP"
            className="w-8 h-8 rounded-md mr-2"
          />
          <span className="text-xl font-bold text-blue-600">SNAP</span>
        </Link>
      </div>
      <div className="flex items-center space-x-3">
        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/orders"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Package className="w-4 h-4 mr-2" />
            Orders
          </Link>
          <Link
            to="/products"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Products
          </Link>
        </div>

        {/* <div className="relative">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-orange-500 rounded-full">
            2
          </span>
        </div> */}
        
        {/* User info */}
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.phoneNumber}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
