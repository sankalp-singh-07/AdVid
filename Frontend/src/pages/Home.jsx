import BottomBanner from "../sections/BottomBanner";
import { FaqSection } from "../sections/FaqSection";
import FeaturesSection from "../sections/FeaturesSection";
import HeroSection from "../sections/HeroSection";
import Pricing from "../sections/Pricing";
import Testimonials from "../sections/Testimonials";

export default function Home() {
    return (
        <>
            <HeroSection />
            <FeaturesSection />
            <Testimonials />
            <Pricing />
            <FaqSection />
            <BottomBanner />
        </>
    );
}