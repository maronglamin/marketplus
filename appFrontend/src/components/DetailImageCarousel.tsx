import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AUTO_PLAY_MS = 4000;

interface DetailImageCarouselProps {
  images: string[];
  height?: number;
  accentColor?: string;
}

export function DetailImageCarousel({
  images,
  height = 260,
  accentColor = '#FFFFFF',
}: DetailImageCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracting = useRef(false);

  const clearAutoPlay = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    clearAutoPlay();
    if (images.length <= 1 || userInteracting.current) return;
    autoTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % images.length;
        scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, AUTO_PLAY_MS);
  }, [clearAutoPlay, images.length]);

  useEffect(() => {
    startAutoPlay();
    return clearAutoPlay;
  }, [startAutoPlay, clearAutoPlay]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeIndex && slide >= 0 && slide < images.length) {
      setActiveIndex(slide);
    }
  };

  const goToIndex = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    startAutoPlay();
  };

  if (images.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onTouchStart={() => {
          userInteracting.current = true;
          clearAutoPlay();
        }}
        onTouchEnd={() => {
          userInteracting.current = false;
          startAutoPlay();
        }}
        onMomentumScrollEnd={onScroll}
      >
        {images.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={[styles.image, { width: SCREEN_WIDTH, height }]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.dots} pointerEvents="box-none">
          {images.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => goToIndex(index)}
              hitSlop={8}
              style={[
                styles.dot,
                index === activeIndex && [styles.dotActive, { backgroundColor: accentColor }],
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', backgroundColor: '#F3F4F6' },
  image: { backgroundColor: '#F3F4F6' },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
