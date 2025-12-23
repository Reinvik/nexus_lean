import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Activity, CheckCircle, TrendingUp, Zap, ClipboardList, Target, Clock, Maximize2, Minimize2 } from 'lucide-react';
import StatCard from '../components/StatCard';


const Dashboard = () => {
    const { user, globalFilterCompanyId, companies } = useAuth();
    const [data, setData] = useState({ fiveS: [], quickWins: [], vsms: [], a3: [] });
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        const doc = window.document;
        const docEl = doc.documentElement;

        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            if (requestFullScreen) {
                requestFullScreen.call(docEl).then(() => {
                    setIsFullScreen(true);
                }).catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    alert("No se pudo entrar en modo pantalla completa. Es posible que tu navegador lo haya bloqueado.");
                });
            } else {
                alert("Tu navegador no soporta el modo pantalla completa.");
            }
        } else {
            if (cancelFullScreen) {
                cancelFullScreen.call(doc).then(() => {
                    setIsFullScreen(false);
                }).catch(err => {
                    console.error(`Error attempting to exit full-screen mode: ${err.message}`);
                });
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

    // 1. Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                const [fiveSRes, quickWinsRes, vsmRes, a3Res] = await Promise.all([
                    // Removed 'area' as it likely doesn't exist and causes error. Kept essential fields.
                    supabase.from('five_s_cards').select('id, created_at, status, reason, responsible, company_id, date, location, article, type, proposed_action'),
                    supabase.from('quick_wins').select('id, title, status, company_id, responsible, date, impact, description'),
                    supabase.from('vsm_projects').select('id, company_id'),
                    supabase.from('a3_projects').select('id, company_id, title, status, responsible, created_at, action_plan, follow_up_data')
                ]);

                // Map data from DB to match frontend expectations
                const fiveS = fiveSRes.data ? fiveSRes.data.map(c => ({
                    id: c.id,
                    status: c.status,
                    reason: c.reason, // Title for 5S
                    responsible: c.responsible,
                    companyId: c.company_id,
                    date: c.date,
                    location: c.location || c.area, // Fallback
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
                    created_at: p.created_at, // For timeline sorting
                    actionPlan: p.action_plan || [], // Include Action Plan for metrics
                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data && Object.keys(p.follow_up_data).length > 0 ? [p.follow_up_data] : [])
                })) : [];

                setData({ fiveS, quickWins, vsms, a3 });
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            }
        };
        loadData();
    }, [user, globalFilterCompanyId]);

    // 2. Filter Data
    const filteredData = useMemo(() => {
        if (!user) return { fiveS: [], quickWins: [], vsms: [], a3: [] };

        const isAdmin = user.role === 'admin' || user.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isAdmin ? globalFilterCompanyId : user.companyId;

        const filterByCompany = (items) => {
            if (!Array.isArray(items)) return [];
            if (targetCompanyId === 'all') return items;
            // Only include items that have a matching company_id (exclude null/undefined)
            return items.filter(item => item.companyId && item.companyId === targetCompanyId);
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
            fiveS: { total: fiveSTotal, closed: fiveSClosed, pending: fiveSPending, inProcess: fiveSInProcess, rate: fiveSCompletion },
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

    const chartData = [
        { name: '5S', Total: metrics.fiveS.total, Completados: metrics.fiveS.closed },
        { name: 'Quick Wins', Total: metrics.quickWins.total, Completados: metrics.quickWins.done },
        { name: 'Proyectos A3', Total: metrics.a3.total, Completados: metrics.a3.closed },
    ];

    const pieData = [
        { name: 'Pendiente', value: metrics.fiveS.pending, color: '#ef4444' },
        { name: 'En Proceso', value: metrics.fiveS.inProcess, color: '#f59e0b' },
        { name: 'Cerrado', value: metrics.fiveS.closed, color: '#10b981' },
    ].filter(d => d.value > 0);


    if (!user) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
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
                <StatCard
                    title="Tarjetas 5S"
                    value={metrics.fiveS.total}
                    subtitle={`${metrics.fiveS.rate}% Cumplimiento`}
                    icon={<ClipboardList />}
                    variant="red"
                    type="solid"
                />
                <StatCard
                    title="Quick Wins"
                    value={metrics.quickWins.done}
                    subtitle={`de ${metrics.quickWins.total} Ideas Registradas`}
                    icon={<Zap size={28} />}
                    variant="yellow"
                    type="solid"
                />
                <StatCard
                    title="Mapas VSM"
                    value={metrics.vsm.count}
                    subtitle="Flujos de Valor Analizados"
                    icon={<Activity size={28} />}
                    variant="purple"
                    type="solid"
                />
                <StatCard
                    title="Impacto Alto"
                    value={metrics.quickWins.impact}
                    subtitle="Mejoras de Alto Impacto"
                    icon={<Target size={28} />}
                    variant="green"
                    type="solid"
                />
            </div>

            {/* Dashboard Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PROGRESS RINGS ROW - REPLACES BAR CHART */}
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

                {/* 5S Status Distribution - 1/3 Width */}
                {/* 2. NEW SECTION: A3 KPI MONITORING (Moved Up) */}
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
                                        <div className="flex-1 w-full min-h-[120px] -mx-2">
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
                            <p className="text-xs text-slate-300">Crea un A3 y añade gráficos con "Mostrar en Dashboard" activo.</p>
                        </div>
                    )}
                </div>

                {/* 5S Status Distribution - 1/3 Width */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-100 lg:col-span-1 flex flex-col justify-between">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 z-10 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" /> Estado de Hallazgos 5S
                    </h4>
                    <div className="h-72 w-full flex items-center justify-center -mt-4">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
                                    <Legend
                                        verticalAlign="bottom"
                                        align="center"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 w-full h-full">
                                <Activity size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">Sin datos suficientes</p>
                                <p className="text-sm">Agrega auditorías o tarjetas</p>
                            </div>
                        )}
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
                            // Aggregate and Sort Activity
                            const allActivity = [
                                ...filteredData.fiveS.map(i => ({ ...i, type: '5S', rawDate: i.date, label: 'Reporte 5S', icon: <ClipboardList size={14} />, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' })),
                                ...filteredData.quickWins.map(i => ({ ...i, type: 'QW', rawDate: i.date, label: 'Quick Win', icon: <Zap size={14} />, color: 'text-amber-500 bg-amber-50 border-amber-100' })),
                                ...filteredData.a3.map(i => ({ ...i, type: 'A3', rawDate: i.created_at || new Date().toISOString(), label: 'Proyecto A3', icon: <Activity size={14} />, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' }))
                            ].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)).slice(0, 10);

                            if (allActivity.length === 0) return <div className="text-center py-12 text-slate-400">Sin actividad reciente.</div>;

                            return allActivity.map((item, idx) => {
                                // Initials
                                const initials = item.responsible ? item.responsible.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NA';
                                // Time Format (Simple)
                                const dateObj = new Date(item.rawDate);
                                const dateStr = isNaN(dateObj.getTime()) ? 'Reciente' : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

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
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${item.color}`}>
                                                        {item.icon} {item.type}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                <span className="font-bold text-slate-800">{item.responsible || 'Usuario'}</span> {actionText} <span className="font-medium italic text-slate-500">"{descriptionText}"</span>
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
