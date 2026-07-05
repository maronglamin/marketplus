import React, { useEffect, useState } from 'react';

const AUTO_PLAY_MS = 4000;

interface DetailImageCarouselProps {
  images: string[];
  height?: number | string;
  alt?: string;
  className?: string;
}

export function DetailImageCarousel({
  images,
  height,
  alt = 'Gallery image',
  className = '',
}: DetailImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  useEffect(() => {
    if (images.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [images.length, paused]);

  if (images.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={height != null ? { height } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images.map((src, index) => (
        <img
          key={`${src}-${index}`}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to image ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-2.5 h-2.5 bg-white shadow-sm'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
