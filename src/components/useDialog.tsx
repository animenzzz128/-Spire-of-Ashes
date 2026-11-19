import React, { useEffect, useRef } from 'react';

// Every open dialog registers on this stack. Only the top one reacts to keys,
// and game screens check isDialogOpen() so shortcuts (1-9, E, Space, B, Q) never
// reach the combat behind a dialog.
const openDialogs: symbol[] = [];

export function isDialogOpen(): boolean {
  return openDialogs.length > 0;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a dialog panel: focus moves inside when it opens, Tab
 * stays inside, Esc closes it, and focus returns to where it was on close.
 * Attach the returned ref to the panel element (give it tabIndex={-1}).
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = Symbol('dialog');
    openDialogs.push(id);
    const returnFocusTo = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== id || !panel) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || !panel.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (active === lastItem || !panel.contains(active))) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    // Capture phase, so the dialog handles keys before any game shortcut.
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const i = openDialogs.indexOf(id);
      if (i >= 0) openDialogs.splice(i, 1);
      if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}

/** A dialog container for places that render their own content (e.g. the map overlay). */
export const DialogFrame: React.FC<{
  label: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ label, onClose, className, children }) => {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={className}>
      {children}
    </div>
  );
};
