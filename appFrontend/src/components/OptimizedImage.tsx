import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import imageCache from '../utils/imageCache';

interface OptimizedImageProps {
  source: any;
  style: any;
  size?: number;
  showLoader?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  source, 
  style, 
  size = 56,
  showLoader = false 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if image is already cached
    const imageKey = typeof source === 'number' ? source.toString() : source.uri;
    if (imageCache.isPreloaded(imageKey)) {
      setIsLoaded(true);
      setIsLoading(false);
    }
  }, [source]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      {isLoading && showLoader && (
        <ActivityIndicator 
          size="small" 
          color="#6B7280" 
          style={{ position: 'absolute', zIndex: 1 }}
        />
      )}
      <Image
        source={source}
        style={[
          style,
          { opacity: isLoaded ? 1 : 0 }
        ]}
        fadeDuration={0}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        resizeMode="contain"
      />
    </View>
  );
};

export default OptimizedImage;
