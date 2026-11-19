import React, { useEffect, useRef, useState } from 'react';

/** True while a CSS media query matches (e.g. '(pointer: coarse)' for touch screens). */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Touch-first device: no hover, so information must open on tap. */
export function useIsTouch(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * Explanation that opens on hover, keyboard focus or tap (title attributes
 * never show on touch screens). Clicks don't reach parents, so a chip inside a
 * clickable enemy doesn't also select it as a target.
 */
export const InfoTip: React.FC<{
  tip: string;
  label?: string;
  className?: string;
  placement?: 'top' | 'bottom';
  children: React.ReactNode;
}> = ({ tip, label, className, placement = 'top', children }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label ? `${label}: ${tip}` : tip}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        // A tap also fires focus and emulated mouse events before click; open on
        // hover only for a real mouse and on focus only for keyboard focus, so a
        // tap doesn't open the tip and then immediately toggle it shut.
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`cursor-help ${className ?? ''}`}
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-[60] w-max max-w-[min(240px,80vw)] -translate-x-1/2 rounded-lg border border-white/15 bg-[#0b0e14]/95 px-2.5 py-1.5 text-left text-[12px] font-normal leading-snug text-slate-100 shadow-xl ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {tip}
        </span>
      )}
    </span>
  );
};
