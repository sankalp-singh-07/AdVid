import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, Sparkles, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import SectionTitle from "../components/SectionTitle";
import { pricingData } from "../data/pricingData";

export default function Pricing() {
    const [isYearly, setIsYearly] = useState(false);
    const [showComparison, setShowComparison] = useState(false);

    // Feature categories for comparison table
    const comparisonFeatures = [
        {
            category: "Core RAG & Retrieval",
            features: [
                { name: "Semantic Search", info: "Search based on context and meaning instead of just keywords.", starter: "Basic", pro: "Advanced", enterprise: "Customizable" },
                { name: "Source Citations", info: "Every answer links back to the exact document and page number.", starter: "Yes", pro: "Yes", enterprise: "Yes" },
                { name: "Multi-document Reasoning", info: "Query across multiple files simultaneously to synthesize facts.", starter: "No", pro: "Yes", enterprise: "Yes" },
                { name: "Cross-file Summaries", info: "Summarize and synthesize information across multiple PDFs.", starter: "No", pro: "Yes", enterprise: "Yes" },
            ]
        },
        {
            category: "Limits & Capacity",
            features: [
                { name: "Documents Limit", info: "Total number of documents you can upload and index.", starter: "100 documents", pro: "Unlimited", enterprise: "Unlimited" },
                { name: "Max File Size", info: "The maximum size limit per single uploaded file.", starter: "20 MB", pro: "100 MB", enterprise: "500 MB (Customizable)" },
                { name: "Monthly Queries", info: "The number of AI questions you can ask per month.", starter: "500 / month", pro: "Unlimited", enterprise: "Unlimited" },
                { name: "Supported Formats", info: "Formats processed by our extraction pipeline.", starter: "PDF, TXT, MD", pro: "PDF, DOCX, XLSX, TXT, MD", enterprise: "All + OCR & Scanned Docs" },
            ]
        },
        {
            category: "Enterprise & Security",
            features: [
                { name: "Data Privacy", info: "How your data is isolated and stored securely.", starter: "Secure Cloud", pro: "Dedicated Workspace", enterprise: "Zero-Data Retention / On-Premise" },
                { name: "Ollama Private AI", info: "Connect to local LLMs to ensure no data ever leaves your network.", starter: "No", pro: "No", enterprise: "Yes (Local/Private)" },
                { name: "Single Sign-On (SSO)", info: "Enterprise SAML/OIDC authentication.", starter: "No", pro: "No", enterprise: "Yes" },
                { name: "Role-based Permissions", info: "Limit document access based on user departments or roles.", starter: "No", pro: "Yes", enterprise: "Yes" },
                { name: "Support SLA", info: "Guaranteed support response times.", starter: "Email (24-48h)", pro: "Priority (12h)", enterprise: "Dedicated 24/7 / custom SLA" },
            ]
        }
    ];

    return (
        <section className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden" id="pricing">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-blue-200/20 rounded-full blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-6">
                <SectionTitle 
                    text1="Pricing Plans" 
                    text2="Flexible Plans For Any Scale" 
                    text3="Choose the plan that fits your organization. Start with our flexible tiers or talk to us for private deployments." 
                />

                {/* Billing Toggle */}
                <div className="flex justify-center items-center gap-4 mt-12 mb-16">
                    <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>Monthly</span>
                    <button 
                        onClick={() => setIsYearly(!isYearly)}
                        className="relative w-14 h-8 bg-indigo-600 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        aria-label="Toggle annual billing"
                    >
                        <motion.div 
                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow animate-none"
                            animate={{ x: isYearly ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
                    <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${isYearly ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                        Yearly
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 animate-pulse">Save 20%</span>
                    </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
                    {pricingData.map((plan, index) => {
                        const monthlyPrice = plan.price;
                        const yearlyPrice = plan.yearlyPrice || Math.round(plan.price * 0.8);
                        const displayedPrice = isYearly ? yearlyPrice : monthlyPrice;

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                className={`flex flex-col relative p-8 rounded-3xl border transition-all ${
                                    plan.mostPopular 
                                    ? "bg-slate-900 text-white border-indigo-500 shadow-xl shadow-indigo-950/20 backdrop-blur-md" 
                                    : "bg-white text-slate-900 border-slate-200 shadow-md shadow-slate-100 hover:border-indigo-200"
                                }`}
                            >
                                {plan.mostPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs py-1.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-bold uppercase tracking-wider shadow-md border border-indigo-400">
                                        <Sparkles size={14} />
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold tracking-tight">{plan.title}</h3>
                                    <div className="mt-4 flex items-baseline">
                                        <span className="text-5xl font-extrabold tracking-tight">
                                            ${displayedPrice}
                                        </span>
                                        <span className={`text-sm ml-2 ${plan.mostPopular ? "text-slate-400" : "text-slate-500"}`}>
                                            /month
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-1.5 font-medium ${plan.mostPopular ? 'text-indigo-400' : 'text-slate-500'}`}>
                                        {isYearly ? `Billed annually ($${displayedPrice * 12}/yr)` : "Billed monthly"}
                                    </p>
                                </div>

                                <hr className={`my-6 ${plan.mostPopular ? "border-slate-800" : "border-slate-100"}`} />

                                <ul className="space-y-4 flex-1 mb-8">
                                    {plan.features.map((feature, i) => {
                                        const Icon = feature.icon || Check;
                                        return (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className={`mt-0.5 rounded-full p-0.5 flex items-center justify-center ${
                                                    plan.mostPopular ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                                }`}>
                                                    <Icon size={14} className="stroke-[3]" />
                                                </div>
                                                <span className={`text-sm ${plan.mostPopular ? "text-slate-300" : "text-slate-600"}`}>
                                                    {feature.name}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button 
                                    className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                                        plan.mostPopular 
                                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30" 
                                        : "bg-slate-900 hover:bg-slate-800 text-white"
                                    }`}
                                >
                                    {plan.buttonText}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Toggle Comparison Button */}
                <div className="flex justify-center mt-20">
                    <button 
                        onClick={() => setShowComparison(!showComparison)}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm border-2 border-indigo-600/10 hover:border-indigo-600/30 px-6 py-3 rounded-xl transition bg-indigo-50/50 cursor-pointer"
                    >
                        <span>{showComparison ? "Hide Detailed Features" : "Compare All Features"}</span>
                        {showComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* Comparison Table */}
                <AnimatePresence>
                    {showComparison && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden mt-12 max-w-5xl mx-auto border border-slate-200 rounded-3xl bg-white shadow-lg shadow-slate-100/50"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="py-5 px-6 font-bold text-slate-800 text-sm">Feature</th>
                                            <th className="py-5 px-6 font-bold text-slate-800 text-sm w-[22%]">Starter</th>
                                            <th className="py-5 px-6 font-bold text-slate-800 text-sm w-[22%]">Professional</th>
                                            <th className="py-5 px-6 font-bold text-indigo-600 text-sm w-[22%]">Enterprise</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {comparisonFeatures.map((cat, idx) => (
                                            <tr key={idx} className="contents">
                                                <tr className="bg-slate-50/30">
                                                    <td colSpan={4} className="py-3 px-6 font-bold text-slate-500 uppercase tracking-wider text-xs bg-slate-50/50">
                                                        {cat.category}
                                                    </td>
                                                </tr>
                                                {cat.features.map((feature, fIdx) => (
                                                    <tr key={fIdx} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="py-4 px-6 font-medium text-slate-700">
                                                            <div className="flex items-center gap-1.5 group/info relative">
                                                                {feature.name}
                                                                <div className="relative cursor-help text-slate-400 hover:text-slate-600 group">
                                                                    <HelpCircle size={14} />
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 text-xs bg-slate-800 text-white rounded-lg shadow-lg z-20 text-center leading-relaxed">
                                                                        {feature.info}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-600">
                                                            {feature.starter === "Yes" ? <Check size={16} className="text-emerald-500" /> : feature.starter === "No" ? <Minus size={16} className="text-slate-300" /> : feature.starter}
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-600">
                                                            {feature.pro === "Yes" ? <Check size={16} className="text-emerald-500" /> : feature.pro === "No" ? <Minus size={16} className="text-slate-300" /> : feature.pro}
                                                        </td>
                                                        <td className="py-4 px-6 font-semibold text-slate-800">
                                                            {feature.enterprise === "Yes" ? <Check size={16} className="text-emerald-500" /> : feature.enterprise === "No" ? <Minus size={16} className="text-slate-300" /> : feature.enterprise}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}