import { create } from "zustand";
import { api, getStoredToken, setStoredToken } from "../lib/api";

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  preferredLanguage: "hi" | "hinglish" | "en";
  onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface PendingAuth {
  phone: string;
  name?: string | null;
  requestId: string;
  demoOtp?: string;
  retryAfterSeconds?: number;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingAuth: PendingAuth | null;
  setPendingAuth: (pending: PendingAuth | null) => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<AuthUser | null>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: true,
  pendingAuth: null,

  setPendingAuth: (pendingAuth) => set({ pendingAuth }),

  login: (token, user) => {
    setStoredToken(token);
    set({
      token,
      user,
      isAuthenticated: true,
      pendingAuth: null,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* non-fatal */
    } finally {
      setStoredToken(null);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        pendingAuth: null,
        isLoading: false,
      });
    }
  },

  restoreSession: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await api.get<{ success: boolean; user: AuthUser }>("/api/users/me");
      if (response.success && response.user) {
        set({
          user: response.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error("Invalid user payload");
      }
    } catch (err) {
      console.warn("[Auth] Session restoration failed, clearing token:", err);
      setStoredToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  refreshProfile: async () => {
    try {
      const response = await api.get<{ success: boolean; user: AuthUser }>("/api/users/me");
      if (response.success && response.user) {
        set({ user: response.user });
        return response.user;
      }
      return null;
    } catch (err) {
      console.warn("[Auth] Failed to refresh profile:", err);
      return null;
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));

export function useAuth() {
  return useAuthStore();
}
