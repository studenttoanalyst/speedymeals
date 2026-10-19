/**
 * Centralized smooth scroll utility for SpeedyMeals
 * Computes the real bottom of the fixed floating navbar (#main-navigation)
 * and scrolls so that the target section (or its data-scroll-anchor child)
 * rests exactly `gap` px below the navbar.
 */

export interface ScrollOptions {
  gap?: number;
  offset?: number;
  behavior?: ScrollBehavior;
  onComplete?: () => void;
}

export function scrollToSection(
  targetIdOrElement: string | HTMLElement,
  options: ScrollOptions = {}
): boolean {
  if (typeof window === 'undefined') return false;

  const { gap = 16, offset, onComplete } = options;

  let targetElement: HTMLElement | null = null;
  if (typeof targetIdOrElement === 'string') {
    const cleanId = targetIdOrElement.replace(/^#/, '');
    targetElement = document.getElementById(cleanId);
  } else {
    targetElement = targetIdOrElement;
  }

  if (!targetElement) return false;

  // Prefer dedicated scroll anchor if available to bypass large section padding
  const anchorElement =
    (targetElement.querySelector('[data-scroll-anchor]') as HTMLElement | null) ||
    targetElement;

  // Measure dynamic navbar bottom
  const navbar = document.getElementById('main-navigation');
  let navBottom = 0;
  if (navbar) {
    const navRect = navbar.getBoundingClientRect();
    navBottom = Math.max(0, navRect.bottom);
  } else {
    navBottom = 80;
  }

  const effectiveOffset = offset !== undefined ? offset : -(navBottom + gap);
  const elementRect = anchorElement.getBoundingClientRect();
  const targetY = Math.max(0, window.pageYOffset + elementRect.top + effectiveOffset);

  // Check prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = prefersReduced
    ? 'auto'
    : options.behavior || 'smooth';

  window.scrollTo({
    top: targetY,
    behavior,
  });

  if (onComplete) {
    if (behavior === 'auto') {
      onComplete();
    } else {
      let timeoutId: number | null = null;
      const handleScrollEnd = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          window.removeEventListener('scroll', handleScrollEnd);
          onComplete();
        }, 100);
      };
      window.addEventListener('scroll', handleScrollEnd, { passive: true });
      timeoutId = window.setTimeout(() => {
        window.removeEventListener('scroll', handleScrollEnd);
        onComplete();
      }, 800);
    }
  }

  return true;
}
