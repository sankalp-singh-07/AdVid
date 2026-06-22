import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "./components/ScrollToTop";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AIAssistant from "./pages/AIAssistant";
import DocumentExplorer from "./pages/DocumentExplorer";
import Dashboard from "./pages/Dashboard";
import WorkdayExplorer from "./pages/WorkdayExplorer";

import Community from "./pages/Community";
import Plans from "./pages/Plans";
import Loading from "./pages/Loading";
import { useAuth } from "./context/AuthContext";

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
                <Routes location={location}>
                    {/* Public route */}
                    <Route path="/" element={<Home />} />
                    
                    {/* Enterprise routes wrapped in Sidebar Layout */}
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/assistant" element={<AIAssistant />} />
                        <Route path="/documents" element={<DocumentExplorer />} />
                        <Route path="/upload" element={<DocumentExplorer initialTab="upload" />} />
                        <Route path="/knowledge-base" element={<div className="p-8"><h1>Knowledge Base</h1><p>Under construction.</p></div>} />
                        <Route path="/workday" element={<WorkdayExplorer />} />
                        <Route path="/generator" element={<div className="p-8"><h1>Document Generator</h1><p>Under construction.</p></div>} />
                        <Route path="/settings" element={<div className="p-8"><h1>Settings</h1><p>Under construction.</p></div>} />
                        
                        {/* Old routes retained for now if needed, or point them somewhere */}
                        <Route path="/community" element={<Community />} />
                        <Route path="/plans" element={<Plans />} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </MotionDiv>
        </AnimatePresence>
    );
}
