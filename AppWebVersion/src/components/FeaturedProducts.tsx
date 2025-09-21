import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FeaturedProducts() {
  const products = [
    {
      id: 1,
      name: 'Wireless Earbuds',
      price: '$49.99',
      rating: 4.5,
      image:
        'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      discount: '20% OFF',
    },
    {
      id: 2,
      name: 'Smartphone Case',
      price: '$19.99',
      rating: 4.2,
      image:
        'https://images.unsplash.com/photo-1541877944-ac82a091518a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 3,
      name: 'Smart Watch',
      price: '$129.99',
      rating: 4.7,
      image:
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      discount: '15% OFF',
    },
    {
      id: 4,
      name: 'Bluetooth Speaker',
      price: '$79.99',
      rating: 4.3,
      image:
        'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Featured Products</h3>
          <Link to="/products" className="text-sm text-blue-600 font-medium hover:text-blue-700">
            See All
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {product.discount && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                    {product.discount}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">{product.name}</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">
                    {product.price}
                  </span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm ml-1 text-gray-600">
                      {product.rating}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
