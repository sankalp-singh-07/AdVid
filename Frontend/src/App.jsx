import { useEffect } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "./components/ScrollToTop";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AIAssistant from "./pages/AIAssistant";
import DocumentExplorer from "./pages/DocumentExplorer";
import KnowledgeBasePage from "./pages/KnowledgeBase";
import Settings from "./pages/Settings";
import Features from "./pages/Features";
import PricingPage from "./pages/PricingPage";
import AuthModal from "./components/AuthModal";

import { useAuth } from "./context/AuthContext";
import { PageHeaderSkeleton } from "./components/Skeleton";

/**
 * Unauthenticated users hitting protected routes are sent home with the login modal open.
 */
function ProtectedRoute({ children }) {
  const { isLoggedIn, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
    }
  }, [isLoggedIn, openAuthModal]);

  if (!isLoggedIn) {
    return <Navigate to="/" replace state={{ openAuth: true, authMode: "login" }} />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const { loading, isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal } =
    useAuth();
  const MotionDiv = motion.div;

  // Honor navigation state: { openAuth: true } from redirects / deep links
  useEffect(() => {
    if (location.state?.openAuth) {
      openAuthModal(location.state.authMode || "login");
      // Clear state so refresh doesn't re-open forever
      window.history.replaceState({}, document.title);
    }
  }, [location.state, openAuthModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFF]">
        <div className="h-[68px] border-b border-[#E8EAF5] bg-white/60" />
        <div className="max-w-5xl mx-auto px-8 pt-16">
          <PageHeaderSkeleton />
          <div className="mt-10 grid gap-4">
            <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const animateRoute = !["/assistant", "/documents", "/upload"].includes(
    location.pathname
  );

  return (
    <>
      <AnimatePresence mode="wait">
        <MotionDiv
          key={animateRoute ? location.pathname : "app-shell"}
          initial={animateRoute ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={animateRoute ? { opacity: 0, y: -8 } : undefined}
          transition={{ duration: 0.25 }}
          className="h-full w-full"
        >
          <ScrollToTop />
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<PricingPage />} />

            <Route
              path="/assistant"
              element={
                <ProtectedRoute>
                  <AIAssistant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentExplorer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <DocumentExplorer initialTab="upload" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute>
                  <KnowledgeBasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route element={<Layout />}>
              <Route path="/generator" element={<Navigate to="/assistant" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MotionDiv>
      </AnimatePresence>

      {/* Global auth modal — works from Home, Features, Pricing, or any redirect */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
      />
    </>
  );
}
