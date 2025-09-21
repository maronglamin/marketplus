import React, { useState, useEffect } from 'react';
import { Star, Eye, ShoppingCart, Plus, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  price: string;
  rating: number;
  image: string;
  discount?: string;
  views: number;
  orderCount: number;
  stock: number;
  condition: string;
  category: string;
}

export function ProductListing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock data - in a real app, this would come from an API
  const mockProducts: Product[] = [
    {
      id: 1,
      name: 'Wireless Earbuds Pro',
      price: '$49.99',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      discount: '20% OFF',
      views: 1234,
      orderCount: 89,
      stock: 15,
      condition: 'New',
      category: 'Electronics',
    },
    {
      id: 2,
      name: 'Smartphone Case',
      price: '$19.99',
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1541877944-ac82a091518a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      views: 567,
      orderCount: 45,
      stock: 8,
      condition: 'New',
      category: 'Accessories',
    },
    {
      id: 3,
      name: 'Smart Watch Series 7',
      price: '$129.99',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      discount: '15% OFF',
      views: 2341,
      orderCount: 156,
      stock: 3,
      condition: 'New',
      category: 'Electronics',
    },
    {
      id: 4,
      name: 'Bluetooth Speaker',
      price: '$79.99',
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      views: 890,
      orderCount: 67,
      stock: 12,
      condition: 'New',
      category: 'Electronics',
    },
    {
      id: 5,
      name: 'Laptop Stand',
      price: '$39.99',
      rating: 4.1,
      image: 'https://images.unsplash.com/photo-1527864550417-7f91c4f76c42?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      views: 445,
      orderCount: 23,
      stock: 20,
      condition: 'New',
      category: 'Accessories',
    },
    {
      id: 6,
      name: 'Gaming Mouse',
      price: '$59.99',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1527864550417-7f91c4f76c42?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      views: 1123,
      orderCount: 78,
      stock: 5,
      condition: 'New',
      category: 'Electronics',
    },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock > 10) return { text: 'In Stock', color: 'text-green-600' };
    if (stock > 0) return { text: `Only ${stock} left`, color: 'text-orange-600' };
    return { text: 'Out of Stock', color: 'text-red-600' };
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(product => product.category.toLowerCase() === filter.toLowerCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">All Products</h1>
        
        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          {['all', 'electronics', 'accessories', 'fashion', 'home'].map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                {product.discount && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                    {product.discount}
                  </span>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50">
                  <Heart className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                <div className="flex items-center mb-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                  <span className="text-sm text-gray-400 ml-1">({product.orderCount})</span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">{product.price}</span>
                  <span className={`text-sm font-medium ${getStockStatus(product.stock).color}`}>
                    {getStockStatus(product.stock).text}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    <span>{product.views}</span>
                  </div>
                  <div className="flex items-center">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    <span>{product.orderCount}</span>
                  </div>
                </div>
                
                <button className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </button>
              </div>
            </Link>
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
