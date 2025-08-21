import imageCache from './imageCache';

// Preload all app images at startup
export const preloadAppImages = () => {
  const appImages = {
    taxi: require('../assets/Taxi.png'),
    rental: require('../assets/Rental.png'),
  };

  // Preload all images into cache
  Object.entries(appImages).forEach(([key, imageSource]) => {
    imageCache.preloadImage(key, imageSource);
  });

  console.log('App images preloaded successfully');
};

// Get preloaded image source
export const getPreloadedImage = (key: string) => {
  return imageCache.getImage(key);
};
