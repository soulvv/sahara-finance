/**
 * Global configuration for the 3D experiences.
 * Quality is detected once at startup from device capabilities so low-end
 * phones automatically get capped DPR / simpler scenes — no manual tuning.
 */
export type QualityLevel = "low" | "medium" | "high";

function detectQuality(): QualityLevel {
  if (typeof window === "undefined") return "medium";
  try {
    // Respect the user's motion preference first
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "low";
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(window.innerWidth, window.innerHeight) < 480;
    if (isMobile && cores <= 4) return "low";
    if (isMobile) return "medium";
    return cores >= 8 ? "high" : "medium";
  } catch {
    return "medium";
  }
}

export const threeConfig = {
  // Cap DPR per quality tier — the single biggest win on high-DPI phones
  dprByQuality: {
    low: [1, 1.25],
    medium: [1, 1.75],
    high: [1, 2],
  } as Record<QualityLevel, [number, number]>,

  // Max DPR for devices without tier info
  dpr: [1, 2] as [number, number],

  quality: detectQuality() as QualityLevel,

  colors: {
    trustCore: "#17324d",
    signal: "#e6a62d",
    success: "#5b936d",
    attention: "#b65c4a",
    background: "#f8f4eb",
    ivory: "#fffdf8",
  },
};
