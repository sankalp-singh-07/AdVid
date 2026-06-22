import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Loader2, Sparkles, MessageSquare, Plus, Copy, RotateCcw, PanelRightClose, PanelRightOpen, History } from "lucide-react";

export default function AIAssistant() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: "assistant",
            content: "Hello! I am your Enterprise AI Assistant. I can help you find answers in company policies, summarize documents, or generate SOPs. What would you like to know?",
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showRightPanel, setShowRightPanel] = useState(true);
    const messagesEndRef = useRef(null);

    const quickPrompts = [
        "Summarize this policy",
        "Explain onboarding process",
        "Generate SOP",
        "Compare two documents",
        "Find reimbursement rules"
    ];

    const chatHistory = [
        "Q3 Financials Summary",
        "Onboarding Process 2025",
        "Travel Policy Updates",
        "Engineering Best Practices"
    ];

    const activeSources = [
        { id: 1, name: "Employee_Handbook_2026.pdf", excerpt: "Section 4.2: All employees are required to submit expense reports within 30 days of travel.", page: 14 },
        { id: 2, name: "Travel_Policy_v2.docx", excerpt: "Reimbursement for meals is capped at $75 per diem.", page: 3 }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e, customText = null) => {
        if (e) e.preventDefault();
        const text = customText || input;
        if (!text.trim() || isLoading) return;

        const userMessage = { id: Date.now(), role: "user", content: text };
        setMessages(prev => [...prev, userMessage]);
        if (!customText) setInput("");
        setIsLoading(true);

        setTimeout(() => {
            const aiMessage = {
                id: Date.now() + 1,
                role: "assistant",
                content: "Based on the retrieved documents, the travel reimbursement policy requires all expenses to be submitted within 30 days. The meal per diem is capped at $75. Let me know if you need help generating a standard operating procedure (SOP) based on these rules.",
                citations: [
                    { id: 1, title: "Employee_Handbook_2026.pdf", page: 14 },
                    { id: 2, title: "Travel_Policy_v2.docx", page: 3 }
                ]
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans">
            
            {/* Left Sidebar: Chat History */}
            <div className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-slate-50 shrink-0">
                <div className="p-4 border-b border-slate-200">
                    <button className="flex items-center gap-2 w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium text-sm shadow-sm">
                        <Plus size={16} /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5"><History size={14}/> Recent</h3>
                    <div className="space-y-1">
                        {chatHistory.map((chat, idx) => (
                            <button key={idx} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-200/50 rounded-md transition truncate">
                                <MessageSquare size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate">{chat}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Center: Chat Interface */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur z-10 absolute top-0 w-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-1.5 rounded-lg">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800 leading-tight">Knowledge Assistant</h2>
                            <p className="text-xs text-slate-500">Ollama v3 Integration Active</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowRightPanel(!showRightPanel)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition"
                        title="Toggle Context Panel"
                    >
                        {showRightPanel ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 pt-24 pb-32 space-y-8 scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-4 max-w-3xl mx-auto group">
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 shadow-sm
                                ${msg.role === "assistant" ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white" : "bg-slate-100 border border-slate-200 text-slate-600"}
                            `}>
                                {msg.role === "assistant" ? <Bot size={18} /> : <User size={18} />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold mb-1 text-slate-800">
                                    {msg.role === "assistant" ? "AI Assistant" : "You"}
                                </div>
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <p className="text-slate-700 leading-relaxed">{msg.content}</p>
                                </div>
                                
                                {msg.role === "assistant" && (
                                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition" title="Copy text"><Copy size={14}/></button>
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition" title="Regenerate"><RotateCcw size={14}/></button>
                                    </div>
                                )}

                                {/* Inline Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {msg.citations.map(cite => (
                                            <button key={cite.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md text-xs text-indigo-700 hover:bg-indigo-100 transition">
                                                <FileText size={12} />
                                                <span>{cite.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex gap-4 max-w-3xl mx-auto">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Bot size={18} />
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                <span className="text-slate-500 text-sm font-medium">Synthesizing documents...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Area */}
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-6">
                    <div className="max-w-3xl mx-auto">
                        
                        {/* Quick Prompts */}
                        {messages.length === 1 && !isLoading && (
                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                                {quickPrompts.map((prompt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSend(null, prompt)}
                                        className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition shadow-sm"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Box */}
                        <form onSubmit={(e) => handleSend(e)} className="relative flex items-end bg-white border border-slate-300 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-400 transition-all">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                placeholder="Ask anything about your uploaded documents..."
                                className="w-full max-h-32 min-h-[56px] pl-4 pr-12 py-4 bg-transparent border-none focus:ring-0 resize-none text-slate-800 placeholder-slate-400 text-sm"
                                rows={1}
                                disabled={isLoading}
                            />
                            <div className="absolute right-2 bottom-2">
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                        <div className="text-center mt-3">
                            <span className="text-[11px] text-slate-400">AI-generated content may be inaccurate. Double-check important info.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Context Panel */}
            {showRightPanel && (
                <div className="hidden xl:flex flex-col w-80 border-l border-slate-200 bg-slate-50 shrink-0">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Database size={16} className="text-indigo-600" /> Current Context
                        </h3>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Retrieved Sources</p>
                        
                        {activeSources.map(source => (
                            <div key={source.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                <div className="flex items-start gap-2 mb-2">
                                    <FileText size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-slate-700 truncate">{source.name}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2 relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l"></div>
                                    <p className="text-xs text-slate-600 italic line-clamp-4 pl-1">"...{source.excerpt}..."</p>
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 text-right font-medium">Page {source.page}</div>
                            </div>
                        ))}

                    </div>
                </div>
            )}
        </div>
    );
}
