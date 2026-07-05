import React, { useEffect, useState } from 'react';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { SearchBar } from '../components/SearchBar';
import { QuickActions } from '../components/QuickActions';
import { ShopOnline } from '../components/ShopOnline';
import { PromotionsBanner } from '../components/PromotionsBanner';
import { ServicesSection } from '../components/ServicesSection';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { orderService } from '../api/orders';

export function Home() {
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    const loadPending = async () => {
      try {
        setLoadingPending(true);
        const res = await orderService.getMyOrders(1, 100);
        const count = (res.orders || []).filter((o) => {
          const status = (o.status || '').toString().toLowerCase();
          const payment = (o.paymentStatus || '').toString().toLowerCase();
          return status === 'authorized' && payment !== 'paid';
        }).length;
        setPendingPaymentCount(count);
      } catch {
        setPendingPaymentCount(0);
      } finally {
        setLoadingPending(false);
      }
    };
    loadPending();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SearchBar />
      <WelcomeBanner />
      <ServicesSection />
      <QuickActions />
      <ShopOnline />
      <PromotionsBanner />
      {/* Floating Shopping Cart Button */}
      <Link
        to="/shopping-cart"
        className="fixed right-6 bottom-20 sm:bottom-24 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center z-50"
        aria-label="Open Orders"
      >
        <ShoppingCart className="w-6 h-6" />
        {(loadingPending || pendingPaymentCount > 0) && (
          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-[10px] font-bold flex items-center justify-center">
            {loadingPending ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              pendingPaymentCount > 99 ? '99+' : pendingPaymentCount
            )}
          </span>
        )}
      </Link>
    </div>
  );
}
