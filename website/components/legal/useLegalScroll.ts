'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export const LEGAL_SCROLL_OFFSET = 88;

interface UseLegalScrollOptions {
  defaultSectionId?: string;
  sectionIds?: string[];
}

export function useLegalScroll({ defaultSectionId = '', sectionIds = [] }: UseLegalScrollOptions = {}) {
  const [activeSectionId, setActiveSectionId] = useState<string>(defaultSectionId);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getElementByTargetId = useCallback((id: string): HTMLElement | null => {
    if (!id) return null;
    const cleanId = id.replace(/^#/, '');
    return (
      document.getElementById(cleanId) ||
      document.getElementById(`clause-${cleanId}`) ||
      document.getElementById(`sec-${cleanId}`) ||
      document.getElementById(`part-${cleanId}`) ||
      document.getElementById(cleanId.toLowerCase().replace(/[^a-z0-9]/g, '-')) ||
      null
    );
  }, []);

  const scrollToSection = useCallback(
    (targetId: string, updateHash = true) => {
      if (!targetId) return;
      const cleanId = targetId.replace(/^#/, '');
      const element = getElementByTargetId(cleanId);

      if (element) {
        isProgrammaticScrollRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        setActiveSectionId(cleanId);
        if (updateHash && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `#${cleanId}`);
        }

        const y = element.getBoundingClientRect().top + window.pageYOffset - LEGAL_SCROLL_OFFSET;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 700);
      } else {
        // Fallback: If unknown hash, smoothly stay or fall back without crashing
        if (updateHash && typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    },
    [getElementByTargetId]
  );

  // Handle cold load and hashchange
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      // Poll briefly (up to 6 times, 60ms interval) since content is client-rendered
      let attempts = 0;
      const checkAndScroll = () => {
        const el = getElementByTargetId(hash);
        if (el) {
          requestAnimationFrame(() => {
            scrollToSection(hash, false);
          });
        } else if (attempts < 6) {
          attempts++;
          setTimeout(checkAndScroll, 60);
        }
      };
      checkAndScroll();
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [getElementByTargetId, scrollToSection]);

  // Scroll spy (IntersectionObserver or throttled scroll listener)
  useEffect(() => {
    if (typeof window === 'undefined' || sectionIds.length === 0) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (isProgrammaticScrollRef.current) return;

        let currentActive = activeSectionId;
        for (const id of sectionIds) {
          const el = getElementByTargetId(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= LEGAL_SCROLL_OFFSET + 30 && rect.bottom > LEGAL_SCROLL_OFFSET) {
              currentActive = id;
            }
          }
        }
        if (currentActive && currentActive !== activeSectionId) {
          setActiveSectionId(currentActive);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds, activeSectionId, getElementByTargetId]);

  return {
    activeSectionId,
    setActiveSectionId,
    scrollToSection,
    getElementByTargetId,
    LEGAL_SCROLL_OFFSET,
  };
}
