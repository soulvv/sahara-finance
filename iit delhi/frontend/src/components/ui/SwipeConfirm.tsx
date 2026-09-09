import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ArrowRight, Check, Lock } from "lucide-react";

interface SwipeConfirmProps {
  onConfirm: () => void;
  label?: string;
  confirmedLabel?: string;
  disabled?: boolean;
}

export function SwipeConfirm({
  onConfirm,
  label = "Swipe to confirm",
  confirmedLabel = "Confirmed",
  disabled = false,
}: SwipeConfirmProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [trackWidth, setTrackWidth] = useState(280);
  const x = useMotionValue(0);

  // Measure the track width on mount
  useEffect(() => {
    if (containerRef.current) {
      setTrackWidth(containerRef.current.offsetWidth - 64); // thumb width
    }
  }, []);

  const threshold = trackWidth * 0.85;

  // Background fill follows the drag position
  const fillWidth = useTransform(x, [0, trackWidth], ["0%", "100%"]);
  const fillOpacity = useTransform(
    x,
    [0, threshold * 0.5, threshold],
    [0, 0.3, 0.6]
  );

  // Shared confirmation path for drag, keyboard, and tap
  const doConfirm = useCallback(() => {
    if (disabled || confirmed) return;
    setConfirmed(true);
    x.set(trackWidth);
    // Tactile confirmation pattern (no-op where vibration is unsupported)
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([15, 40, 25]);
      } catch {
        /* non-fatal */
      }
    }
    // Small delay so the user sees the confirmation state
    setTimeout(onConfirm, 400);
  }, [disabled, confirmed, trackWidth, onConfirm, x]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (disabled || confirmed) return;
      if (x.get() >= threshold) {
        doConfirm();
      }
    },
    [threshold, doConfirm, disabled, confirmed, x]
  );

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${label}. Swipe right, or press Enter to confirm.`}
      onKeyDown={e => {
        // Keyboard-equivalent confirmation (WCAG 2.1.1 — drag is not the only path)
        if (!disabled && !confirmed && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          doConfirm();
        }
      }}
      className="relative flex h-[64px] items-center overflow-hidden rounded-2xl border-2 border-[#17324d] bg-[#17324d] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#e6a62d]"
    >
      {/* Fill track */}
      <motion.div
        className="absolute inset-0 bg-[#5b936d] rounded-2xl"
        style={{ width: fillWidth, opacity: fillOpacity }}
      />

      {/* Label */}
      <span
        aria-live="polite"
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-[#fffdf8]/70"
      >
        {confirmed ? (
          <>
            <Check size={18} /> {confirmedLabel}
          </>
        ) : (
          <>
            {label} <ArrowRight size={16} />
          </>
        )}
      </span>

      {/* Draggable thumb */}
      <motion.div
        drag={disabled || confirmed ? false : "x"}
        dragConstraints={{ left: 0, right: trackWidth }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => {
          if ("vibrate" in navigator) {
            try {
              navigator.vibrate(8);
            } catch {
              /* non-fatal */
            }
          }
        }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 grid h-[52px] w-[52px] shrink-0 cursor-grab place-items-center rounded-[14px] bg-[#e6a62d] text-[#17324d] shadow-lg active:cursor-grabbing ml-[6px]"
        whileTap={{ scale: 0.95 }}
      >
        {confirmed ? <Check size={22} strokeWidth={3} /> : <Lock size={20} />}
      </motion.div>
    </div>
  );
}
