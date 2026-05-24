import SectionTitle from "../components/SectionTitle";

export default function FeaturesSection() {
    return (
        <>
            <SectionTitle 
                text1="Features" 
                text2="AI-Powered Ad Creation" 
                text3="Create stunning, high-converting ad videos from your product images — in seconds." 
            />

            <div className="flex flex-wrap items-center justify-center gap-10 mt-16">

                {/* Feature 1 */}
                <div className="max-w-80 hover:-translate-y-1 hover:scale-[1.02] transition duration-300">
                    <div className="relative">
                        <img 
                            className="rounded-xl w-full h-72 object-cover"
                            src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop"
                            alt="AI Video Generation"
                        />
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-xl"></div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-700 mt-4">
                        AI Video Generation
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Upload your product images and let AI generate engaging ad videos instantly.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="max-w-80 hover:-translate-y-1 hover:scale-[1.02] transition duration-300">
                    <div className="relative">
                        <img 
                            className="rounded-xl w-full h-72 object-cover"
                            src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop"
                            alt="AI Advertisement Creator"
                        />
                        <div className="absolute inset-0 bg-purple-500/10 rounded-xl"></div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-700 mt-4">
                        AI Advertisement Creator
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Generate AI-powered advertisements, promo videos, and social media content for your brand in seconds.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="max-w-80 hover:-translate-y-1 hover:scale-[1.02] transition duration-300">
                    <div className="relative">
                        <img 
                            className="rounded-xl w-full h-72 object-cover"
                            src="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1200&auto=format&fit=crop"
                            alt="Social Media Ads"
                        />
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-xl"></div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-700 mt-4">
                        Social Media Ready
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Export videos optimized for Instagram, TikTok, YouTube, and ad campaigns.
                    </p>
                </div>

            </div>
        </>
    );
}