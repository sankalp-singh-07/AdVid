import { useNavigate } from "react-router-dom";
import { Bot, Network, Search, FileText, FileSignature, HelpCircle, Layers, Lock, Link as LinkIcon, SplitSquareHorizontal, Database, Globe, DatabaseZap, Box, Cpu, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Features() {
    const navigate = useNavigate();
    const features = [
        { icon: Bot, title: "AI Chat with Documents", desc: "Interact with your enterprise documents naturally." },
        { icon: Network, title: "Retrieval-Augmented Generation (RAG)", desc: "Ground AI responses in factual company data." },
        { icon: Search, title: "Semantic Search", desc: "Find intent, not just exact keywords." },
        { icon: FileText, title: "Document Summarization", desc: "Condense long reports instantly." },
        { icon: FileSignature, title: "AI SOP Generator", desc: "Draft standard operating procedures easily." },
        { icon: HelpCircle, title: "FAQ Generator", desc: "Extract FAQs directly from employee handbooks." },
        { icon: Layers, title: "Multi-document Analysis", desc: "Cross-reference multiple files simultaneously." },
        { icon: Lock, title: "Role-based Access", desc: "Strict data governance and access control." },
        { icon: LinkIcon, title: "Source Citations", desc: "Every AI claim points to exact document pages." },
        { icon: SplitSquareHorizontal, title: "Smart Document Comparison", desc: "Highlight differences between policy versions." },
        { icon: Database, title: "Enterprise Knowledge Base", desc: "Centralize your files in a unified repository." },
        { icon: Globe, title: "Multilingual Support", desc: "Query English documents in over 50 languages." },
        { icon: DatabaseZap, title: "Vector Database Retrieval", desc: "Lightning fast sub-millisecond semantic queries." },
        { icon: Box, title: "LangChain Integration", desc: "Advanced AI pipelines and routing logic." },
        { icon: Cpu, title: "Ollama-powered Private AI", desc: "Run models locally for ultimate privacy." }
    ];

    return (
        <div className="bg-slate-50 min-h-screen">
            <Navbar />
            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Enterprise-Grade AI Capabilities</h1>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto">Explore the comprehensive suite of tools designed to transform your organization's unstructured data into an intelligent knowledge hub.</p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {features.map((feat, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition duration-300 group">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <feat.icon size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{feat.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Architecture Diagram Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm text-center mb-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
                    
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works: The RAG Pipeline</h2>
                    <p className="text-slate-600 mb-12 max-w-2xl mx-auto">Our architecture ensures privacy, accuracy, and speed by converting your documents into vector embeddings before generating AI responses.</p>
                    
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 opacity-90">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <FileText size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Documents</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <SplitSquareHorizontal size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Chunking</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <Network size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Embeddings</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 4 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <DatabaseZap size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Vector DB</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 5 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <Box size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">LangChain</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 6 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white border-2 border-indigo-200 rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 mb-3 z-10 relative">
                                <Cpu size={28} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Ollama</span>
                        </div>

                        <ArrowRight className="hidden lg:block text-slate-300" />
                        <div className="w-0.5 h-6 lg:hidden bg-slate-300"></div>

                        {/* Step 7 */}
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl text-white mb-3 z-10 relative">
                                <Bot size={28} />
                            </div>
                            <span className="text-sm font-bold text-indigo-600">AI Response</span>
                        </div>

                    </div>
                </div>

                <div className="text-center">
                    <button 
                        onClick={() => navigate('/documents')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        Start Building Your AI Knowledge Hub
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
