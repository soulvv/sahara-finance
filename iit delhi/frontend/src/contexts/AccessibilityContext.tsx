import React, { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityState {
  seniorMode: boolean;
  visuallyImpairedMode: boolean;
  highContrast: boolean;
  lowLiteracyMode: boolean;
  speechRate: number;
  toggleSeniorMode: () => void;
  toggleVisuallyImpairedMode: () => void;
  toggleHighContrast: () => void;
  toggleLowLiteracyMode: () => void;
  setSpeechRate: (rate: number) => void;
}

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [seniorMode, setSeniorMode] = useState<boolean>(() => {
    return localStorage.getItem("accessibility_senior") === "true";
  });

  const [visuallyImpairedMode, setVisuallyImpairedMode] = useState<boolean>(() => {
    return localStorage.getItem("accessibility_vi") === "true";
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("accessibility_hc") === "true";
  });

  const [lowLiteracyMode, setLowLiteracyMode] = useState<boolean>(() => {
    return localStorage.getItem("accessibility_low_lit") === "true";
  });

  const [speechRate, setSpeechRate] = useState<number>(() => {
    const stored = localStorage.getItem("accessibility_speech_rate");
    return stored ? parseFloat(stored) : 0.9;
  });

  useEffect(() => {
    const root = document.documentElement;

    if (seniorMode) {
      root.classList.add("senior-mode");
      localStorage.setItem("accessibility_senior", "true");
    } else {
      root.classList.remove("senior-mode");
      localStorage.setItem("accessibility_senior", "false");
    }

    if (highContrast) {
      root.classList.add("high-contrast");
      localStorage.setItem("accessibility_hc", "true");
    } else {
      root.classList.remove("high-contrast");
      localStorage.setItem("accessibility_hc", "false");
    }

    if (visuallyImpairedMode) {
      root.classList.add("vi-mode");
      localStorage.setItem("accessibility_vi", "true");
    } else {
      root.classList.remove("vi-mode");
      localStorage.setItem("accessibility_vi", "false");
    }

    localStorage.setItem("accessibility_low_lit", lowLiteracyMode ? "true" : "false");
    localStorage.setItem("accessibility_speech_rate", speechRate.toString());
  }, [seniorMode, highContrast, visuallyImpairedMode, lowLiteracyMode, speechRate]);

  const toggleSeniorMode = () => setSeniorMode((prev) => !prev);
  const toggleVisuallyImpairedMode = () => setVisuallyImpairedMode((prev) => !prev);
  const toggleHighContrast = () => setHighContrast((prev) => !prev);
  const toggleLowLiteracyMode = () => setLowLiteracyMode((prev) => !prev);

  return (
    <AccessibilityContext.Provider
      value={{
        seniorMode,
        visuallyImpairedMode,
        highContrast,
        lowLiteracyMode,
        speechRate,
        toggleSeniorMode,
        toggleVisuallyImpairedMode,
        toggleHighContrast,
        toggleLowLiteracyMode,
        setSpeechRate,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return ctx;
}
