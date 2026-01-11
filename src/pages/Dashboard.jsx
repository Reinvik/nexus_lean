import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis } from 'recharts';
import { Activity, CheckCircle, Zap, ClipboardList, Target, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import LoadingScreen from '../components/LoadingScreen';


const Dashboard = () => {
    const { user, globalFilterCompanyId, refreshData } = useAuth();
    const [data, setData] = useState({ fiveS: [], quickWins: [], vsms: [], a3: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error("Error enabling fullscreen:", err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        function onFullscreenChange() {
            const isFull = Boolean(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
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
            // console.time("DashboardLoad");

            try {
                // A. Parallel Count Queries (Much lighter than fetching all rows)
                // Note: RLS applies automatically, so we just count what is visible.

                // NOTE: Supabase JS select('*', { count: 'exact', head: true }) is the most efficient way to get counts.
                // However, we need counts filtered by status. 
                // Since we can't do "GROUP BY" easily in client-side Supabase without RPC, 
                // we'll compromise: Fetch ID and STATUS columns only. This is very light.

                // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
                const isAdmin = user.isGlobalAdmin;

                // Helper to apply company filter if not "all" (for superadmin)
                // For normal users, RLS handles it. For Superadmin, if they selected a company, we filter.
                const applyFilter = (query) => {
                    if (isAdmin && globalFilterCompanyId && globalFilterCompanyId !== 'all' && globalFilterCompanyId !== 'null') {
                        return query.eq('company_id', globalFilterCompanyId);
                    }
                    return query;
                }

                // 1. FiveS Light Fetch - Use correct column names
                const fiveSPromise = applyFilter(
                    supabase.from('five_s_cards').select('id, status, company_id, created_at, close_date')
                );

                // 2. Quick Wins Light Fetch (Id, Status, Impact)
                const qwPromise = applyFilter(
                    supabase.from('quick_wins').select('id, status, impact, company_id')
                );

                // 3. VSM Count
                const vsmPromise = applyFilter(
                    supabase.from('vsm_projects').select('id, company_id', { count: 'exact', head: true })
                );

                // 4. A3 Projects
                const a3Promise = applyFilter(
                    supabase.from('a3_projects').select('id, title, status, responsible, created_at, action_plan, follow_up_data, company_id')
                );

                // 5. Recent Activity - Use correct column names for five_s_cards
                const recentFiveSPromise = applyFilter(
                    supabase.from('five_s_cards')
                        .select(`
                            id, created_at, findings, area, description, assigned_to, status, company_id,
                            assigned_user:profiles!five_s_cards_assigned_to_fkey(full_name)
                        `)
                        .order('created_at', { ascending: false })
                        .limit(6)
                );
                const recentQwPromise = applyFilter(
                    supabase.from('quick_wins').select('id, created_at, title, description, responsible, status, impact, company_id').order('created_at', { ascending: false }).limit(6)
                );

                const [fiveSRes, qwRes, vsmRes, a3Res, recFiveS, recQw] = await Promise.all([
                    fiveSPromise,
                    qwPromise,
                    vsmPromise,
                    a3Promise,
                    recentFiveSPromise,
                    recentQwPromise
                ]);

                // console.timeEnd("DashboardLoad");

                // --- Process Counts & Stats ---
                const fiveS = (fiveSRes.data || []).map(c => ({
                    id: c.id,
                    status: c.status,
                    companyId: c.company_id,
                    date: c.created_at, // Map created_at -> date for compatibility
                    solutionDate: c.close_date // Map close_date -> solutionDate
                }));

                const quickWins = (qwRes.data || []).map(w => ({
                    id: w.id,
                    status: w.status,
                    companyId: w.company_id,
                    impact: w.impact
                }));

                const effectiveCompanyId = (isAdmin && globalFilterCompanyId !== 'all') ? globalFilterCompanyId : (user.companyId || null);
                const vsms = Array(vsmRes.count || 0).fill(0).map((_, i) => ({
                    id: i,
                    companyId: effectiveCompanyId
                }));

                const a3List = (a3Res.data || []).map(p => ({
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
                // --- Process Activity Feed ---
                const allowedModules = user.allowedModules || ['5s', 'a3', 'vsm', 'quick_wins', 'auditoria_5s', 'consultor_ia'];

                const recentActivity = [];

                if (allowedModules.includes('5s')) {
                    recentActivity.push(...(recFiveS.data || []).map(i => ({
                        ...i,
                        type: '5S',
                        rawDate: i.created_at,
                        location: i.area,
                        reason: i.findings,
                        responsible: i.assigned_user?.full_name || i.assigned_to || null
                    })));
                }

                if (allowedModules.includes('quick_wins')) {
                    recentActivity.push(...(recQw.data || []).map(i => ({ ...i, type: 'QW', rawDate: i.created_at })));
                }

                if (allowedModules.includes('a3')) {
                    recentActivity.push(...a3List.map(i => ({ ...i, type: 'A3', rawDate: i.created_at })));
                }

                const sortedActivity = recentActivity.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)).slice(0, 15);

                setData({
                    fiveS,
                    quickWins,
                    vsms,
                    a3: a3List,
                    recentActivity: sortedActivity
                });

            } catch (error) {
                console.error("Error loading dashboard data:", error);
                setError(error.message || "Error de conexión");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user, globalFilterCompanyId]);

    // 2. Filter Data
    const filteredData = useMemo(() => {
        if (!user) return { fiveS: [], quickWins: [], vsms: [], a3: [] };

        // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
        const isAdmin = user.isGlobalAdmin;
        const targetCompanyId = isAdmin ? globalFilterCompanyId : user.companyId;

        const filterByCompany = (items) => {
            if (!Array.isArray(items)) return [];
            if (targetCompanyId === 'all') return items;
            return items.filter(item => item.companyId && item.companyId == targetCompanyId);
        };

        return {
            fiveS: filterByCompany(data.fiveS),
            quickWins: filterByCompany(data.quickWins),
            vsms: filterByCompany(data.vsms),
            a3: filterByCompany(data.a3)
        };
    }, [user, globalFilterCompanyId, data]);

    // 3. Compute Metrics
    const metrics = useMemo(() => {
        const { fiveS, quickWins, vsms, a3 } = filteredData;
        const fiveSClosed = fiveS.filter(i => i.status === 'Cerrado').length;
        const fiveSTotal = fiveS.length;
        const fiveSPending = fiveS.filter(i => i.status === 'Pendiente').length;
        const fiveSInProcess = fiveS.filter(i => i.status === 'En Proceso').length;
        const fiveSCompletion = fiveSTotal > 0 ? Math.round((fiveSClosed / fiveSTotal) * 100) : 0;

        // Calculate Average, Min, Max Closure Time
        const closedCards = fiveS.filter(c => c.status === 'Cerrado');
        let totalDays = 0;
        let validClosedCount = 0;
        let minDays = null;
        let maxDays = null;

        closedCards.forEach(c => {
            // Ensure we have valid dates
            if (!c.date || !c.solutionDate) return;

            const start = new Date(c.date);
            const end = new Date(c.solutionDate);

            // Check for Invalid Date
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

            // Calculate difference in milliseconds
            const diffTime = end.getTime() - start.getTime();

            // Convert to days
            // Use Math.abs only if we suspect negative dates, but strictly end should be >= start.
            // However, allowing negative (0) if closed immediately.
            let days = diffTime / (1000 * 60 * 60 * 24);

            // Correction: If less than 0 (e.g. clock skew), cap at 0
            if (days < 0) days = 0;

            totalDays += days;
            validClosedCount++;

            if (minDays === null || days < minDays) minDays = days;
            if (maxDays === null || days > maxDays) maxDays = days;
        });

        // Avoid division by zero
        const avgClosureDays = validClosedCount > 0 ? (totalDays / validClosedCount).toFixed(1) : "0.0";
        const fastestClosure = minDays !== null ? minDays.toFixed(1) : "0.0";
        const slowestClosure = maxDays !== null ? maxDays.toFixed(1) : "0.0";


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
                completedA3Actions += project.actionPlan.filter(action => action.status === 'done').length;
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
                avgClosure: avgClosureDays,
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
        const charts = [];
        filteredData.a3.forEach(project => {
            if (project.followUpData && Array.isArray(project.followUpData)) {
                project.followUpData.forEach(chart => {
                    const isVisible = chart.showInDashboard !== false;

                    if (isVisible && chart.dataPoints && chart.dataPoints.length > 0) {
                        let processedData = [];

                        // LOGIC FOR OEE CHARTS
                        if (chart.kpiType === 'oee') {
                            const oeeConfig = chart.oeeConfig || { standardSpeed: 100 };

                            processedData = chart.dataPoints.map(point => {
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
                            processedData = chart.dataPoints.map(p => ({
                                date: p.date,
                                value: p.value !== null && p.value !== undefined ? parseFloat(p.value) : 0
                            }));
                        }

                        const sortedData = processedData.sort((a, b) => new Date(a.date) - new Date(b.date));

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

    const pieData = [
        { name: 'Pendiente', value: metrics.fiveS.pending, color: '#ef4444' },
        { name: 'En Proceso', value: metrics.fiveS.inProcess, color: '#f59e0b' },
        { name: 'Cerrado', value: metrics.fiveS.closed, color: '#10b981' },
    ].filter(d => d.value > 0);


    if (!user) return <LoadingScreen fullScreen={false} />;

    // Show loading screen on initial load (when no data exists yet)
    const isInitialLoading = loading &&
        data.fiveS.length === 0 &&
        data.quickWins.length === 0 &&
        data.vsms.length === 0 &&
        data.a3.length === 0 &&
        (!data.recentActivity || data.recentActivity.length === 0);

    if (isInitialLoading) {
        return <LoadingScreen fullScreen={false} />;
    }

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
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className={`w-full mx-auto space-y-8 animate-in fade-in duration-500 pb-12 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
            <HeaderWithFilter
                title="Dashboard General"
                subtitle="Visión global del desempeño operativo (KPIs)"
            >
                <button
                    onClick={refreshData}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-sm h-[36px] whitespace-nowrap bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 mr-3 shadow-sm"
                    title="Recargar Empresas y Datos"
                >
                    <RefreshCw size={18} />
                    <span>Recargar Datos</span>
                </button>
                <button
                    onClick={toggleFullScreen}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-bold text-sm h-[36px] whitespace-nowrap ${isFullScreen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'}`}
                    title={isFullScreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
                >
                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    <span className="hidden sm:inline">{isFullScreen ? 'Salir' : 'Pantalla Completa'}</span>
                </button>
            </HeaderWithFilter>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(user?.allowedModules || ['5s']).includes('5s') && (
                    <Link to="/5s" className="block transform transition-transform hover:scale-105 active:scale-95">
                        <StatCard
                            title="Tarjetas 5S"
                            value={metrics.fiveS.total}
                            subtitle={`${metrics.fiveS.rate}% Cumplimiento`}
                            icon={<ClipboardList />}
                            variant="red"
                            type="solid"
                        />
                    </Link>
                )}
                {(user?.allowedModules || ['quick_wins']).includes('quick_wins') && (
                    <Link to="/quick-wins" className="block transform transition-transform hover:scale-105 active:scale-95">
                        <StatCard
                            title="Quick Wins"
                            value={metrics.quickWins.done}
                            subtitle={`de ${metrics.quickWins.total} Ideas Registradas`}
                            icon={<Zap size={28} />}
                            variant="yellow"
                            type="solid"
                        />
                    </Link>
                )}
                {(user?.allowedModules || ['vsm']).includes('vsm') && (
                    <Link to="/vsm" className="block transform transition-transform hover:scale-105 active:scale-95">
                        <StatCard
                            title="Mapas VSM"
                            value={metrics.vsm.count}
                            subtitle="Flujos de Valor Analizados"
                            icon={<Activity size={28} />}
                            variant="purple"
                            type="solid"
                        />
                    </Link>
                )}
                {(user?.allowedModules || ['a3']).includes('a3') && (
                    <Link to="/a3" className="block transform transition-transform hover:scale-105 active:scale-95">
                        <StatCard
                            title="Impacto Alto"
                            value={metrics.quickWins.impact}
                            subtitle="Mejoras de Alto Impacto"
                            icon={<Target size={28} />}
                            variant="green"
                            type="solid"
                        />
                    </Link>
                )}
            </div>

            {/* Dashboard Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PROGRESS RINGS ROW - REPLACES BAR CHART */}
                <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* CARD 1: 5S */}
                    {(user?.allowedModules || ['5s']).includes('5s') && (
                        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                                <ClipboardList size={16} /> Completado 5S
                            </h4>
                            <div className="w-full h-56 relative z-10 min-w-0">
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
                    )}

                    {/* CARD 2: QUICK WINS */}
                    {(user?.allowedModules || ['quick_wins']).includes('quick_wins') && (
                        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                                <Zap size={16} /> Quick Wins
                            </h4>
                            <div className="w-full h-56 relative z-10 min-w-0">
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
                    )}

                    {/* CARD 3: A3 PROJECTS */}
                    {(user?.allowedModules || ['a3']).includes('a3') && (
                        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden h-[280px]">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 z-10 flex items-center gap-2">
                                <Activity size={16} /> Proyectos A3
                            </h4>
                            <div className="w-full h-56 relative z-10 min-w-0">
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
                    )}

                </div>

                {/* 5S Status Distribution - 1/3 Width */}
                {/* 2. NEW SECTION: A3 KPI MONITORING (Moved Up) */}
                {(user?.allowedModules || ['a3']).includes('a3') && (
                    <div className="col-span-full">
                        <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-indigo-600" /> Monitoreo de KPIs (Proyectos A3)
                        </h3>

                        {activeCharts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {activeCharts.map((chart, idx) => {
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
                                            <div className="h-[200px] w-full -mx-2 overflow-hidden min-w-0">
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
                                                            formatter={(value) => [chart.isPercentage ? `${value}%` : value, 'Valor']}
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
                )}

                {/* 5S Status Distribution - REPLACED WITH AVERAGE CLOSURE TIME */}
                {(user?.allowedModules || ['5s']).includes('5s') && (
                    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-1 flex flex-col h-[340px] relative overflow-hidden">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 z-10 flex items-center gap-2">
                            <CheckCircle size={16} className="text-emerald-500" /> Promedio de Cierre de Tarjetas 5S
                        </h4>

                        <div className="w-full h-56 relative z-10 -mt-2 min-w-0">
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
                                    {parseFloat(metrics.fiveS.avgClosure) > 15 && (
                                        <span className="absolute -top-2 -right-4 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Días Promedio</span>
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
                )}

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

                            return allActivity.map((item, idx) => {
                                // Initials
                                const initials = item.responsible ? item.responsible.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
                                // Time Format (Simple)
                                const dateObj = new Date(item.rawDate);
                                const dateStr = isNaN(dateObj.getTime()) ? 'Reciente' : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                                // Format logic
                                let label = item.type === '5S' ? 'Reporte 5S' : (item.type === 'QW' ? 'Quick Win' : 'Proyecto A3');
                                let icon = item.type === '5S' ? <ClipboardList size={14} /> : (item.type === 'QW' ? <Zap size={14} /> : <Activity size={14} />);
                                let color = item.type === '5S' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : (item.type === 'QW' ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-indigo-500 bg-indigo-50 border-indigo-100');

                                // Action & Detail Logic
                                let actionText = "actualizó";
                                let descriptionText = item.title || item.reason || 'Sin Título';

                                if (item.type === '5S') {
                                    // Custom Format for 5S: Location, Article, Reason
                                    const parts = [];
                                    if (item.location) parts.push(item.location);
                                    if (item.article) parts.push(item.article);
                                    if (item.reason) parts.push(item.reason);
                                    if (parts.length > 0) descriptionText = parts.join(' • '); // Join with bullet

                                    if (item.status === 'Pendiente') actionText = "detectó hallazgo en";
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

                                        {/* Content Card */}
                                        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow relative top-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${color}`}>
                                                        {icon} {label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                <span className="font-bold text-slate-800">{item.responsible || 'Usuario'}</span> {actionText} <span className="font-medium italic text-slate-500">&quot;{descriptionText}&quot;</span>
                                            </p>

                                            {/* Status Badge (Mini) */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${item.status === 'done' || item.status === 'Cerrado' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                                <span className="text-[10px] text-slate-400 capitalize">{item.status}</span>
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
