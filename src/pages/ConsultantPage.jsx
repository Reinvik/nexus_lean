import { useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import AIConsultant from '../components/AIConsultant';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Brain } from 'lucide-react';

const ConsultantPage = () => {
    const { user, globalFilterCompanyId, companies } = useAuth();

    // 1. CACHED DATA (Instant Load)
    const {
        fiveSCards: ctxFiveS,
        quickWinsData: ctxQuickWins,
        vsmData: ctxVSM,
        a3Data: ctxA3,
        loadingFiveS,
        loadingResponsables,
        fetchFiveSCards,
        fetchResponsablesData,
        auditData: ctxAudits,
        fetchAudits
    } = useData();

    // 2. TRIGGER CONTEXT DATA LOADING
    useEffect(() => {
        if (user) {
            // Ensure context has fresh data
            fetchFiveSCards('all').catch(console.error);
            fetchResponsablesData().catch(console.error);
            fetchAudits().catch(console.error);
        }
    }, [user, fetchFiveSCards, fetchResponsablesData, fetchAudits]);

    const isSyncing = loadingFiveS || loadingResponsables;

    // 3. EFFECTIVE DATA: Filter Context Data
    const effectiveData = useMemo(() => {
        // Helper to filter by company logic
        const filterByCompany = (items) => {
            if (!Array.isArray(items)) return [];

            // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
            const isGlobalAdmin = user?.isGlobalAdmin;
            const targetCompanyId = isGlobalAdmin ? globalFilterCompanyId : user?.companyId;

            if (targetCompanyId === 'all') return items;

            // Loose equality for cross-type matching (string vs number id)
            return items.filter(item =>
                (item.companyId && item.companyId == targetCompanyId) ||
                (item.company_id && item.company_id == targetCompanyId)
            );
        };

        const enrichedA3 = (ctxA3 || []).map(p => ({
            ...p,
            currentCondition: p.current_condition || p.currentCondition,
            rootCause: p.root_cause || p.rootCause,
            ishikawas: p.ishikawas || [],
            multipleFiveWhys: p.multipleFiveWhys || p.five_whys || [],
            followUpData: p.followUpData || p.follow_up_data || []
        }));

        return {
            fiveS: filterByCompany(ctxFiveS),
            quickWins: filterByCompany(ctxQuickWins),
            vsms: filterByCompany(ctxVSM),
            a3: filterByCompany(enrichedA3),
            auditLogs: filterByCompany(ctxAudits)
        };
    }, [user, globalFilterCompanyId, ctxFiveS, ctxQuickWins, ctxVSM, ctxA3, ctxAudits]);


    const companyName = companies?.find(c => c.id === globalFilterCompanyId)?.name || 'Todas las Empresas';

    if (!user) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

    // Permissions check
    const hasAIAccess = user.role === 'admin' || user.role === 'superadmin' || user.has_ai_access === true;

    if (!hasAIAccess) {
        return (
            <div className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="bg-slate-100 p-6 rounded-full mb-6">
                    <Brain size={48} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-md">
                    No tienes permisos para acceder al Consultor IA. Contacta a tu administrador para solicitar acceso.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-2 h-[calc(100vh-85px)] flex flex-col">
            <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-2 shrink-0">
                <HeaderWithFilter
                    title="Consultor IA"
                    subtitle="Análisis inteligente y asistencia en tiempo real"
                    icon={<Brain className="text-cyan-500" size={32} />}
                />
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">


                <AIConsultant
                    data={effectiveData}
                    companyName={companyName}
                    apiKey={import.meta.env.VITE_GEMINI_API_KEY}
                    fullScreen={true}
                    isSyncing={isSyncing}
                />
            </div>
        </div>
    );
};

export default ConsultantPage;
