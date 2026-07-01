import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "./components/ScrollToTop";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AIAssistant from "./pages/AIAssistant";
import DocumentExplorer from "./pages/DocumentExplorer";
import Features from "./pages/Features";
import PricingPage from "./pages/PricingPage";

import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }) {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }
    return children;
}

export default function App() {
    const location = useLocation();
    const { loading } = useAuth();
    const MotionDiv = motion.div;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <MotionDiv
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="h-full w-full"
            >
                <ScrollToTop />
                <Routes location={location}>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/features" element={<Features />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    
                    {/* Protected routes */}
                    <Route path="/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><DocumentExplorer /></ProtectedRoute>} />
                    <Route path="/upload" element={<ProtectedRoute><DocumentExplorer initialTab="upload" /></ProtectedRoute>} />
                    
                    {/* Enterprise routes wrapped in Sidebar Layout */}
                    <Route element={<Layout />}>
                        <Route path="/knowledge-base" element={<div className="p-8"><h1>Knowledge Base</h1><p>Under construction.</p></div>} />
                        <Route path="/generator" element={<div className="p-8"><h1>Document Generator</h1><p>Under construction.</p></div>} />
                        <Route path="/settings" element={<div className="p-8"><h1>Settings</h1><p>Under construction.</p></div>} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </MotionDiv>
        </AnimatePresence>
    );
}
