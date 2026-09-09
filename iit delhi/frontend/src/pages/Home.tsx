import { useLocation, Link } from "wouter";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { Brand } from "../components/layout/Brand";
import { OfflineBanner } from "../components/OfflineBanner";
import { OmniVoiceExperience } from "../features/voice/OmniVoiceExperience";
import { routeFade } from "../motion/variants";
import { initNetworkListeners } from "../lib/network";
import { useAuthStore } from "../hooks/useAuth";
import { JudgeDemoPanel } from "../components/demo/JudgeDemoPanel";

// Pages
import Welcome from "./Welcome";
import Language from "./Language";
import Login from "./Login";
import Otp from "./Otp";
import Onboarding from "./Onboarding";
import Dashboard from "./Dashboard";
import Pay from "./Pay";
import Confirm from "./Confirm";
import Success from "./Success";
import Loan from "./Loan";
import Help from "./Help";
import Ticket from "./Ticket";
import Profile from "./Profile";
import Offline from "./Offline";

export default function Home() {
  const [location, nav] = useLocation();
  const path = location.split("?")[0];

  const { isAuthenticated, isLoading, user, restoreSession } = useAuthStore();

  // Live online/offline detection for the connectivity banner
  useEffect(() => {
    initNetworkListeners();
  }, []);

  // Restore authenticated session on application mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Route guarding for authenticated vs public vs incomplete onboarding screens
  useEffect(() => {
    if (isLoading) return;

    const isProtected =
      path === "/dashboard" ||
      path.startsWith("/pay") ||
      path.startsWith("/loan") ||
      path.startsWith("/help") ||
      path === "/profile" ||
      path === "/settings";

    // 1. If accessing protected routes without session -> redirect to login
    if (isProtected && !isAuthenticated) {
      nav("/login");
      return;
    }

    // 2. If authenticated with IN_PROGRESS onboarding accessing dashboard -> redirect to onboarding
    if (
      isAuthenticated &&
      user?.onboardingStatus === "IN_PROGRESS" &&
      isProtected
    ) {
      nav("/onboarding");
      return;
    }

    // 3. If authenticated with COMPLETED onboarding visiting /onboarding (not success) -> redirect to dashboard
    if (
      isAuthenticated &&
      user?.onboardingStatus === "COMPLETED" &&
      path === "/onboarding"
    ) {
      nav("/dashboard");
      return;
    }
  }, [path, isAuthenticated, isLoading, user, nav]);

  const render = useMemo(() => {
    if (path === "/") return <Welcome />;
    if (path === "/language") return <Language />;
    if (path === "/login") return <Login />;
    if (path === "/otp") return <Otp />;
    if (path === "/onboarding" || path.startsWith("/onboarding/"))
      return path === "/onboarding/success" ? (
        <Success variant="onboarding" />
      ) : (
        <Onboarding />
      );
    if (path === "/dashboard") return <Dashboard />;
    if (path === "/pay" || path === "/pay/scan" || path === "/pay/amount")
      return <Pay />;
    if (path === "/pay/confirm") return <Confirm />;
    if (path === "/pay/success") return <Success />;
    if (path === "/loan" || path.startsWith("/loan/")) return <Loan />;
    if (path === "/help") return <Help />;
    if (path === "/help/ticket") return <Ticket />;
    if (path === "/help/status") return <Ticket />;
    if (path === "/profile" || path === "/settings") return <Profile />;
    if (path === "/offline") return <Offline />;
    return <Dashboard />;
  }, [path]);

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="phone relative">
          <OfflineBanner />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={path}
              variants={routeFade}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full w-full absolute inset-0"
            >
              {render}
            </motion.div>
          </AnimatePresence>
          <OmniVoiceExperience />
        </div>
        <aside className="demo-rail hidden self-center lg:block">
          <div className="sticky top-8">
            <Brand />
            <p className="mt-7 text-sm font-semibold leading-6 text-[#66717b]">
              A calm, voice-first way to make digital money feel understandable.
            </p>
            <div className="mt-6">
              <JudgeDemoPanel />
            </div>
            <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#8b7c68]">
              <LockKeyhole size={14} className="mt-0.5 shrink-0" />
              Demo mode. Real free OTP auth enabled.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
