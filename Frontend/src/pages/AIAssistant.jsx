import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Loader2, Sparkles } from "lucide-react";

export default function AIAssistant() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: "assistant",
            content: "Hello! I am your Enterprise AI Assistant. I can help you find answers in company policies, summarize documents, or query Workday data. What would you like to know?",
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { id: Date.now(), role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Dummy response simulation
        setTimeout(() => {
            const aiMessage = {
                id: Date.now() + 1,
                role: "assistant",
                content: "This is a simulated response based on the uploaded documents. In the real implementation, this will stream from LangChain and Ollama, fetching relevant chunks from Qdrant.",
                citations: [
                    { id: 1, title: "Employee_Handbook_2026.pdf", page: 14 }
                ]
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-slate-800">Knowledge Assistant</h1>
                        <p className="text-sm text-slate-500">Ask questions across all your enterprise documents</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                            ${msg.role === "assistant" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}
                        `}>
                            {msg.role === "assistant" ? <Bot size={18} /> : <User size={18} />}
                        </div>

                        {/* Message Content */}
                        <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div className={`px-4 py-3 rounded-2xl max-w-2xl
                                ${msg.role === "user" 
                                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                                }
                            `}>
                                <p className="leading-relaxed">{msg.content}</p>
                            </div>
                            
                            {/* Citations */}
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="flex gap-2 mt-1">
                                    {msg.citations.map(cite => (
                                        <div key={cite.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                            <FileText size={12} className="text-indigo-500" />
                                            <span>{cite.title}</span>
                                            <span className="text-slate-400">pg {cite.page}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-4 max-w-4xl mx-auto">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                            <Bot size={18} />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                            <span className="text-slate-500 text-sm">Searching knowledge base...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about your documents or Workday data..."
                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-shadow text-slate-800 placeholder-slate-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
                <p className="text-center text-xs text-slate-400 mt-3">
                    AI can make mistakes. Verify important information with original documents.
                </p>
            </div>
        </div>
    );
}
