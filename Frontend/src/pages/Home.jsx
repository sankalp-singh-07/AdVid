import BottomBanner from "../sections/BottomBanner";
import { FaqSection } from "../sections/FaqSection";
import FeaturesSection from "../sections/FeaturesSection";
import HeroSection from "../sections/HeroSection";
import StatsSection from "../sections/StatsSection";
import Pricing from "../sections/Pricing";
import Testimonials from "../sections/Testimonials";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
    // AuthModal is mounted globally in App.jsx so it works from any route.
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
        </div>
    );
}