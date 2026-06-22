import BottomBanner from "../sections/BottomBanner";
import { FaqSection } from "../sections/FaqSection";
import FeaturesSection from "../sections/FeaturesSection";
import HeroSection from "../sections/HeroSection";
import StatsSection from "../sections/StatsSection";
import Pricing from "../sections/Pricing";
import Testimonials from "../sections/Testimonials";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";

export default function Home() {
    const { isAuthModalOpen, closeAuthModal, authModalMode } = useAuth();

    return (
        <div className="bg-slate-50 min-h-screen">
            <Navbar />
            <main>
                <HeroSection />
                <StatsSection />
                <FeaturesSection />
                <Testimonials />
                <Pricing />
                <FaqSection />
                <BottomBanner />
            </main>
            <Footer />
            <AuthModal
                isOpen={isAuthModalOpen}
                mode={authModalMode}
                onClose={closeAuthModal}
            />
        </div>
    );
}