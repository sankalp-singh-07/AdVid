import { useState } from "react";
import { UploadCloud, FileText, Search, Filter, MoreVertical, Clock, User as UserIcon, LayoutGrid, List, MessageSquare, Database, Trash2, ExternalLink, ChevronDown } from "lucide-react";

const dummyDocs = [
    { id: 1, name: "Employee_Handbook_2026.pdf", type: "PDF", size: "2.4 MB", date: "2 hours ago", uploader: "HR Team", chunks: 145, status: "Indexed", tags: ["Policy", "HR"] },
    { id: 2, name: "Q3_Financial_Report.xlsx", type: "Excel", size: "1.1 MB", date: "1 day ago", uploader: "Finance", chunks: 89, status: "Indexed", tags: ["Finance", "Q3"] },
    { id: 3, name: "Engineering_Onboarding.docx", type: "Word", size: "5.6 MB", date: "3 days ago", uploader: "Eng Ops", chunks: 320, status: "Processing", tags: ["Engineering"] },
    { id: 4, name: "Security_Policies_v3.pdf", type: "PDF", size: "8.2 MB", date: "1 week ago", uploader: "IT Sec", chunks: 412, status: "Indexed", tags: ["Security", "IT"] },
    { id: 5, name: "Project_Phoenix_Architecture.md", type: "Markdown", size: "125 KB", date: "2 weeks ago", uploader: "Alice J.", chunks: 45, status: "Indexed", tags: ["Engineering", "Architecture"] },
];

export default function DocumentExplorer() {
    const [viewMode, setViewMode] = useState("grid");
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="flex flex-col h-full space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Document Knowledge Base</h1>
                    <p className="text-slate-500 mt-1 text-sm">Upload, manage, and chat with your enterprise documents.</p>
                </div>
                
                <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm shadow-indigo-600/20">
                    <UploadCloud size={18} />
                    Upload Document
                </button>
            </div>

            {/* Upload Zone (Always visible at top for easy access) */}
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer group flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">Drag & Drop files here or click to browse</h3>
                <p className="text-slate-500 text-sm max-w-lg">
                    Supported formats: PDF, DOCX, PPTX, TXT, Markdown, CSV, Excel. Files are automatically chunked and vectorized for RAG.
                </p>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 min-w-[200px] lg:min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 text-sm shadow-sm"
                            />
                        </div>
                        
                        {/* Filters */}
                        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                            <Filter className="w-4 h-4 text-slate-500" /> Department <ChevronDown size={14} className="text-slate-400"/>
                        </button>
                        <button className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                            Tags <ChevronDown size={14} className="text-slate-400"/>
                        </button>
                        <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                            Owner <ChevronDown size={14} className="text-slate-400"/>
                        </button>
                    </div>

                    <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200 self-end lg:self-auto shrink-0">
                        <button 
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {dummyDocs.map(doc => (
                                <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : doc.type === 'Excel' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${doc.status === 'Indexed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                            {doc.status}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 mb-1" title={doc.name}>{doc.name}</h3>
                                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-2">
                                        {doc.size} • <Clock size={12}/> {doc.date}
                                    </p>
                                    
                                    <div className="flex items-center gap-1 mb-4 flex-wrap">
                                        {doc.tags.map((tag, i) => (
                                            <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">{tag}</span>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium" title="Indexed Chunks">
                                            <Database size={14} className="text-indigo-400"/>
                                            {doc.chunks} chunks
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition" title="Chat with Doc"><MessageSquare size={16}/></button>
                                            <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Document</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Chunks</th>
                                        <th className="px-6 py-4">Uploader</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dummyDocs.map(doc => (
                                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : doc.type === 'Excel' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{doc.name}</div>
                                                        <div className="text-xs text-slate-500">{doc.size}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${doc.status === 'Indexed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                <div className="flex items-center gap-1.5"><Database size={14} className="text-slate-400"/> {doc.chunks}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <div className="flex items-center gap-1.5"><UserIcon size={14} className="text-slate-400"/> {doc.uploader}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {doc.date}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center gap-1 transition"><MessageSquare size={12}/> Chat</button>
                                                    <button className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition"><ExternalLink size={12}/> Open</button>
                                                    <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ml-1"><Trash2 size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
