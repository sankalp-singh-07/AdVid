import { Route, Routes } from "react-router-dom";
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
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/generate" element={<Generator />} />
                <Route path="/result/:projectId" element={<Result />} />
                <Route path="/my-generations" element={<MyGeneration />} />
                <Route path="/community" element={<Community />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/loading" element={<Loading />} />
            </Routes>
            <Footer />
        </>
    );
}
