import { ChevronRightIcon, SparklesIcon, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";

export default function HeroSection() {

    const navigate = useNavigate();

    const videoRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(true);

    const handleVideo = () => {

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }

        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex flex-col items-center justify-center text-center bg-[url('/assets/hero-section-dot-image.png')] bg-cover bg-no-repeat overflow-hidden px-6">

            {/* Top Badge */}

            <button
                onClick={() => navigate("/generate")}
                className="flex items-center gap-2 rounded-full p-1 pr-3 mt-32 text-indigo-600 bg-indigo-50 border border-indigo-100"
            >
                <span className="bg-indigo-600 text-white text-xs px-3.5 py-1 rounded-full">
                    NEW
                </span>

                <p className="flex items-center gap-1 text-sm">
                    <span>Get 10 credits for free</span>
                    <ChevronRightIcon size={16} />
                </p>
            </button>

            {/* Heading */}

            <h1 className="text-[38px]/12 md:text-[58px]/15 font-bold max-w-5xl mt-6 tracking-tight">
                Create stunning{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    AI-powered
                </span>{" "}
                advertisement videos
            </h1>

            <p className="text-base md:text-lg text-slate-600 max-w-2xl mt-5 leading-8">
                Turn your product images into engaging social media ads,
                promo videos, and reels using AI automation — fast,
                modern, and editing-free.
            </p>

            {/* Buttons */}

            <div className="flex items-center gap-4 mt-8">

                <button
                    onClick={() => navigate("/generate")}
                    className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 px-8 py-3 rounded-xl text-white font-medium shadow-lg shadow-indigo-500/20"
                >
                    Get Started
                </button>

                <button
                    onClick={() => navigate("/community")}
                    className="flex items-center justify-center gap-2 border border-indigo-300 hover:border-indigo-500 px-6 py-3 rounded-xl text-indigo-600 bg-white transition"
                >
                    <SparklesIcon size={18} />
                    <span>Gallery</span>
                </button>

            </div>

            {/* Hero Section */}

            <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl w-full mt-16">

                {/* Left Side */}

                <div className="relative">

                    <div className="relative bg-white rounded-[32px] p-4 shadow-[0_20px_60px_rgba(79,70,229,0.12)] border border-slate-100">

                        {/* Video */}

                        <div className="relative overflow-hidden rounded-[24px] bg-black group">

                            <video
                                ref={videoRef}
                                className="w-full h-[620px] object-contain rounded-[24px]"
                                src="/assets/tiger-video.mp4"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />

                            {/* Overlay */}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

                            {/* Play Pause Button */}

                            <button
                                onClick={handleVideo}
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                            >

                                <div className="bg-white/90 backdrop-blur-md p-5 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 cursor-pointer">

                                    {
                                        isPlaying ? (
                                            <Pause
                                                className="text-indigo-600"
                                                size={40}
                                            />
                                        ) : (
                                            <Play
                                                className="text-indigo-600 fill-indigo-600 ml-1"
                                                size={40}
                                            />
                                        )
                                    }

                                </div>

                            </button>

                            {/* Top Badge */}

                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium shadow-lg text-slate-700">
                                ✨ AI Generated Video
                            </div>

                            {/* Bottom Text */}

                            <div className="absolute bottom-0 left-0 p-6 text-left text-white">

                                <p className="text-xs opacity-80">
                                    AI Advertisement Generator
                                </p>

                                <h3 className="text-2xl font-bold mt-2 leading-tight max-w-sm">
                                    Turn product images into cinematic videos
                                </h3>

                            </div>

                        </div>

                        {/* Input Image Card */}

                        <div className="absolute -left-8 bottom-10 bg-white rounded-2xl shadow-2xl p-2 border border-slate-100 rotate-[-8deg]">

                            <img
                                className="w-28 h-36 object-cover rounded-xl"
                                src="/assets/tiger-image.jpeg"
                                alt="Input Image"
                            />

                            <div className="mt-2 text-center">

                                <p className="text-[11px] font-semibold text-slate-700">
                                    Input Image
                                </p>

                            </div>

                        </div>

                        {/* AI Arrow */}

                        <div className="absolute left-24 bottom-36 bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-3 py-1 rounded-full text-[11px] font-semibold shadow-xl">
                            AI → Video
                        </div>

                    </div>

                </div>

                {/* Right Side */}

                <div className="flex flex-col gap-5">

                    {/* Stats Card */}

                    <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 text-left">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-slate-500 text-sm">
                                    Generated Content
                                </p>

                                <h3 className="text-3xl font-bold text-slate-800 mt-2">
                                    +42%
                                </h3>

                                <p className="text-slate-500 mt-2 leading-7 text-sm">
                                    Higher engagement with AI-generated
                                    advertisements and promo videos.
                                </p>

                            </div>

                            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl">
                                <SparklesIcon size={26} />
                            </div>

                        </div>

                    </div>

                    {/* Gradient Card */}

                    <div className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 rounded-3xl p-7 text-left text-white shadow-[0_20px_50px_rgba(168,85,247,0.25)]">

                        <p className="text-sm opacity-80">
                            AI Automation
                        </p>

                        <h3 className="text-3xl font-bold mt-3 leading-tight">
                            Generate social media ads in seconds
                        </h3>

                        <p className="mt-3 opacity-90 leading-7 text-sm">
                            Create ad creatives optimized for Instagram,
                            TikTok, YouTube, and marketing campaigns.
                        </p>

                        <div className="flex flex-wrap gap-3 mt-6">

                            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs">
                                Instagram Reels
                            </span>

                            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs">
                                YouTube Ads
                            </span>

                            <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs">
                                HD Export
                            </span>

                        </div>

                    </div>

                    {/* Platform Card */}

                    <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100 text-left">

                        <div className="flex items-center gap-4">

                            <img
                                className="w-16 h-16 rounded-2xl object-cover"
                                src="https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?q=80&w=500&auto=format&fit=crop"
                                alt="Social Media"
                            />

                            <div>

                                <h4 className="text-xl font-semibold text-slate-800">
                                    Multi Platform Ready
                                </h4>

                                <p className="text-slate-500 mt-1 text-sm leading-6">
                                    Export ads optimized for Instagram,
                                    TikTok, YouTube Shorts, and more.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}