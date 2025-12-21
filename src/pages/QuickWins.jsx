import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, Filter, X, Zap, CheckCircle, Clock, Target, User, Calendar, Image as ImageIcon, ExternalLink, Lightbulb, Trash2, ArrowRight, ChevronDown } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import StatCard from '../components/StatCard';
import MobileFab from '../components/mobile/MobileFab';
import CameraCapture from '../components/mobile/CameraCapture';

const QuickWinsPage = () => {
    const { user, companyUsers, globalFilterCompanyId } = useAuth();
    const location = useLocation();

    // Filtros locales
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterImpact, setFilterImpact] = useState('all');

    // Estado del modal de detalle
    const [selectedWin, setSelectedWin] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estado del modal de nueva idea
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newIdea, setNewIdea] = useState({
        title: '',
        description: '',
        impact: 'Medio',
        responsible: '', // Nuevo campo
        deadline: '',     // Nuevo campo
        image: null
    });

    // Estado local para los datos
    const [allWins, setAllWins] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos de Supabase
    useEffect(() => {
        if (user) {
            fetchWins();
        }
    }, [user, globalFilterCompanyId]);

    const fetchWins = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('quick_wins')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Map snake_case to camelCase for internal use
                const formattedWins = data.map(w => ({
                    id: w.id,
                    title: w.title,
                    description: w.description,
                    status: w.status,
                    impact: w.impact,
                    responsible: w.responsible,
                    deadline: w.deadline,
                    date: w.date,
                    image: w.image_url,
                    completionImage: w.completion_image_url,
                    completionComment: w.completion_comment,
                    completedAt: w.completed_at,
                    companyId: w.company_id,
                    likes: w.likes
                }));
                setAllWins(formattedWins);
            }
        } catch (error) {
            console.error('Error fetching Quick Wins:', error);
            // Fallback for new database connectivity
            setAllWins([]);
        } finally {
            setLoading(false);
        }
    };

    // Handle Deep Linking (Existing logic kept)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const winId = params.get('winId');
        if (winId && allWins.length > 0) {
            const winToOpen = allWins.find(w => w.id === parseInt(winId) || w.id === winId);
            if (winToOpen) {
                setSelectedWin(winToOpen);
            }
        }
    }, [location.search, allWins]);

    // Filtrado Global por Empresa (Admin)
    const visibleWins = useMemo(() => {
        if (!user) return [];

        const isSuperAdmin = user.role === 'admin' || user.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        if (targetCompanyId === 'all') return allWins;

        // Show tasks matching company OR assigned to current user (safety net) OR global/legacy items (no companyId)
        return allWins.filter(w => w.companyId === targetCompanyId || w.responsible === user.name || !w.companyId);
    }, [allWins, user, globalFilterCompanyId]);

    // Filtrado Local (Búsqueda, Estado, Impacto)
    const filteredWins = useMemo(() => {
        return visibleWins.filter(win => {
            const matchesSearch = win.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                win.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || win.status === filterStatus;
            const matchesImpact = filterImpact === 'all' || win.impact === filterImpact;

            return matchesSearch && matchesStatus && matchesImpact;
        });
    }, [visibleWins, searchTerm, filterStatus, filterImpact]);

    // KPIs Calculations
    const kpiData = useMemo(() => {
        const total = visibleWins.length;
        const done = visibleWins.filter(w => w.status === 'done').length;
        const ideas = visibleWins.filter(w => w.status === 'idea').length;
        const highImpact = visibleWins.filter(w => w.impact === 'Alto').length;

        return { total, done, ideas, highImpact };
    }, [visibleWins]);


    // Crear Nueva Idea
    const handleCreateIdea = async () => {
        if (!newIdea.title.trim() || !newIdea.description.trim()) {
            alert('Por favor completa el título y la descripción');
            return;
        }

        // Determine company ID
        let idToAssign = user.companyId

        // Auto-assign company from responsible if possible
        if (companyUsers && newIdea.responsible) {
            const responsibleUser = companyUsers.find(u => u.name === newIdea.responsible);
            if (responsibleUser && responsibleUser.company_id) {
                idToAssign = responsibleUser.company_id;
            }
        }

        if (!idToAssign) {
            idToAssign = globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null;
        }

        const newWinDB = {
            title: newIdea.title,
            description: newIdea.description,
            impact: newIdea.impact,
            responsible: newIdea.responsible,
            deadline: newIdea.deadline,
            date: new Date().toISOString().split('T')[0],
            status: 'idea',
            image_url: newIdea.image,
            company_id: idToAssign
        };

        try {
            const { data, error } = await supabase
                .from('quick_wins')
                .insert([newWinDB])
                .select();

            if (error) throw error;

            if (data) {
                // Update local state by refetching or appending
                fetchWins();
                setIsNewModalOpen(false);
                setNewIdea({ title: '', description: '', impact: 'Medio', responsible: '', deadline: '', image: null });
            }
        } catch (error) {
            alert('Error al crear la idea: ' + error.message);
        }
    };

    // Actualizar campos genéricos (como responsable)
    const handleUpdateField = async (id, field, value) => {
        // Optimistic update
        const oldWins = [...allWins];
        setAllWins(prev => prev.map(win =>
            win.id === id ? { ...win, [field]: value } : win
        ));

        // Also update selectedWin if it's the one being edited
        if (selectedWin && selectedWin.id === id) {
            setSelectedWin(prev => ({ ...prev, [field]: value }));
        }

        try {
            const { error } = await supabase
                .from('quick_wins')
                .update({ [field]: value })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            alert(`Error al actualizar ${field}`);
            setAllWins(oldWins); // Revert
            if (selectedWin && selectedWin.id === id) {
                // Revert selectedWin logic (approximate since we don't have deep clone of selectedWin easily available without state)
                // Getting from oldWins is safer
                const oldWin = oldWins.find(w => w.id === id);
                if (oldWin) setSelectedWin(oldWin);
            }
        }
    };

    // Actualizar Estado (Drag & Drop simulado o botón)
    const handleStatusChange = async (id, newStatus, extraData = {}) => {
        // Optimistic update
        const oldWins = [...allWins];
        setAllWins(prev => prev.map(win =>
            win.id === id ? { ...win, status: newStatus, ...extraData } : win
        ));

        // DB Mapping
        const updates = {
            status: newStatus
        };
        if (extraData.completionImage) updates.completion_image_url = extraData.completionImage;
        if (extraData.completionComment) updates.completion_comment = extraData.completionComment;
        if (extraData.completedAt) updates.completed_at = extraData.completedAt;

        try {
            const { error } = await supabase
                .from('quick_wins')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado en la base de datos.');
            setAllWins(oldWins); // Revert
        }
    };

    // Modal de Completar Tarea
    const [completionModal, setCompletionModal] = useState(null); // ID de la tarea a completar
    const [completionData, setCompletionData] = useState({ image: null, comment: '' });

    const openCompletionModal = (win) => {
        setCompletionModal(win.id);
        setCompletionData({ image: null, comment: '' });
    };

    const confirmCompletion = () => {
        if (!completionData.image || !completionData.comment.trim()) {
            alert("Debes subir una foto y agregar un comentario para completar la tarea.");
            return;
        }

        handleStatusChange(completionModal, 'done', {
            completionImage: completionData.image,
            completionComment: completionData.comment,
            completedAt: new Date().toISOString()
        });
        setCompletionModal(null);
    };


    // Autocomplete helpers
    const personSuggestions = useMemo(() => {
        const usersNames = companyUsers ? companyUsers.map(u => u.name) : [];
        const cardNames = visibleWins.map(c => c.responsible);
        const all = [...usersNames, ...cardNames].filter(n => n && n.trim().length > 0);
        return [...new Set(all)].sort();
    }, [visibleWins, companyUsers]);


    // Eliminar Quick Win
    const handleDeleteWin = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
            // Optimistic
            const oldWins = [...allWins];
            setAllWins(prev => prev.filter(w => w.id !== id));
            setSelectedWin(null);

            try {
                const { error } = await supabase.from('quick_wins').delete().eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Error al eliminar");
                setAllWins(oldWins);
            }
        }
    };

    const getImpactColor = (impact) => {
        switch (impact) {
            case 'Alto': return 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10';
            case 'Medio': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10';
            default: return 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/10';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <HeaderWithFilter
                title="Quick Wins (Mejoras Rápidas)"
                subtitle="Registro y seguimiento de ideas de alto impacto y bajo esfuerzo"
            >
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm shadow-brand-500/30 hover:shadow-brand-500/50 font-medium active:scale-95"
                >
                    <Plus size={20} />
                    <span>Nueva Idea</span>
                </button>
            </HeaderWithFilter>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Ideas"
                    value={kpiData.total}
                    icon={<Lightbulb size={24} />}
                    variant="blue"
                    type="outlined"
                />
                <StatCard
                    title="Completadas"
                    value={kpiData.done}
                    icon={<CheckCircle size={24} />}
                    variant="green"
                    type="solid"
                />
                <StatCard
                    title="Pendientes"
                    value={kpiData.ideas}
                    icon={<Clock size={24} />}
                    variant="orange"
                    type="outlined"
                />
                <StatCard
                    title="Alto Impacto"
                    value={kpiData.highImpact}
                    icon={<Zap size={24} />}
                    variant="red"
                    type="outlined"
                />
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center sticky top-4 z-30">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar ideas por título o descripción..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 flex-wrap">
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="idea">Ideas (Pendientes)</option>
                            <option value="done">Completadas</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                            value={filterImpact}
                            onChange={(e) => setFilterImpact(e.target.value)}
                        >
                            <option value="all">Cualquier Impacto</option>
                            <option value="Alto">Alto Impacto</option>
                            <option value="Medio">Medio Impacto</option>
                            <option value="Bajo">Bajo Impacto</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Kanban Board Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Column: Ideas / Pendientes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                            <div className="bg-amber-200 p-1.5 rounded-lg text-amber-700"><Lightbulb size={20} /></div>
                            Ideas Pendientes
                        </h3>
                        <span className="bg-white px-2.5 py-1 rounded-full text-xs font-bold text-amber-600 border border-amber-200 shadow-sm">
                            {filteredWins.filter(w => w.status === 'idea').length}
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {filteredWins.filter(w => w.status === 'idea').map(win => (
                            <div
                                key={win.id}
                                className="group bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-200 transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => setSelectedWin(win)}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border ${getImpactColor(win.impact)}`}>
                                        {win.impact} Impacto
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded flex items-center gap-1">
                                        <Calendar size={12} /> {win.date}
                                    </span>
                                </div>

                                <h4 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-brand-600 transition-colors pr-8">
                                    {win.title}
                                </h4>
                                <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2">
                                    {win.description}
                                </p>

                                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold border border-brand-100">
                                            {win.responsible ? win.responsible.charAt(0) : <User size={12} />}
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 truncate max-w-[100px]">
                                            {win.responsible || 'Sin asignar'}
                                        </span>
                                    </div>
                                    <button
                                        className="text-xs font-bold bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1 active:scale-95"
                                        onClick={(e) => { e.stopPropagation(); openCompletionModal(win); }}
                                    >
                                        Marcar Hecho <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredWins.filter(w => w.status === 'idea').length === 0 && (
                            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                <Lightbulb size={48} className="opacity-20 mb-2" />
                                <p className="font-medium">No hay ideas pendientes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column: Completadas */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                            <div className="bg-emerald-200 p-1.5 rounded-lg text-emerald-700"><CheckCircle size={20} /></div>
                            Completadas
                        </h3>
                        <span className="bg-white px-2.5 py-1 rounded-full text-xs font-bold text-emerald-600 border border-emerald-200 shadow-sm">
                            {filteredWins.filter(w => w.status === 'done').length}
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {filteredWins.filter(w => w.status === 'done').map(win => (
                            <div
                                key={win.id}
                                className="group bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden opacity-90 hover:opacity-100"
                                onClick={() => setSelectedWin(win)}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-500/10 flex items-center gap-1">
                                        <CheckCircle size={10} strokeWidth={4} /> COMPLETADO
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded flex items-center gap-1">
                                        <Calendar size={12} /> {win.date}
                                    </span>
                                </div>

                                <h4 className="font-bold text-slate-700 text-lg mb-2 line-through decoration-slate-300 decoration-2">
                                    {win.title}
                                </h4>

                                {win.completionComment && (
                                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 mb-3 flex gap-3 items-start">
                                        <div className="mt-1 text-emerald-400"><CheckCircle size={14} /></div>
                                        <p className="text-sm text-slate-600 italic leading-snug">
                                            "{win.completionComment}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredWins.filter(w => w.status === 'done').length === 0 && (
                            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                <CheckCircle size={48} className="opacity-20 mb-2" />
                                <p className="font-medium">No hay tareas completadas</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>


            {/* Modal: Create New Idea */}
            {isNewModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setIsNewModalOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 bg-brand-100 text-brand-600 rounded-lg"><Lightbulb size={20} /></div>
                                Nueva Idea
                            </h3>
                            <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título de la Idea</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 font-medium transition-all"
                                    value={newIdea.title}
                                    onChange={e => setNewIdea({ ...newIdea, title: e.target.value })}
                                    placeholder="Ej: Instalar dispensador de EPP"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción Detallada</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 font-medium transition-all resize-none"
                                    rows="4"
                                    value={newIdea.description}
                                    onChange={e => setNewIdea({ ...newIdea, description: e.target.value })}
                                    placeholder="¿Qué problema resuelve y cómo?"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impacto Estimado</label>
                                    <div className="relative">
                                        <Target size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 font-medium appearance-none cursor-pointer"
                                            value={newIdea.impact}
                                            onChange={e => setNewIdea({ ...newIdea, impact: e.target.value })}
                                        >
                                            <option value="Bajo">Bajo</option>
                                            <option value="Medio">Medio</option>
                                            <option value="Alto">Alto</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Límite</label>
                                    <div className="relative">
                                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="date"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 font-medium cursor-pointer"
                                            value={newIdea.deadline}
                                            onChange={e => setNewIdea({ ...newIdea, deadline: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Responsable Sugerido</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 font-medium appearance-none cursor-pointer"
                                        value={newIdea.responsible}
                                        onChange={e => setNewIdea({ ...newIdea, responsible: e.target.value })}
                                    >
                                        <option value="">Seleccionar Responsable</option>
                                        {personSuggestions.map((name, i) => (
                                            <option key={i} value={name}>{name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Image Upload for New Idea */}
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Foto Referencial (Opcional)</label>
                                {/* Mobile Camera */}
                                <div className="block md:hidden">
                                    <CameraCapture
                                        currentImage={newIdea.image}
                                        onCapture={(url) => setNewIdea({ ...newIdea, image: url })}
                                        label="Tomar Foto"
                                    />
                                </div>
                                {/* Desktop Upload */}
                                <div className="hidden md:block">
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-1 hover:border-brand-300 hover:bg-slate-50 transition-all">
                                        <ImageUpload
                                            currentImage={newIdea.image}
                                            onUpload={(url) => setNewIdea({ ...newIdea, image: url })}
                                            placeholderText="Subir Foto (Opcional)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                            <button onClick={() => setIsNewModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={handleCreateIdea} className="px-5 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 active:scale-95 transition-all">Crear Idea</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Completar Tarea */}
            {completionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setCompletionModal(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-white">
                            <h3 className="font-bold text-xl text-emerald-800 flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={20} /></div>
                                Completar Quick Win
                            </h3>
                            <button onClick={() => setCompletionModal(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                                <div className="text-emerald-500 shrink-0"><CheckCircle size={20} /></div>
                                <p className="text-sm text-emerald-800 leading-snug">Para cerrar esta tarea y documentar la mejora, por favor sube una evidencia fotográfica y un comentario final.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comentario de Cierre</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 font-medium transition-all resize-none"
                                    rows="3"
                                    placeholder="Explica qué se hizo para resolver el problema..."
                                    value={completionData.comment}
                                    onChange={(e) => setCompletionData({ ...completionData, comment: e.target.value })}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Evidencia Fotográfica</label>
                                {/* Mobile Camera */}
                                <div className="block md:hidden mb-2">
                                    <CameraCapture
                                        currentImage={completionData.image}
                                        onCapture={(url) => setCompletionData({ ...completionData, image: url })}
                                        label="Tomar Foto Evidencia"
                                    />
                                </div>
                                {/* Desktop Upload */}
                                <div className="hidden md:block">
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-1 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                                        <ImageUpload
                                            currentImage={completionData.image}
                                            onUpload={(url) => setCompletionData({ ...completionData, image: url })}
                                            placeholderText="Subir Foto de la Mejora"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                            <button onClick={() => setCompletionModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={confirmCompletion} className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                                Confirmar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: View Details */}
            {selectedWin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setSelectedWin(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="border-b border-slate-100 px-6 py-5 flex justify-between items-start bg-white z-10 shrink-0">
                            <div className="flex-1 pr-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${selectedWin.status === 'done' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                        {selectedWin.status === 'done' ? 'COMPLETADO' : 'EN PROGRESO'}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${getImpactColor(selectedWin.impact)}`}>
                                        {selectedWin.impact} Impacto
                                    </span>
                                </div>
                                <h3 className="font-bold text-2xl text-slate-900 leading-tight">{selectedWin.title}</h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDeleteWin(selectedWin.id)}
                                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Eliminar registro permanentemente"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button onClick={() => setSelectedWin(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Col: Info */}
                                <div className="space-y-8">
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Lightbulb size={14} /> Detalle del Problema
                                        </h4>
                                        <p className="text-slate-700 text-base leading-relaxed">{selectedWin.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Responsable</h4>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                    {selectedWin.responsible ? selectedWin.responsible.charAt(0) : <User size={14} />}
                                                </div>
                                                <select
                                                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer border-b border-transparent hover:border-brand-300 transition-all py-0.5"
                                                    value={selectedWin.responsible || ''}
                                                    onChange={(e) => handleUpdateField(selectedWin.id, 'responsible', e.target.value)}
                                                >
                                                    <option value="">Sin asignar</option>
                                                    {personSuggestions.map((name, i) => (
                                                        <option key={i} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fecha Límite</h4>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{selectedWin.deadline || 'Sin fecha'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedWin.status === 'idea' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openCompletionModal(selectedWin); setSelectedWin(null); }}
                                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={20} /> Marcar como Completado
                                        </button>
                                    )}
                                </div>

                                {/* Right Col: Images */}
                                <div className="space-y-6">
                                    {selectedWin.completionImage ? (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <div className="p-1 bg-emerald-100 rounded text-emerald-600"><CheckCircle size={12} /></div>
                                                Evidencia de Cierre
                                            </h4>
                                            <div className="relative group rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                                                <img src={selectedWin.completionImage} className="w-full h-64 object-cover" alt="Evidencia" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                                                    <p className="text-white text-sm font-medium italic">"{selectedWin.completionComment}"</p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400 text-center pt-2">
                                                Tarea completada el {new Date(selectedWin.completedAt || selectedWin.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                                <ImageIcon size={32} />
                                            </div>
                                            <p className="font-medium">Sin evidencia adjunta</p>
                                            <p className="text-xs text-slate-300 mt-1 max-w-[200px] text-center">Las tareas completadas mostrarán aquí la foto de evidencia.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Actions */}
            {!isNewModalOpen && !completionModal && !selectedWin && (
                <MobileFab icon={Lightbulb} onClick={() => setIsNewModalOpen(true)} label="Nueva Idea" />
            )}
        </div>
    );
};

export default QuickWinsPage;
