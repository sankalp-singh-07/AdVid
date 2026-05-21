import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Generator from "./pages/Generator";
import Result from "./pages/Result";
import MyGeneration from "./pages/MyGeneration";
import Community from "./pages/Community";
import Plans from "./pages/Plans";
import Loading from "./pages/Loading";

export default function App() {

    const location = useLocation();

    return (
        <>
            <Navbar />

            <AnimatePresence mode="wait">

                <motion.div
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

                </motion.div>

            </AnimatePresence>

            <Footer />
        </>
    );
}