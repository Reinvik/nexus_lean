import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import AIConsultant from '../components/AIConsultant';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { AuditService } from '../services/AuditService';
import { Brain } from 'lucide-react';

const ConsultantPage = () => {
    const { user, globalFilterCompanyId, companies } = useAuth();
    const [data, setData] = useState({ fiveS: [], quickWins: [], vsms: [], a3: [] });
    const [loading, setLoading] = useState(true);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const [fiveSRes, quickWinsRes, vsmRes, a3Res] = await Promise.all([
                    supabase.from('five_s_cards').select('id, created_at, status, reason, responsible, company_id, date, location, article, type, proposed_action'),
                    supabase.from('quick_wins').select('id, title, status, company_id, responsible, date, impact, description'),
                    supabase.from('vsm_projects').select('id, company_id'),
                    supabase.from('a3_projects').select('id, company_id, title, status, responsible, created_at, action_plan, follow_up_data, background, current_condition, goal, root_cause, countermeasures, ishikawas, five_whys')
                ]);

                // Map data
                const fiveS = fiveSRes.data ? fiveSRes.data.map(c => ({
                    id: c.id,
                    status: c.status,
                    reason: c.reason,
                    responsible: c.responsible,
                    companyId: c.company_id,
                    date: c.date,
                    location: c.location,
                    article: c.article
                })) : [];

                const quickWins = quickWinsRes.data ? quickWinsRes.data.map(w => ({
                    id: w.id,
                    title: w.title,
                    description: w.description,
                    status: w.status,
                    companyId: w.company_id,
                    responsible: w.responsible,
                    date: w.date,
                    impact: w.impact
                })) : [];

                const vsms = vsmRes.data ? vsmRes.data.map(v => ({
                    id: v.id,
                    companyId: v.company_id
                })) : [];

                const a3 = a3Res.data ? a3Res.data.map(p => ({
                    id: p.id,
                    companyId: p.company_id,
                    title: p.title,
                    status: p.status,
                    responsible: p.responsible,
                    created_at: p.created_at,
                    actionPlan: p.action_plan || [],
                    // Ensure we pass full structure for AI analysis
                    background: p.background,
                    currentCondition: p.current_condition,
                    goal: p.goal,
                    rootCause: p.root_cause,
                    countermeasures: p.countermeasures,
                    // Map Ishikawas and 5 Whys from direct DB columns
                    ishikawas: p.ishikawas || [],
                    multipleFiveWhys: p.five_whys || [], // Note: DB column is five_whys, frontend uses multipleFiveWhys

                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data ? [p.follow_up_data] : [])
                })) : [];

                // Fetch Audit Logs (last 50)
                const auditLogs = await AuditService.getLogs(null, 50);

                setData({ fiveS, quickWins, vsms, a3, auditLogs });
            } catch (error) {
                console.error("Error loading consultant data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user, globalFilterCompanyId]);

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

        return {
            fiveS: filterByCompany(data.fiveS),
            quickWins: filterByCompany(data.quickWins),
            vsms: filterByCompany(data.vsms),
            a3: filterByCompany(data.a3),
            auditLogs: data.auditLogs || []
        };
    }, [user, globalFilterCompanyId, data]);

    const companyName = companies?.find(c => c.id === globalFilterCompanyId)?.name || 'Todas las Empresas';

    if (!user) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

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
