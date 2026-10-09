'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react';
import { BannerSlide } from '@/lib/banners';

const AUTOPLAY_INTERVAL = 5000;

interface HeroBannerCarouselProps {
  slides?: BannerSlide[];
  onSelectPersona?: (persona: 'rider' | 'restaurant' | 'customer') => void;
}

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({
  slides = [],
  onSelectPersona,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalSlides = slides.length;

  const goToSlide = useCallback((newIndex: number, newDirection = 1) => {
    setDirection(newDirection);
    setCurrentIndex(newIndex);
    setProgressKey((prev) => prev + 1);
  }, []);

  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;
    goToSlide((currentIndex + 1) % totalSlides, 1);
  }, [currentIndex, totalSlides, goToSlide]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    goToSlide((currentIndex - 1 + totalSlides) % totalSlides, -1);
  }, [currentIndex, totalSlides, goToSlide]);

  // Autoplay
  useEffect(() => {
    if (totalSlides <= 1 || shouldReduceMotion || isPaused) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
      return;
    }
    autoplayTimerRef.current = setInterval(handleNext, AUTOPLAY_INTERVAL);
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [totalSlides, shouldReduceMotion, isPaused, handleNext]);

  // Pause when tab hidden
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
        setProgressKey((p) => p + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
  };

  const handleCtaClick = (persona?: 'rider' | 'restaurant' | 'customer') => {
    if (persona && onSelectPersona) onSelectPersona(persona);
    document.getElementById('partner')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (totalSlides === 0) return null;

  const activeSlide = slides[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? '100%' : '-100%',
      opacity: shouldReduceMotion ? 1 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1] as const },
    },
    exit: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir > 0 ? '-100%' : '100%',
      opacity: shouldReduceMotion ? 1 : 0,
      transition: { duration: shouldReduceMotion ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1] as const },
    }),
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="SpeedyMeals Promotions"
      aria-live={isPaused ? 'polite' : 'off'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="relative w-full outline-hidden select-none"
    >
      {/*
        Unified 2.8:1 aspect ratio box — no max-w, no padding, no bg-gray.
        The blurred backdrop fills the box when art is narrower than 2.8:1.
        The sharp foreground is always fully visible (object-contain).
      */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.8 / 1' }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeSlide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={totalSlides > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) handleNext();
              else if (info.offset.x > 60) handlePrev();
            }}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          >
            {activeSlide.href ? (
              <a href={activeSlide.href} className="block w-full h-full" tabIndex={-1}>
                <SlideArt slide={activeSlide} isFirst={currentIndex === 0} />
              </a>
            ) : (
              <SlideArt slide={activeSlide} isFirst={currentIndex === 0} />
            )}

            {/* Optional overlay — rendered ONLY when slide defines overlay in banners.json */}
            {activeSlide.overlay && (
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 pointer-events-none z-10">
                <div className="inline-block p-4 sm:p-6 bg-gradient-to-r from-black/85 via-black/60 to-transparent pointer-events-auto">
                  <h2 className="font-heading font-extrabold text-white text-lg sm:text-2xl md:text-3xl lg:text-4xl uppercase tracking-tight leading-tight mb-2">
                    {activeSlide.overlay.headline}
                  </h2>
                  {activeSlide.overlay.subline && (
                    <p className="font-sans font-medium text-white/90 text-xs sm:text-sm md:text-base leading-snug mb-3">
                      {activeSlide.overlay.subline}
                    </p>
                  )}
                  {activeSlide.overlay.ctaLabel && (
                    <button
                      type="button"
                      onClick={() => handleCtaClick(activeSlide.overlay?.persona)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-red hover:bg-[#C92F24] text-white font-sans text-xs sm:text-sm font-bold uppercase tracking-wider rounded-none shadow-md transition-colors cursor-pointer"
                    >
                      <span>{activeSlide.overlay.ctaLabel}</span>
                      <ArrowRight size={14} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next arrows (desktop only) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-none items-center justify-center transition-colors cursor-pointer shadow-md"
            >
              <CaretLeft size={22} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-none items-center justify-center transition-colors cursor-pointer shadow-md"
            >
              <CaretRight size={22} weight="bold" />
            </button>

            {/* Progress dots inside banner */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((slide, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goToSlide(index, index > currentIndex ? 1 : -1)}
                    aria-label={`Go to slide ${index + 1}`}
                    className="relative h-1.5 w-7 sm:w-10 bg-white/40 hover:bg-white/60 overflow-hidden rounded-none cursor-pointer transition-colors"
                  >
                    {isActive && (
                      <div
                        key={`prog-${progressKey}`}
                        className="absolute inset-y-0 left-0 bg-red"
                        style={{
                          width: '100%',
                          animation: shouldReduceMotion
                            ? 'none'
                            : `carousel-progress ${AUTOPLAY_INTERVAL}ms linear forwards`,
                          animationPlayState: isPaused ? 'paused' : 'running',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Dual-layer slide art:
 * - Backdrop: blurred, scale-125, object-cover — fills any letterbox gap with colour
 * - Foreground: object-contain, always fully visible, centred
 */
const SlideArt: React.FC<{ slide: BannerSlide; isFirst: boolean }> = ({ slide, isFirst }) => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Backdrop: low-quality, blurred colour fill — hides letterbox bars */}
      <Image
        src={slide.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="10vw"
        quality={20}
        loading={isFirst ? 'eager' : 'lazy'}
        className="object-cover scale-125 blur-2xl saturate-125 brightness-75 pointer-events-none select-none"
      />
      {/* Foreground: full-quality, never cropped */}
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        priority={isFirst}
        {...(isFirst ? { fetchPriority: 'high' as const } : {})}
        loading={isFirst ? 'eager' : 'lazy'}
        sizes="100vw"
        className="object-contain object-center pointer-events-none select-none relative z-10"
      />
    </div>
  );
};
