export const spring = {
  fast: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
  normal: { type: "spring", stiffness: 300, damping: 25, mass: 1 },
  slow: { type: "spring", stiffness: 150, damping: 20, mass: 1.2 },
  bouncy: { type: "spring", stiffness: 350, damping: 15, mass: 1 },
} as const;

/**
 * Duration tokens (seconds) for non-spring transitions.
 * Aligned with the 160–240ms guidance in ideas.md for panel/route entry.
 */
export const timing = {
  fast: 0.18,
  normal: 0.28,
  slow: 0.45,
} as const;
