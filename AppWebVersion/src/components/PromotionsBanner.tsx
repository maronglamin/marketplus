import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Gift,
  Bed,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AUTO_SLIDE_MS = 5500;
const RESUME_DELAY_MS = 10000;
const CARDS_PER_PAGE = 2;

type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: [string, string];
  accentColor: string;
  buttonText: string;
  link: string;
  icon: React.ReactNode;
};

const promotions: Promotion[] = [
  {
    id: 'flash-sale',
    title: 'Flash Sale',
    subtitle: 'Electronics Deals',
    description: 'Up to 30% off selected items',
    gradient: ['#EA580C', '#C2410C'],
    accentColor: '#EA580C',
    buttonText: 'Shop Now',
    link: '/products/popular',
    icon: <Zap className="w-20 h-20" />,
  },
  {
    id: 'stay-special',
    title: 'Stay Special',
    subtitle: 'Book Your Next Getaway',
    description: 'Hotels, apartments & leisure trips',
    gradient: ['#0D9488', '#115E59'],
    accentColor: '#0D9488',
    buttonText: 'Browse Stays',
    link: '/real-estate?section=stay',
    icon: <Bed className="w-20 h-20" />,
  },
  {
    id: 'home-services',
    title: 'Home Help',
    subtitle: 'Trusted Pros Nearby',
    description: 'Book trades, cleaning & coaching',
    gradient: ['#0284C7', '#0369A1'],
    accentColor: '#0284C7',
    buttonText: 'Find Pros',
    link: '/home-services',
    icon: <Wrench className="w-20 h-20" />,
  },
  {
    id: 'weekend-offers',
    title: 'Weekend Offers',
    subtitle: 'Festival Discounts',
    description: 'Special deals all weekend long',
    gradient: ['#4F46E5', '#4338CA'],
    accentColor: '#4F46E5',
    buttonText: 'View Deals',
    link: '/products',
    icon: <Gift className="w-20 h-20" />,
  },
];

const pageCount = Math.ceil(promotions.length / CARDS_PER_PAGE);

export function PromotionsBanner() {
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAutoSlide = useCallback(() => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  const goToPage = (next: number) => {
    setPage(((next % pageCount) + pageCount) % pageCount);
  };

  const nextPage = useCallback(() => {
    setPage((prev) => (prev + 1) % pageCount);
  }, []);

  const prevPage = () => {
    pauseAutoSlide();
    goToPage(page - 1);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      nextPage();
    }, AUTO_SLIDE_MS);
    return () => {
      clearInterval(timer);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [nextPage]);

  return (
    <div className="py-6 bg-white rounded-xl shadow-sm mb-4">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-medium text-gray-800">Special Offers</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPage}
              aria-label="Previous offers"
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => {
                pauseAutoSlide();
                nextPage();
              }}
              aria-label="Next offers"
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={pauseAutoSlide}
          onTouchStart={pauseAutoSlide}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: pageCount }).map((_, pageIndex) => {
              const pagePromos = promotions.slice(
                pageIndex * CARDS_PER_PAGE,
                pageIndex * CARDS_PER_PAGE + CARDS_PER_PAGE,
              );
              return (
                <div
                  key={`page-${pageIndex}`}
                  className="w-full shrink-0 grid grid-cols-2 gap-3"
                >
                  {pagePromos.map((promo) => (
                    <div
                      key={promo.id}
                      className="relative h-[168px] rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-sm"
                      style={{
                        background: `linear-gradient(145deg, ${promo.gradient[0]}, ${promo.gradient[1]})`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute -right-1 -top-1 text-white/10"
                        aria-hidden
                      >
                        {promo.icon}
                      </div>

                      <div className="relative z-10 pr-6">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase text-white mb-2">
                          {promo.title}
                        </span>
                        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                          {promo.subtitle}
                        </h4>
                        <p className="mt-1 text-xs sm:text-sm text-white/85 leading-snug line-clamp-2">
                          {promo.description}
                        </p>
                      </div>

                      <Link
                        to={promo.link}
                        onClick={pauseAutoSlide}
                        className="relative z-10 self-start inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors"
                        style={{ color: promo.accentColor }}
                      >
                        {promo.buttonText}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => {
                pauseAutoSlide();
                goToPage(index);
              }}
              aria-label={`Go to offers page ${index + 1}`}
              className={`h-2 rounded-full transition-all ${
                index === page ? 'w-5 bg-gray-700' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
