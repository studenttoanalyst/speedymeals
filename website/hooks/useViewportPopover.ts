import { useState, useEffect, useLayoutEffect, useCallback } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseViewportPopoverOptions {
  anchorRef: React.RefObject<HTMLElement | null>;
  popoverRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  preferredWidth?: number;
  margin?: number;
  gap?: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  width: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
}

export function useViewportPopover({
  anchorRef,
  popoverRef,
  open,
  preferredWidth = 350,
  margin = 8,
  gap = 10,
}: UseViewportPopoverOptions): PopoverPosition {
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    width: 0,
    arrowLeft: 0,
    placement: 'top',
  });

  const updatePosition = useCallback(() => {
    if (!open || !anchorRef.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;

    const width = Math.min(preferredWidth, vw - 2 * margin);
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;

    // Windows-style shift: center on anchor, but clamp inside [margin, vw - width - margin]
    const left = Math.max(
      margin,
      Math.min(anchorCenterX - width / 2, vw - width - margin)
    );

    const popoverHeight = popoverRef.current?.offsetHeight ?? 36;

    // Preferred placement = above the anchor:
    let top = anchorRect.top - popoverHeight - gap;
    let placement: 'top' | 'bottom' = 'top';

    // Flip below if top < margin:
    if (top < margin) {
      top = anchorRect.bottom + gap;
      placement = 'bottom';
    }

    // Then clamp top to [margin, window.innerHeight - popoverHeight - margin]
    top = Math.max(margin, Math.min(top, vh - popoverHeight - margin));

    // Pointer arrow points to anchorCenterX relative to popover left, clamped [12, width - 12]
    const arrowLeft = Math.max(12, Math.min(anchorCenterX - left, width - 12));

    setPosition({
      top,
      left,
      width,
      arrowLeft,
      placement,
    });
  }, [anchorRef, popoverRef, open, preferredWidth, margin, gap]);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    // Measure and position immediately before browser paint
    updatePosition();

    // Recompute on window resize, orientationchange, and capture scroll
    const handleScrollCapture = () => {
      updatePosition();
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('orientationchange', updatePosition);
    window.addEventListener('scroll', handleScrollCapture, { capture: true, passive: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updatePosition);
      vv.addEventListener('scroll', updatePosition);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('orientationchange', updatePosition);
      window.removeEventListener('scroll', handleScrollCapture, true);
      if (vv) {
        vv.removeEventListener('resize', updatePosition);
        vv.removeEventListener('scroll', updatePosition);
      }
    };
  }, [open, updatePosition]);

  return position;
}
