import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Tooltip, AreaChart, Area, XAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, CheckCircle, Zap, ClipboardList, Target, Maximize2, Minimize2 } from 'lucide-react';
import StatCard from '../components/StatCard';

interface DashboardData {
    fiveS: any[];
    quickWins: any[];
    vsms: any[];
    a3: any[];
    recentActivity: any[];
}

const Dashboard = () => {
    const { user, profile, selectedCompanyId } = useAuth();
    const [data, setData] = useState<DashboardData>({ fiveS: [], quickWins: [], vsms: [], a3: [], recentActivity: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        const doc = window.document as any;
        const docEl = doc.documentElement as any;

        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            if (requestFullScreen) {
                requestFullScreen.call(docEl).catch((err: any) => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    alert("No se pudo entrar en modo pantalla completa. Es posible que tu navegador lo haya bloqueado o necesite un gesto de usuario explícito.");
                });
            } else {
                alert("Tu navegador no soporta el modo pantalla completa.");
            }
        } else {
            if (cancelFullScreen) {
                cancelFullScreen.call(doc).catch((err: any) => {
                    console.error(`Error attempting to exit full-screen mode: ${err.message}`);
                });
            }
        }
    };

    useEffect(() => {
        function onFullscreenChange() {
            const doc = document as any;
            const isFull = Boolean(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
            setIsFullScreen(isFull);
        }

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        document.addEventListener('mozfullscreenchange', onFullscreenChange);
        document.addEventListener('MSFullscreenChange', onFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('mozfullscreenchange', onFullscreenChange);
            document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        };
    }, []);

    // 1. Fetch Data Optimized
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);

            try {
                const isAdmin = profile?.role === 'superadmin';

                // Helper to apply company filter if not "all" (for superadmin)
                // For normal users, RLS handles it. For Superadmin, if they selected a company, we filter.
                const applyFilter = (query: any) => {
                    if (isAdmin && selectedCompanyId) {
                        return query.eq('company_id', selectedCompanyId);
                    }
                    return query;
                }

                // 1. FiveS Light Fetch
                const fiveSPromise = applyFilter(
                    supabase.from('five_s_cards').select('id, status, company_id, created_at, close_date')
                );

                // 2. Quick Wins Light Fetch
                const qwPromise = applyFilter(
                    supabase.from('quick_wins').select('id, status, impact, company_id, date')
                );

                // 3. VSM Count
                const vsmPromise = applyFilter(
                    supabase.from('vsm_projects').select('id, company_id', { count: 'exact', head: true })
                );

                // 4. A3 Projects
                const a3Promise = applyFilter(
                    supabase.from('a3_projects').select('id, title, status, responsible, created_at, action_plan, follow_up_data, company_id')
                );

                // 5. Recent Activity
                const recentFiveSPromise = applyFilter(
                    supabase.from('five_s_cards').select('id, created_at, findings, area, category, assigned_to, status, company_id').order('created_at', { ascending: false }).limit(6)
                );
                const recentQwPromise = applyFilter(
                    supabase.from('quick_wins').select('id, date, title, description, responsible, status, impact, company_id').order('date', { ascending: false }).limit(6)
                );

                const [fiveSRes, qwRes, vsmRes, a3Res, recFiveS, recQw] = await Promise.all([
                    fiveSPromise,
                    qwPromise,
                    vsmPromise,
                    a3Promise,
                    recentFiveSPromise,
                    recentQwPromise
                ]);

                // --- Process Counts & Stats ---
                const fiveS = (fiveSRes.data || []).map((c: any) => ({
                    id: c.id,
                    status: c.status,
                    companyId: c.company_id,
                    date: c.created_at,
                    solutionDate: c.close_date // Note: Mapping solution_date to close_date
                }));

                const quickWins = (qwRes.data || []).map((w: any) => ({
                    id: w.id,
                    status: w.status,
                    companyId: w.company_id,
                    impact: w.impact
                }));

                // NOTE: VSM is count only, so we simulate objects if needed or just use count
                const effectiveCompanyId = (isAdmin && selectedCompanyId) ? selectedCompanyId : (profile?.company_id || null);
                const vsms = Array(vsmRes.count || 0).fill(0).map((_, i) => ({
                    id: i,
                    companyId: effectiveCompanyId
                }));

                const a3List = (a3Res.data || []).map((p: any) => ({
                    id: p.id,
                    companyId: p.company_id,
                    title: p.title,
                    status: p.status,
                    responsible: p.responsible,
                    created_at: p.created_at,
                    actionPlan: p.action_plan || [],
                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data && Object.keys(p.follow_up_data).length > 0 ? [p.follow_up_data] : [])
                }));

                // --- Process Activity Feed ---
                // Mapping fields for consistency
                const recentActivity = [
                    ...(recFiveS.data || []).map((i: any) => ({
                        ...i,
                        type: '5S',
                        rawDate: i.created_at,
                        title: i.findings, // Map findings to title/description for feed
                        reason: i.description // or category?
                    })),
                    ...(recQw.data || []).map((i: any) => ({
                        ...i,
                        type: 'QW',
                        rawDate: i.date
                    })),
                    ...a3List.map((i: any) => ({
                        ...i,
                        type: 'A3',
                        rawDate: i.created_at
                    }))
                ].sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()).slice(0, 15);


                setData({
                    fiveS,
                    quickWins,
                    vsms,
                    a3: a3List,
                    recentActivity
                });

            } catch (error: any) {
                console.error("Error loading dashboard data:", error);
                setError(error.message || "Error de conexión");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user, profile, selectedCompanyId]);

    // 2. Filter Data
    const filteredData = useMemo(() => {
        if (!user) return { fiveS: [], quickWins: [], vsms: [], a3: [] };

        const isAdmin = profile?.role === 'superadmin';
        const targetCompanyId = isAdmin ? selectedCompanyId : profile?.company_id;

        const filterByCompany = (items: any[]) => {
            if (!Array.isArray(items)) return [];
            // If admin and no company selected (or null), show all? Or show none?
            // Assuming behavior: if selectedCompanyId is null, maybe show all if no restriction?
            // But usually selectedCompanyId defaults to null.
            if (isAdmin && !targetCompanyId) return items;

            return items.filter(item => item.companyId === targetCompanyId);
        };

        return {
            fiveS: filterByCompany(data.fiveS),
            quickWins: filterByCompany(data.quickWins),
            vsms: filterByCompany(data.vsms),
            a3: filterByCompany(data.a3)
        };
    }, [user, profile, selectedCompanyId, data]);

    // 3. Compute Metrics
    const metrics = useMemo(() => {
        const { fiveS, quickWins, vsms, a3 } = filteredData;
        const fiveSClosed = fiveS.filter(i => i.status === 'Cerrado').length;
        const fiveSTotal = fiveS.length;
        const fiveSPending = fiveS.filter(i => i.status === 'Pendiente' || i.status === 'Abierto').length; // Abierto/Pendiente mapping
        const fiveSInProcess = fiveS.filter(i => i.status === 'En Proceso' || i.status === 'En Progreso').length;
        const fiveSCompletion = fiveSTotal > 0 ? Math.round((fiveSClosed / fiveSTotal) * 100) : 0;

        // Calculate Average, Min, Max Closure Time
        const closedCards = fiveS.filter(c => c.status === 'Cerrado' && c.date && c.solutionDate);
        let totalDays = 0;
        let minDays: number | null = null;
        let maxDays: number | null = null;

        closedCards.forEach(c => {
            const start = new Date(c.date);
            const end = new Date(c.solutionDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const days = Math.max(0, diffTime / (1000 * 60 * 60 * 24));

                totalDays += days;

                if (minDays === null || days < minDays) minDays = days;
                if (maxDays === null || days > maxDays) maxDays = days;
            }
        });

        const rawAvgDays = closedCards.length > 0 ? (totalDays / closedCards.length) : 0;
        let avgLabel = '0.0';
        let avgUnit = 'Días Promedio';

        if (rawAvgDays > 0) {
            if (rawAvgDays < (1 / 24)) { // Less than 1 hour -> Minutes
                avgLabel = (rawAvgDays * 24 * 60).toFixed(0);
                avgUnit = 'Min Promedio';
            } else if (rawAvgDays < 1) { // Less than 1 day -> Hours
                avgLabel = (rawAvgDays * 24).toFixed(1);
                avgUnit = 'Horas Promedio';
            } else {
                avgLabel = rawAvgDays.toFixed(1);
                avgUnit = 'Días Promedio';
            }
        }

        const fastestClosure = minDays !== null ? minDays.toFixed(1) : '0';
        const slowestClosure = maxDays !== null ? maxDays.toFixed(1) : '0';


        const winsDone = quickWins.filter(i => i.status === 'done').length;
        const winsTotal = quickWins.length;
        const winsImpact = quickWins.filter(i => i.impact === 'Alto').length;

        const vsmCount = vsms.length;

        // A3 Metrics based on Action Plan Tasks
        let totalA3Actions = 0;
        let completedA3Actions = 0;

        a3.forEach(project => {
            if (Array.isArray(project.actionPlan)) {
                totalA3Actions += project.actionPlan.length;
                completedA3Actions += project.actionPlan.filter((action: any) =>
                    ['done', 'completado', 'finalizado', 'cerrado', 'terminado'].includes(action.status?.toLowerCase())
                ).length;
            }
        });

        const a3CompletionRate = totalA3Actions > 0
            ? Math.round((completedA3Actions / totalA3Actions) * 100)
            : 0;

        return {
            fiveS: {
                total: fiveSTotal,
                closed: fiveSClosed,
                pending: fiveSPending,
                inProcess: fiveSInProcess,
                rate: fiveSCompletion,
                avgClosure: avgLabel,
                avgClosureUnit: avgUnit,
                avgClosureRaw: rawAvgDays,
                minClosure: fastestClosure,
                maxClosure: slowestClosure
            },
            quickWins: { total: winsTotal, done: winsDone, impact: winsImpact },
            vsm: { count: vsmCount },
            a3: { total: a3.length, closed: a3.filter(p => p.status === 'Cerrado').length, rate: a3CompletionRate }
        };
    }, [filteredData]);

    // 4. Extract all Charts from Active A3 Projects for Monitoring
    const activeCharts = useMemo(() => {
        const charts: any[] = [];
        filteredData.a3.forEach(project => {
            if (project.followUpData && Array.isArray(project.followUpData)) {
                project.followUpData.forEach((chart: any) => {
                    const isVisible = chart.showInDashboard !== false;

                    if (isVisible && chart.dataPoints && chart.dataPoints.length > 0) {
                        let processedData: any[] = [];

                        // LOGIC FOR OEE CHARTS
                        if (chart.kpiType === 'oee') {
                            const oeeConfig = chart.oeeConfig || { standardSpeed: 100 };

                            processedData = chart.dataPoints.map((point: any) => {
                                const availableTime = parseFloat(point.availableTime) || 0;
                                const productiveTime = parseFloat(point.productiveTime) || 0;
                                const producedPieces = parseFloat(point.producedPieces) || 0;
                                const defectPieces = parseFloat(point.defectPieces) || 0;
                                const standardSpeed = parseFloat(oeeConfig.standardSpeed) || 100;

                                // Avoid division by zero
                                const availability = availableTime > 0 ? (productiveTime / availableTime) * 100 : 0;
                                const theoreticalOutput = productiveTime * standardSpeed;
                                const performance = theoreticalOutput > 0 ? (producedPieces / theoreticalOutput) * 100 : 0;
                                const quality = producedPieces > 0 ? ((producedPieces - defectPieces) / producedPieces) * 100 : 0;
                                const oee = (availability * performance * quality) / 10000;

                                return {
                                    date: point.date,
                                    value: Math.round(oee * 10) / 10 // OEE Percentage
                                };
                            });
                        }
                        // LOGIC FOR STANDARD KPIs
                        else {
                            processedData = chart.dataPoints.map((p: any) => ({
                                date: p.date,
                                value: p.value !== null && p.value !== undefined ? parseFloat(p.value) : 0
                            }));
                        }

                        const sortedData = processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        charts.push({
                            uniqueId: `${project.id}-${chart.id}`,
                            projectId: project.id,
                            projectTitle: project.title,
                            responsible: project.responsible,
                            kpiName: chart.kpiName || 'KPI Sin Nombre',
                            goal: chart.kpiGoal,
                            isPercentage: chart.kpiType === 'oee' ? true : chart.isPercentage, // OEE is always %
                            data: sortedData,
                            lastValue: sortedData[sortedData.length - 1]?.value
                        });
                    }
                });
            }
        });
        return charts;
    }, [filteredData]);


    if (!user) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

    if (error) {
        return (
            <div className="flex flex-col h-[50vh] items-center justify-center text-slate-500 space-y-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-full">
                    <Zap size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-700">No pudimos cargar los datos</h3>
                <p className="max-w-md text-center text-sm">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className={`space-y-8 animate-in fade-in duration-500 pb-12 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4">
                <div className="flex-1 w-full">
                    <HeaderWithFilter
                        title="Dashboard General"
                        subtitle="Visión global del desempeño operativo (KPIs)"
                    />
                </div>
                <button
                    onClick={toggleFullScreen}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm font-bold text-sm whitespace-nowrap mb-1"
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    {isFullScreen ? 'Salir Pantalla Completa' : 'Modo Pantalla Completa'}
                </button>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to="/tarjetas-5s" className="block transform transition-transform hover:scale-105 active:scale-95">
                    <StatCard
                        title="Tarjetas 5S"
                        value={metrics.fiveS.total}
                        subtitle={`${metrics.fiveS.rate}% Cumplimiento`}
                        icon={ClipboardList}
                        variant="red"
                        type="solid"
                    />
                </Link>
                <Link to="/quick-wins" className="block transform transition-transform hover:scale-105 active:scale-95">
                    <StatCard
                        title="Quick Wins"
                        value={metrics.quickWins.done}
                        subtitle={`de ${metrics.quickWins.total} Ideas Registradas`}
                        icon={Zap}
                        variant="yellow"
                        type="solid"
                    />
                </Link>
                <Link to="/vsm" className="block transform transition-transform hover:scale-105 active:scale-95">
                    <StatCard
                        title="Mapas VSM"
                        value={metrics.vsm.count}
                        subtitle="Flujos de Valor Analizados"
                        icon={Activity}
                        variant="purple"
                        type="solid"
                    />
                </Link>
                <Link to="/proyectos-a3" className="block transform transition-transform hover:scale-105 active:scale-95">
                    <StatCard
                        title="Impacto Alto"
                        value={metrics.quickWins.impact}
                        subtitle="Mejoras de Alto Impacto"
                        icon={Target}
                        variant="green"
                        type="solid"
                    />
                </Link>
            </div>

            {/* Dashboard Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PROGRESS RINGS ROW */}
                <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* CARD 1: 5S */}
                    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                            <ClipboardList size={16} /> Completado 5S
                        </h4>
                        <div className="w-full flex-1 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[{ value: metrics.fiveS.rate }, { value: 100 - metrics.fiveS.rate }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#10b981" /> {/* Emerald-500 */}
                                        <Cell fill="#f1f5f9" /> {/* Slate-100 */}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-emerald-500">{metrics.fiveS.rate}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avance</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12">
                            <ClipboardList size={120} className="text-emerald-500" />
                        </div>
                    </div>

                    {/* CARD 2: QUICK WINS */}
                    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                            <Zap size={16} /> Quick Wins
                        </h4>
                        <div className="w-full flex-1 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { value: metrics.quickWins.total > 0 ? Math.round((metrics.quickWins.done / metrics.quickWins.total) * 100) : 0 },
                                            { value: 100 - (metrics.quickWins.total > 0 ? Math.round((metrics.quickWins.done / metrics.quickWins.total) * 100) : 0) }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#f59e0b" /> {/* Amber-500 */}
                                        <Cell fill="#f1f5f9" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-amber-500">
                                    {metrics.quickWins.total > 0 ? Math.round((metrics.quickWins.done / metrics.quickWins.total) * 100) : 0}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Implementado</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12">
                            <Zap size={120} className="text-amber-500" />
                        </div>
                    </div>

                    {/* CARD 3: A3 PROJECTS */}
                    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                            <Activity size={16} /> Proyectos A3
                        </h4>
                        <div className="w-full flex-1 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { value: metrics.a3.rate },
                                            { value: 100 - metrics.a3.rate }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        <Cell fill="#6366f1" /> {/* Indigo-500 */}
                                        <Cell fill="#f1f5f9" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-indigo-500">
                                    {metrics.a3.rate}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avance</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12">
                            <Activity size={120} className="text-indigo-500" />
                        </div>
                    </div>

                </div>

                {/* 2. NEW SECTION: A3 KPI MONITORING (Moved Up) */}
                <div className="col-span-full">
                    <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-indigo-600" /> Monitoreo de KPIs (Proyectos A3)
                    </h3>

                    {activeCharts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {activeCharts.map((chart: any, idx: number) => {
                                // Calculate Delta
                                const firstValue = chart.data[0]?.value || 0;
                                const lastValue = parseFloat(chart.lastValue) || 0;
                                const deltaPercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
                                const isPositive = deltaPercent >= 0;
                                const deltaString = `${isPositive ? '+' : ''}${Math.round(deltaPercent)}% vs. inicio`;

                                // Dynamic Color Theme based on Index or Goal
                                const colors = [
                                    { stop1: '#8b5cf6', stop2: '#c4b5fd', stroke: '#7c3aed', bg: 'bg-purple-50', text: 'text-purple-600' }, // Purple
                                    { stop1: '#10b981', stop2: '#6ee7b7', stroke: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-600' }, // Emerald
                                    { stop1: '#f59e0b', stop2: '#fcd34d', stroke: '#d97706', bg: 'bg-amber-50', text: 'text-amber-600' }, // Amber
                                ];
                                const theme = colors[idx % colors.length];

                                return (
                                    <div key={chart.uniqueId} className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 flex flex-col justify-between h-[300px]">

                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="font-bold text-slate-500 text-sm">{chart.kpiName}</h5>
                                                {/* Big Value */}
                                                <div className="mt-2 flex items-baseline gap-2">
                                                    <span className={`text-4xl font-black ${theme.text}`}>
                                                        {chart.lastValue}{chart.isPercentage ? '%' : ''}
                                                    </span>
                                                </div>
                                                {/* Delta Badge */}
                                                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                    <span className={`${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {deltaString}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-10 rounded-full ${theme.bg} flex items-center justify-center ${theme.text}`}>
                                                <Activity size={20} />
                                            </div>
                                        </div>

                                        {/* Chart Area */}
                                        <div className="flex-1 w-full min-h-[120px] -mx-2 overflow-hidden">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chart.data}>
                                                    <defs>
                                                        <linearGradient id={`gradient-${chart.uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={theme.stop1} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={theme.stop1} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="date" hide />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                                        formatter={(value: any) => [chart.isPercentage ? `${value}%` : value, 'Valor']}
                                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={theme.stroke}
                                                        strokeWidth={3}
                                                        fill={`url(#gradient-${chart.uniqueId})`}
                                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Footer X-Axis Labels Simulation */}
                                        <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-2 border-t border-slate-50 pt-2">
                                            <span>{chart.data[0] ? new Date(chart.data[0].date).toLocaleDateString('es-ES', { month: 'short' }) : ''}</span>
                                            <span>{chart.projectTitle}</span>
                                            <span>{chart.data[chart.data.length - 1] ? new Date(chart.data[chart.data.length - 1].date).toLocaleDateString('es-ES', { month: 'short' }) : ''}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <Activity size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No hay gráficos de seguimiento activos</p>
                            <p className="text-xs text-slate-300">Crea un A3 y añade gráficos con &quot;Mostrar en Dashboard&quot; activo.</p>
                        </div>
                    )}
                </div>

                {/* 5S Status Distribution - REPLACED WITH AVERAGE CLOSURE TIME */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-1 flex flex-col h-[340px] relative overflow-hidden">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 z-10 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" /> Promedio de Cierre de Tarjetas 5S
                    </h4>

                    <div className="w-full flex-1 relative z-10 -mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[{ value: 100 }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                    isAnimationActive={true}
                                >
                                    <Cell fill="#10b981" fillOpacity={0.1} />
                                </Pie>
                                <Pie
                                    data={[{ value: 100 }]} // Visual trick: Full ring but thin, or just rely on the background ring
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {/* Just a subtle border effect or leave empty if we just want the number */}
                                    <Cell fill="transparent" stroke="#10b981" strokeWidth={0} />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="relative">
                                <span className="text-6xl font-black text-slate-700 tracking-tight">
                                    {metrics.fiveS.avgClosure}
                                </span>
                                {metrics.fiveS.avgClosureRaw > 15 && (
                                    <span className="absolute -top-2 -right-4 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{metrics.fiveS.avgClosureUnit}</span>
                        </div>
                    </div>

                    <div className="absolute -bottom-8 -right-8 opacity-[0.03] rotate-12 pointer-events-none">
                        <CheckCircle size={180} className="text-emerald-500" />
                    </div>

                    {/* NEW COMPARISON FOOTER */}
                    <div className="z-10 mt-auto w-full px-2">
                        <div className="flex justify-between items-center bg-slate-50 rounded-lg p-2 text-xs">
                            <div className="text-center">
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Más Rápida</p>
                                <p className="text-emerald-600 font-bold">{metrics.fiveS.minClosure} <span className="text-[10px]">días</span></p>
                            </div>
                            <div className="h-6 w-px bg-slate-200"></div>
                            <div className="text-center">
                                <p className="text-slate-400 font-bold uppercase text-[10px]">Más Lenta</p>
                                <p className="text-rose-600 font-bold">{metrics.fiveS.maxClosure} <span className="text-[10px]">días</span></p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium text-center mt-2 leading-tight">
                            Tiempo promedio desde la detección<br />hasta el cierre del hallazgo.
                        </p>
                    </div>
                </div>

                {/* TIMELINE ACTIVITY FEED - Replaces Quick Wins List */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-2 flex flex-col">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 z-10 flex items-center gap-2">
                        Actividad Reciente
                    </h4>

                    {/* Timeline Container */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[290px] relative pl-2 pt-2">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 z-0"></div>


                        {(() => {
                            // Use pre-fetched recent activity if available, or fallback to empty
                            const allActivity = data.recentActivity || [];

                            if (allActivity.length === 0) return <div className="text-center py-12 text-slate-400">Sin actividad reciente.</div>;

                            return allActivity.map((item: any, idx: number) => {
                                // Initials
                                const initials = item.responsible ? item.responsible.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
                                // Time Format (Simple)
                                const dateObj = new Date(item.rawDate);
                                const dateStr = isNaN(dateObj.getTime()) ? 'Reciente' : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                                // Format logic
                                let icon = item.type === '5S' ? <ClipboardList size={14} /> : (item.type === 'QW' ? <Zap size={14} /> : <Activity size={14} />);

                                // Action & Detail Logic
                                let actionText = "actualizó";
                                let descriptionText = item.title || item.reason || 'Sin Título';

                                if (item.type === '5S') {
                                    // Custom Format for 5S: Location, Article, Reason
                                    const parts = [];
                                    if (item.area) parts.push(item.area);
                                    if (item.category) parts.push(item.category);
                                    if (item.findings) parts.push(item.findings);
                                    if (parts.length > 0) descriptionText = parts.join(' • '); // Join with bullet

                                    if (item.status === 'Pendiente' || item.status === 'Abierto') actionText = "detectó hallazgo en";
                                    else if (item.status === 'Cerrado') actionText = "cerró hallazgo en";
                                    else actionText = "trabaja en";

                                } else if (item.type === 'QW') {
                                    // Custom Format for Quick Wins: Title, Description
                                    const parts = [item.title];
                                    if (item.description) parts.push(item.description);
                                    descriptionText = parts.join(': ');

                                    if (item.status === 'done') actionText = "implementó idea";
                                    else actionText = "propuso idea";
                                }

                                return (
                                    <div key={`${item.type}-${item.id}-${idx}`} className="relative pl-12 pb-6 last:pb-0 z-10 group">
                                        {/* Timeline Dot (Avatar) */}
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full border-4 border-white shadow-sm bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 z-10">
                                            {initials}
                                        </div>

                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-bold text-slate-700">{item.responsible || 'Usuario'}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{actionText}</span>
                                                <span className="text-[10px] text-slate-300 ml-auto">{dateStr}</span>
                                            </div>
                                            <div className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed flex gap-2">
                                                    <span className="mt-0.5 text-slate-400">{icon}</span>
                                                    {descriptionText}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
