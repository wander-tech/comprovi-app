'use client';

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

const VIEWPORT_MARGIN = 12;
const MIN_PANEL_HEIGHT = 120;

interface UseFloatingPositionOptions {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  /** Fixed panel width. Omit to match the trigger's width. */
  width?: number;
  gap?: number;
}

/**
 * Computes a fixed-position style for a floating panel anchored to a trigger
 * element, flipping above the trigger when there's more room there, and
 * capping the panel's height to whatever space is actually available so it
 * never overflows the viewport.
 */
export function useFloatingPosition({ open, triggerRef, panelRef, width, gap = 4 }: UseFloatingPositionOptions) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelWidth = width
        ? Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2)
        : rect.width;
      const panelHeight = panelRef.current?.offsetHeight ?? 0;

      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;
      const openUpward = panelHeight > spaceBelow && spaceAbove > spaceBelow;

      let left = rect.left;
      if (left + panelWidth > window.innerWidth - VIEWPORT_MARGIN) {
        left = window.innerWidth - VIEWPORT_MARGIN - panelWidth;
      }
      left = Math.max(VIEWPORT_MARGIN, left);

      const maxHeight = Math.max(MIN_PANEL_HEIGHT, openUpward ? spaceAbove : spaceBelow);

      setStyle(
        openUpward
          ? { position: 'fixed', bottom: window.innerHeight - rect.top + gap, left, width: panelWidth, maxHeight, zIndex: 60 }
          : { position: 'fixed', top: rect.bottom + gap, left, width: panelWidth, maxHeight, zIndex: 60 },
      );
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, triggerRef, panelRef, width, gap]);

  return style;
}
