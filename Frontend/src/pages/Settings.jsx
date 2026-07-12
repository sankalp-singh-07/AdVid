import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Settings as SettingsIcon, User, Shield, Cpu } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAFBFF] font-sans">
      <Navbar />
      <main className="pt-24 pb-20 px-6 md:px-16 max-w-3xl mx-auto space-y-8">
        <div className="border-b border-[#E8EAF5] pb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <SettingsIcon className="text-[#6D5DFC]" /> Settings
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Account and workspace preferences.
          </p>
        </div>

        <section className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <User size={16} className="text-[#6D5DFC]" /> Profile
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase">Name</dt>
              <dd className="font-semibold text-slate-800">{user?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase">Email</dt>
              <dd className="font-semibold text-slate-800">{user?.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase">Credits</dt>
              <dd className="font-semibold text-indigo-600">{user?.credits ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase">Role</dt>
              <dd className="font-semibold text-slate-800">{user?.role || "user"}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Cpu size={16} className="text-[#6D5DFC]" /> Platform
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Models, storage, and embedding providers are configured on the server via environment
            variables (<code className="bg-slate-100 px-1 rounded">LLM_PROVIDER</code>,{" "}
            <code className="bg-slate-100 px-1 rounded">STORAGE_PROVIDER</code>,{" "}
            <code className="bg-slate-100 px-1 rounded">EMBEDDING_MODEL</code>). Switching providers
            does not require application code changes.
          </p>
        </section>

        <section className="bg-white border border-[#E8EAF5] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Shield size={16} className="text-[#6D5DFC]" /> Security
          </h2>
          <ul className="text-xs text-slate-600 space-y-2 list-disc ml-4">
            <li>JWT access tokens with HttpOnly refresh cookies</li>
            <li>Per-user vector isolation in Qdrant</li>
            <li>Upload MIME/size validation and rate limiting</li>
            <li>Prompt-injection filters on chat queries</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
