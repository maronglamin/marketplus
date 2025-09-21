import React from 'react';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { SearchBar } from '../components/SearchBar';
import { QuickActions } from '../components/QuickActions';
import { ProductCategories } from '../components/ProductCategories';
import { PopularProducts } from '../components/PopularProducts';
import { NewArrivals } from '../components/NewArrivals';
import { PromotionsBanner } from '../components/PromotionsBanner';
import { RecentActivity } from '../components/RecentActivity';

export function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <WelcomeBanner />
      <SearchBar />
      <QuickActions />
      <ProductCategories />
      <PopularProducts />
      <NewArrivals />
      <PromotionsBanner />
      <RecentActivity />
    </div>
  );
}
