import { ChevronRightIcon, Upload, MessageSquare, ShieldCheck, Database, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function HeroSection() {
    const navigate = useNavigate();
    const { isLoggedIn, openAuthModal } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-50 to-white overflow-hidden px-6 pt-32 pb-20">

            {/* Top Badge */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                    if (!isLoggedIn) openAuthModal("login");
                    else navigate("/assistant");
                }}
                className="flex items-center gap-2 rounded-full p-1 pr-3 text-indigo-700 bg-indigo-50 border border-indigo-100 shadow-sm hover:shadow-md transition cursor-pointer"
            >
                <span className="bg-indigo-600 text-white text-xs px-3.5 py-1 rounded-full font-medium">
                    NEW
                </span>
                <p className="flex items-center gap-1 text-sm font-medium">
                    <span>Ollama v3 Integration</span>
                    <ChevronRightIcon size={16} />
                </p>
            </motion.button>

            {/* Heading */}
            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[42px]/tight md:text-[64px]/tight font-extrabold max-w-5xl mt-8 tracking-tight text-slate-900"
            >
                Chat with Your{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                    Company's Knowledge
                </span>
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-slate-600 max-w-3xl mt-6 leading-relaxed"
            >
                Upload documents, ask questions in natural language, generate new content, and retrieve accurate answers using AI-powered Retrieval-Augmented Generation.
            </motion.p>

            {/* Buttons */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 mt-10"
            >
                <button
                    onClick={() => {
                        if (!isLoggedIn) openAuthModal("login");
                        else navigate("/assistant");
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 px-8 py-4 rounded-xl text-white font-semibold shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                    <MessageSquare size={20} />
                    Start Chat
                </button>

                <button
                    onClick={() => {
                        if (!isLoggedIn) openAuthModal("login");
                        else navigate("/documents");
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 px-8 py-4 rounded-xl text-slate-700 font-semibold transition cursor-pointer"
                >
                    <Upload size={20} />
                    Upload Documents
                </button>
            </motion.div>

            {/* Hero Graphic Area */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-20 w-full max-w-6xl relative"
            >
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-400/20 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="grid lg:grid-cols-12 gap-6 relative z-10">
                    
                    {/* Main Chat Interface Mockup */}
                    <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[500px]">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="text-xs font-medium text-slate-500 mx-auto flex items-center gap-2">
                                <ShieldCheck size={14} className="text-green-500" /> Secure Enterprise Environment
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
                            {/* User Message */}
                            <div className="flex items-start gap-4 self-end flex-row-reverse max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                                    ME
                                </div>
                                <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-sm text-sm text-left shadow-md">
                                    Summarize the Q3 Financial Report and extract the key revenue metrics.
                                </div>
                            </div>
                            
                            {/* AI Message */}
                            <div className="flex items-start gap-4 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                    AI
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm text-sm text-left text-slate-700 shadow-sm flex flex-col gap-3">
                                    <p>Based on the <strong>Q3 Financial Report.pdf</strong>, here are the key revenue metrics:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>Total Revenue:</strong> $12.4M (up 15% YoY)</li>
                                        <li><strong>Recurring Revenue:</strong> $9.8M</li>
                                        <li><strong>Net Retention:</strong> 112%</li>
                                    </ul>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded-md border border-slate-200 flex items-center gap-1">
                                            📄 Q3_Financial_Report.pdf (Page 4)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side Info Cards */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 text-left flex flex-col justify-center transform hover:-translate-y-1 transition duration-300">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
                                <Database size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Vector Search</h3>
                            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                                Instantly retrieve exact paragraphs from thousands of internal documents using semantic embeddings.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 shadow-xl shadow-indigo-600/20 rounded-2xl p-6 text-left text-white flex flex-col justify-center transform hover:-translate-y-1 transition duration-300">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white mb-4 backdrop-blur-sm border border-white/30">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Local LLM Supported</h3>
                            <p className="text-indigo-100 mt-2 text-sm leading-relaxed">
                                Connect to local Ollama models to ensure your proprietary data never leaves your secure network.
                            </p>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}