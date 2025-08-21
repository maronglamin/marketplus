import { Image } from 'react-native';

class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, any> = new Map();
  private preloadedImages: Set<string> = new Set();

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  preloadImage(key: string, imageSource: any): void {
    if (this.preloadedImages.has(key)) {
      return;
    }

    this.cache.set(key, imageSource);
    this.preloadedImages.add(key);

    // Force image to be loaded into memory
    if (typeof imageSource === 'number') {
      Image.resolveAssetSource(imageSource);
    }
  }

  getImage(key: string): any {
    return this.cache.get(key);
  }

  isPreloaded(key: string): boolean {
    return this.preloadedImages.has(key);
  }

  clearCache(): void {
    this.cache.clear();
    this.preloadedImages.clear();
  }
}

export default ImageCache.getInstance();
