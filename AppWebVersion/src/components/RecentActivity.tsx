import React from 'react';
import { Activity, ShoppingBag, Tag, Heart, Star, TrendingUp, Users, MapPin } from 'lucide-react';

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      icon: <ShoppingBag className="w-4 h-4 text-blue-500" />,
      message: 'Fatou sold an iPhone 15 Pro in your area',
      time: '5 mins ago',
      type: 'sale',
      location: 'Banjul, Gambia',
      price: '$1,199',
    },
    {
      id: 2,
      icon: <Tag className="w-4 h-4 text-green-500" />,
      message: 'New 30% discount on electronics near you',
      time: '15 mins ago',
      type: 'discount',
      location: 'Serrekunda, Gambia',
      discount: '30% OFF',
    },
    {
      id: 3,
      icon: <Heart className="w-4 h-4 text-red-500" />,
      message: 'Modou liked your Samsung Galaxy listing',
      time: '1 hour ago',
      type: 'like',
      location: 'Bakau, Gambia',
    },
    {
      id: 4,
      icon: <Star className="w-4 h-4 text-yellow-500" />,
      message: 'You received a 5-star rating for your MacBook sale',
      time: '2 hours ago',
      type: 'rating',
      location: 'Fajara, Gambia',
      rating: '5.0',
    },
    {
      id: 5,
      icon: <TrendingUp className="w-4 h-4 text-purple-500" />,
      message: 'Electronics trending in your area - 15 new listings',
      time: '3 hours ago',
      type: 'trending',
      location: 'Banjul, Gambia',
      count: '15',
    },
    {
      id: 6,
      icon: <Users className="w-4 h-4 text-indigo-500" />,
      message: 'New seller joined near you - check out their items',
      time: '5 hours ago',
      type: 'new_seller',
      location: 'Kotu, Gambia',
    },
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-blue-50 border-blue-200';
      case 'discount':
        return 'bg-green-50 border-green-200';
      case 'like':
        return 'bg-red-50 border-red-200';
      case 'rating':
        return 'bg-yellow-50 border-yellow-200';
      case 'trending':
        return 'bg-purple-50 border-purple-200';
      case 'new_seller':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Activity className="w-6 h-6 mr-3 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-800">Live Activity</h3>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live
          </div>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border flex items-start hover:shadow-sm transition-all duration-200 ${getActivityColor(activity.type)}`}
            >
              <div className="mr-3 mt-1 flex-shrink-0">{activity.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium leading-relaxed">
                  {activity.message}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="w-3 h-3 mr-1" />
                    {activity.location}
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
                {(activity.price || activity.discount || activity.rating || activity.count) && (
                  <div className="mt-2">
                    {activity.price && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {activity.price}
                      </span>
                    )}
                    {activity.discount && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium ml-2">
                        {activity.discount}
                      </span>
                    )}
                    {activity.rating && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium ml-2">
                        ⭐ {activity.rating}
                      </span>
                    )}
                    {activity.count && (
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium ml-2">
                        {activity.count} items
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
