import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";

export default function Layout() {
    const { isLoggedIn, isAuthModalOpen, closeAuthModal, authModalMode } = useAuth();

    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
            <Sidebar />
            
            <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
                <div className="flex-1 px-6 py-8 md:px-10 lg:px-12 max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>

            <AuthModal
                isOpen={isAuthModalOpen}
                mode={authModalMode}
                onClose={closeAuthModal}
            />
        </div>
    );
}
