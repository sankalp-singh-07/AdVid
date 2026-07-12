import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FileText,
  UploadCloud,
  MessageSquare,
  Menu,
  X,
  LogOut,
  Library,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const navItems = [
  { name: "Upload Document", href: "/upload", icon: UploadCloud },
  { name: "My Documents", href: "/documents", icon: FileText },
  { name: "Knowledge Bases", href: "/knowledge-base", icon: Library },
  { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isLoggedIn, logout, openAuthModal, user } = useAuth();

  return (
    <>
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-md text-slate-700"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
                fixed inset-y-0 left-0 z-40 w-72 bg-white text-slate-700 border-r border-[#E8EAF5] shadow-sm transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col
                ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[#E8EAF5]">
          <img src={logo} alt="Logo" className="h-8 shrink-0" />
          <span className="text-xl font-extrabold text-slate-850 tracking-tight">
            Intellect<span className="text-[#6D5DFC]">RAG</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2 mt-4">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all duration-200 group
                                ${
                                  isActive
                                    ? "bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] text-white shadow-md shadow-indigo-650/15"
                                    : "text-slate-600 hover:bg-purple-50/70 hover:text-[#6D5DFC]"
                                }
                            `}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={`shrink-0 transition-colors duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-[#6D5DFC]"
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-[#E8EAF5]">
          {isLoggedIn ? (
            <div className="flex flex-col gap-3">
              <div className="px-3 py-2 bg-[#FAFBFF] border border-[#E8EAF5] rounded-lg text-sm text-slate-500">
                Logged in as{" "}
                <span className="text-slate-850 font-bold block truncate">
                  {user?.email || "User"}
                </span>
                <span className="text-xs text-indigo-600 font-semibold">
                  {user?.credits ?? 0} credits
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold text-red-500 hover:bg-red-50 hover:text-red-650 transition-colors w-full cursor-pointer"
              >
                <LogOut size={20} />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6D5DFC] to-[#8B5CF6] hover:opacity-95 text-white py-2.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
