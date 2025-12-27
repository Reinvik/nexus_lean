import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import AIConsultant from '../components/AIConsultant';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Brain } from 'lucide-react';

const ConsultantPage = () => {
    const { user, globalFilterCompanyId, companies } = useAuth();
    const { fiveSCards, quickWinsData, vsmData, a3Data, loadingFiveS, loadingResponsables } = useData();

    const loading = loadingFiveS || loadingResponsables;

    // Filter Data
    const filteredData = useMemo(() => {
        if (!user) return { fiveS: [], quickWins: [], vsms: [], a3: [] };

        const isAdmin = user.role === 'admin' || user.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isAdmin ? globalFilterCompanyId : user.companyId;

        const filterByCompany = (items) => {
            if (!Array.isArray(items)) return [];
            if (targetCompanyId === 'all') return items;
            return items.filter(item => item.companyId && item.companyId === targetCompanyId);
        };

        // Prepare A3 detailed structure (ensure all fields expected by AI are present)
        const enrichedA3 = (a3Data || []).map(p => ({
            ...p,
            background: p.background,
            currentCondition: p.current_condition || p.currentCondition, // Handle snake_case vs camelCase if mixed
            goal: p.goal,
            rootCause: p.root_cause || p.rootCause,
            countermeasures: p.countermeasures,
            ishikawas: p.ishikawas || [],
            multipleFiveWhys: p.multipleFiveWhys || p.five_whys || [], // Handle both keys
            followUpData: Array.isArray(p.follow_up_data) ? p.follow_up_data : (p.followUpData || [])
        }));

        return {
            fiveS: filterByCompany(fiveSCards),
            quickWins: filterByCompany(quickWinsData),
            vsms: filterByCompany(vsmData),
            a3: filterByCompany(enrichedA3),
            auditLogs: [] // Audit logs can be fetched separately if strictly needed, or omitted for speed
        };
    }, [user, globalFilterCompanyId, fiveSCards, quickWinsData, vsmData, a3Data]);

    const companyName = companies?.find(c => c.id === globalFilterCompanyId)?.name || 'Todas las Empresas';

    if (!user) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

    // Permissions Check
    const hasAIAccess = user.role === 'admin' || user.has_ai_access === true;

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
        <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4 shrink-0">
                <HeaderWithFilter
                    title="Consultor IA"
                    subtitle="Análisis inteligente y asistencia en tiempo real"
                    icon={<Brain className="text-cyan-500" size={32} />}
                />
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <AIConsultant
                        data={filteredData}
                        companyName={companyName}
                        apiKey={import.meta.env.VITE_GEMINI_API_KEY}
                        fullScreen={true}
                    />
                )}
            </div>
        </div>
    );
};

export default ConsultantPage;
