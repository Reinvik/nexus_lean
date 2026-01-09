import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Brain, ClipboardList, ShieldCheck, FileText, Activity, Zap, Users, Building, TrendingUp, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import DebugBanner from '../components/DebugBanner';
import ProfileDebugger from '../components/ProfileDebugger';
import SessionRecoveryBanner from '../components/SessionRecoveryBanner';

import CompanySwitcher from '../components/admin/CompanySwitcher';

export default function DashboardLayout() {
    const { profile, forceLogout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false); // Enable setCollapsed if needed for desktop, though user asked for mobile reply
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleSignOut = async () => {
        // Use the robust forceLogout from context
        await forceLogout();
    };

    // Filter menu items based on role
    // 'Empresas' and 'Administración' (Users) are only for superadmins/admins
    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Consultor IA', icon: Brain, path: '/consultor' },
        { label: 'Tarjetas 5S', icon: ClipboardList, path: '/tarjetas-5s' },
        { label: 'Auditoría 5S', icon: ShieldCheck, path: '/auditoria-5s' },
        { label: 'Proyectos A3', icon: FileText, path: '/proyectos-a3' },
        { label: 'VSM', icon: Activity, path: '/vsm' },
        { label: 'Quick Wins', icon: Zap, path: '/quick-wins' },
        { label: 'Responsables', icon: Users, path: '/responsables' },
    ];

    if (profile?.role === 'superadmin') {
        menuItems.push(
            { label: 'Empresas', icon: Building, path: '/admin/companies' },
            { label: 'Administración', icon: Users, path: '/admin/users' }
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "bg-sidebar text-sidebar-text flex flex-col transition-all duration-300 shadow-2xl z-30 border-r border-slate-800/50",
                // Mobile Styles
                "fixed inset-y-0 left-0 h-full",
                isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
                // Desktop Styles
                "lg:static lg:translate-x-0",
                collapsed ? "lg:w-20" : "lg:w-64"
            )}>
                <div className="h-16 lg:h-24 flex items-center justify-between px-4 border-b border-slate-800/30 bg-sidebar">
                    <div className="flex items-center justify-center w-full px-2 cursor-pointer transition-transform duration-300 hover:scale-105">
                        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight text-center">
                            Nexus Lean
                        </h1>
                    </div>
                </div>

                {/* Company Switcher Area */}
                {!collapsed && (
                    <div className="px-4 py-3 border-b border-slate-800/30">
                        <CompanySwitcher />
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">Menu Principal</div>
                    {menuItems.map((item) => {
                        const isActive = window.location.pathname === item.path;
                        return (
                            <div
                                key={item.label}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsMobileOpen(false); // Close on mobile click
                                }}
                                className={cn(
                                    "relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-cyan-600/20 to-cyan-600/5 text-cyan-400 shadow-lg shadow-cyan-900/20 border border-cyan-500/10"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse" />
                                )}
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 transition-all duration-300",
                                        isActive
                                            ? "text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                            : "text-slate-500 group-hover:text-slate-300 group-hover:scale-105"
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                {!collapsed && (
                                    <span className={cn(
                                        "font-medium tracking-wide",
                                        isActive && "font-bold"
                                    )}>
                                        {item.label}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-slate-800/30 bg-sidebar">
                    {!collapsed && profile && (
                        <div className="mb-3 p-2 rounded-lg hover:bg-sidebar-hover transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm border-2 border-slate-600/50">
                                    {profile.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{profile.name}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {profile.role === 'superadmin' ? 'Super Admin' : profile.role === 'admin' ? 'Administrador' : 'Usuario'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center justify-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-white border border-transparent transition-all duration-200"
                    >
                        <LogOut className="h-5 w-5" />
                        {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden w-full">

                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10 shrink-0">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 text-slate-400 hover:text-white"
                    >
                        <div className="space-y-1.5">
                            <div className="w-6 h-0.5 bg-current"></div>
                            <div className="w-6 h-0.5 bg-current"></div>
                            <div className="w-6 h-0.5 bg-current"></div>
                        </div>
                    </button>
                    <span className="font-bold text-lg text-white">Nexus Lean</span>
                    <div className="w-8"></div> {/* Spacer balance */}
                </header>

                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>

            <DebugBanner />
            <ProfileDebugger />
            <SessionRecoveryBanner />
        </div>
    );
}
