import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send, Bot, User, FileText, Loader2, Plus, Copy, RotateCcw,
  History, Search, Trash2, Edit3, Check, X, StopCircle,
  Download, Database, ChevronDown, Sparkles, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  ChatMessagesSkeleton,
  ChatSidebarSkeleton,
} from "../components/Skeleton";
import api, {
  normalizeChatResponse,
  normalizeMessage,
  normalizeCitation,
  streamChat,
  exportConversation,
} from "../utils/api";

export default function AIAssistant() {
  const location = useLocation();
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [activeKbId, setActiveKbId] = useState(
    location.state?.knowledge_base_id || ""
  );
  const [allDocuments, setAllDocuments] = useState([]);
  const [selectedContextDocId, setSelectedContextDocId] = useState(
    location.state?.document_id || ""
  );

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const abortRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialQueryFired = useRef(false);

  const activeChat = conversations.find((c) => c.id === activeChatId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, streamingText, isLoading, scrollToBottom]);

  // Boot: KBs + docs + history in parallel
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setBootLoading(true);
      try {
        const [kbRes, docRes, histRes] = await Promise.all([
          api.get("/knowledge-bases"),
          api.get("/documents", { params: { limit: 100 } }),
          api.get("/chat/history", { params: { limit: 50 } }),
        ]);
        if (cancelled) return;

        const kbs = kbRes.data.knowledge_bases || [];
        setKnowledgeBases(kbs);
        const defaultKb =
          location.state?.knowledge_base_id ||
          kbs.find((k) => k.is_default)?.id ||
          kbs[0]?.id ||
          "";
        setActiveKbId((prev) => prev || defaultKb);

        const docs = docRes.data.documents || [];
        setAllDocuments(docs);

        const mapped = (histRes.data.conversations || []).map((c) => ({
          id: c.id,
          title: c.title || "New Chat",
          knowledge_base_id: c.knowledge_base_id,
          document_id: c.document_id,
          messages: [],
          loaded: false,
        }));
        setConversations(mapped);

        if (location.state?.initial_query && !initialQueryFired.current) {
          initialQueryFired.current = true;
          const q = location.state.initial_query;
          const docId = location.state.document_id || "";
          const kbId = location.state.knowledge_base_id || defaultKb;
          setSelectedContextDocId(docId);
          setActiveKbId(kbId);
          window.history.replaceState({}, document.title);
          // Create local chat and send
          const localId = `c-${Date.now()}`;
          setConversations((prev) => [
            {
              id: localId,
              title: q.slice(0, 40),
              messages: [{ id: `u-${Date.now()}`, role: "user", content: q, citations: [] }],
              loaded: true,
            },
            ...prev,
          ]);
          setActiveChatId(localId);
          // defer send until state settles
          setTimeout(() => {
            sendMessage(q, {
              chatId: localId,
              documentId: docId,
              knowledgeBaseId: kbId,
              skipUserAppend: true,
            });
          }, 50);
        } else if (mapped.length > 0) {
          setActiveChatId(mapped[0].id);
        }
      } catch (err) {
        // Partial failures (e.g. empty history) should not brick the chat UI
        console.error("Boot failed", err);
        if (!cancelled) {
          setConversations((prev) => prev || []);
          setAllDocuments((prev) => prev || []);
          setKnowledgeBases((prev) => prev || []);
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when selecting a server chat
  useEffect(() => {
    if (!activeChatId || String(activeChatId).startsWith("c-")) return;
    const chat = conversations.find((c) => c.id === activeChatId);
    if (!chat || chat.loaded) return;

    let cancelled = false;
    const load = async () => {
      setMessagesLoading(true);
      try {
        const res = await api.get(`/chat/history/${activeChatId}`);
        if (cancelled) return;
        const loaded = (res.data.messages || []).map(normalizeMessage);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: loaded,
                  loaded: true,
                  knowledge_base_id: res.data.knowledge_base_id,
                  document_id: res.data.document_id,
                }
              : c
          )
        );
        if (res.data.knowledge_base_id) setActiveKbId(res.data.knowledge_base_id);
        if (res.data.document_id) setSelectedContextDocId(res.data.document_id || "");
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, conversations]);

  const kbDocs = useMemo(() => {
    if (!activeKbId) return allDocuments;
    return allDocuments.filter(
      (d) => !d.knowledge_base_id || d.knowledge_base_id === activeKbId
    );
  }, [allDocuments, activeKbId]);

  const readyDocs = kbDocs.filter((d) => d.status === "ready");

  const handleNewChat = () => {
    const id = `c-${Date.now()}`;
    setConversations((prev) => [
      { id, title: "New Session", messages: [], loaded: true },
      ...prev,
    ]);
    setActiveChatId(id);
    setShowMobileSidebar(false);
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      if (!String(chatId).startsWith("c-")) await api.delete(`/chat/${chatId}`);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== chatId);
        if (activeChatId === chatId) {
          setActiveChatId(next[0]?.id || null);
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRename = async (chatId) => {
    const title = editTitle.trim();
    if (!title) {
      setEditingChatId(null);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title } : c))
    );
    setEditingChatId(null);
    if (!String(chatId).startsWith("c-")) {
      try {
        await api.patch(`/chat/history/${chatId}`, { title });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  };

  const sendMessage = async (
    text,
    {
      chatId = activeChatId,
      documentId = selectedContextDocId,
      knowledgeBaseId = activeKbId,
      skipUserAppend = false,
    } = {}
  ) => {
    const query = (text || "").trim();
    if (!query || isLoading) return;

    let currentId = chatId;
    if (!currentId) {
      currentId = `c-${Date.now()}`;
      setConversations((prev) => [
        { id: currentId, title: query.slice(0, 40), messages: [], loaded: true },
        ...prev,
      ]);
      setActiveChatId(currentId);
    }

    const userMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: query,
      citations: [],
    };

    if (!skipUserAppend) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? {
                ...c,
                title:
                  c.messages.length === 0 ? query.slice(0, 40) : c.title,
                messages: [...c.messages, userMessage],
              }
            : c
        )
      );
    }

    setInput("");
    setIsLoading(true);
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;

    let serverConvId = String(currentId).startsWith("c-") ? null : currentId;
    let citations = [];
    let assembled = "";

    try {
      await streamChat(
        {
          query,
          conversation_id: serverConvId,
          document_id: documentId || null,
          knowledge_base_id: knowledgeBaseId || null,
        },
        {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "meta" && event.conversation_id) {
              serverConvId = event.conversation_id;
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === currentId
                    ? { ...c, id: event.conversation_id }
                    : c
                )
              );
              setActiveChatId(event.conversation_id);
              currentId = event.conversation_id;
            }
            if (event.type === "citations") {
              citations = (event.citations || []).map(normalizeCitation);
            }
            if (event.type === "token") {
              assembled += event.content || "";
              setStreamingText(assembled);
            }
            if (event.type === "done") {
              const finalAnswer = event.answer || assembled;
              citations = (event.citations || citations).map(normalizeCitation);
              const finalId = event.conversation_id || currentId;
              const aiMessage = {
                id: event.message_id || `msg-ai-${Date.now()}`,
                role: "assistant",
                content: finalAnswer,
                citations,
              };
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === currentId || c.id === finalId
                    ? {
                        ...c,
                        id: finalId,
                        messages: [
                          ...c.messages.filter((m) => m.role !== "streaming"),
                          aiMessage,
                        ],
                        loaded: true,
                      }
                    : c
                )
              );
              setActiveChatId(finalId);
              setStreamingText("");
            }
            if (event.type === "error") {
              throw new Error(event.detail || "Stream error");
            }
          },
        }
      );
    } catch (err) {
      if (err.name === "AbortError") {
        if (assembled) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentId
                ? {
                    ...c,
                    messages: [
                      ...c.messages,
                      {
                        id: `msg-ai-${Date.now()}`,
                        role: "assistant",
                        content: assembled + "\n\n*(Generation stopped)*",
                        citations,
                      },
                    ],
                  }
                : c
            )
          );
        }
      } else {
        console.error(err);
        // Fallback non-stream
        try {
          const res = await api.post("/chat", {
            query,
            conversation_id: serverConvId,
            document_id: documentId || null,
            knowledge_base_id: knowledgeBaseId || null,
          });
          const data = normalizeChatResponse(res.data);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentId || c.id === data.conversation_id
                ? {
                    ...c,
                    id: data.conversation_id,
                    messages: [
                      ...c.messages,
                      {
                        id: data.message_id,
                        role: "assistant",
                        content: data.answer,
                        citations: data.citations,
                      },
                    ],
                    loaded: true,
                  }
                : c
            )
          );
          setActiveChatId(data.conversation_id);
        } catch (fallbackErr) {
          const msg =
            fallbackErr.response?.data?.message ||
            fallbackErr.message ||
            "Failed to get a response.";
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentId
                ? {
                    ...c,
                    messages: [
                      ...c.messages,
                      {
                        id: `err-${Date.now()}`,
                        role: "assistant",
                        content: `**Error:** ${msg}`,
                        citations: [],
                      },
                    ],
                  }
                : c
            )
          );
        }
      }
    } finally {
      setIsLoading(false);
      setStreamingText("");
      abortRef.current = null;
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const handleRegenerate = async () => {
    if (!activeChatId || String(activeChatId).startsWith("c-") || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.post("/chat/regenerate", {
        conversation_id: activeChatId,
      });
      const data = normalizeChatResponse(res.data);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeChatId) return c;
          const msgs = [...c.messages];
          // Replace last assistant message
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "assistant") {
              msgs[i] = {
                id: data.message_id,
                role: "assistant",
                content: data.answer,
                citations: data.citations,
              };
              break;
            }
          }
          return { ...c, messages: msgs };
        })
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text, msgId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleExport = async (format) => {
    if (!activeChatId || String(activeChatId).startsWith("c-")) return;
    setExportOpen(false);
    try {
      await exportConversation(activeChatId, format);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lastAssistant = [...(activeChat?.messages || [])]
    .reverse()
    .find((m) => m.role === "assistant");
  const activeCitations = lastAssistant?.citations || [];

  const renderMarkdown = (content) => {
    if (!content) return null;
    const lines = content.split("\n");
    const elements = [];
    let table = null;

    const flushTable = (key) => {
      if (!table) return;
      elements.push(
        <div key={key} className="my-3 overflow-x-auto border border-[#E8EAF5] rounded-xl">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#FAFBFF]">
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-bold border-b border-[#E8EAF5]">
                    {inlineFmt(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-purple-50/20" : ""}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 border-t border-slate-100">
                      {inlineFmt(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      table = null;
    };

    const inlineFmt = (text) => {
      const parts = String(text).split(/(\*\*.*?\*\*|`[^`]+`|\[\d+\])/g);
      return parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={i} className="bg-slate-100 px-1 rounded text-[12px] font-mono">
              {p.slice(1, -1)}
            </code>
          );
        }
        if (/^\[\d+\]$/.test(p)) {
          return (
            <sup key={i} className="text-[#6D5DFC] font-bold mx-0.5">
              {p}
            </sup>
          );
        }
        return <span key={i}>{p}</span>;
      });
    };

    lines.forEach((line, i) => {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.every((c) => /^[-:]+$/.test(c))) return;
        if (!table) table = { headers: [], rows: [] };
        if (!table.headers.length) table.headers = cells;
        else table.rows.push(cells);
        return;
      }
      flushTable(`t-${i}`);

      if (/^###\s/.test(line)) {
        elements.push(
          <h4 key={i} className="text-sm font-bold text-slate-900 mt-3 mb-1">
            {inlineFmt(line.replace(/^###\s/, ""))}
          </h4>
        );
        return;
      }
      if (/^##\s/.test(line)) {
        elements.push(
          <h3 key={i} className="text-base font-extrabold text-slate-900 mt-4 mb-1">
            {inlineFmt(line.replace(/^##\s/, ""))}
          </h3>
        );
        return;
      }
      if (/^#\s/.test(line)) {
        elements.push(
          <h2 key={i} className="text-lg font-extrabold text-slate-900 mt-4 mb-1">
            {inlineFmt(line.replace(/^#\s/, ""))}
          </h2>
        );
        return;
      }
      if (/^[-*]\s/.test(line.trim())) {
        elements.push(
          <li key={i} className="ml-4 list-disc text-slate-700 my-0.5 leading-relaxed">
            {inlineFmt(line.trim().replace(/^[-*]\s/, ""))}
          </li>
        );
        return;
      }
      const num = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (num) {
        elements.push(
          <li key={i} className="ml-4 list-decimal text-slate-700 my-0.5 leading-relaxed">
            {inlineFmt(num[2])}
          </li>
        );
        return;
      }
      if (!line.trim()) {
        elements.push(<div key={i} className="h-2" />);
        return;
      }
      elements.push(
        <p key={i} className="text-slate-700 leading-relaxed my-1">
          {inlineFmt(line)}
        </p>
      );
    });
    flushTable("t-end");
    return <div className="space-y-0.5">{elements}</div>;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAFBFF] font-sans overflow-hidden">
      <Navbar />

      <div className="flex flex-1 pt-[68px] overflow-hidden relative">
        {/* Left sidebar */}
        <aside
          className={`
            fixed inset-y-[68px] left-0 z-30 w-[280px] bg-white border-r border-[#E8EAF5] flex flex-col transition-transform duration-300 md:static md:translate-x-0 shrink-0
            ${showMobileSidebar ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="p-4 border-b border-[#E8EAF5] space-y-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white py-2.5 rounded-xl font-bold text-sm shadow-md"
            >
              <Plus size={16} /> New chat
            </button>

            {/* Knowledge base picker */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Knowledge Base
              </label>
              <div className="relative mt-1">
                <select
                  value={activeKbId}
                  onChange={(e) => {
                    setActiveKbId(e.target.value);
                    setSelectedContextDocId("");
                  }}
                  className="w-full appearance-none bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#6D5DFC]"
                >
                  {knowledgeBases.length === 0 && (
                    <option value="">Default</option>
                  )}
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name} ({kb.ready_document_count || 0} ready)
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-2 bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg text-xs outline-none focus:border-[#6D5DFC]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {bootLoading ? (
              <ChatSidebarSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <History size={24} className="mx-auto mb-2 opacity-50" />
                No conversations yet
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredConversations.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setShowMobileSidebar(false);
                    }}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                      activeChatId === chat.id
                        ? "bg-purple-50 text-[#6D5DFC]"
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <MessageIcon />
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveRename(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(chat.id);
                            if (e.key === "Escape") setEditingChatId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs font-semibold bg-white border border-[#6D5DFC] rounded px-1 py-0.5"
                        />
                      ) : (
                        <p className="text-xs font-semibold truncate">{chat.title}</p>
                      )}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditTitle(chat.title);
                        }}
                        className="p-1 hover:bg-white rounded"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main chat column */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#FAFBFF]">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-[#E8EAF5] bg-white/80 backdrop-blur flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setShowMobileSidebar(true)}
              >
                <History size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-slate-900 truncate">
                  {activeChat?.title || "AI Assistant"}
                </h1>
                <p className="text-[10px] text-slate-400 truncate">
                  Searching {readyDocs.length} ready docs
                  {selectedContextDocId ? " · filtered to 1 document" : " · full knowledge base"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={!activeChatId || String(activeChatId).startsWith("c-")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-[#E8EAF5] rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <Download size={14} /> Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E8EAF5] rounded-xl shadow-lg z-20 py-1">
                    {["markdown", "txt", "pdf"].map((f) => (
                      <button
                        key={f}
                        onClick={() => handleExport(f)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-purple-50 capitalize"
                      >
                        {f === "markdown" ? "Markdown" : f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowRightPanel((v) => !v)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                title="Toggle sources"
              >
                {showRightPanel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {bootLoading || messagesLoading ? (
              <ChatMessagesSkeleton />
            ) : !activeChat || activeChat.messages.length === 0 ? (
              <EmptyChat
                onPrompt={(p) => sendMessage(p)}
                docCount={readyDocs.length}
              />
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {activeChat.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow">
                          <Bot size={16} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          isUser
                            ? "bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white"
                            : "bg-white border border-[#E8EAF5] text-slate-800"
                        }`}
                      >
                        {isUser ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                        ) : (
                          <div className="text-sm">{renderMarkdown(msg.content)}</div>
                        )}

                        {!isUser && msg.citations?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-[#6D5DFC] rounded-lg text-[10px] font-bold border border-purple-100"
                                  title={c.excerpt}
                                >
                                  <FileText size={10} />
                                  {c.title || c.filename} · p.{c.page}
                                  {c.confidence != null && (
                                    <span className="text-slate-400 font-medium">
                                      {c.confidence}%
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isUser && (
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              title="Copy"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check size={14} className="text-emerald-500" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            <button
                              onClick={handleRegenerate}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              title="Regenerate"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          <User size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming bubble */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] flex items-center justify-center text-white shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-[#E8EAF5] shadow-sm">
                      {streamingText ? (
                        <div className="text-sm">{renderMarkdown(streamingText)}</div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Loader2 size={14} className="animate-spin text-[#6D5DFC]" />
                          Retrieving from knowledge base…
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-[#E8EAF5] bg-white p-4 shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedContextDocId}
                  onChange={(e) => setSelectedContextDocId(e.target.value)}
                  className="text-[11px] font-semibold bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg px-2 py-1.5 outline-none focus:border-[#6D5DFC] max-w-[220px]"
                >
                  <option value="">All documents in KB</option>
                  {readyDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.original_filename}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 font-medium">
                  Optional filter · default is entire knowledge base
                </span>
              </div>

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything about your knowledge base…"
                  className="flex-1 resize-none max-h-32 px-4 py-3 bg-[#FAFBFF] border border-[#E8EAF5] rounded-2xl text-sm outline-none focus:border-[#6D5DFC] focus:ring-2 focus:ring-indigo-100"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="p-3 rounded-2xl bg-red-500 text-white shadow-md hover:bg-red-600"
                    title="Stop"
                  >
                    <StopCircle size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-3 rounded-2xl bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white shadow-md disabled:opacity-40"
                  >
                    <Send size={18} />
                  </button>
                )}
              </form>
            </div>
          </div>
        </main>

        {/* Right sources panel */}
        {showRightPanel && (
          <aside className="hidden lg:flex w-[280px] border-l border-[#E8EAF5] bg-white flex-col shrink-0">
            <div className="p-4 border-b border-[#E8EAF5]">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Database size={14} className="text-[#6D5DFC]" /> Active sources
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeCitations.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">
                  Sources from the latest answer appear here.
                </p>
              ) : (
                activeCitations.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-[#E8EAF5] bg-[#FAFBFF] space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {c.title || c.filename}
                      </p>
                      <span className="text-[10px] font-bold text-[#6D5DFC] shrink-0">
                        {c.confidence}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Page {c.page}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                      {c.excerpt || c.content}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-[#E8EAF5] text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Documents (KB)</span>
                <span className="font-semibold text-slate-600">{kbDocs.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Ready</span>
                <span className="font-semibold text-emerald-600">{readyDocs.length}</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function MessageIcon() {
  return <Sparkles size={14} className="shrink-0 opacity-70" />;
}

function EmptyChat({ onPrompt, docCount }) {
  const prompts = [
    "Summarize the key policies in my knowledge base",
    "What are the onboarding steps?",
    "Compare overlapping guidelines across documents",
    "Create an FAQ from my documents",
  ];
  return (
    <div className="max-w-xl mx-auto text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#6D5DFC] to-[#8B5CF6] flex items-center justify-center text-white shadow-lg">
        <Bot size={28} />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">
        Chat with your knowledge base
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {docCount > 0
          ? `${docCount} ready document${docCount === 1 ? "" : "s"} available for retrieval.`
          : "Upload documents to start building your knowledge base."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="text-left text-xs font-semibold px-3 py-3 rounded-xl border border-[#E8EAF5] bg-white hover:border-[#6D5DFC]/40 hover:bg-purple-50 text-slate-600 transition"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
