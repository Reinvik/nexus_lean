import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { Mail, AlertCircle, CheckCircle2, Send, FileText, Activity, Trophy, TrendingUp, List, ChevronRight, Search, Users, Target } from 'lucide-react';

interface TaskItem {
    id: string | number;
    title: string;
    status: string;
    type: '5S' | 'Quick Win' | 'A3' | 'VSM';
}

interface ResponsibleStats {
    userId: string;
    name: string;
    email: string | null;
    role: string;
    // Data collections
    fiveSItems: TaskItem[];
    quickWinsItems: TaskItem[];
    a3Items: TaskItem[];
    vsmItems: TaskItem[];
    // Counts
    fiveSPending: number;
    fiveSCompleted: number;
    quickWinsPending: number;
    quickWinsCompleted: number;
    a3Pending: number;
    a3Completed: number;
    vsmPending: number;
    vsmCompleted: number;
    // Totals
    totalPending: number;
    totalCompleted: number;
    completionRate: number;
}

export default function Responsables() {
    const { user, selectedCompanyId } = useAuth();
    const [stats, setStats] = useState<ResponsibleStats[]>([]);
    const [selectedUser, setSelectedUser] = useState<ResponsibleStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [teamSearchTerm, setTeamSearchTerm] = useState('');

    useEffect(() => {
        if (user && selectedCompanyId) {
            fetchData();
        }
    }, [user, selectedCompanyId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (!selectedCompanyId) return;

            // 1. Fetch Profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', selectedCompanyId);

            if (profilesError) throw profilesError;

            // 2. Fetch ALL 5S Cards - Need Area as title
            const { data: fiveCards, error: fiveError } = await supabase
                .from('five_s_cards')
                .select('id, assigned_to, area, status');

            if (fiveError) throw fiveError;

            // 3. Fetch ALL Quick Wins
            const { data: quickWins, error: qwError } = await supabase
                .from('quick_wins')
                .select('id, responsible, title, status');

            if (qwError) throw qwError;

            // 4. Fetch ALL A3 Projects
            const { data: a3Projects, error: a3Error } = await supabase
                .from('a3_projects')
                .select('id, responsible, title, status');

            if (a3Error) console.warn('No a3_projects table or error:', a3Error);

            // 5. Fetch ALL VSM Projects
            const { data: vsmProjects, error: vsmError } = await supabase
                .from('vsm_projects')
                .select('id, responsible, name, status');

            if (vsmError) console.warn('No vsm_projects table or error:', vsmError);

            // Process Data
            const processedStats: ResponsibleStats[] = profiles.map(profile => {
                // 5S Items
                const userFiveCards = fiveCards?.filter(c => c.assigned_to === profile.id) || [];
                const fiveSItems: TaskItem[] = userFiveCards.map(c => ({
                    id: c.id,
                    title: `Tarjeta 5S: ${c.area}`,
                    status: c.status,
                    type: '5S'
                }));

                const fiveSPending = fiveSItems.filter(c => c.status !== 'Cerrado').length;
                const fiveSCompleted = fiveSItems.filter(c => c.status === 'Cerrado').length;

                // Quick Win Items
                const userQuickWins = quickWins?.filter(qw => qw.responsible === profile.id || qw.responsible === profile.full_name) || [];
                const quickWinsItems: TaskItem[] = userQuickWins.map(qw => ({
                    id: qw.id,
                    title: qw.title,
                    status: qw.status,
                    type: 'Quick Win'
                }));
                const quickWinsPending = quickWinsItems.filter(qw => qw.status !== 'done').length;
                const quickWinsCompleted = quickWinsItems.filter(qw => qw.status === 'done').length;

                // A3 Items
                const userA3 = a3Projects?.filter(a => a.responsible === profile.id || a.responsible === profile.full_name) || [];
                const a3Items: TaskItem[] = userA3.map(a => ({
                    id: a.id,
                    title: a.title,
                    status: a.status,
                    type: 'A3'
                }));
                const a3Pending = a3Items.filter(a => a.status !== 'Cerrado').length;
                const a3Completed = a3Items.filter(a => a.status === 'Cerrado').length;

                // VSM Items
                const userVsm = vsmProjects?.filter(v => v.responsible === profile.id || v.responsible === profile.full_name) || [];
                const vsmItems: TaskItem[] = userVsm.map(v => ({
                    id: v.id,
                    title: v.name,
                    status: v.status,
                    type: 'VSM'
                }));
                const vsmPending = vsmItems.filter(v => v.status !== 'completed').length;
                const vsmCompleted = vsmItems.filter(v => v.status === 'completed').length;


                const totalPending = fiveSPending + quickWinsPending + a3Pending + vsmPending;
                const totalCompleted = fiveSCompleted + quickWinsCompleted + a3Completed + vsmCompleted;
                const totalTasks = totalPending + totalCompleted;
                const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

                return {
                    userId: profile.id,
                    name: profile.full_name || 'Usuario sin nombre',
                    email: profile.email,
                    role: profile.role,
                    fiveSItems,
                    quickWinsItems,
                    a3Items,
                    vsmItems,
                    fiveSPending,
                    fiveSCompleted,
                    quickWinsPending,
                    quickWinsCompleted,
                    a3Pending,
                    a3Completed,
                    vsmPending,
                    vsmCompleted,
                    totalPending,
                    totalCompleted,
                    completionRate
                };
            });

            // Sort by pending tasks desc
            const sortedStats = processedStats.sort((a, b) => b.totalPending - a.totalPending);
            setStats(sortedStats);

            if (sortedStats.length > 0 && !selectedUser) {
                setSelectedUser(sortedStats[0]);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReminder = async () => {
        if (!selectedUser || !selectedUser.email) {
            alert('Este usuario no tiene un email registrado.');
            return;
        }

        try {
            setSendingEmail(selectedUser.userId);

            const { error } = await supabase.functions.invoke('send-reminder', {
                body: {
                    name: selectedUser.name,
                    email: selectedUser.email,
                    pendingTasks: selectedUser.totalPending,
                    details: {
                        fiveS: selectedUser.fiveSPending,
                        quickWins: selectedUser.quickWinsPending,
                        a3: selectedUser.a3Pending,
                        vsm: selectedUser.vsmPending
                    }
                }
            });

            if (error) throw error;
            alert(`Recordatorio enviado correctamente a ${selectedUser.name}`);

        } catch (error) {
            console.error('Error sending reminder:', error);
            alert('Error al enviar el recordatorio via Supabase Edge Function.');
        } finally {
            setSendingEmail(null);
        }
    };

    // Calculate Top Stats
    const topPerformer = useMemo(() => {
        if (stats.length === 0) return null;
        return [...stats].sort((a, b) => b.totalCompleted - a.totalCompleted)[0];
    }, [stats]);

    const topLoad = useMemo(() => {
        if (stats.length === 0) return null;
        return [...stats].sort((a, b) => b.totalPending - a.totalPending)[0];
    }, [stats]);

    const totalSystemPending = useMemo(() => {
        return stats.reduce((acc, curr) => acc + curr.totalPending, 0);
    }, [stats]);

    // Filter team members by search
    const filteredStats = useMemo(() => {
        if (!teamSearchTerm.trim()) return stats;
        return stats.filter(s =>
            s.name.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(teamSearchTerm.toLowerCase())
        );
    }, [stats, teamSearchTerm]);

    // Filter Items for Selected User
    const filteredItems = useMemo(() => {
        if (!selectedUser) return [];
        let allItems = [
            ...selectedUser.fiveSItems,
            ...selectedUser.quickWinsItems,
            ...selectedUser.a3Items,
            ...selectedUser.vsmItems
        ];

        return allItems.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            const isCompleted = ['Cerrado', 'done', 'completed'].includes(item.status);

            if (filterStatus === 'all') return true;
            if (filterStatus === 'completed') return isCompleted;
            if (filterStatus === 'pending') return !isCompleted;

            return true;
        });
    }, [selectedUser, filterStatus, searchTerm]);


    if (loading) {
        return <LoadingScreen message="Cargando panel de responsables..." fullScreen={false} />;
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <HeaderWithFilter
                title="Gestión de Responsables"
                subtitle="Visión general de carga de trabajo y desempeño"
            />

            {/* Top Summary Cards - More Compact */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Team Members */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Equipo</div>
                            <div className="font-black text-slate-800 text-2xl">{stats.length}</div>
                            <div className="text-xs text-slate-700 font-medium">miembros activos</div>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                {/* Mayor Desempeño */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Mayor Desempeño</div>
                            <div className="font-black text-slate-800 text-base truncate">{topPerformer?.name || '-'}</div>
                            <div className="text-xs text-slate-700 font-medium">{topPerformer?.totalCompleted || 0} completadas</div>
                        </div>
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0 ml-2">
                            <Trophy size={20} />
                        </div>
                    </div>
                </div>

                {/* Mayor Carga */}
                <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-5 border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Mayor Carga</div>
                            <div className="font-black text-slate-800 text-base truncate">{topLoad?.name || '-'}</div>
                            <div className="text-xs text-slate-700 font-medium">{topLoad?.totalPending || 0} pendientes</div>
                        </div>
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 flex-shrink-0 ml-2">
                            <Target size={20} />
                        </div>
                    </div>
                </div>

                {/* Total Pendientes */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Pendientes</div>
                            <div className="font-black text-slate-800 text-2xl">{totalSystemPending}</div>
                            <div className="text-xs text-slate-700 font-medium">en el sistema</div>
                        </div>
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                            <List size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-280px)] min-h-[600px]">
                {/* Left Column - Team List */}
                <div className="w-full lg:w-[380px] flex flex-col gap-3 bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                            <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                            Equipo ({filteredStats.length})
                        </h2>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={teamSearchTerm}
                            onChange={(e) => setTeamSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {filteredStats.map(userStats => (
                            <div
                                key={userStats.userId}
                                onClick={() => setSelectedUser(userStats)}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group
                                    ${selectedUser?.userId === userStats.userId
                                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-md ring-2 ring-blue-200'
                                        : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:shadow-sm hover:bg-white'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm
                                            ${selectedUser?.userId === userStats.userId
                                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                                                : 'bg-gradient-to-br from-slate-600 to-slate-700'
                                            }
                                        `}>
                                            {userStats.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                                                {userStats.name}
                                            </div>
                                            <div className="text-[10px] text-slate-700 font-medium">{userStats.role}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide
                                        ${userStats.totalPending > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}
                                    `}>
                                        {userStats.totalPending}
                                    </span>
                                </div>

                                {/* Compact Stats Grid */}
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                    <div className="bg-white/50 rounded-md p-1.5 text-center border border-red-100">
                                        <div className="text-xs font-black text-red-600">{userStats.fiveSPending}</div>
                                        <div className="text-[8px] text-red-400 font-bold">5S</div>
                                    </div>
                                    <div className="bg-white/50 rounded-md p-1.5 text-center border border-amber-100">
                                        <div className="text-xs font-black text-amber-600">{userStats.quickWinsPending}</div>
                                        <div className="text-[8px] text-amber-400 font-bold">QW</div>
                                    </div>
                                    <div className="bg-white/50 rounded-md p-1.5 text-center border border-blue-100">
                                        <div className="text-xs font-black text-blue-600">{userStats.a3Pending}</div>
                                        <div className="text-[8px] text-blue-400 font-bold">A3</div>
                                    </div>
                                    <div className="bg-white/50 rounded-md p-1.5 text-center border border-purple-100">
                                        <div className="text-xs font-black text-purple-600">{userStats.vsmPending}</div>
                                        <div className="text-[8px] text-purple-400 font-bold">VSM</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${selectedUser?.userId === userStats.userId
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                            : 'bg-slate-400'
                                            }`}
                                        style={{ width: `${userStats.completionRate}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-700 font-medium mt-1">
                                    <span>{userStats.totalCompleted} completadas</span>
                                    <span className="font-bold">{Math.round(userStats.completionRate)}%</span>
                                </div>
                            </div>
                        ))}
                        {filteredStats.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No se encontraron miembros</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Detail View */}
                <div className="flex-1 bg-white rounded-2xl p-6 flex flex-col shadow-lg border border-slate-100">
                    {selectedUser ? (
                        <>
                            {/* User Header - More Compact */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5 pb-5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                        {selectedUser.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedUser.name}</h2>
                                        <p className="text-sm text-slate-700 font-medium flex items-center gap-2">
                                            {selectedUser.role}
                                            {selectedUser.email && (
                                                <>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span className="text-xs">{selectedUser.email}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSendReminder}
                                    disabled={sendingEmail === selectedUser.userId || !selectedUser.email || selectedUser.totalPending === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                                >
                                    {sendingEmail === selectedUser.userId ? (
                                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                    ) : (
                                        <Mail size={16} />
                                    )}
                                    Enviar Recordatorio
                                </button>
                            </div>

                            {/* Summary Grid - More Compact */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3.5 rounded-xl border border-red-200 text-center hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-red-600 mb-0.5">{selectedUser.fiveSPending}</div>
                                    <div className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Tarjetas 5S</div>
                                    <div className="text-[10px] text-slate-700 mt-1">{selectedUser.fiveSCompleted} completadas</div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-xl border border-amber-200 text-center hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-amber-600 mb-0.5">{selectedUser.quickWinsPending}</div>
                                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Quick Wins</div>
                                    <div className="text-[10px] text-slate-700 mt-1">{selectedUser.quickWinsCompleted} completadas</div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3.5 rounded-xl border border-blue-200 text-center hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-blue-600 mb-0.5">{selectedUser.a3Pending}</div>
                                    <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Proyectos A3</div>
                                    <div className="text-[10px] text-slate-700 mt-1">{selectedUser.a3Completed} completados</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3.5 rounded-xl border border-purple-200 text-center hover:shadow-md transition-shadow">
                                    <div className="text-2xl font-black text-purple-600 mb-0.5">{selectedUser.vsmPending}</div>
                                    <div className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Mapas VSM</div>
                                    <div className="text-[10px] text-slate-700 mt-1">{selectedUser.vsmCompleted} completados</div>
                                </div>
                            </div>

                            {/* Filter Tabs + Search */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'all', label: 'Todas', icon: List },
                                        { id: 'completed', label: 'Completadas', activeClass: 'bg-emerald-500 text-white', icon: CheckCircle2 },
                                        { id: 'pending', label: 'Pendientes', activeClass: 'bg-red-500 text-white', icon: AlertCircle },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setFilterStatus(tab.id as any)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                                ${filterStatus === tab.id
                                                    ? (tab.activeClass || 'bg-slate-800 text-white shadow-md')
                                                    : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                                                }
                                            `}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative w-full sm:w-auto">
                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Buscar tareas..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Detailed List - Improved */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                                {/* Group assignments by type to keep organization */}
                                {['5S', 'Quick Win', 'A3', 'VSM'].map(type => {
                                    const itemsOfType = filteredItems.filter(i => i.type === type);
                                    if (itemsOfType.length === 0) return null;

                                    const typeConfig = {
                                        '5S': { icon: AlertCircle, label: 'Tarjetas 5S', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
                                        'Quick Win': { icon: Activity, label: 'Quick Wins', color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
                                        'A3': { icon: FileText, label: 'Proyectos A3', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                                        'VSM': { icon: TrendingUp, label: 'Mapas VSM', color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
                                    }[type] || { icon: List, label: type, color: 'slate', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };

                                    const Icon = typeConfig.icon;

                                    return (
                                        <div key={type} className="mb-4">
                                            <div className={`sticky top-0 z-10 ${typeConfig.bgColor} ${typeConfig.borderColor} border rounded-lg px-3 py-2 mb-2 backdrop-blur-sm bg-opacity-90`}>
                                                <h3 className={`text-xs font-bold text-${typeConfig.color}-600 uppercase tracking-wider flex items-center gap-2`}>
                                                    <Icon size={14} />
                                                    {typeConfig.label}
                                                    <span className={`ml-auto px-2 py-0.5 rounded-md bg-white text-${typeConfig.color}-600 font-black text-[10px]`}>
                                                        {itemsOfType.length}
                                                    </span>
                                                </h3>
                                            </div>
                                            <div className="space-y-1.5 pl-1">
                                                {itemsOfType.map(item => {
                                                    const isCompleted = ['Cerrado', 'done', 'completed'].includes(item.status);
                                                    return (
                                                        <div
                                                            key={`${item.type}-${item.id}`}
                                                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group/item hover:shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCompleted ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                                <span className="font-medium text-slate-700 text-sm truncate">{item.title}</span>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ml-2
                                                                ${isCompleted
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }
                                                            `}>
                                                                {isCompleted ? 'OK' : 'Pend'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}

                                {filteredItems.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <Search size={40} className="mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No se encontraron asignaciones</p>
                                        <p className="text-xs">Intenta cambiar los filtros</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <Users size={40} className="text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-600 mb-1">Selecciona un miembro del equipo</p>
                            <p className="text-sm text-slate-700">Haz clic en un nombre para ver sus asignaciones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Custom scrollbar styles
const styles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
  transition: background-color 0.2s;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}
`;



