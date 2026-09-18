"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  className?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
};

const DURATION = 450;
// Fixed locale so the server and the first client render agree.
const LOCALE = "en-US";

/**
 * A counter that rolls to its new value instead of jumping. Holds still under
 * `prefers-reduced-motion` (DESIGN.md §2).
 */
export function NumberValue({ value, className, ...format }: Props) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;

    // Reduced motion gets the same code path with no duration: one frame, no roll.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION;

    const t0 = performance.now();
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = start + (value - start) * eased;
      from.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [value]);

  const digits = format.maximumFractionDigits ?? 0;
  // Round to the displayed precision so the tween never shows a stale digit.
  const rounded = Number(shown.toFixed(digits));

  return (
    <span className={className}>{new Intl.NumberFormat(LOCALE, format).format(rounded)}</span>
  );
}
