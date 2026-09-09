import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, CanvasProps } from "@react-three/fiber";
import { threeConfig } from "./threeConfig";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") ||
      canvas.getContext("webgl2") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// CSS-only fallback: a pulsing gradient orb
function GradientOrbFallback({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className || ""}`}>
      <div
        className="w-24 h-24 rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, #e6a62d 0%, #17324d 60%, transparent 80%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}

// Loading skeleton while Canvas initializes
function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-16 h-16 rounded-full animate-pulse"
        style={{
          background:
            "radial-gradient(circle, rgba(230,166,45,0.3), transparent 70%)",
        }}
      />
    </div>
  );
}

// Minimal error boundary for Canvas
class ErrorBoundaryCanvas extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface SafeCanvasProps extends CanvasProps {
  fallbackClassName?: string;
  children: React.ReactNode;
}

/**
 * A Canvas wrapper that:
 * 1. Checks for WebGL support and falls back to CSS animation if unavailable
 * 2. Caps DPR by device quality tier (threeConfig)
 * 3. Pauses the render loop when the tab is hidden or the canvas is off-screen
 * 4. Handles errors gracefully
 */
export function SafeCanvas({
  children,
  fallbackClassName,
  ...canvasProps
}: SafeCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOnScreen, setIsOnScreen] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasWebGL(detectWebGL());
  }, []);

  // Pause rendering when the canvas scrolls out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsOnScreen(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause rendering when the tab is hidden
  useEffect(() => {
    const onVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Tier-based DPR cap
  const dpr = threeConfig.dprByQuality[threeConfig.quality];
  const shouldAnimate = isOnScreen && isTabVisible;
  const { frameloop, ...rest } = canvasProps;

  if (!hasWebGL || hasError) {
    return <GradientOrbFallback className={fallbackClassName} />;
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Suspense fallback={<CanvasLoader />}>
        <ErrorBoundaryCanvas onError={() => setHasError(true)}>
          <Canvas
            frameloop={shouldAnimate ? (frameloop ?? "always") : "never"}
            dpr={dpr}
            {...rest}
          >
            {children}
          </Canvas>
        </ErrorBoundaryCanvas>
      </Suspense>
    </div>
  );
}
