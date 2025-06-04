import React, { useState } from 'react'
import { Button } from '../../components/Button'
import {
  EditIcon,
  HeartIcon,
  PackageIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react'

interface UserProfileProps {
  onBack: () => void
}

export function UserProfile({ onBack }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState('profile')

  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80',
    joinDate: 'January 2024',
    interests: 12,
    reviews: 8,
    orders: 5,
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="w-5 h-5" /> },
    {
      id: 'interests',
      label: 'Interests',
      icon: <HeartIcon className="w-5 h-5" />,
    },
    { id: 'orders', label: 'Orders', icon: <PackageIcon className="w-5 h-5" /> },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: <StarIcon className="w-5 h-5" />,
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {user.name}
                  </h2>
                  <p className="text-gray-500">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    Member since {user.joinDate}
                  </p>
                </div>
              </div>
              <Button
                label="Edit Profile"
                icon={<EditIcon className="w-5 h-5" />}
                variant="outline"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <HeartIcon className="w-5 h-5 text-red-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {user.interests}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">Interests</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <PackageIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {user.orders}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">Orders</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {user.reviews}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">Reviews</p>
              </div>
            </div>
          </div>
        )
      case 'interests':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Interested Products
              </h3>
              <Button
                label="View All"
                variant="outline"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Sample interested products */}
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <img
                    src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80`}
                    alt="Product"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <h4 className="mt-2 font-medium text-gray-900">
                    Wireless Headphones
                  </h4>
                  <p className="text-sm text-gray-500">$59.99</p>
                </div>
              ))}
            </div>
          </div>
        )
      case 'orders':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
              <Button
                label="View All"
                variant="outline"
              />
            </div>
            <div className="space-y-4">
              {/* Sample orders */}
              {[1, 2, 3].map((order) => (
                <div
                  key={order}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Order #{order}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Placed on March {order}, 2024
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      Delivered
                    </span>
                  </div>
                  <div className="mt-4 flex items-center">
                    <img
                      src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80`}
                      alt="Product"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="ml-4">
                      <h5 className="font-medium text-gray-900">
                        Wireless Headphones
                      </h5>
                      <p className="text-sm text-gray-500">$59.99</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      case 'reviews':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">My Reviews</h3>
              <Button
                label="View All"
                variant="outline"
              />
            </div>
            <div className="space-y-4">
              {/* Sample reviews */}
              {[1, 2, 3].map((review) => (
                <div
                  key={review}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="flex items-center">
                    <img
                      src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80`}
                      alt="Product"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">
                        Wireless Headphones
                      </h4>
                      <div className="flex items-center mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`w-4 h-4 ${
                              star <= 4
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-600">
                    Great product! The sound quality is amazing and the battery
                    life is impressive.
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Reviewed on March {review}, 2024
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
} 