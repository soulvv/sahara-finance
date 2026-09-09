import { Variants } from "framer-motion";
import { spring, timing } from "./spring";

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: timing.normal } },
  exit: { opacity: 0, transition: { duration: timing.fast } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: spring.normal },
  exit: { opacity: 0, y: -8, transition: { duration: timing.fast } },
};

export const spatialExpand: Variants = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: spring.normal,
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    filter: "blur(4px)",
    transition: { duration: timing.fast },
  },
};

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/**
 * Route-level transition used by the keyed child of <AnimatePresence> in
 * Home.tsx. Keeps exits short so navigation never feels like it blocks.
 */
export const routeFade: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: timing.normal, ease: [0.23, 1, 0.32, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: timing.fast, ease: "easeIn" },
  },
};
