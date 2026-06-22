import { useState } from "react";
import { UploadCloud, FileText, Search, Filter, MoreVertical, File, Clock, User as UserIcon } from "lucide-react";

const dummyDocs = [
    { id: 1, name: "Employee_Handbook_2026.pdf", type: "PDF", size: "2.4 MB", date: "2 hours ago", uploader: "HR Team" },
    { id: 2, name: "Q1_Financial_Report.xlsx", type: "Excel", size: "1.1 MB", date: "1 day ago", uploader: "Finance" },
    { id: 3, name: "Engineering_Onboarding.docx", type: "Word", size: "5.6 MB", date: "3 days ago", uploader: "Eng Ops" },
    { id: 4, name: "Security_Policies_v3.pdf", type: "PDF", size: "8.2 MB", date: "1 week ago", uploader: "IT Sec" },
];

export default function DocumentExplorer({ initialTab = "explore" }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Document Repository</h1>
                    <p className="text-slate-500 mt-1">Manage and upload files to your enterprise knowledge base.</p>
                </div>
                
                <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setActiveTab("explore")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "explore" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Explore
                    </button>
                    <button 
                        onClick={() => setActiveTab("upload")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "upload" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Upload New
                    </button>
                </div>
            </div>

            {activeTab === "explore" ? (
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 text-sm"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>

                    {/* Table List */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Document Name</th>
                                    <th className="px-6 py-4 font-medium">Uploader</th>
                                    <th className="px-6 py-4 font-medium">Size</th>
                                    <th className="px-6 py-4 font-medium">Date Modified</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {dummyDocs.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="font-medium text-slate-700">{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon size={14} className="text-slate-400" />
                                                {doc.uploader}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{doc.size}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-400" />
                                                {doc.date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-full max-w-2xl border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer group">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Click to upload or drag and drop</h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                            Support for PDF, DOCX, PPTX, CSV, and Markdown files. Files are automatically chunked and vectorized.
                        </p>
                        <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                            Select Files
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
