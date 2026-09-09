import { create } from "zustand";

/**
 * Live network status, driven by the browser's online/offline events.
 * Used by the offline banner and to gate sensitive actions (payments)
 * with honest messaging — nothing is ever claimed as "sent" while queued.
 */

interface NetworkState {
  online: boolean;
  /** Becomes true when the browser comes back online after being offline */
  reconnected: boolean;
}

function initialOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export const useNetworkStore = create<NetworkState>(() => ({
  online: initialOnline(),
  reconnected: false,
}));

let wired = false;

/** Attach global online/offline listeners exactly once. */
export function initNetworkListeners(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;

  const goOnline = () =>
    useNetworkStore.setState({ online: true, reconnected: true });
  const goOffline = () =>
    useNetworkStore.setState({ online: false, reconnected: false });

  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);

  // Sync initial state (navigator.onLine can disagree with events on load)
  if (!initialOnline()) goOffline();
}
