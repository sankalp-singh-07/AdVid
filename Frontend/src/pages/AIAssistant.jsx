import { useState, useRef, useEffect } from "react";
import { 
    Send, Bot, User, FileText, Loader2, Sparkles, MessageSquare, 
    Plus, Copy, RotateCcw, PanelRightClose, PanelRightOpen, History,
    Search, Trash2, Edit3, Check, X, Paperclip, AlertCircle, RefreshCw,
    Pin, Star, Database, Cpu, Activity, Mic, MicOff, FolderOpen, Layout,
    Info, BookOpen, Layers, Settings, Trash
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../utils/api";

export default function AIAssistant() {
    // ----------------------------------------------------
    // State definitions
    // ----------------------------------------------------
    const [documentCount, setDocumentCount] = useState(0);
    const [chunkCount, setChunkCount] = useState(0);
    const [storageUsed, setStorageUsed] = useState(0);

    const [conversations, setConversations] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const docRes = await api.get("/documents");
                const docs = docRes.data || [];
                setDocumentCount(docs.length);
                let chunks = 0, size = 0;
                docs.forEach(d => { chunks += d.chunks || 0; size += d.size || 0; });
                setChunkCount(chunks);
                setStorageUsed(Number((size / (1024 * 1024)).toFixed(2)));

                const histRes = await api.get("/chat/history");
                const sortedHistory = (histRes.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const mappedChats = sortedHistory.map(c => ({
                    id: c.id,
                    title: c.title || "New Chat",
                    group: "History",
                    isPinned: false,
                    isFavorite: false,
                    messages: []
                }));
                setConversations(mappedChats);
                if (mappedChats.length > 0) setActiveChatId(mappedChats[0].id);
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!activeChatId || String(activeChatId).startsWith("c-")) return;
        const fetchMessages = async () => {
            try {
                const res = await api.get(`/chat/history/${activeChatId}`);
                if (res.data && res.data.messages) {
                    const loaded = res.data.messages.map(m => ({
                        id: m.id, role: m.role, content: m.content, citations: m.citations || [],
                        retrievedCount: m.citations ? m.citations.length : 0,
                        docCount: m.citations ? new Set(m.citations.map(c => c.title)).size : 0
                    }));
                    setConversations(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: loaded } : c));
                }
            } catch (err) {
                console.error(err);
            }
        };
        const chat = conversations.find(c => c.id === activeChatId);
        if (chat && chat.messages.length === 0) fetchMessages();
    }, [activeChatId, conversations]);

    const [searchQuery, setSearchQuery] = useState("");
    const [input, setInput] = useState("");
    
    // Multi-step loading process
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(""); // Searching, Retrieving, Generating
    const [copiedMsgId, setCopiedMsgId] = useState(null);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Active tool state for bottom action bar
    const [selectedTool, setSelectedTool] = useState(null);

    // PDF Preview Modal State
    const [previewDoc, setPreviewDoc] = useState(null);

    // Responsive panel toggles
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // References
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const activeChat = conversations.find(c => c.id === activeChatId);

    // Suggested prompts
    const suggestedPrompts = [
        "Summarize a document",
        "Generate SOP",
        "Explain company policy",
        "Compare two active documents",
        "Create onboarding guide",
        "Create FAQ list"
    ];

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeChat?.messages, isLoading, loadingStep]);

    // ----------------------------------------------------
    // Operations & Chat Handlers
    // ----------------------------------------------------
    const handleNewChat = () => {
        const newChat = {
            id: `c-${Date.now()}`,
            title: `New Session ${conversations.length + 1}`,
            group: "Today",
            isPinned: false,
            isFavorite: false,
            messages: []
        };
        setConversations([newChat, ...conversations]);
        setActiveChatId(newChat.id);
        setShowMobileSidebar(false);
    };

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        try {
            if (!String(chatId).startsWith("c-")) await api.delete(`/chat/${chatId}`);
            const nextChats = conversations.filter(c => c.id !== chatId);
            setConversations(nextChats);
            if (activeChatId === chatId) setActiveChatId(nextChats.length > 0 ? nextChats[0].id : null);
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    const togglePinChat = (e, chatId) => {
        e.stopPropagation();
        setConversations(conversations.map(c => 
            c.id === chatId ? { ...c, isPinned: !c.isPinned } : c
        ));
    };

    const toggleFavoriteChat = (e, chatId) => {
        e.stopPropagation();
        setConversations(conversations.map(c => 
            c.id === chatId ? { ...c, isFavorite: !c.isFavorite } : c
        ));
    };

    const startRenameChat = (e, chat) => {
        e.stopPropagation();
        setEditingChatId(chat.id);
        setEditTitle(chat.title);
    };

    const handleSaveRename = (chatId) => {
        if (editTitle.trim()) {
            setConversations(conversations.map(c => 
                c.id === chatId ? { ...c, title: editTitle.trim() } : c
            ));
        }
        setEditingChatId(null);
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleVoiceToggle = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            // Simulate voice capture
            setTimeout(() => {
                setInput("What are the remote work approval guidelines?");
                setIsRecording(false);
            }, 2500);
        }
    };

    const handleToolClick = (toolName) => {
        setSelectedTool(selectedTool === toolName ? null : toolName);
        handleSend(null, `${toolName} request for active documents`);
    };

    const handleSend = async (e, customText = null) => {
        if (e) e.preventDefault();
        const text = customText || input;
        if (!text.trim() && !attachment && !isLoading) return;
        
        const currentChatId = activeChatId;
        const contentWithAttachment = attachment ? `[Attached: ${attachment.name}]\n\n${text}` : text;
        const userMessage = { id: `msg-user-${Date.now()}`, role: "user", content: contentWithAttachment };

        let isNewChat = false;
        if (!currentChatId || String(currentChatId).startsWith("c-")) {
            isNewChat = true;
            if (currentChatId) {
                setConversations(conversations.map(c => c.id === currentChatId ? { ...c, title: text.slice(0, 24) + "...", messages: [...c.messages, userMessage] } : c));
            } else {
                const newLocalChat = {
                    id: `c-${Date.now()}`, title: text.slice(0, 24) + "...", group: "History",
                    isPinned: false, isFavorite: false, messages: [userMessage]
                };
                setConversations([newLocalChat, ...conversations]);
                setActiveChatId(newLocalChat.id);
            }
        } else {
            setConversations(conversations.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, userMessage] } : c));
        }

        setInput("");
        removeAttachment();
        setIsLoading(true);
        setLoadingStep("Searching Documents...");

        try {
            const requestPayload = {
                query: contentWithAttachment,
                conversation_id: (!currentChatId || String(currentChatId).startsWith("c-")) ? null : currentChatId
            };
            const response = await api.post("/chat", requestPayload);
            const data = response.data;

            const aiMessage = {
                id: data.id || `msg-ai-${Date.now()}`, role: "assistant", content: data.response, citations: data.citations || [],
                retrievedCount: data.citations ? data.citations.length : 0,
                docCount: data.citations ? new Set(data.citations.map(c => c.title)).size : 0
            };

            const newServerChatId = data.conversation_id;
            setConversations(prev => prev.map(c => {
                if (c.id === currentChatId || c.id === activeChatId) {
                    return { ...c, id: newServerChatId || c.id, messages: [...c.messages, aiMessage], title: isNewChat ? (text.slice(0, 24) + "...") : c.title };
                }
                return c;
            }));

            if (isNewChat && newServerChatId) setActiveChatId(newServerChatId);
        } catch (error) {
            console.error(error);
            const errorMsg = { id: `msg-err-${Date.now()}`, role: "assistant", content: "**Error:** Failed to connect to backend.", citations: [] };
            setConversations(prev => prev.map(c => (c.id === currentChatId || c.id === activeChatId) ? { ...c, messages: [...c.messages, errorMsg] } : c));
        } finally {
            setIsLoading(false);
            setLoadingStep("");
            setSelectedTool(null);
        }
    };

    const handleRegenerate = () => {
        if (!activeChat || activeChat.messages.length < 2 || isLoading) return;

        const lastUserIndex = [...activeChat.messages].reverse().findIndex(m => m.role === "user");
        if (lastUserIndex === -1) return;

        const originalMessages = [...activeChat.messages];
        const trimmedMessages = originalMessages.slice(0, originalMessages.length - lastUserIndex);

        setConversations(conversations.map(c => 
            c.id === activeChatId 
                ? { ...c, messages: trimmedMessages }
                : c
        ));

        setIsLoading(true);
        setLoadingStep("Searching Documents...");

        setTimeout(() => {
            setLoadingStep("Retrieving Sources...");
            setTimeout(() => {
                setLoadingStep("Generating Response...");
                setTimeout(() => {
                    const aiMessage = {
                        id: `msg-ai-${Date.now()}`,
                        role: "assistant",
                        retrievedCount: 4,
                        docCount: 2,
                        content: "Regenerated operational guidelines: Standard templates specify that onboarding requirements must complete within the first week of recruitment. HR systems validate completion parameters.",
                        citations: [
                            { id: 203, title: "Employee_Handbook.pdf", page: 2, excerpt: "Onboarding must be completed in the first week.", confidence: 91 }
                        ]
                    };

                    setConversations(prev => prev.map(c => 
                        c.id === activeChatId 
                            ? { ...c, messages: [...c.messages, aiMessage] }
                            : c
                    ));
                    setIsLoading(false);
                    setLoadingStep("");
                }, 800);
            }, 600);
        }, 600);
    };

    const handleCopy = (text, msgId) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2000);
    };

    const handleOpenPreview = (citation) => {
        setPreviewDoc(citation);
    };

    // Filter conversations
    const filteredConversations = conversations.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Separate pinned and unpinned chats
    const pinnedChats = filteredConversations.filter(c => c.isPinned);
    const unpinnedChats = filteredConversations.filter(c => !c.isPinned);

    // Group remaining chats by groups
    const groupedChats = {
        "History": unpinnedChats
    };

    const lastAssistantMsg = activeChat?.messages
        ?.slice()
        ?.reverse()
        ?.find(m => m.role === "assistant");
    const activeCitations = lastAssistantMsg?.citations || [];
    const avgConfidence = activeCitations.length > 0
        ? Math.round(activeCitations.reduce((acc, curr) => acc + curr.confidence, 0) / activeCitations.length)
        : 0;

    // ----------------------------------------------------
    // Markdown/Rich text parser supporting tables
    // ----------------------------------------------------
    const renderMarkdown = (content, msgId) => {
        const parts = content.split(/(```[\s\S]*?```)/g);
        
        return parts.map((part, index) => {
            if (part.startsWith("```")) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                const language = match ? match[1] : "";
                const code = match ? match[2] : part.slice(3, -3);
                
                return (
                    <div key={index} className="my-4 border border-slate-700 bg-slate-900 rounded-xl overflow-hidden shadow-lg font-mono">
                        <div className="bg-slate-850 text-slate-400 text-[10px] px-4 py-2 flex justify-between items-center select-none border-b border-slate-850">
                            <span>{language || "code"}</span>
                            <button 
                                onClick={() => handleCopy(code, `${msgId}-code-${index}`)}
                                className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                            >
                                {copiedMsgId === `${msgId}-code-${index}` ? (
                                    <><Check size={12} className="text-emerald-400" /><span>Copied</span></>
                                ) : (
                                    <><Copy size={12} /><span>Copy code</span></>
                                )}
                            </button>
                        </div>
                        <pre className="p-4 text-xs text-slate-200 overflow-x-auto">
                            <code>{code}</code>
                        </pre>
                    </div>
                );
            }

            const lines = part.split("\n");
            const renderedElements = [];
            let currentTable = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
                    if (!currentTable) {
                        currentTable = { headers: [], rows: [] };
                    }
                    
                    const cells = line.split("|").map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                    
                    if (line.includes("-") && cells.every(c => c.match(/^-+$/))) {
                        continue;
                    }
                    
                    if (currentTable.headers.length === 0) {
                        currentTable.headers = cells;
                    } else {
                        currentTable.rows.push(cells);
                    }
                    continue;
                } else {
                    if (currentTable) {
                        renderedElements.push(renderTableHTML(currentTable, `table-${index}-${i}`));
                        currentTable = null;
                    }
                }

                if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                    const formatted = parseInlineFormatting(line.trim().slice(2));
                    renderedElements.push(<li key={`li-${i}`} className="ml-4 list-disc text-slate-700 leading-relaxed my-1">{formatted}</li>);
                    continue;
                }
                
                const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
                if (numMatch) {
                    const formatted = parseInlineFormatting(numMatch[2]);
                    renderedElements.push(<li key={`num-li-${i}`} className="ml-4 list-decimal text-slate-700 leading-relaxed my-1">{formatted}</li>);
                    continue;
                }

                if (line.trim() === "") {
                    renderedElements.push(<div key={`blank-${i}`} className="h-2" />);
                    continue;
                }

                renderedElements.push(<p key={`p-${i}`} className="text-slate-700 leading-relaxed my-1.5">{parseInlineFormatting(line)}</p>);
            }

            if (currentTable) {
                renderedElements.push(renderTableHTML(currentTable, `table-end-${index}`));
            }

            return <div key={index}>{renderedElements}</div>;
        });
    };

    const renderTableHTML = (table, key) => {
        return (
            <div key={key} className="my-4 overflow-x-auto border border-[#E8EAF5] rounded-xl shadow-sm bg-white">
                <table className="min-w-full divide-y divide-[#E8EAF5] text-left text-xs">
                    <thead className="bg-[#FAFBFF] font-bold text-slate-750 uppercase tracking-wider">
                        <tr>
                            {table.headers.map((h, idx) => (
                                <th key={idx} className="px-4 py-3 border-b border-[#E8EAF5]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-purple-50/10"}>
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-2.5 font-medium">{parseInlineFormatting(cell)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const parseInlineFormatting = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-screen w-full bg-[#FAFBFF] font-sans overflow-hidden">
            {/* 1. Navbar */}
            <Navbar />

            {/* 2. Three-column workspace layout */}
            <div className="flex flex-1 pt-[68px] overflow-hidden relative">
                
                {/* ================================================= */}
                {/* LEFT SIDEBAR (Width: 280px, bg: #FFFFFF, border)  */}
                {/* ================================================= */}
                <aside className={`
                    fixed inset-y-[68px] left-0 z-30 w-[280px] bg-white text-slate-700 border-r border-[#E8EAF5] flex flex-col transition-transform duration-300 md:static md:translate-x-0 shrink-0
                    ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}
                `}>
                    {/* New Chat Button */}
                    <div className="p-4 border-b border-[#E8EAF5]">
                        <button 
                            onClick={handleNewChat}
                            className="flex items-center justify-center gap-2.5 w-full px-4 py-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white rounded-xl transition font-bold text-sm shadow-md cursor-pointer active:scale-[0.98]"
                        >
                            <Plus size={16} /> New Chat
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="p-3 border-b border-[#E8EAF5] relative">
                        <span className="absolute inset-y-0 left-6 flex items-center text-slate-400">
                            <Search size={14} />
                        </span>
                        <input 
                            type="text" 
                            placeholder="Search chats..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6D5DFC] transition"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-6 flex items-center text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Chat groups scroll list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {/* Pinned conversations */}
                        {pinnedChats.length > 0 && (
                            <div className="space-y-1">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5 select-none">
                                    <Pin size={11} className="text-[#6D5DFC] rotate-45" /> Pinned
                                </h3>
                                {pinnedChats.map((chat) => {
                                    const isActive = chat.id === activeChatId;
                                    return (
                                        <div 
                                            key={chat.id}
                                            onClick={() => {
                                                setActiveChatId(chat.id);
                                                setShowMobileSidebar(false);
                                            }}
                                            className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-all
                                                ${isActive 
                                                    ? "bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white font-bold shadow-sm" 
                                                    : "text-slate-600 hover:bg-purple-50/70 hover:text-[#6D5DFC]"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <MessageSquare size={13} className={`shrink-0 ${isActive ? "text-white" : "text-[#6D5DFC]"}`} />
                                                {editingChatId === chat.id ? (
                                                    <input 
                                                        type="text" 
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleSaveRename(chat.id);
                                                            if (e.key === "Escape") setEditingChatId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full bg-white border border-[#E8EAF5] text-slate-800 text-xs px-2 py-0.5 rounded focus:outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="truncate">{chat.title}</span>
                                                )}
                                            </div>
                                            {/* Icons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={(e) => togglePinChat(e, chat.id)} className={`p-0.5 transition-opacity ${isActive ? "text-white" : "text-[#6D5DFC]"}`} title="Unpin"><Pin size={11} /></button>
                                                <button onClick={(e) => toggleFavoriteChat(e, chat.id)} className={`p-0.5 transition-opacity ${isActive ? "text-white" : "text-slate-400 group-hover:text-amber-500"}`} title="Favorite"><Star size={11} className={chat.isFavorite ? "fill-amber-400 text-amber-400" : ""} /></button>
                                                <button onClick={(e) => startRenameChat(e, chat)} className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-white hover:text-white" : "text-slate-400 hover:text-slate-700"}`} title="Rename"><Edit3 size={11} /></button>
                                                <button onClick={(e) => handleDeleteChat(e, chat.id)} className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-white hover:text-white" : "text-slate-400 hover:text-red-500"}`} title="Delete"><Trash2 size={11} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Standard groups */}
                        {Object.entries(groupedChats).map(([groupTitle, list]) => {
                            if (list.length === 0) return null;
                            return (
                                <div key={groupTitle} className="space-y-1">
                                    <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 flex items-center gap-1.5 select-none">
                                        <History size={11} /> {groupTitle}
                                    </h3>
                                    {list.map((chat) => {
                                        const isActive = chat.id === activeChatId;
                                        return (
                                            <div 
                                                key={chat.id}
                                                onClick={() => {
                                                    setActiveChatId(chat.id);
                                                    setShowMobileSidebar(false);
                                                }}
                                                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-all
                                                    ${isActive 
                                                        ? "bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white font-bold shadow-sm" 
                                                        : "text-slate-650 hover:bg-purple-50/70 hover:text-[#6D5DFC]"
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <MessageSquare size={13} className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#6D5DFC]"}`} />
                                                    {editingChatId === chat.id ? (
                                                        <input 
                                                            type="text" 
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveRename(chat.id);
                                                                if (e.key === "Escape") setEditingChatId(null);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full bg-white border border-[#E8EAF5] text-slate-800 text-xs px-2 py-0.5 rounded focus:outline-none"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="truncate">{chat.title}</span>
                                                    )}
                                                </div>
                                                {/* Hover items */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={(e) => togglePinChat(e, chat.id)} className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-white" : "text-slate-400 hover:text-indigo-600"}`} title="Pin"><Pin size={11} /></button>
                                                    <button onClick={(e) => toggleFavoriteChat(e, chat.id)} className={`p-0.5 transition-opacity ${isActive ? "text-white" : "text-slate-400 group-hover:text-amber-500"}`} title="Favorite"><Star size={11} className={chat.isFavorite ? "fill-amber-400 text-amber-400" : ""} /></button>
                                                    <button onClick={(e) => startRenameChat(e, chat)} className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-white" : "text-slate-400 hover:text-slate-700"}`} title="Rename"><Edit3 size={11} /></button>
                                                    <button onClick={(e) => handleDeleteChat(e, chat.id)} className={`p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-white font-bold" : "text-slate-400 hover:text-red-500"}`} title="Delete"><Trash2 size={11} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Sidebar Settings & Stats */}
                    <div className="p-4 border-t border-[#E8EAF5] bg-white text-slate-500 text-[11px] space-y-3 select-none">
                        {/* Storage usage */}
                        <div className="space-y-1">
                            <div className="flex justify-between font-semibold">
                                <span>Storage Limit</span>
                                <span>{storageUsed} MB / 1 GB</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#6D5DFC] rounded-full" style={{ width: `${(storageUsed/1000)*100}%` }}></div>
                            </div>
                        </div>

                        {/* Counts */}
                        <div className="grid grid-cols-2 gap-2 text-center bg-[#FAFBFF] p-2.5 rounded-lg border border-[#E8EAF5]">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Documents</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{documentCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Chunks</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{chunkCount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Mobile sidebar layout overlay */}
                {showMobileSidebar && (
                    <div 
                        className="fixed inset-0 bg-slate-950/10 backdrop-blur-sm z-20 md:hidden pt-[68px]"
                        onClick={() => setShowMobileSidebar(false)}
                    />
                )}

                {/* ================================================= */}
                {/* CENTER CHAT AREA (bg: #FFFFFF)                   */}
                {/* ================================================= */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#FAFBFF] relative h-full overflow-hidden">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[#E8EAF5] flex items-center justify-between shrink-0 bg-white/90 backdrop-blur z-10 w-full select-none">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                <History size={20} />
                            </button>

                            <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
                                <Sparkles className="w-4 h-4 text-[#6D5DFC]" />
                            </div>
                            <div>
                                <h2 className="font-extrabold text-slate-850 text-sm md:text-base leading-tight">
                                    {activeChat ? activeChat.title : "Enterprise Copilot"}
                                </h2>
                                {/* Under-title RAG active status (Light purple badges) */}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#6D5DFC] bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFC] animate-pulse"></span> RAG Active
                                    </span>
                                    <span className="text-[9px] font-bold text-[#6D5DFC] bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-0.5">
                                        Vector DB Connected
                                    </span>
                                    <span className="text-[9px] font-bold text-[#6D5DFC] bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-0.5">
                                        Ollama Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Document Index Control to Toggle Empty State */}
                            <button 
                                onClick={() => {}}
                                className="text-[10px] font-bold text-slate-500 hover:text-[#6D5DFC] hover:bg-purple-50 border border-[#E8EAF5] px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer bg-white shadow-sm"
                                title="Toggle zero document state"
                            >
                                <Info size={12} /> Test Mode: {documentCount === 0 ? "Empty Docs" : "Loaded Docs"}
                            </button>

                            <button 
                                onClick={() => setShowRightPanel(!showRightPanel)}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Toggle context panel"
                            >
                                {showRightPanel ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Chat messages screen */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 pb-48 space-y-6">
                        
                        {/* 1. Global Document Count Empty State */}
                        {documentCount === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center animate-fade-in select-none">
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-full mb-4 ring-8 ring-purple-50/50">
                                    <AlertCircle size={36} className="text-[#6D5DFC]" />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900">No documents available yet.</h3>
                                <p className="text-slate-500 text-sm mt-1 mb-6 leading-relaxed">
                                    Upload documents to start building your organization's vector knowledge base.
                                </p>
                                <button 
                                    onClick={() => setDocumentCount(124)}
                                    className="px-6 py-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Upload Documents
                                </button>
                            </div>
                        ) : conversations.length === 0 ? (
                            /* Active chats empty state */
                            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center select-none">
                                <div className="p-4 bg-purple-50 text-[#6D5DFC] rounded-full mb-4">
                                    <MessageSquare size={32} />
                                </div>
                                <h3 className="text-base font-bold text-slate-800">No conversations</h3>
                                <p className="text-slate-500 text-xs mt-1 mb-6">
                                    Start an active Copilot chat session by clicking the button below.
                                </p>
                                <button onClick={handleNewChat} className="px-5 py-2.5 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer">
                                    Start Chat
                                </button>
                            </div>
                        ) : activeChat?.messages.length === 0 ? (
                            /* Welcome / Empty chat prompts (Using white + subtle purple branding) */
                            <div className="flex flex-col items-center justify-center min-h-[70%] max-w-2xl mx-auto text-center py-6 select-none">
                                <div className="bg-white border border-[#E8EAF5] p-4 rounded-3xl mb-6 shadow-sm ring-8 ring-purple-50/60">
                                    <Bot size={40} className="text-[#6D5DFC]" />
                                </div>
                                <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">How can I help you today?</h2>
                                <p className="text-slate-500 text-sm max-w-md mb-8">
                                    Ask inquiries grounded on indexed company assets, vector embeddings, and private model reasoning.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                                    {suggestedPrompts.map((prompt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSend(null, prompt)} 
                                            className="text-left p-4 rounded-xl border border-[#E8EAF5] bg-white hover:bg-purple-50/55 hover:border-[#6D5DFC]/30 hover:shadow-md transition text-xs font-bold text-slate-700 cursor-pointer flex justify-between items-center group"
                                        >
                                            <span className="flex items-center gap-2">📄 {prompt}</span>
                                            <span className="text-[#6D5DFC] opacity-0 group-hover:opacity-100 transition duration-200">→</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Message Bubbles - Using clean purple/white brand colors */
                            <div className="max-w-3xl mx-auto space-y-6">
                                {activeChat?.messages.map((msg) => {
                                    const isUser = msg.role === "user";
                                    return (
                                        <div key={msg.id} className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} group`}>
                                            {!isUser && (
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm select-none bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] text-white font-bold">
                                                    <Bot size={15} />
                                                </div>
                                            )}

                                            <div className={`min-w-0 max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
                                                <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase select-none">
                                                    {isUser ? "YOU" : "Enterprise Copilot"}
                                                </div>

                                                {/* Chat Cards - White with purple accent borders for assistant, Light purple for User */}
                                                <div className={`rounded-2xl p-5 shadow-sm border transition-all duration-200
                                                    ${isUser 
                                                        ? "bg-purple-50/70 border-[#E8EAF5] text-slate-800 rounded-tr-none text-left" 
                                                        : "bg-white border-[#E8EAF5] border-l-4 border-l-[#6D5DFC] text-slate-800 rounded-tl-none text-left"
                                                    }
                                                `}>
                                                    {/* RAG-specific retrieved banner */}
                                                    {!isUser && (
                                                        <div className="text-[10px] font-bold text-[#6D5DFC] mb-3 bg-purple-50/70 border border-[#E8EAF5] rounded-lg px-2.5 py-1.5 w-max select-none">
                                                            Retrieved {msg.retrievedCount} chunks from {msg.docCount} documents.
                                                        </div>
                                                    )}
                                                    
                                                    {/* Content Markdown */}
                                                    <div className="prose prose-sm prose-slate max-w-none text-slate-800 text-sm leading-relaxed">
                                                        {renderMarkdown(msg.content, msg.id)}
                                                    </div>

                                                    {/* Citations below assistant answers */}
                                                    {!isUser && msg.citations && msg.citations.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-[#E8EAF5]">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">Sources:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {msg.citations.map((cite) => (
                                                                    <button 
                                                                        key={cite.id}
                                                                        onClick={() => handleOpenPreview(cite)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8EAF5] hover:bg-purple-50/50 hover:border-indigo-300 hover:text-[#6D5DFC] rounded-lg text-xs font-semibold text-slate-600 transition cursor-pointer shadow-xs"
                                                                    >
                                                                        <FileText size={12} className="text-red-500" />
                                                                        <span>{cite.title} (Page {cite.page})</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action links */}
                                                {!isUser && (
                                                    <div className="flex items-center gap-2.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleCopy(msg.content, msg.id)}
                                                            className="p-1.5 text-slate-400 hover:text-[#6D5DFC] hover:bg-purple-50 rounded-md transition cursor-pointer"
                                                            title="Copy text"
                                                        >
                                                            {copiedMsgId === msg.id ? (
                                                                <Check size={14} className="text-emerald-500" />
                                                            ) : (
                                                                <Copy size={14} />
                                                            )}
                                                        </button>
                                                        <button 
                                                            onClick={handleRegenerate}
                                                            className="p-1.5 text-slate-400 hover:text-[#6D5DFC] hover:bg-purple-50 rounded-md transition cursor-pointer"
                                                            title="Regenerate"
                                                        >
                                                            <RotateCcw size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isUser && (
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-sm select-none bg-slate-100 border border-[#E8EAF5] text-slate-650 font-bold">
                                                    <User size={15} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* typing anim & multi-step transitions */}
                                {isLoading && (
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 mt-0.5">
                                            <Bot size={15} />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="text-[10px] font-bold text-slate-400 select-none">Enterprise Copilot</div>
                                            <div className="bg-white border border-[#E8EAF5] rounded-2xl px-4 py-3.5 flex flex-col gap-2.5 min-w-[200px] shadow-sm">
                                                {/* Steps */}
                                                <div className="space-y-1.5 select-none">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        {loadingStep === "Searching Documents..." ? (
                                                            <Loader2 size={13} className="text-[#6D5DFC] animate-spin" />
                                                        ) : (
                                                            <Check size={13} className="text-emerald-500 font-bold" />
                                                        )}
                                                        <span className={loadingStep === "Searching Documents..." ? "text-[#6D5DFC] font-semibold" : "text-slate-500"}>
                                                            Searching Documents...
                                                        </span>
                                                    </div>

                                                    {(loadingStep === "Retrieving Sources..." || loadingStep === "Generating Response...") && (
                                                        <div className="flex items-center gap-2 text-xs animate-fade-in">
                                                            {loadingStep === "Retrieving Sources..." ? (
                                                                <Loader2 size={13} className="text-[#6D5DFC] animate-spin" />
                                                            ) : (
                                                                <Check size={13} className="text-emerald-500 font-bold" />
                                                            )}
                                                            <span className={loadingStep === "Retrieving Sources..." ? "text-[#6D5DFC] font-semibold" : "text-slate-500"}>
                                                                Retrieving Sources...
                                                            </span>
                                                        </div>
                                                    )}

                                                    {loadingStep === "Generating Response..." && (
                                                        <div className="flex items-center gap-2 text-xs animate-fade-in">
                                                            <Loader2 size={13} className="text-[#6D5DFC] animate-spin" />
                                                            <span className="text-[#6D5DFC] font-semibold">Generating Response...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Dots Bounce */}
                                                <div className="flex gap-1 items-center py-1">
                                                    <div className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1.5 h-1.5 bg-[#6D5DFC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Bottom Input Area */}
                    {documentCount > 0 && conversations.length > 0 && (
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#FAFBFF] via-[#FAFBFF] to-transparent pt-14 pb-5 px-6 z-10 select-none">
                            <div className="max-w-3xl mx-auto">
                                
                                {/* Attachment file indicator */}
                                {attachment && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-xl text-xs text-indigo-755 mb-2.5 w-max animate-fade-in font-semibold">
                                        <FileText size={13} className="text-[#6D5DFC] shrink-0" />
                                        <span className="truncate max-w-xs">{attachment.name}</span>
                                        <button type="button" onClick={removeAttachment} className="hover:text-red-500 font-bold ml-1 cursor-pointer transition" title="Remove attachment"><X size={14} /></button>
                                    </div>
                                )}

                                {/* Microphone recording visual */}
                                {isRecording && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 mb-2.5 w-max animate-pulse font-medium">
                                        <Mic size={13} className="text-red-500 shrink-0" />
                                        <span>Recording voice query... Click mic to cancel.</span>
                                    </div>
                                )}

                                {/* Input box */}
                                <form onSubmit={handleSend} className="relative flex items-end bg-white border border-[#E8EAF5] rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-[#6D5DFC]/10 focus-within:border-[#6D5DFC] transition-all p-1.5 gap-1.5">
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    
                                    {/* Paperclip */}
                                    <button
                                        type="button"
                                        onClick={handleAttachClick}
                                        className="p-3 bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-[#6D5DFC] rounded-xl transition cursor-pointer shrink-0"
                                        title="Attach Document"
                                    >
                                        <Paperclip size={18} />
                                    </button>

                                    {/* Textarea */}
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Ask anything about your organization's knowledge..."
                                        className="w-full max-h-32 min-h-[44px] px-2 py-3 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-slate-800 placeholder-slate-400 text-sm leading-relaxed"
                                        rows={1}
                                        disabled={isLoading}
                                    />

                                    {/* Voice Input */}
                                    <button
                                        type="button"
                                        onClick={handleVoiceToggle}
                                        className={`p-3 rounded-xl transition cursor-pointer shrink-0 flex items-center justify-center
                                            ${isRecording 
                                                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse" 
                                                : "bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-[#6D5DFC]"
                                            }
                                        `}
                                        title="Voice Input"
                                    >
                                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                                    </button>

                                    {/* Send */}
                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && !attachment) || isLoading}
                                        className="p-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white rounded-xl disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 transition cursor-pointer shrink-0 flex items-center justify-center shadow-md active:scale-95"
                                        title="Send message"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>

                                {/* Quick Tools - White background, purple on hover, gradient when selected */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-3 select-none overflow-x-auto pb-1 max-w-full">
                                    {['Summarize', 'Generate SOP', 'Compare Docs', 'Generate FAQ', 'Policy Review', 'Create Training Guide', 'Meeting Notes'].map((tool) => {
                                        const isSelected = selectedTool === tool;
                                        return (
                                            <button 
                                                key={tool}
                                                type="button" 
                                                onClick={() => handleToolClick(tool)} 
                                                className={`text-[10px] font-bold border rounded-lg px-2.5 py-1.5 transition cursor-pointer shrink-0
                                                    ${isSelected
                                                        ? "bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white border-transparent shadow-sm"
                                                        : "bg-white border-[#E8EAF5] text-slate-650 hover:bg-purple-50 hover:text-[#6D5DFC] hover:border-[#6D5DFC]/20"
                                                    }
                                                `}
                                            >
                                                {tool}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* ================================================= */}
                {/* RIGHT PANEL (Knowledge Sources - bg: white)      */}
                {/* ================================================= */}
                {showRightPanel && (
                    <aside className="hidden lg:flex flex-col w-[320px] border-l border-[#E8EAF5] bg-white shrink-0 h-full overflow-hidden">
                        
                        {/* Status Panel (Light purple badges) */}
                        <div className="p-3 border-b border-[#E8EAF5] bg-[#FAFBFF] grid grid-cols-3 gap-1.5 select-none">
                            <div className="flex items-center justify-center gap-1 py-1 px-1.5 bg-purple-50/60 border border-[#E8EAF5] rounded text-[9px] font-bold text-[#6D5DFC]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFC]"></span> Ollama
                            </div>
                            <div className="flex items-center justify-center gap-1 py-1 px-1.5 bg-purple-50/60 border border-[#E8EAF5] rounded text-[9px] font-bold text-[#6D5DFC]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFC]"></span> Qdrant
                            </div>
                            <div className="flex items-center justify-center gap-1 py-1 px-1.5 bg-purple-50/60 border border-[#E8EAF5] rounded text-[9px] font-bold text-[#6D5DFC]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFC]"></span> Retrieval
                            </div>
                        </div>

                        {/* Title Bar */}
                        <div className="p-4 border-b border-[#E8EAF5] bg-white select-none">
                            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                                <BookOpen size={14} className="text-[#6D5DFC]" /> Knowledge Sources
                            </h3>
                        </div>
                        
                        {/* Knowledge Source Cards List - White cards with purple left border */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFBFF]">
                            {activeCitations.length > 0 ? (
                                activeCitations.map((source) => (
                                    <div key={source.id} className="bg-white border border-[#E8EAF5] border-l-4 border-l-[#6D5DFC] rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200">
                                        <div className="flex items-start justify-between gap-2 mb-2 select-none">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <FileText size={14} className="text-red-500 shrink-0" />
                                                <p className="text-xs font-bold text-slate-700 truncate" title={source.title}>
                                                    {source.title}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-semibold text-[#6D5DFC] bg-purple-50 px-1.5 py-0.5 rounded shrink-0">
                                                Page {source.page}
                                            </span>
                                        </div>

                                        {/* Snippet preview */}
                                        <div className="bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg p-2.5 relative">
                                            <p className="text-[11px] text-slate-650 italic leading-relaxed">
                                                "...{source.excerpt}..."
                                            </p>
                                        </div>

                                        {/* Confidence and Open button */}
                                        <div className="mt-3.5 flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded select-none">
                                                Confidence: {source.confidence}%
                                            </span>
                                            
                                            <button 
                                                onClick={() => handleOpenPreview(source)}
                                                className="text-[#6D5DFC] hover:text-[#8B5CF6] transition cursor-pointer select-none font-bold"
                                            >
                                                [Open Source]
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4 select-none bg-white border border-[#E8EAF5] rounded-2xl shadow-sm">
                                    <AlertCircle size={28} className="text-slate-300 mb-3 animate-pulse" />
                                    <p className="text-xs font-bold text-slate-600">No active sources</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                                        Active query references and chunks will populate here dynamically.
                                    </p>
                                </div>
                            )}

                            {/* Knowledge Context Section */}
                            <div className="border-t border-[#E8EAF5] pt-5 mt-6 space-y-4">
                                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                                    <Layers size={12} /> Knowledge Context
                                </h4>
                                
                                <div className="bg-white border border-[#E8EAF5] rounded-xl p-3.5 space-y-2.5 text-xs shadow-xs">
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500 font-medium">Current Collection</span>
                                        <span className="font-semibold text-slate-800">HR Policies</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500 font-medium">Indexed Documents</span>
                                        <span className="font-semibold text-slate-800">{documentCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500 font-medium">Retrieved Chunks</span>
                                        <span className="font-semibold text-slate-800">{activeCitations.length > 0 ? 5 : 0}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500 font-medium">Embedding Model</span>
                                        <span className="font-semibold text-slate-800 font-mono text-[10px]">nomic-embed-text</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                        <span className="text-slate-500 font-medium">LLM Core</span>
                                        <span className="font-semibold text-slate-800">Llama 3</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Vector Database</span>
                                        <span className="font-semibold text-[#6D5DFC] font-mono text-[10px]">Qdrant v1.9</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* ================================================= */}
            {/* PDF PREVIEW MODAL                                 */}
            {/* ================================================= */}
            {previewDoc && (
                <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl border border-[#E8EAF5] overflow-hidden shadow-2xl flex flex-col animate-scale-up max-h-[85vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-[#E8EAF5] flex justify-between items-center bg-[#FAFBFF] select-none">
                            <div className="flex items-center gap-2.5">
                                <FileText size={18} className="text-red-500" />
                                <h3 className="font-bold text-slate-900 text-sm md:text-base">{previewDoc.title}</h3>
                            </div>
                            <button 
                                onClick={() => setPreviewDoc(null)}
                                className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body content preview */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* Page Indicator */}
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 select-none">
                                <span>Retrieved Match (Confidence: {previewDoc.confidence}%)</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">Page {previewDoc.page} Reference</span>
                            </div>

                        </div>

                        {/* Footer controls */}
                        <div className="px-6 py-4 border-t border-[#E8EAF5] flex justify-end gap-2 bg-[#FAFBFF] select-none">
                            <button 
                                onClick={() => setPreviewDoc(null)}
                                className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Close Preview
                            </button>
                            <a 
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert(`Downloading document: ${previewDoc.title}`);
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                            >
                                <FolderOpen size={13} /> Open Original Document
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
