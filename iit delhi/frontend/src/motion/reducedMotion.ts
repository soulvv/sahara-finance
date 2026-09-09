import { useReducedMotion } from "framer-motion";

/**
 * Returns true if the user prefers reduced motion, either via system settings
 * or an application-level override (could be tied to state later).
 */
export function useAppReducedMotion() {
  const prefersReduced = useReducedMotion();
  // We can also check a global state if we add a setting for this
  return !!prefersReduced;
}
