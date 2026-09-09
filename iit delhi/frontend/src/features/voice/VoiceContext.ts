import { create } from "zustand";

export type VoiceState =
  | "idle"
  | "awakening"
  | "connecting"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "action"
  | "confirmation"
  | "success"
  | "error"
  | "offline";

interface VoiceStore {
  isOpen: boolean;
  state: VoiceState;
  transcript: string;
  contextualHelp: string;
  actionIntent: { type: string; payload?: any } | null;
  setOpen: (open: boolean) => void;
  setState: (state: VoiceState) => void;
  setTranscript: (text: string) => void;
  setContextualHelp: (text: string) => void;
  setActionIntent: (intent: { type: string; payload?: any } | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>(set => ({
  isOpen: false,
  state: "idle",
  transcript: "",
  contextualHelp: "",
  actionIntent: null,
  setOpen: isOpen => set({ isOpen }),
  setState: state => set({ state }),
  setTranscript: transcript => set({ transcript }),
  setContextualHelp: contextualHelp => set({ contextualHelp }),
  setActionIntent: actionIntent => set({ actionIntent }),
  reset: () =>
    set({
      isOpen: false,
      state: "idle",
      transcript: "",
      actionIntent: null,
    }),
}));
