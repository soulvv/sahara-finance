import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Animates a number counting up from 0 to a target value.
 * Returns the current display value.
 * Users who prefer reduced motion see the final value immediately —
 * financial numbers must never be hidden behind animation.
 */
export function useCountUp(
  target: number,
  duration = 1200,
  startOnMount = true
) {
  const prefersReduced = useReducedMotion();
  const [value, setValue] = useState(() =>
    startOnMount && !prefersReduced ? 0 : target
  );
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      // Ease out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    },
    [target, duration]
  );

  useEffect(() => {
    if (!startOnMount) return;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [animate, startOnMount, prefersReduced, target]);

  return value;
}

/**
 * Formats a number as Indian currency string.
 * e.g. 8420 → "8,420"
 */
export function formatINR(n: number): string {
  return n.toLocaleString("en-IN");
}
