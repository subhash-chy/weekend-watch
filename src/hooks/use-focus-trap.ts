/**
 * Focus management for overlays.
 *
 * Implements the WAI-ARIA dialog pattern: focus moves into the overlay on
 * open, `Tab` cycles only through the overlay's own controls, `Escape` closes
 * it, and focus returns to the element that opened it. Getting the restore
 * right matters — losing focus to `<body>` after a modal closes is one of the
 * most common keyboard-accessibility failures.
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Selector matching every element that can receive focus in DOM order. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/** Options for {@link useFocusTrap}. */
export interface FocusTrapOptions {
  /** Whether the trap is currently active. */
  active: boolean;
  /** Called when the user presses `Escape`. */
  onEscape: () => void;
}

/**
 * Traps keyboard focus inside `containerRef` while active.
 *
 * @param containerRef - Ref to the overlay's root element.
 * @param options - Activation flag and escape handler.
 * @returns A ref to be attached to the element that should receive focus first.
 *   When unset, the first focusable descendant is used. `TFocus` lets the caller
 *   match the concrete element type, e.g. `HTMLButtonElement`, so the ref can be
 *   attached without a cast.
 */
export function useFocusTrap<
  TContainer extends HTMLElement,
  TFocus extends HTMLElement = HTMLElement,
>(
  containerRef: RefObject<TContainer | null>,
  { active, onEscape }: FocusTrapOptions,
): RefObject<TFocus | null> {
  const initialFocusRef = useRef<TFocus | null>(null);
  /** The element that had focus when the trap engaged, for restoration. */
  const restoreToRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (container === null) return;

    // Capture the opener before we move focus anywhere.
    restoreToRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus into the overlay. Prefer the explicitly-marked element, then
    // the first focusable control, then the container itself (which must be
    // focusable for this to work — overlays set tabIndex={-1}).
    const target = initialFocusRef.current ?? focusables()[0] ?? container;
    target.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        // Nothing to cycle through: keep focus on the container so the user
        // cannot tab out into the page behind the overlay.
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) return;

      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (current === last || !container.contains(current)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to the control that opened the overlay. Guarded because
      // the opener may itself have unmounted (e.g. a route change).
      const restoreTo = restoreToRef.current;
      if (restoreTo !== null && document.contains(restoreTo)) {
        restoreTo.focus({ preventScroll: true });
      }
      restoreToRef.current = null;
    };
  }, [active, containerRef, onEscape]);

  return initialFocusRef;
}

/**
 * Prevents the page behind an overlay from scrolling.
 *
 * Restores the original inline style on cleanup so nested overlays do not
 * leave `overflow: hidden` stuck on `<body>`.
 *
 * @param locked - Whether scrolling should be suppressed.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
