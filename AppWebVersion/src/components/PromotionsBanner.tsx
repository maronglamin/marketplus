import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Percent,
  Gift,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function PromotionsBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const promotions = [
    {
      id: 1,
      title: 'Flash Sale',
      subtitle: 'Electronics Sale!',
      description: 'Up to 30% off selected items',
      gradient: ['#3B82F6', '#1D4ED8'],
      buttonText: 'Shop Now',
      link: '/products?filter=flash-sale',
      icon: <Percent className="w-6 h-6" />,
      timeLeft: '2h 15m left',
    },
    {
      id: 2,
      title: 'Weekend Special',
      subtitle: 'Fashion Discount',
      description: 'Buy one, get one 50% off',
      gradient: ['#F97316', '#EA580C'],
      buttonText: 'Shop Now',
      link: '/products?filter=fashion-sale',
      icon: <Gift className="w-6 h-6" />,
      timeLeft: '1d 8h left',
    },
    {
      id: 3,
      title: 'Holiday Special',
      subtitle: 'Festival Discounts',
      description: 'Special offers all weekend',
      gradient: ['#8B5CF6', '#7C3AED'],
      buttonText: 'View Deals',
      link: '/products?filter=holiday-sale',
      icon: <Clock className="w-6 h-6" />,
      timeLeft: '3d 12h left',
    },
    {
      id: 4,
      title: 'New User',
      subtitle: 'Welcome Bonus',
      description: 'Get 20% off your first order',
      gradient: ['#10B981', '#059669'],
      buttonText: 'Claim Now',
      link: '/products?filter=new-user',
      icon: <Gift className="w-6 h-6" />,
      timeLeft: 'Always available',
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promotions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Special Offers</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={prevSlide}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={nextSlide}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Main Promotion Card */}
        <div className="relative mb-4">
          <div className="overflow-hidden rounded-xl">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="w-full flex-shrink-0 h-40 rounded-xl p-6 flex flex-col justify-between"
                  style={{
                    background: `linear-gradient(135deg, ${promo.gradient[0]}, ${promo.gradient[1]})`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-white">
                      <div className="flex items-center mb-2">
                        {promo.icon}
                        <span className="text-sm font-medium ml-2">{promo.title}</span>
                      </div>
                      <h4 className="text-xl font-bold mb-1">{promo.subtitle}</h4>
                      <p className="text-sm opacity-90 mb-2">{promo.description}</p>
                      <div className="flex items-center text-xs opacity-75">
                        <Clock className="w-3 h-3 mr-1" />
                        {promo.timeLeft}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <span className="text-2xl font-bold text-white">30%</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={promo.link}
                    className="self-start px-4 py-2 text-sm font-medium bg-white text-gray-800 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    {promo.buttonText}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center space-x-2 mb-6">
          {promotions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg border border-gray-100">
          <ShieldCheck className="w-5 h-5 mr-3 text-blue-600" />
          <span className="text-sm text-gray-600 font-medium">
            Secure Payments & Verified Sellers
          </span>
        </div>
      </div>
    </div>
  );
}
