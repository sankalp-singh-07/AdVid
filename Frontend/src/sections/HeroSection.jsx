import { ChevronRightIcon, SparklesIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HeroSection() {

    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center text-center bg-[url('/assets/hero-section-dot-image.png')] bg-cover bg-no-repeat">

            <button
                onClick={() => navigate("/generate")}
                className="flex items-center gap-2 rounded-full p-1 pr-3 mt-44 text-indigo-600 bg-indigo-50"
            >
                <span className="bg-indigo-600 text-white text-xs px-3.5 py-1 rounded-full">
                    NEW
                </span>

                <p className="flex items-center gap-1">
                    <span>Get 10 credits for free </span>
                    <ChevronRightIcon size={16} />
                </p>
            </button>

            <h1 className="text-[40px]/12 md:text-[54px]/16 font-semibold max-w-3xl mt-4">
                Build, launch and scale{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
                    your AI
                </span>{" "}
                video
            </h1>

            <p className="text-base text-slate-600 max-w-lg mt-5">
                Upload your product and model images, and let AI generate
                stunning ad videos ready for social media. No editing skills required.
            </p>

            <div className="flex items-center gap-4 mt-6">

                <button
                    onClick={() => navigate("/generate")}
                    className="bg-indigo-600 hover:bg-indigo-700 transition px-8 py-3 rounded-md text-white"
                >
                    <span>Get Started</span>
                </button>

                <button className="flex items-center justify-center gap-2 border border-indigo-400 px-5 py-3 rounded-md text-indigo-600">
                    <SparklesIcon size={16} />
                    <span>AI Features</span>
                </button>

            </div>

            <img
                className="w-full max-w-xl mt-16 drop-shadow-2xl drop-shadow-blue-500/15 mx-auto"
                src="/assets/hero-section-card-image.svg"
                alt="Hero Section Card Image"
                width={1000}
                height={500}
                fetchPriority="high"
            />
        </div>
    );
}