import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Pricing from "../sections/Pricing";
import { FaqSection } from "../sections/FaqSection";
import BottomBanner from "../sections/BottomBanner";

export default function PricingPage() {
    return (
        <div className="bg-slate-50 min-h-screen">
            <Navbar />
            <main className="pt-20">
                <Pricing />
                <FaqSection />
                <BottomBanner />
            </main>
            <Footer />
        </div>
    );
}
