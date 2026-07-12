import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud, FileText, Search, LayoutGrid, List, Trash2,
  Loader2, X, CheckCircle2, AlertTriangle, FileSpreadsheet, FileCode,
  RefreshCw, Sparkles,
} from "lucide-react";
import Navbar from "../components/Navbar";
import {
  DocumentListSkeleton,
  StatsSkeleton,
  UploadZoneSkeleton,
  SearchBarSkeleton,
} from "../components/Skeleton";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function DocumentExplorer({ initialTab } = {}) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const uploadSectionRef = useRef(null);
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [activeKbId, setActiveKbId] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [uploadDept, setUploadDept] = useState("General");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [errorToast, setErrorToast] = useState("");

  const departments = ["All", "HR", "Finance", "Engineering", "IT", "General"];
  const statuses = ["All", "Indexed", "Processing", "Failed"];
  const docTypes = ["All", "PDF", "Excel", "Word", "Markdown"];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (initialTab === "upload" && uploadSectionRef.current) {
      setTimeout(() => {
        uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [initialTab]);

  const mapDoc = (backendDoc) => {
    const type = (backendDoc.file_type || ".pdf").substring(1).toUpperCase();
    let status = "Processing";
    if (backendDoc.status === "ready") status = "Indexed";
    if (backendDoc.status === "failed") status = "Failed";
    if (backendDoc.status === "cancelled") status = "Failed";
    if (backendDoc.status === "pending") status = "Processing";

    const sizeInMB = backendDoc.file_size
      ? `${(backendDoc.file_size / (1024 * 1024)).toFixed(1)} MB`
      : "0.0 MB";

    let dateStr = "Recently";
    try {
      const d = new Date(backendDoc.created_at);
      dateStr =
        d.toLocaleDateString() +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      /* ignore */
    }

    return {
      id: backendDoc.id,
      name: backendDoc.original_filename,
      type,
      size: sizeInMB,
      date: dateStr,
      uploader: backendDoc.owner || "You",
      chunks: backendDoc.chunk_count || 0,
      status,
      tags: [backendDoc.department || "General"],
      department: backendDoc.department || "General",
      error_message: backendDoc.error_message,
      rawSize: backendDoc.file_size || 0,
      progress: backendDoc.progress ?? 0,
      stage: backendDoc.stage,
      knowledge_base_id: backendDoc.knowledge_base_id,
      rawStatus: backendDoc.status,
    };
  };

  const fetchKnowledgeBases = async () => {
    try {
      const res = await api.get("/knowledge-bases");
      const kbs = res.data.knowledge_bases || [];
      setKnowledgeBases(kbs);
      if (!activeKbId && kbs.length) {
        const def = kbs.find((k) => k.is_default) || kbs[0];
        setActiveKbId(def.id);
      }
    } catch (err) {
      // KB list failure should not block an empty document view
      console.error("Knowledge bases fetch failed:", err);
      setKnowledgeBases([]);
    }
  };

  const fetchDocuments = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoadingDocs(true);
      try {
        const params = {
          limit: 100,
          offset: 0,
          sort_by: "created_at",
          sort_dir: "desc",
        };
        if (activeKbId) params.knowledge_base_id = activeKbId;
        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedDept !== "All") params.department = selectedDept;
        if (selectedStatus !== "All") params.status = selectedStatus;
        if (selectedType !== "All") params.file_type = selectedType;

        const response = await api.get("/documents", { params });
        const mapped = (response.data.documents || []).map(mapDoc);
        setDocuments(mapped);
        setTotal(response.data.total ?? mapped.length);
        // Empty list is success — clear any prior error
        setErrorToast("");
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        // Empty / no docs is not an error; only real HTTP failures toast
        const status = error.response?.status;
        const detail =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message;
        if (status === 404 || status === 204) {
          setDocuments([]);
          setTotal(0);
          setErrorToast("");
        } else if (status >= 500 || !error.response) {
          // Don't spam "failed to load" when the list is simply empty-shaped;
          // only show for server/network failures
          setDocuments([]);
          setTotal(0);
          setErrorToast(
            typeof detail === "string" && detail.length < 160
              ? detail
              : "Could not load documents. Please try again."
          );
        } else {
          setDocuments([]);
          setTotal(0);
          setErrorToast("");
        }
      } finally {
        if (showLoading) setLoadingDocs(false);
      }
    },
    [activeKbId, debouncedSearch, selectedDept, selectedStatus, selectedType]
  );

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    fetchDocuments(true);
  }, [fetchDocuments]);

  // Poll processing docs with backoff-friendly interval
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "Processing" || d.rawStatus === "pending"
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => fetchDocuments(false), 2500);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("department", uploadDept);
    formData.append("owner", "You");
    if (activeKbId) formData.append("knowledge_base_id", activeKbId);

    try {
      const response = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      const newDocMapped = mapDoc(response.data);
      setDocuments((prev) => [newDocMapped, ...prev]);
      setTotal((t) => t + 1);
      setUploadProgress(100);
      // Upload costs credits — refresh navbar balance
      refreshUser?.().catch(() => {});
    } catch (error) {
      console.error("Upload failed:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        "File upload failed. Please try again.";
      setErrorToast(String(msg));
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(null), 800);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Delete this document and its embeddings?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      if (selectedDocForPreview?.id === id) setSelectedDocForPreview(null);
    } catch {
      setErrorToast("Failed to delete document.");
    }
  };

  const handleRetry = async (id) => {
    try {
      const res = await api.post(`/documents/${id}/retry`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? mapDoc(res.data) : d))
      );
    } catch {
      setErrorToast("Retry failed.");
    }
  };

  const handleCancel = async (id) => {
    try {
      const res = await api.post(`/documents/${id}/cancel`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? mapDoc(res.data) : d))
      );
    } catch {
      setErrorToast("Cancel failed.");
    }
  };

  const handleQuickAction = (action) => {
    const docId = selectedDocForPreview?.id || null;
    let initial_query = "";
    if (action === "Summarize Document") {
      initial_query = docId
        ? "Write a clear, structured executive summary of this document."
        : "Write a clear, structured summary of my knowledge base.";
    } else if (action === "Compare Documents") {
      initial_query = "Compare the key documents in my knowledge base.";
    } else {
      initial_query = docId
        ? `Help me with a ${action} for this document.`
        : `Help me with a ${action} for my knowledge base.`;
    }
    navigate("/assistant", {
      state: {
        document_id: docId,
        knowledge_base_id: activeKbId || null,
        initial_query,
        forceNew: true,
      },
    });
  };

  const openDocChat = (doc) => {
    navigate("/assistant", {
      state: {
        document_id: doc.id,
        knowledge_base_id: activeKbId || doc.knowledge_base_id || null,
        forceNew: true,
      },
    });
  };

  const statsIndexed = documents.filter((d) => d.status === "Indexed").length;
  const statsChunks = documents.reduce((sum, d) => sum + d.chunks, 0);
  const statsDepts = new Set(documents.map((d) => d.department)).size;
  const totalStorageBytes = documents.reduce((sum, d) => sum + d.rawSize, 0);
  const statsStorage = `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`;

  const getDocIcon = (type) => {
    switch (type) {
      case "XLSX":
      case "XLS":
      case "CSV":
      case "EXCEL":
        return <FileSpreadsheet className="text-emerald-600" size={20} />;
      case "MD":
      case "MARKDOWN":
        return <FileCode className="text-orange-500" size={20} />;
      case "DOCX":
      case "DOC":
      case "WORD":
        return <FileText className="text-blue-600" size={20} />;
      default:
        return <FileText className="text-red-500" size={20} />;
    }
  };

  const statusBadge = (doc) => {
    if (doc.status === "Indexed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={10} /> Indexed
        </span>
      );
    }
    if (doc.status === "Failed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
          <AlertTriangle size={10} /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
        <Loader2 size={10} className="animate-spin" />
        {doc.stage || "Processing"} {doc.progress ? `${doc.progress}%` : ""}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF] text-slate-800 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-20 px-6 md:px-16 lg:px-24 xl:px-32 max-w-7xl mx-auto w-full space-y-10">
        {errorToast && (
          <div className="fixed top-20 right-6 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-3">
            {errorToast}
            <button onClick={() => setErrorToast("")}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[#E8EAF5]">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Document Knowledge Base
            </h1>
            <p className="text-[#64748B] mt-2 text-sm leading-relaxed">
              Upload many documents into a knowledge base. Chat searches all of them by default.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeKbId}
              onChange={(e) => setActiveKbId(e.target.value)}
              className="bg-white border border-[#E8EAF5] rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#6D5DFC]"
            >
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-sm"
            >
              <UploadCloud size={16} /> Upload
            </button>
          </div>
        </div>

        {/* Upload zone */}
        <div
          ref={uploadSectionRef}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer shadow-sm relative group
            ${
              dragActive
                ? "border-[#6D5DFC] bg-purple-50/40 scale-[1.01]"
                : "border-[#E8EAF5] hover:border-[#6D5DFC] hover:bg-purple-50/10"
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.csv,.xlsx,.xls"
          />
          <div className="w-16 h-16 bg-purple-50 text-[#6D5DFC] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform border border-purple-100/50">
            {isUploading ? (
              <Loader2 size={32} className="animate-spin" />
            ) : (
              <UploadCloud size={32} />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1.5">
            {isUploading
              ? `Uploading… ${uploadProgress ?? 0}%`
              : "Drag & drop documents"}
          </h3>
          <p className="text-[#64748B] text-xs max-w-lg mx-auto mb-4">
            PDF, DOCX, PPTX, TXT, Markdown, CSV, Excel · 3 credits per upload
          </p>
          {uploadProgress != null && (
            <div className="max-w-sm mx-auto h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          <div className="mb-4" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Department
            </label>
            <select
              value={uploadDept}
              onChange={(e) => setUploadDept(e.target.value)}
              className="bg-white border border-[#E8EAF5] rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              {["General", "Engineering", "Marketing", "Sales", "HR", "Finance", "Legal"].map(
                (d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-[10px] font-bold text-[#6D5DFC]">
            {["Automatic Chunking", "Vectorization", "RAG Indexing"].map((t) => (
              <span
                key={t}
                className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1 flex items-center gap-1.5"
              >
                <CheckCircle2 size={12} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        {loadingDocs ? (
          <StatsSkeleton />
        ) : (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ["Documents Indexed", statsIndexed],
              ["Knowledge Chunks", statsChunks.toLocaleString()],
              ["Departments", statsDepts],
              ["Storage Used", statsStorage],
            ].map(([label, val]) => (
              <div
                key={label}
                className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-3xl font-extrabold text-slate-850 mt-1">{val}</p>
              </div>
            ))}
          </section>
        )}

        {/* Filters */}
        <section className="bg-white border border-[#E8EAF5] rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            {loadingDocs ? (
              <SearchBarSkeleton />
            ) : (
              <div className="relative w-full lg:flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by filename, department, owner…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl text-sm outline-none focus:border-[#6D5DFC]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-white text-[#6D5DFC] shadow-sm" : "text-slate-500"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white text-[#6D5DFC] shadow-sm" : "text-slate-500"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 border-t border-[#E8EAF5]">
            <FilterGroup
              label="Department"
              options={departments}
              value={selectedDept}
              onChange={setSelectedDept}
            />
            <FilterGroup
              label="Status"
              options={statuses}
              value={selectedStatus}
              onChange={setSelectedStatus}
            />
            <FilterGroup
              label="Type"
              options={docTypes}
              value={selectedType}
              onChange={setSelectedType}
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={14} className="text-[#6D5DFC]" /> Quick actions
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {[
              "Summarize Document",
              "Chat with Document",
              "Compare Documents",
              "Generate SOP",
              "Generate FAQ",
            ].map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="px-4 py-2 border border-[#E8EAF5] bg-white hover:bg-purple-50 hover:text-[#6D5DFC] text-xs font-bold text-slate-600 rounded-full transition shadow-xs"
              >
                {action}
              </button>
            ))}
          </div>
        </section>

        {/* Document list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-slate-400">
              {total} document{total === 1 ? "" : "s"}
            </p>
          </div>

          {loadingDocs ? (
            <DocumentListSkeleton view={viewMode} />
          ) : documents.length === 0 ? (
            <div className="bg-white border border-[#E8EAF5] rounded-2xl p-16 text-center">
              <FileText size={40} className="mx-auto text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-800 mb-1">No documents yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                Upload your first document to start building your AI knowledge base.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#6D5DFC] text-white rounded-xl text-sm font-bold"
              >
                Upload document
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {getDocIcon(doc.type)}
                    </div>
                    {statusBadge(doc)}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {doc.size} · {doc.chunks} chunks · {doc.date}
                  </p>
                  {doc.status === "Processing" && (
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${doc.progress || 10}%` }}
                      />
                    </div>
                  )}
                  {doc.error_message && (
                    <p className="text-[10px] text-red-500 mt-2 line-clamp-2">
                      {doc.error_message}
                    </p>
                  )}
                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openDocChat(doc)}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-[#6D5DFC] bg-purple-50 rounded-lg hover:bg-[#6D5DFC] hover:text-white transition"
                    >
                      Chat
                    </button>
                    {doc.status === "Failed" && (
                      <button
                        onClick={() => handleRetry(doc.id)}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-lg flex items-center gap-1"
                      >
                        <RefreshCw size={10} /> Retry
                      </button>
                    )}
                    {doc.status === "Processing" && (
                      <button
                        onClick={() => handleCancel(doc.id)}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-red-500 bg-red-50 rounded-lg ml-auto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E8EAF5] rounded-2xl overflow-hidden divide-y divide-[#E8EAF5]">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {doc.department} · {doc.size} · {doc.chunks} chunks
                    </p>
                  </div>
                  {statusBadge(doc)}
                  <button
                    onClick={() => openDocChat(doc)}
                    className="text-[10px] font-bold text-[#6D5DFC] px-2 py-1"
                  >
                    Chat
                  </button>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[#64748B]">{label}:</span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1 rounded-md transition border ${
              value === opt
                ? "bg-purple-50 text-[#6D5DFC] border-purple-200"
                : "bg-white border-[#E8EAF5] text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
