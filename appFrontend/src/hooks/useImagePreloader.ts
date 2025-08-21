import { useMemo, useEffect } from 'react';
import imageCache from '../utils/imageCache';

export const useImagePreloader = () => {
  const preloadedImages = useMemo(() => ({
    taxi: require('../../assets/Taxi.png'),
    rental: require('../../assets/Rental.png'),
  }), []);

  useEffect(() => {
    // Preload all images into cache
    Object.entries(preloadedImages).forEach(([key, imageSource]) => {
      imageCache.preloadImage(key, imageSource);
    });
  }, [preloadedImages]);

  return {
    preloadedImages,
  };
};
