import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, WifiOff } from "lucide-react";
import { useNetworkStore } from "../lib/network";

/**
 * A calm, honest connectivity indicator inside the phone frame.
 * - Offline: "your information is saved safely" (never blame, never panic)
 * - Reconnect: short confirmation pill, then it fades away
 */
export function OfflineBanner() {
  const online = useNetworkStore(s => s.online);
  const [showReconnect, setShowReconnect] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      setShowReconnect(true);
      const timer = setTimeout(() => setShowReconnect(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [online]);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          role="status"
          aria-live="polite"
          className="absolute inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-[#b65c4a] px-4 py-2.5 text-xs font-bold text-[#fffdf8]"
        >
          <WifiOff size={14} className="shrink-0" aria-hidden="true" />
          Offline — Your information is saved safely.
        </motion.div>
      )}
      {online && showReconnect && (
        <motion.div
          key="reconnected"
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          role="status"
          aria-live="polite"
          className="absolute inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-[#5b936d] px-4 py-2.5 text-xs font-bold text-[#fffdf8]"
        >
          <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
          Connected again — everything is up to date
        </motion.div>
      )}
    </AnimatePresence>
  );
}
