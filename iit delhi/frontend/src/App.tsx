// Mitti & Signal: warm public-service editorial shell, guided one-task screens, and voice-first navigation.
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding/:rest*" component={Home} />
      <Route path="/pay/:rest*" component={Home} />
      <Route path="/loan/:rest*" component={Home} />
      <Route path="/help/:rest*" component={Home} />
      <Route path="/:rest*" component={Home} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AccessibilityProvider>
          {/* reducedMotion="user" makes every framer-motion animation honor
              the OS "reduce motion" setting app-wide (transform/opacity only) */}
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              <Toaster position="top-center" />
              <Router />
            </TooltipProvider>
          </MotionConfig>
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
