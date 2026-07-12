import SectionTitle from "../components/SectionTitle";
import { MessageSquareText, Search, FileText, BrainCircuit, ShieldCheck, Zap } from "lucide-react";

export default function FeaturesSection() {
    return (
        <section className="py-20 bg-white">
            <SectionTitle 
                text1="Features" 
                text2="Enterprise Knowledge Capabilities" 
                text3="Transform how your team retrieves and utilizes internal information." 
            />

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">

                {/* Feature 1 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                        <MessageSquareText size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        AI Chat with Documents
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        Have natural conversations with your entire knowledge base. Ask questions and get instant, accurate answers.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                        <Search size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        Smart Document Search
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        Semantic vector search understands the intent behind your queries, finding the exact paragraph you need instantly.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        Instant Summaries
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        Generate concise summaries of 100-page reports in seconds, complete with accurate citations to the source material.
                    </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                        <BrainCircuit size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        Multi-file Reasoning
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        The AI can cross-reference multiple uploaded documents to synthesize comprehensive answers to complex questions.
                    </p>
                </div>

                {/* Feature 5 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6">
                        <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        Secure Enterprise Knowledge
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        Your data remains private. Features role-based access control (RBAC) and support for local Ollama deployments.
                    </p>
                </div>

                {/* Feature 6 */}
                <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition duration-300">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                        <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">
                        AI Document Generator
                    </h3>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        Automatically draft new SOPs, FAQs, and policies based on existing company data and guidelines.
                    </p>
                </div>

            </div>
        </section>
    );
}