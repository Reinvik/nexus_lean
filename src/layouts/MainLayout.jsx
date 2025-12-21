import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-sidebar text-white h-16 flex items-center justify-between px-4 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-2">
                    <img src="/nexus-logo.svg" alt="Nexus" className="w-8 h-8" />
                    <span className="font-bold tracking-tight">Nexus BE LEAN</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300 relative w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
