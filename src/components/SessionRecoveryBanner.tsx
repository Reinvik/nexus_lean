import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SessionRecoveryBanner() {
    const { sessionError, recoverSession, forceLogout, profile, loading } = useAuth();
    const [recovering, setRecovering] = useState(false);
    const [recoveryAttempted, setRecoveryAttempted] = useState(false);

    // Show banner if:
    // 1. There's an explicit sessionError AND we don't have a valid profile, OR
    // 2. Profile exists but has no role or company_id (common symptom of data loss)
    const hasDataLoss = profile && (!profile.role || !profile.company_id);
    const hasValidProfile = profile && profile.role && profile.company_id;

    // Don't show session error if we actually have a valid profile (false positive protection)
    // Don't show session error if we actually have a valid profile (false positive protection)
    const shouldShow = !loading && ((sessionError && !hasValidProfile) || hasDataLoss);

    // Debounce visibility to prevent flashing (waiting for race conditions to resolve)
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (shouldShow) {
            // Wait 1s before showing error - allows time for retry/race conditions to resolve
            timeout = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
        } else {
            // Hide immediately if condition clears
            setIsVisible(false);
        }

        return () => clearTimeout(timeout);
    }, [shouldShow]);

    if (!isVisible) return null;

    const handleRecover = async () => {
        setRecovering(true);
        setRecoveryAttempted(true);
        try {
            await recoverSession();
        } finally {
            setRecovering(false);
        }
    };

    const handleLogout = async () => {
        await forceLogout();
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">
                            {recoveryAttempted
                                ? 'No se pudo recuperar la sesión'
                                : 'Se detectó un problema con tu sesión'}
                        </p>
                        <p className="text-xs text-white/80">
                            {recoveryAttempted
                                ? 'Por favor, cierra sesión y vuelve a iniciar.'
                                : 'Tu rol o compañía no están disponibles. Puedes intentar recuperar o cerrar sesión.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!recoveryAttempted && (
                        <button
                            onClick={handleRecover}
                            disabled={recovering}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${recovering ? 'animate-spin' : ''}`} />
                            {recovering ? 'Recuperando...' : 'Recuperar Sesión'}
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
