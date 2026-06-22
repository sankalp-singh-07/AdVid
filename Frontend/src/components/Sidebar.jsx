import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, 
    FileText, 
    UploadCloud, 
    MessageSquare, 
    Database, 
    Briefcase, 
    PenTool, 
    Settings,
    LogOut,
    Menu,
    X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Upload Document", href: "/upload", icon: UploadCloud },
    { name: "My Documents", href: "/documents", icon: FileText },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Knowledge Base", href: "/knowledge-base", icon: Database },
    { name: "Workday Explorer", href: "/workday", icon: Briefcase },
    { name: "Document Generator", href: "/generator", icon: PenTool },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { isLoggedIn, logout, openAuthModal, user } = useAuth();
    
    return (
        <>
            {/* Mobile Toggle */}
            <button 
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-md text-slate-700"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 shadow-xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col
                ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
                    <img src={logo} alt="Logo" className="h-8 shrink-0 brightness-200" />
                    <span className="text-xl font-bold text-white tracking-tight">EnterpriseAI</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2 mt-4">
                        Navigation
                    </div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200
                                ${isActive 
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                                    : "hover:bg-slate-800 hover:text-white"
                                }
                            `}
                        >
                            <item.icon size={20} className="shrink-0" />
                            {item.name}
                        </NavLink>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800">
                    {isLoggedIn ? (
                        <div className="flex flex-col gap-3">
                            <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-400">
                                Logged in as <span className="text-white font-medium block truncate">{user?.email || 'User'}</span>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors w-full"
                            >
                                <LogOut size={20} />
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => openAuthModal("login")}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition-colors"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </aside>
            
            {/* Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
