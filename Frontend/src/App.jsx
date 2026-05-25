import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Generator from "./pages/Generator";
import Result from "./pages/Result";
import MyGeneration from "./pages/MyGeneration";
import Community from "./pages/Community";
import Plans from "./pages/Plans";
import Loading from "./pages/Loading";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./context/AuthContext";

export default function App() {
    const location = useLocation();
    const { loading, isAuthModalOpen, closeAuthModal, authModalMode } = useAuth();
    const MotionDiv = motion.div;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <AuthModal
                isOpen={isAuthModalOpen}
                mode={authModalMode}
                onClose={closeAuthModal}
            />

            <AnimatePresence mode="wait">

                <MotionDiv
                    key={location.pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                >

                    <Routes location={location}>

                        <Route path="/" element={<Home />} />
                        <Route path="/generate" element={<Generator />} />
                        <Route path="/result/:projectId" element={<Result />} />
                        <Route path="/my-generations" element={<MyGeneration />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/plans" element={<Plans />} />
                        <Route path="/loading" element={<Loading />} />

                    </Routes>

                </MotionDiv>

            </AnimatePresence>

            <Footer />
        </>
    );
}
