import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { sendTaskReminder } from '../services/emailService';
import { User, CheckCircle, Clock, AlertCircle, TrendingUp, Award, List, ChevronRight, Briefcase, Activity, Mail, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ResponsablesPage = () => {
    const { user, companyUsers, globalFilterCompanyId } = useAuth();
    const navigate = useNavigate();
    const [selectedResponsible, setSelectedResponsible] = useState(null);
    const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'completed', 'in_progress', 'pending'
    const [sendingEmail, setSendingEmail] = useState(false);

    const [fiveSData, setFiveSData] = useState([]);
    const [quickWinsData, setQuickWinsData] = useState([]);
    const [vsmData, setVsmData] = useState([]);
    const [a3Data, setA3Data] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAllData();
        }
    }, [user, globalFilterCompanyId]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [fiveSRes, quickWinsRes, vsmRes, a3Res] = await Promise.all([
                supabase.from('five_s_cards').select('*'),
                supabase.from('quick_wins').select('*'),
                supabase.from('vsm_projects').select('*'),
                supabase.from('a3_projects').select('*')
            ]);

            // Map and Set 5S
            if (fiveSRes.data) {
                setFiveSData(fiveSRes.data.map(c => ({
                    id: c.id,
                    responsible: c.responsible,
                    status: c.status,
                    reason: c.reason,
                    article: c.article,
                    location: c.location,
                    date: c.date,
                    companyId: c.company_id
                })));
            }

            // Map and Set Quick Wins
            if (quickWinsRes.data) {
                setQuickWinsData(quickWinsRes.data.map(w => ({
                    id: w.id,
                    responsible: w.responsible,
                    status: w.status, // done, idea
                    title: w.title,
                    date: w.date, // Added date
                    companyId: w.company_id
                })));
            }

            // Map and Set VSM
            if (vsmRes.data) {
                setVsmData(vsmRes.data.map(v => ({
                    id: v.id,
                    responsible: v.responsible,
                    status: v.status, // current, future
                    name: v.name,
                    date: v.date, // Added date
                    companyId: v.company_id
                })));
            }

            // Map and Set A3
            if (a3Res.data) {
                setA3Data(a3Res.data.map(p => ({
                    id: p.id,
                    responsible: p.responsible,
                    status: p.status, // Cerrado, En Proceso, Nuevo
                    title: p.title,
                    created_at: p.created_at, // Added created_at
                    actionPlan: p.action_plan || [], // Include Action Plan
                    companyId: p.company_id
                })));
            }

        } catch (error) {
            console.error("Error fetching aggregated data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Helper: checks if an item belongs to the currently viewed company context
    const isVisible = (item) => {
        if (!user) return false;

        // ALWAYS show tasks assigned to the current user (My Tasks view), 
        // disregarding company mismatch (safety net for data inconsistency)
        if (item.responsible === user.name) return true;

        const isSuperAdmin = user.role === 'admin' || user.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        if (targetCompanyId === 'all') return true;
        return item.companyId === targetCompanyId;
    };

    // 1. Get List of Unique Responsibles (from Users list OR from Data items)
    // Preference: Use `companyUsers` as the master list of "People", 
    // but fallback to names found in data cards if they aren't in the user list.
    const uniqueResponsibles = useMemo(() => {
        const names = new Set();

        // Determine current filter context
        const isSuperAdmin = user?.role === 'admin' || user?.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user?.companyId;

        // Add authorized users for this company context
        if (companyUsers) {
            companyUsers.forEach(u => {
                // FILTER: Only add if user belongs to target company (or target is 'all')
                // AND exclude global admins from the operational list if they don't have tasks
                const belongsToCompany = targetCompanyId === 'all' || u.company_id === targetCompanyId;
                const isUserAdmin = u.role === 'admin';

                // User request: "Admin no deberia aparecer en ninguna" implies hiding generic admins from this view
                if (belongsToCompany && !isUserAdmin && u.name) {
                    names.add(u.name);
                }
            });
        }

        // Add names found on cards (in case of manual entry) that match the filter
        [...fiveSData, ...quickWinsData, ...vsmData, ...a3Data].forEach(item => {
            if (isVisible(item) && item.responsible) {
                names.add(item.responsible);
            }
        });

        return Array.from(names).sort();
    }, [companyUsers, fiveSData, quickWinsData, vsmData, a3Data, user, globalFilterCompanyId]);

    // 2. Aggregate Tasks per Responsible
    const responsibleStats = useMemo(() => {
        return uniqueResponsibles.map(name => {
            // Filter tasks for this person AND this company context
            const myFiveS = fiveSData.filter(d => d.responsible === name && isVisible(d));
            const myQuickWins = quickWinsData.filter(d => d.responsible === name && isVisible(d));
            const myVsms = vsmData.filter(d => d.responsible === name && isVisible(d));
            const myA3s = a3Data.filter(d => d.responsible === name && isVisible(d));

            // A3 Action Plan Tasks (Individual tasks assigned to this person within ANY visible project)
            // We search across ALL visible A3s, not just the ones they lead
            const myA3Actions = [];
            a3Data.filter(p => isVisible(p)).forEach(project => {
                if (Array.isArray(project.actionPlan)) {
                    project.actionPlan.forEach(action => {
                        if (action.responsible === name) {
                            myA3Actions.push({
                                ...action,
                                projectId: project.id,
                                ...project.title ? { projectTitle: project.title } : {}
                            });
                        }
                    });
                }
            });
            const pendingA3Actions = myA3Actions.filter(a => a.status === 'pending').length;
            const completedA3Actions = myA3Actions.filter(a => a.status === 'done').length;

            const pending5S = myFiveS.filter(d => d.status !== 'Cerrado').length;
            const pendingQW = myQuickWins.filter(d => d.status !== 'done').length; // 'idea' is pending
            const pendingA3Projects = myA3s.filter(d => d.status !== 'Cerrado').length;

            // VSM Status Handling
            const pendingVSM = myVsms.filter(d => d.status !== 'completed').length;
            const completedVSM = myVsms.filter(d => d.status === 'completed').length;

            // Total Pending Tasks (Workload)
            const totalPending = pending5S + pendingQW + pendingA3Projects + pendingVSM + pendingA3Actions;

            // Completed Count for "Motivation" score
            const completed5S = myFiveS.filter(d => d.status === 'Cerrado').length;
            const completedQW = myQuickWins.filter(d => d.status === 'done').length;
            const completedA3Projects = myA3s.filter(d => d.status === 'Cerrado').length;
            const totalCompleted = completed5S + completedQW + completedA3Projects + completedVSM + completedA3Actions;

            return {
                name,
                totalPending,
                totalCompleted,
                breakdown: {
                    fiveS: pending5S,
                    quickWins: pendingQW,
                    vsm: pendingVSM,
                    a3: pendingA3Projects,
                    a3Actions: pendingA3Actions
                },
                tasks: {
                    fiveS: myFiveS,
                    quickWins: myQuickWins,
                    vsm: myVsms,
                    a3: myA3s,
                    a3Actions: myA3Actions
                }
            };
        }).sort((a, b) => b.totalPending - a.totalPending); // Sort by busiest
    }, [uniqueResponsibles, fiveSData, quickWinsData, vsmData, a3Data, user, globalFilterCompanyId]);

    // Helper to determine normalized status for filtering
    const getNormalizedStatus = (task, type) => {
        if (type === '5S') return task.status === 'Cerrado' ? 'completed' : 'pending';
        if (type === 'QW') return task.status === 'done' ? 'completed' : 'pending';
        if (type === 'VSM') return task.status === 'completed' ? 'completed' : (task.status === 'current' ? 'in_progress' : 'pending');
        if (type === 'A3') return task.status === 'Cerrado' ? 'completed' : 'in_progress';
        if (type === 'A3Act') return task.status === 'done' ? 'completed' : 'pending';
        return 'pending';
    };

    const filterList = (list, type) => {
        if (taskFilter === 'all') return list;
        return list.filter(item => getNormalizedStatus(item, type) === taskFilter);
    };


    // Data for Chart
    // Data for Chart
    const chartData = responsibleStats.slice(0, 20).map(r => ({
        name: r.name ? r.name.split(' ')[0] : 'S/N', // First name only for chart, safe check
        pendientes: r.totalPending,
        completadas: r.totalCompleted
    }));


    return (
        <div className="page-container" style={{ position: 'relative' }}>
            <HeaderWithFilter
                title="Gestión de Responsables"
                subtitle="Seguimiento de carga de trabajo y desempeño"
            />

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* MVP Card */}
                <div className="card p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-100 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm text-yellow-500">
                        <Award size={32} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Mayor Desempeño</span>
                        {responsibleStats.length > 0 ? (
                            // Sort copy by completed descending
                            (() => {
                                const top = [...responsibleStats].sort((a, b) => b.totalCompleted - a.totalCompleted)[0];
                                return (
                                    <>
                                        <h3 className="text-xl font-bold text-gray-800">{top.name}</h3>
                                        <p className="text-sm text-gray-600">{top.totalCompleted} tareas resueltas</p>
                                    </>
                                );
                            })()
                        ) : <p className="text-gray-400">Sin datos</p>}
                    </div>
                </div>

                {/* Busiest Bee */}
                <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm text-blue-500">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Mayor Carga</span>
                        {responsibleStats.length > 0 ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-800">{responsibleStats[0].name}</h3>
                                <p className="text-sm text-gray-600">{responsibleStats[0].totalPending} pendientes</p>
                            </>
                        ) : <p className="text-gray-400">Sin datos</p>}
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="card p-6 bg-white flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-full text-gray-500">
                        <List size={32} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pendientes</span>
                        <h3 className="text-2xl font-bold text-gray-800">
                            {responsibleStats.reduce((acc, curr) => acc + curr.totalPending, 0)}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: List of People */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <User size={20} /> Equipo
                    </h3>
                    <div className="space-y-3">
                        {responsibleStats.map((person, idx) => (
                            <div
                                key={idx}
                                className={`card p-4 cursor-pointer transition-all hover:translate-x-1 ${selectedResponsible?.name === person.name ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
                                onClick={() => setSelectedResponsible(person)}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-800">{person.name}</h4>
                                    {person.totalPending === 0 ? (
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                            <CheckCircle size={12} /> Al día
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
                                            {person.totalPending} pendientes
                                        </span>
                                    )}
                                </div>

                                {/* Mini Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-1.5 rounded-full"
                                        style={{ width: `${(person.totalCompleted / (person.totalCompleted + person.totalPending || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>{person.totalCompleted} resueltas</span>
                                    <span>Total: {person.totalCompleted + person.totalPending}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Col: Detail View or General Chart */}
                <div className="lg:col-span-2">
                    {selectedResponsible ? (
                        <div className="card p-6 h-full animate-fadeIn">
                            <div className="flex justify-between items-start mb-6 border-b pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg">
                                            {selectedResponsible.name.charAt(0)}
                                        </div>
                                        {selectedResponsible.name}
                                    </h2>
                                    <p className="text-gray-500 mt-1 ml-14">Detalle de asignaciones</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={sendingEmail}
                                        onClick={async () => {
                                            setSendingEmail(true);
                                            try {
                                                // 1. Find User Email
                                                let userEmail = '';
                                                if (companyUsers) {
                                                    const u = companyUsers.find(user => user.name === selectedResponsible.name);
                                                    if (u && u.email) userEmail = u.email;
                                                }

                                                if (!userEmail) {
                                                    alert('No se encontró el correo electrónico para este usuario.');
                                                    setSendingEmail(false);
                                                    return;
                                                }

                                                // 2. [DEMO MODE] Send via Local Outlook (Mailto) directly

                                                // FLATTEN TASKS from the structured object
                                                const allTasks = [
                                                    ...(selectedResponsible.tasks.fiveS || []).map(t => ({ ...t, type: '5S', title: `${t.article || 'Artículo'}, ${t.reason} en ${t.location || 'Area'}` })),
                                                    ...(selectedResponsible.tasks.quickWins || []).map(t => ({ ...t, type: 'QW', title: `${t.title}` })),
                                                    ...(selectedResponsible.tasks.vsm || []).map(t => ({ ...t, type: 'VSM', title: `${t.name}` })),
                                                    ...(selectedResponsible.tasks.a3 || []).map(t => ({ ...t, type: 'A3', title: `Proyecto: ${t.title}` })),
                                                    ...(selectedResponsible.tasks.a3Actions || []).map(t => ({ ...t, type: 'A3', title: `Acción: ${t.what} (${t.projectTitle})` }))
                                                ];

                                                // Filter for relevant tasks (Pending/In Progress for the list)
                                                // Assuming we want to show everything or just pending? User asked for "avise las pendientes o en progreso"
                                                const pendingTasks = allTasks.filter(t =>
                                                    t.status !== 'Cerrado' && t.status !== 'done' && t.status !== 'completed'
                                                );

                                                const appLink = window.location.origin;

                                                const subject = encodeURIComponent(`Reporte de Estado Nexus Be Lean`);

                                                // Clean format per user request
                                                const body = encodeURIComponent(`Hola ${selectedResponsible.name},

Aquí tienes el resumen ejecutivo de tu carga de trabajo actual.
✅ Tareas Completadas: ${selectedResponsible.totalCompleted}
⚠️ Tareas Pendientes:  ${selectedResponsible.totalPending}


Detalle de Tareas Pendientes:

${pendingTasks.length > 0 ? pendingTasks.map(t => `• [${t.type}] ${t.title} (${t.status})`).join('\n') : '• No hay tareas pendientes.'}


🔗 Accede a la plataforma:
${appLink}


Atentamente,
Nexus Jarvis System | CIAL Alimentos`);

                                                window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`;

                                                setSendingEmail(false);
                                                alert('Se ha abierto tu cliente de correo (Outlook) con el borrador generado.');

                                            } catch (error) {
                                                console.error(error);
                                                alert('Error inesperado al enviar correo.');
                                            } finally {
                                                setSendingEmail(false);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                        {sendingEmail ? 'Enviando...' : 'Enviar Recordatorio'}
                                    </button>
                                    <button onClick={() => setSelectedResponsible(null)} className="text-gray-400 hover:text-gray-600 text-sm underline">
                                        Volver al resumen
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
                                    <span className="block text-2xl font-bold text-red-600">{selectedResponsible.breakdown.fiveS}</span>
                                    <span className="text-xs font-bold text-red-400 uppercase">Tarjetas 5S</span>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-lg text-center border border-amber-100">
                                    <span className="block text-2xl font-bold text-amber-600">{selectedResponsible.breakdown.quickWins}</span>
                                    <span className="text-xs font-bold text-amber-400 uppercase">Quick Wins</span>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                                    <span className="block text-2xl font-bold text-blue-600">{selectedResponsible.breakdown.a3 + selectedResponsible.breakdown.a3Actions}</span>
                                    <span className="text-xs font-bold text-blue-400 uppercase">Proyectos y Acciones A3</span>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-100">
                                    <span className="block text-2xl font-bold text-purple-600">{selectedResponsible.breakdown.vsm}</span>
                                    <span className="text-xs font-bold text-purple-400 uppercase">Mapas VSM</span>
                                </div>
                            </div>

                            {/* FIlter Controls */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setTaskFilter('all')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${taskFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setTaskFilter('completed')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${taskFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    Completadas
                                </button>
                                <button
                                    onClick={() => setTaskFilter('in_progress')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${taskFilter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                >
                                    En Progreso
                                </button>
                                <button
                                    onClick={() => setTaskFilter('pending')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${taskFilter === 'pending' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                                >
                                    Pendientes
                                </button>
                            </div>

                            {/* Task Lists with STANDARDIZED STATUS */}
                            <div className="space-y-6">
                                {filterList(selectedResponsible.tasks.fiveS, '5S').length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <AlertCircle size={16} className="text-red-500" /> Hallazgos 5S ({selectedResponsible.tasks.fiveS.length})
                                        </h4>
                                        <ul className="space-y-2">
                                            {filterList(selectedResponsible.tasks.fiveS, '5S').map(t => (
                                                <li
                                                    key={t.id}
                                                    className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 cursor-pointer transition-colors"
                                                    onClick={() => navigate(`/5s?cardId=${t.id}`)}
                                                >
                                                    <span className="text-gray-600 truncate flex-1 pr-4">{t.reason}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'Cerrado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {t.status === 'Cerrado' ? 'Completado' : 'Pendiente'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {filterList(selectedResponsible.tasks.quickWins, 'QW').length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <TrendingUp size={16} className="text-amber-500" /> Quick Wins ({selectedResponsible.tasks.quickWins.length})
                                        </h4>
                                        <ul className="space-y-2">
                                            {filterList(selectedResponsible.tasks.quickWins, 'QW').map(t => (
                                                <li
                                                    key={t.id}
                                                    className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 cursor-pointer transition-colors"
                                                    onClick={() => navigate(`/quick-wins?winId=${t.id}`)}
                                                >
                                                    <span className="text-gray-600 truncate flex-1 pr-4">{t.title}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {t.status === 'done' ? 'Completado' : 'Pendiente'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {filterList(selectedResponsible.tasks.a3, 'A3').length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Briefcase size={16} className="text-blue-500" /> Proyectos A3 ({selectedResponsible.tasks.a3.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {filterList(selectedResponsible.tasks.a3, 'A3').map(t => (
                                            <li
                                                key={t.id}
                                                className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/a3?projectId=${t.id}`)}
                                            >
                                                <span className="text-gray-600 truncate flex-1 pr-4">{t.title}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'Cerrado' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {t.status === 'Cerrado' ? 'Completado' : 'En Progreso'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {filterList(selectedResponsible.tasks.a3Actions, 'A3Act').length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Briefcase size={16} className="text-blue-500" /> Actividades A3 ({selectedResponsible.tasks.a3Actions.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {filterList(selectedResponsible.tasks.a3Actions, 'A3Act').map((t, idx) => (
                                            <li
                                                key={`action-${idx}-${t.id}`}
                                                className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/a3?projectId=${t.projectId}`)}
                                            >
                                                <div className="flex-1 pr-4">
                                                    <span className="text-gray-600 block font-medium">{t.activity}</span>
                                                    <span className="text-xs text-gray-400">En proyecto: {t.projectTitle}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {t.status === 'done' ? 'Completado' : 'Pendiente'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {filterList(selectedResponsible.tasks.vsm, 'VSM').length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <Activity size={16} className="text-purple-500" /> Mapas VSM ({selectedResponsible.tasks.vsm.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {filterList(selectedResponsible.tasks.vsm, 'VSM').map(t => (
                                            <li
                                                key={t.id}
                                                className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/vsm?vsmId=${t.id}`)}
                                            >
                                                <span className="text-gray-600 truncate flex-1 pr-4">{t.name}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : (t.status === 'current' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')}`}>
                                                    {t.status === 'completed' ? 'Completado' : (t.status === 'current' ? 'En Progreso' : 'Pendiente')}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="card p-6 h-full flex flex-col">
                            <h3 className="text-lg font-bold text-gray-700 mb-6">Panorama General del Equipo</h3>
                            <div className="flex-1 min-h-[350px]" style={{ minHeight: '350px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={80} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                        <Bar dataKey="pendientes" name="Pendientes" fill="#ef4444" stackId="a" radius={[0, 4, 4, 0]} barSize={15} />
                                        <Bar dataKey="completadas" name="Resueltas" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} barSize={15} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">Top 20 usuarios por volumen de actividad</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ResponsablesPage;
