import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Bug, X, ChevronUp, ChevronDown, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DebugBanner() {
    // @ts-ignore
    const { user, profile, loading } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // @ts-ignore
    if (process.env.NODE_ENV === 'production') return null;

    if (profile?.role !== 'superadmin') return null;

    const handleForceLogout = async () => {
        try {
            console.log("Force Logout Triggered");
            window.localStorage.clear();
            window.sessionStorage.clear();
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            await supabase.auth.signOut().catch(err => console.error("SignOut err:", err));
            window.location.replace('/login');
        } catch (e) {
            console.error("Force logout error:", e);
            window.location.href = '/login';
        }
    };

    const handleRepairProfile = async () => {
        if (!user) return;
        console.log("Attempting to repair profile for", user.id);

        // 1. Try to fetch first company to assign
        const { data: companies } = await supabase.from('companies').select('id').limit(1);
        const defaultCompanyId = companies?.[0]?.id;

        if (!defaultCompanyId) {
            alert("Error: No companies found in DB. Cannot repair profile.");
            return;
        }

        // 2. Insert/Upsert profile
        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            company_id: defaultCompanyId,
            role: 'superuser'
        });

        if (error) {
            console.error("Repair failed:", error);
            alert("Repair failed: " + error.message);
        } else {
            alert("Profile repaired! Reloading...");
            window.location.reload();
        }
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="fixed bottom-4 right-4 z-50 p-2 bg-slate-900/90 text-green-400 rounded-full shadow-lg border border-green-500/30 hover:bg-slate-800 hover:scale-110 transition-all duration-200 group"
                title="Debug Info"
            >
                <Bug className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-950/95 backdrop-blur-md text-green-400 font-mono text-xs rounded-lg shadow-2xl border border-green-500/50 overflow-hidden transform transition-all duration-200 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border-b border-green-500/30">
                <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3" />
                    <span className="font-bold tracking-wider">DEBUG CONSOLE</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleForceLogout}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-0.5 rounded text-[10px] uppercase border border-red-500/30 transition-colors mr-2"
                    >
                        Force Logout
                    </button>
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                    <span className="text-slate-500">Loading:</span>
                    <span className={loading ? "text-yellow-400" : "text-green-400"}>{String(loading)}</span>

                    <span className="text-slate-500">User ID:</span>
                    <span className="text-slate-300 truncate" title={user?.id}>{user?.id || 'null'}</span>

                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-300 truncate" title={user?.email}>{user?.email || 'null'}</span>

                    <span className="text-slate-500">Profile ID:</span>
                    <span className="text-slate-300 truncate" title={profile?.id}>{profile?.id || 'null'}</span>

                    <span className="text-slate-500">Role:</span>
                    <span className="text-purple-400 font-bold">{profile?.role || 'null'}</span>

                    <span className="text-slate-500">Company:</span>
                    <span className="text-blue-400 truncate" title={profile?.company_id}>{profile?.company_id || 'null'}</span>
                </div>

                {!profile && user && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-md">
                        <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                            <X className="w-4 h-4" />
                            MISSING PROFILE
                        </div>
                        <button
                            onClick={handleRepairProfile}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors shadow-lg animate-pulse"
                        >
                            REPAIR PROFILE NOW
                        </button>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-dashed border-gray-700 space-y-1">
                    <div className="flex gap-2 text-[10px]">
                        <span className="text-blue-400/70 font-bold">HASH:</span>
                        <span className="text-slate-400 break-all">{window.location.hash || '(none)'}</span>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                        <span className="text-yellow-400/70 font-bold">SEARCH:</span>
                        <span className="text-slate-400 break-all">{window.location.search || '(none)'}</span>
                    </div>
                </div>

                <div className="mt-2 text-[10px] text-slate-600 italic text-center">
                    Debugging Purpose Only
                </div>
            </div>
        </div>
    );
}
