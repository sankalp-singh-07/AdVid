import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    UploadCloud, FileText, Search, Filter, Clock, User as UserIcon, 
    LayoutGrid, List, MessageSquare, Database, Trash2, ExternalLink, 
    ChevronDown, Sparkles, BookOpen, Layers, CheckCircle2, AlertTriangle, 
    Loader2, Download, Eye, FileSpreadsheet, FileCode, Check, X, 
    Folder, HelpCircle, ShieldAlert
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function DocumentExplorer() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ----------------------------------------------------
    // State management
    // ----------------------------------------------------
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [viewMode, setViewMode] = useState("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Filter states
    const [selectedDept, setSelectedDept] = useState("All");
    const [uploadDept, setUploadDept] = useState("General");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedType, setSelectedType] = useState("All");

    // Modal state
    const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);

    // Refs
    const fileInputRef = useRef(null);

    // Unique departments, statuses, types for filters
    const departments = ["All", "HR", "Finance", "Engineering", "IT", "General"];
    const statuses = ["All", "Indexed", "Processing", "Failed"];
    const docTypes = ["All", "PDF", "Excel", "Word", "Markdown"];

    const mapDoc = (backendDoc) => {
        const type = (backendDoc.file_type || ".pdf").substring(1).toUpperCase();
        let status = "Processing";
        if (backendDoc.status === "ready") status = "Indexed";
        if (backendDoc.status === "failed") status = "Failed";
        
        const sizeInMB = backendDoc.file_size ? `${(backendDoc.file_size / (1024 * 1024)).toFixed(1)} MB` : "0.0 MB";

        let dateStr = "Recently";
        try {
            const d = new Date(backendDoc.created_at);
            dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (e) {}

        return {
            id: backendDoc.id,
            name: backendDoc.original_filename,
            type: type,
            size: sizeInMB,
            date: dateStr,
            uploader: backendDoc.owner || "You",
            chunks: backendDoc.chunk_count || 0,
            status: status,
            tags: [backendDoc.department || "General"],
            department: backendDoc.department || "General",
            error_message: backendDoc.error_message,
            rawSize: backendDoc.file_size || 0
        };
    };

    const fetchDocuments = async (showLoading = false) => {
        if (showLoading) setLoadingDocs(true);
        try {
            const response = await api.get("/documents");
            const mapped = (response.data.documents || []).map(mapDoc);
            setDocuments(mapped);
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            if (showLoading) setLoadingDocs(false);
        }
    };

    // Load documents on mount
    useEffect(() => {
        fetchDocuments(true);
    }, []);

    // Poll status if any documents are Processing
    useEffect(() => {
        const hasProcessing = documents.some(d => d.status === "Processing");
        if (!hasProcessing) return;

        const interval = setInterval(() => {
            fetchDocuments(false);
        }, 3000);

        return () => clearInterval(interval);
    }, [documents]);

    // ----------------------------------------------------
    // Drag & Drop Handlers
    // ----------------------------------------------------
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("department", uploadDept);
        formData.append("owner", "You");

        try {
            const response = await api.post("/documents/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const newDocMapped = mapDoc(response.data);
            setDocuments(prev => [newDocMapped, ...prev]);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("File upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDoc = async (id) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            await api.delete(`/documents/${id}`);
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete document.");
        }
    };

    const handleUpdateDepartment = async (id, newDept) => {
        try {
            await api.patch(`/documents/${id}`, { department: newDept });
            setDocuments(documents.map(d => d.id === id ? { ...d, department: newDept } : d));
            if (selectedDocForPreview?.id === id) {
                setSelectedDocForPreview(prev => ({ ...prev, department: newDept }));
            }
        } catch (error) {
            console.error("Failed to update department:", error);
            alert("Failed to update department.");
        }
    };

    const handleQuickAction = (action) => {
        let docId = selectedDocForPreview ? selectedDocForPreview.id : null;
        let initial_query = "";
        if (action === "Summarize Document") initial_query = docId ? "Write a clear, structured, and comprehensive executive summary of this document." : "Write a clear, structured summary of my knowledge base.";
        else if (action === "Compare Documents") initial_query = docId ? "Compare this document with others in my knowledge base." : "Compare the key documents in my knowledge base.";
        else initial_query = docId ? `Help me with a ${action} for this document.` : `Help me with a ${action} for my knowledge base.`;

        navigate("/assistant", { 
            state: { 
                document_id: docId,
                initial_query: initial_query
            } 
        });
    };

    const handleOpenPreview = (doc) => {
        setSelectedDocForPreview(doc);
    };

    // Filter documents
    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDept = selectedDept === "All" || doc.department === selectedDept;
        const matchesStatus = selectedStatus === "All" || doc.status === selectedStatus;
        const matchesType = selectedType === "All" || doc.type === selectedType;

        return matchesSearch && matchesDept && matchesStatus && matchesType;
    });

    // Stats calculations
    const statsIndexed = documents.filter(d => d.status === "Indexed").length;
    const statsChunks = documents.reduce((sum, d) => sum + d.chunks, 0);
    const statsDepts = new Set(documents.map(d => d.department)).size;
    const totalStorageBytes = documents.reduce((sum, d) => sum + d.rawSize, 0);
    const statsStorage = `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`;

    // Dynamic icon selection
    const getDocIcon = (type) => {
        switch(type) {
            case "Excel": return <FileSpreadsheet className="text-emerald-600" size={20} />;
            case "Markdown": return <FileCode className="text-orange-500" size={20} />;
            case "Word": return <FileText className="text-blue-600" size={20} />;
            default: return <FileText className="text-red-500" size={20} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFBFF] text-slate-800 flex flex-col font-sans">
            {/* Sticky Global Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 pt-24 pb-20 px-6 md:px-16 lg:px-24 xl:px-32 max-w-7xl mx-auto w-full space-y-12">
                
                {/* 1. Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[#E8EAF5] select-none">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Document Knowledge Base</h1>
                        <p className="text-[#64748B] mt-2 text-sm md:text-base leading-relaxed">
                            Upload, organize, search, and interact with enterprise documents using AI-powered retrieval and intelligent search.
                        </p>
                    </div>
                    <button 
                        onClick={triggerFileInput}
                        className="px-5 py-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition active:scale-95 flex items-center gap-2 text-sm shrink-0"
                    >
                        <UploadCloud size={16} /> Upload Document
                    </button>
                </div>

                {/* 2. Drag & Drop Upload Zone */}
                <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`bg-white border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer shadow-sm relative group
                        ${dragActive 
                            ? "border-[#6D5DFC] bg-purple-50/40 scale-[1.01]" 
                            : "border-[#E8EAF5] hover:border-[#6D5DFC] hover:bg-purple-50/10"
                        }
                    `}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    
                    <div className="w-16 h-16 bg-purple-50 text-[#6D5DFC] rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform shadow-inner border border-purple-100/50">
                        {isUploading ? (
                            <Loader2 size={32} className="animate-spin text-[#6D5DFC]" />
                        ) : (
                            <UploadCloud size={32} />
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1.5">
                        {isUploading ? "Uploading files..." : "Drag & Drop Documents"}
                    </h3>
                    <p className="text-[#64748B] text-xs max-w-lg mx-auto leading-relaxed mb-4">
                        Supported formats: PDF, DOCX, PPTX, TXT, Markdown, CSV, Excel.
                    </p>

                    {/* Department Selection */}
                    <div className="mb-6" onClick={(e) => e.stopPropagation()}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-3">
                            Upload to Department:
                        </label>
                        <select 
                            value={uploadDept}
                            onChange={(e) => setUploadDept(e.target.value)}
                            className="bg-white border border-[#E8EAF5] rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#6D5DFC] focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
                        >
                            <option value="General">General</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="HR">HR</option>
                            <option value="Finance">Finance</option>
                            <option value="Legal">Legal</option>
                        </select>
                    </div>

                    {/* Automatic Vector RAG indicators */}
                    <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-[#6D5DFC] select-none">
                        <span className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 size={12} /> Automatic Chunking
                        </span>
                        <span className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 size={12} /> Vectorization
                        </span>
                        <span className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 size={12} /> RAG Indexing
                        </span>
                    </div>
                </div>

                {/* 3. Stats Section */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 select-none">
                    <div className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documents Indexed</p>
                        <p className="text-3xl font-extrabold text-slate-850 mt-1">{statsIndexed}</p>
                    </div>
                    <div className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Knowledge Chunks</p>
                        <p className="text-3xl font-extrabold text-slate-850 mt-1">{statsChunks.toLocaleString()}</p>
                    </div>
                    <div className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departments</p>
                        <p className="text-3xl font-extrabold text-slate-850 mt-1">{statsDepts}</p>
                    </div>
                    <div className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Used</p>
                        <p className="text-3xl font-extrabold text-slate-850 mt-1">{statsStorage}</p>
                    </div>
                </section>

                {/* 4. Toolbar & Search & Filters */}
                <section className="bg-white border border-[#E8EAF5] rounded-2xl shadow-sm overflow-hidden p-5 space-y-4 select-none">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                        {/* Search Bar */}
                        <div className="relative w-full lg:flex-1">
                            <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-450">
                                <Search size={16} />
                            </span>
                            <input 
                                type="text"
                                placeholder="Search documents, policies, SOPs, onboarding guides..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl focus:outline-none focus:border-[#6D5DFC] focus:ring-1 focus:ring-[#6D5DFC] text-sm shadow-inner placeholder-slate-450 text-slate-850"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-650">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* View Toggles */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
                            <button 
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-white text-[#6D5DFC] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-white text-[#6D5DFC] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Filter selectors */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 border-t border-[#E8EAF5]">
                        <div className="flex items-center gap-2">
                            <span className="text-[#64748B]">Department:</span>
                            <div className="flex gap-1.5">
                                {departments.map(d => (
                                    <button 
                                        key={d} 
                                        onClick={() => setSelectedDept(d)}
                                        className={`px-2.5 py-1 rounded-md transition cursor-pointer border ${selectedDept === d ? "bg-purple-50 text-[#6D5DFC] border-purple-200" : "bg-white border-[#E8EAF5] text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:ml-auto">
                            <span className="text-[#64748B]">Status:</span>
                            <div className="flex gap-1.5">
                                {statuses.map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setSelectedStatus(s)}
                                        className={`px-2.5 py-1 rounded-md transition cursor-pointer border ${selectedStatus === s ? "bg-purple-50 text-[#6D5DFC] border-purple-200" : "bg-white border-[#E8EAF5] text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[#64748B]">Type:</span>
                            <div className="flex gap-1.5">
                                {docTypes.map(t => (
                                    <button 
                                        key={t} 
                                        onClick={() => setSelectedType(t)}
                                        className={`px-2.5 py-1 rounded-md transition cursor-pointer border ${selectedType === t ? "bg-purple-50 text-[#6D5DFC] border-purple-200" : "bg-white border-[#E8EAF5] text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Quick Actions Section */}
                <section className="space-y-4 select-none">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={14} className="text-[#6D5DFC]" /> Quick Actions
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            "Summarize Document", "Chat with Document", "Compare Documents", 
                            "Generate SOP", "Generate FAQ", "Policy Review", 
                            "Training Guide", "Meeting Notes"
                        ].map((action) => (
                            <button
                                key={action}
                                onClick={() => handleQuickAction(action)}
                                className="px-4 py-2 border border-[#E8EAF5] bg-white hover:bg-purple-50 hover:text-[#6D5DFC] hover:border-[#6D5DFC]/20 text-xs font-bold text-slate-600 rounded-full transition cursor-pointer shadow-xs active:scale-95"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 6. Document Grid / List */}
                <section className="space-y-6">
                    {filteredDocs.length === 0 ? (
                        /* Empty state illustration */
                        <div className="flex flex-col items-center justify-center p-16 bg-white border border-[#E8EAF5] rounded-3xl text-center select-none shadow-sm animate-fade-in">
                            <div className="w-20 h-20 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center mb-6 text-[#6D5DFC]">
                                <Folder size={36} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No Documents Yet</h3>
                            <p className="text-[#64748B] text-sm mt-2 mb-6 max-w-sm leading-relaxed">
                                Upload your first document to start building your AI-powered knowledge base.
                            </p>
                            <button 
                                onClick={triggerFileInput}
                                className="px-5 py-3 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition flex items-center gap-2 text-xs"
                            >
                                <UploadCloud size={14} /> Upload Document
                            </button>
                        </div>
                    ) : viewMode === "grid" ? (
                        /* Premium Grid Layout (4 columns desktop, 2 tablet, 1 mobile) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredDocs.map((doc) => (
                                <div 
                                    key={doc.id} 
                                    className="bg-white border border-[#E8EAF5] hover:border-indigo-200 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex flex-col group relative"
                                >
                                    {/* Top Metadata */}
                                    <div className="flex justify-between items-start mb-4 select-none">
                                        <div className="w-10 h-10 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl flex items-center justify-center shadow-inner">
                                            {getDocIcon(doc.type)}
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                                            ${doc.status === "Indexed" ? "bg-emerald-50 text-emerald-700 border-emerald-250" : 
                                              doc.status === "Processing" ? "bg-purple-50 text-[#6D5DFC] border-purple-200" : 
                                              "bg-red-50 text-red-700 border-red-250"}
                                        `}>
                                            {doc.status}
                                        </span>
                                    </div>

                                    {/* Mid metadata */}
                                    <div className="mb-4">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug group-hover:text-[#6D5DFC] transition-colors" title={doc.name}>
                                            {doc.name}
                                        </h4>
                                        <p className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center gap-1 select-none">
                                            <span>{doc.type}</span> • <span>{doc.size}</span> • <Clock size={10} /> <span>{doc.date}</span>
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1 mb-5 select-none">
                                        {doc.tags.map((tag, tIdx) => (
                                            <span 
                                                key={tIdx} 
                                                className="text-[9px] font-bold bg-purple-50 text-[#6D5DFC] border border-purple-100 px-2 py-0.5 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Bottom parameters */}
                                    <div className="mt-auto border-t border-[#E8EAF5] pt-3.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 select-none mb-4">
                                        <div className="flex items-center gap-1">
                                            <Database size={13} className="text-[#6D5DFC]" />
                                            <span>{doc.chunks} chunks</span>
                                        </div>
                                        <span>Dept: {doc.department}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-3 gap-1.5 select-none pt-2 border-t border-[#E8EAF5]/65">
                                        <a 
                                            href="/assistant"
                                            className="py-2 text-center text-[10px] font-bold text-[#6D5DFC] bg-purple-50 hover:bg-[#6D5DFC] hover:text-white rounded-lg transition"
                                        >
                                            Chat
                                        </a>
                                        <button 
                                            onClick={() => handleOpenPreview(doc)}
                                            className="py-2 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                        >
                                            Preview
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteDoc(doc.id)}
                                            className="py-2 text-[10px] font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer flex items-center justify-center"
                                            title="Delete document"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Premium List Layout */
                        <div className="overflow-hidden border border-[#E8EAF5] rounded-3xl bg-white shadow-sm select-none">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#FAFBFF] border-b border-[#E8EAF5] font-bold text-slate-650 uppercase tracking-wider text-[10px]">
                                            <th className="py-4.5 px-6">Document Name</th>
                                            <th className="py-4.5 px-6 w-[15%]">Status</th>
                                            <th className="py-4.5 px-6 w-[15%]">Chunks</th>
                                            <th className="py-4.5 px-6 w-[15%]">Uploader</th>
                                            <th className="py-4.5 px-6 w-[15%]">Dept</th>
                                            <th className="py-4.5 px-6 text-right w-[15%]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E8EAF5] text-slate-700">
                                        {filteredDocs.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-purple-50/10 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg flex items-center justify-center shrink-0">
                                                            {getDocIcon(doc.type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-800 truncate max-w-sm md:max-w-md group-hover:text-[#6D5DFC] transition-colors" title={doc.name}>
                                                                {doc.name}
                                                            </div>
                                                            <div className="text-[10px] text-[#64748B] mt-0.5 font-semibold">
                                                                {doc.size} • Uploaded {doc.date}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                                                        ${doc.status === "Indexed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                                          doc.status === "Processing" ? "bg-purple-50 text-[#6D5DFC] border-purple-150" : 
                                                          "bg-red-50 text-red-700 border-red-200"}
                                                    `}>
                                                        {doc.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-semibold text-slate-650">
                                                    <div className="flex items-center gap-1.5"><Database size={13} className="text-[#6D5DFC]"/> {doc.chunks}</div>
                                                </td>
                                                <td className="py-4 px-6 text-[#64748B] font-semibold">
                                                    <div className="flex items-center gap-1.5"><UserIcon size={13}/> {doc.uploader}</div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-650 font-bold">
                                                    {doc.department}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <a href="/assistant" className="px-2.5 py-1.5 text-[10px] font-bold text-[#6D5DFC] bg-purple-50 hover:bg-[#6D5DFC] hover:text-white rounded-lg transition">Chat</a>
                                                        <button onClick={() => handleOpenPreview(doc)} className="px-2.5 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition cursor-pointer">Preview</button>
                                                        <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-55 rounded-lg transition cursor-pointer"><Trash2 size={13}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>

                {/* 7. AI Capabilities section */}
                <section className="border-t border-[#E8EAF5] pt-12 space-y-6 select-none">
                    <div className="text-center max-w-xl mx-auto mb-10">
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Capabilities</h3>
                        <p className="text-[#64748B] text-sm mt-2 leading-relaxed">Discover how our grounding and retrieval pipelines transform static text assets into live intelligence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6D5DFC] mb-4">
                                <MessageSquare size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Document Chat</h4>
                            <p className="text-[#64748B] text-xs leading-relaxed">Ask questions directly from uploaded documents. Citations ground responses in truth.</p>
                        </div>

                        <div className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6D5DFC] mb-4">
                                <Layers size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Summarization</h4>
                            <p className="text-[#64748B] text-xs leading-relaxed">Generate concise bullet summaries instantly, outlining core takeaways and action lists.</p>
                        </div>

                        <div className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6D5DFC] mb-4">
                                <Search size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Knowledge Retrieval</h4>
                            <p className="text-[#64748B] text-xs leading-relaxed">Search semantic matches across thousands of pages to extract exact records in milliseconds.</p>
                        </div>

                        <div className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6D5DFC] mb-4">
                                <FileText size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Document Generation</h4>
                            <p className="text-[#64748B] text-xs leading-relaxed">Draft structured SOP guides, FAQ sheets, and template policies using vector structures.</p>
                        </div>

                        <div className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-[#6D5DFC] mb-4">
                                <Layers size={20} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm mb-2">Multi-Document Analysis</h4>
                            <p className="text-[#64748B] text-xs leading-relaxed">Cross-reference and contrast multiple documents side-by-side to highlight differentials.</p>
                        </div>

                        {/* RAG pipeline model statistics */}
                        <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border border-purple-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                            <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                                <Sparkles size={16} className="text-[#6D5DFC]" /> RAG Ingestion Pipeline
                            </h4>
                            <p className="text-slate-650 text-xs leading-relaxed mb-4">
                                Connected models: Llama 3, nomic-embed-text embeddings, and Qdrant databases.
                            </p>
                            <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider bg-white rounded-md px-2 py-1 w-max shadow-sm border border-purple-100">
                                🟢 Platform Status: Active
                            </span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Global Footer */}
            <Footer />

            {/* ================================================= */}
            {/* DOCUMENT PREVIEW MODAL                            */}
            {/* ================================================= */}
            {selectedDocForPreview && (
                <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl border border-[#E8EAF5] overflow-hidden shadow-2xl flex flex-col animate-scale-up max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4.5 border-b border-[#E8EAF5] flex justify-between items-center bg-[#FAFBFF] select-none">
                            <div className="flex items-center gap-2.5">
                                <FileText size={18} className="text-red-500" />
                                <h3 className="font-bold text-slate-900 text-sm md:text-base truncate max-w-md">{selectedDocForPreview.name}</h3>
                            </div>
                            <button 
                                onClick={() => setSelectedDocForPreview(null)}
                                className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">
                            {/* Metadata specs */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl p-4 text-xs font-semibold select-none">
                                <div>
                                    <span className="text-[#64748B] block mb-0.5">Uploader</span>
                                    <span className="text-slate-800 font-bold">{selectedDocForPreview.uploader}</span>
                                </div>
                                <div>
                                    <span className="text-[#64748B] block mb-0.5">Upload Date</span>
                                    <span className="text-slate-800 font-bold">{selectedDocForPreview.date}</span>
                                </div>
                                <div>
                                    <span className="text-[#64748B] block mb-0.5">Chunks Count</span>
                                    <span className="text-[#6D5DFC] font-bold">{selectedDocForPreview.chunks} chunks</span>
                                </div>
                                <div>
                                    <span className="text-[#64748B] block mb-0.5">Department</span>
                                    <select 
                                        value={selectedDocForPreview.department}
                                        onChange={(e) => handleUpdateDepartment(selectedDocForPreview.id, e.target.value)}
                                        className="bg-transparent font-bold text-slate-800 outline-none border-none cursor-pointer hover:bg-slate-100 px-1 py-0.5 rounded -ml-1 w-full"
                                    >
                                        <option value="General">General</option>
                                        <option value="Engineering">Engineering</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Sales">Sales</option>
                                        <option value="HR">HR</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Legal">Legal</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[#64748B] block mb-0.5">Status</span>
                                    <span className="text-slate-800 font-bold">{selectedDocForPreview.status}</span>
                                </div>
                            </div>

                            {/* Summary & doc details */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                                    <Sparkles size={13} className="text-[#6D5DFC]" /> AI-Generated Summary
                                </h4>
                                <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl text-xs leading-relaxed text-slate-750">
                                    This document outlines standard operational parameters regarding the "{selectedDocForPreview.name.split('.')[0]}". It details general expectations, department ownership under the {selectedDocForPreview.department} group, and chunk indexes compiled into the vector database.
                                </div>
                            </div>

                            {/* Actual document preview placeholder (or we can just omit since this was a mock modal) */}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-[#E8EAF5] flex justify-end gap-2 bg-[#FAFBFF] select-none">
                            <button 
                                onClick={() => setSelectedDocForPreview(null)}
                                className="px-4 py-2 border border-slate-350 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => navigate("/assistant", { state: { document_id: selectedDocForPreview.id } })}
                                className="px-4 py-2 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white rounded-xl text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                            >
                                <MessageSquare size={13} /> Chat With Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
