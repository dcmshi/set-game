import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Focus management for a modal dialog: keeps Tab and Shift+Tab inside the
 * element the returned ref is attached to, and hands focus back to whatever
 * opened the dialog once it unmounts.
 *
 * Call this before any effect that moves focus into the dialog, so it records
 * the opener rather than the dialog's own initially-focused control.
 */
export function useModalFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = ref.current;
      if (e.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;

      const leaving = e.shiftKey ? items[0] : items[items.length - 1];
      const inside = dialog.contains(document.activeElement);
      if (inside && document.activeElement !== leaving) return;

      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // The opener can be gone by now — quitting a game removes the very button
      // that opened the confirm dialog — leaving nothing to hand focus back to.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return ref;
}
