import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Library, Plus, Trash2, Star, FileText, MessageSquare, Loader2, X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { DocumentListSkeleton } from "../components/Skeleton";
import api from "../utils/api";

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [kbs, setKbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/knowledge-bases");
      setKbs(res.data.knowledge_bases || []);
    } catch (err) {
      console.error(err);
      // Treat empty/unavailable as empty list — not a scary error for new users
      setKbs([]);
      const status = err.response?.status;
      if (status >= 500 || !err.response) {
        setError(
          err.response?.data?.message ||
            "Could not load knowledge bases. Please try again."
        );
      } else {
        setError("");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post("/knowledge-bases", {
        name: name.trim(),
        description: description.trim() || null,
        is_default: kbs.length === 0,
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const setDefault = async (id) => {
    try {
      await api.patch(`/knowledge-bases/${id}`, { is_default: true });
      await load();
    } catch (err) {
      setError("Could not set default.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this knowledge base? Documents remain but unlinked.")) return;
    try {
      await api.delete(`/knowledge-bases/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF] font-sans">
      <Navbar />
      <main className="pt-24 pb-20 px-6 md:px-16 max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#E8EAF5] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Library className="text-[#6D5DFC]" /> Knowledge Bases
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xl">
              Group documents into workspaces. Chat retrieves across every document in the active knowledge base.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between">
            {error}
            <button onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Plus size={16} className="text-[#6D5DFC]" /> Create knowledge base
          </h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. HR Policies)"
            className="w-full px-4 py-2.5 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl text-sm outline-none focus:border-[#6D5DFC]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-4 py-2.5 bg-[#FAFBFF] border border-[#E8EAF5] rounded-xl text-sm outline-none focus:border-[#6D5DFC] resize-none"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Create
          </button>
        </form>

        {loading ? (
          <DocumentListSkeleton count={3} />
        ) : (
          <div className="grid gap-4">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className="bg-white border border-[#E8EAF5] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900">{kb.name}</h3>
                    {kb.is_default && (
                      <span className="text-[10px] font-bold bg-purple-50 text-[#6D5DFC] px-2 py-0.5 rounded-full border border-purple-100">
                        Default
                      </span>
                    )}
                  </div>
                  {kb.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{kb.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-[11px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <FileText size={12} /> {kb.document_count} docs
                    </span>
                    <span className="text-emerald-600">
                      {kb.ready_document_count} ready
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!kb.is_default && (
                    <button
                      onClick={() => setDefault(kb.id)}
                      className="px-3 py-2 text-xs font-bold border border-[#E8EAF5] rounded-lg hover:bg-purple-50 flex items-center gap-1"
                    >
                      <Star size={12} /> Set default
                    </button>
                  )}
                  <button
                    onClick={() =>
                      navigate("/documents", { state: { knowledge_base_id: kb.id } })
                    }
                    className="px-3 py-2 text-xs font-bold border border-[#E8EAF5] rounded-lg hover:bg-slate-50"
                  >
                    Documents
                  </button>
                  <button
                    onClick={() =>
                      navigate("/assistant", { state: { knowledge_base_id: kb.id } })
                    }
                    className="px-3 py-2 text-xs font-bold bg-purple-50 text-[#6D5DFC] rounded-lg flex items-center gap-1"
                  >
                    <MessageSquare size={12} /> Chat
                  </button>
                  <button
                    onClick={() => handleDelete(kb.id)}
                    className="px-3 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
