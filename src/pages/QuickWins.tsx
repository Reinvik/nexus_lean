import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Plus, Search, Filter, X, Zap, CheckCircle, Clock, Target,
    User, Calendar, Lightbulb, Trash2, ChevronDown, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { QuickWin, Profile } from '../types/database.types';
import { generateQuickWinSolution } from '../services/geminiService';

export default function QuickWins() {
    const { selectedCompanyId, profile } = useAuth();

    // Local filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'idea' | 'done'>('all');
    const [filterImpact, setFilterImpact] = useState<'all' | 'Alto' | 'Medio' | 'Bajo'>('all');

    // State for modals
    const [selectedWin, setSelectedWin] = useState<QuickWin | null>(null);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [completionModal, setCompletionModal] = useState<string | null>(null);

    // Data state
    const [allWins, setAllWins] = useState<QuickWin[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // New idea form state
    const [newIdea, setNewIdea] = useState({
        title: '',
        description: '',
        proposed_solution: '',
        impact: 'Medio' as 'Alto' | 'Medio' | 'Bajo',
        responsible: '',
        deadline: '',
        image_url: null as string | null
    });

    // Completion modal state
    const [completionData, setCompletionData] = useState({
        image: null as string | null,
        comment: ''
    });

    // Image upload refs
    const newIdeaImageRef = useRef<HTMLInputElement>(null);
    const completionImageRef = useRef<HTMLInputElement>(null);

    // Fetch Quick Wins
    const fetchWins = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('quick_wins')
                .select('*')
                .order('created_at', { ascending: false });

            if (selectedCompanyId) {
                query = query.eq('company_id', selectedCompanyId);
            }

            const { data, error } = await query;
            if (error) throw error;

            setAllWins(data || []);
        } catch (error) {
            console.error('Error fetching Quick Wins:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            let query = supabase.from('profiles').select('*');

            // If checking for a specific company, filter users. 
            // Note: Superadmins viewing "all" might see all users, but usually we want relevant ones.
            // RLS should handle visibility, but explicit filtering helps UI context.
            if (selectedCompanyId) {
                // Fetch company users OR superadmins
                // Since OR across filtered columns is tricky in simple syntax, we rely on RLS 
                // or just fetch all accessible and filter in memory if list is small, 
                // but let's try to trust standard visibility.
            }

            const { data, error } = await query;
            if (error) throw error;

            // Client-side filter to be safe if active company is selected
            let filteredUsers = data || [];
            if (selectedCompanyId) {
                filteredUsers = filteredUsers.filter(u =>
                    u.company_id === selectedCompanyId || u.role === 'superadmin'
                );
            }

            setUsers(filteredUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        if (selectedCompanyId) {
            fetchWins();
            fetchUsers();
        } else {
            setAllWins([]);
            fetchUsers(); // Fetch even if no company selected (e.g. superadmin view all)
            setLoading(false);
        }
    }, [selectedCompanyId]);

    // Filtered wins
    const filteredWins = useMemo(() => {
        return allWins.filter(win => {
            const matchesSearch = (win.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (win.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || win.status === filterStatus;
            const matchesImpact = filterImpact === 'all' || win.impact === filterImpact;

            return matchesSearch && matchesStatus && matchesImpact;
        });
    }, [allWins, searchTerm, filterStatus, filterImpact]);

    // KPIs
    const kpiData = useMemo(() => {
        const total = filteredWins.length;
        const done = filteredWins.filter(w => w.status === 'done').length;
        const ideas = filteredWins.filter(w => w.status !== 'done').length;
        const highImpact = filteredWins.filter(w => w.impact === 'Alto').length;

        return { total, done, ideas, highImpact };
    }, [filteredWins]);

    // Handle image upload
    const handleImageUpload = async (file: File, type: 'new' | 'completion'): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `quick-wins/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('five-s-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            return null;
        }
    };

    // Create new Quick Win
    const handleCreateIdea = async () => {
        if (!newIdea.title.trim() || !newIdea.description.trim()) {
            alert('Por favor completa el título y la descripción');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('No user session');

            let targetCompanyId = selectedCompanyId;
            if (!targetCompanyId && profile?.company_id) targetCompanyId = profile.company_id;

            const { error } = await supabase.from('quick_wins').insert({
                title: newIdea.title,
                description: newIdea.description,
                proposed_solution: newIdea.proposed_solution || null,
                impact: newIdea.impact,
                responsible: newIdea.responsible || null,
                deadline: newIdea.deadline || null,
                status: 'idea',
                image_url: newIdea.image_url,
                company_id: targetCompanyId
            });

            if (error) throw error;

            fetchWins();
            setIsNewModalOpen(false);
            setNewIdea({
                title: '',
                description: '',
                proposed_solution: '',
                impact: 'Medio',
                responsible: '',
                deadline: '',
                image_url: null
            });
        } catch (error: any) {
            alert('Error al crear la idea: ' + error.message);
        }
    };

    // Handle completion
    const confirmCompletion = async () => {
        if (!completionData.image || !completionData.comment.trim()) {
            alert('Debes subir una foto y agregar un comentario para completar la tarea.');
            return;
        }

        if (!completionModal) return;

        try {
            const { error } = await supabase
                .from('quick_wins')
                .update({
                    status: 'done',
                    completion_image_url: completionData.image,
                    completion_comment: completionData.comment,
                    completed_at: new Date().toISOString()
                })
                .eq('id', completionModal);

            if (error) throw error;

            fetchWins();
            setCompletionModal(null);
            setCompletionData({ image: null, comment: '' });
        } catch (error: any) {
            alert('Error al completar: ' + error.message);
        }
    };

    // Generate AI solution
    const handleGenerateSolution = async () => {
        if (!newIdea.title || !newIdea.description) {
            alert('Necesitas un título y descripción para generar una solución.');
            return;
        }

        setIsGenerating(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('Falta la API Key de Gemini');

            const solution = await generateQuickWinSolution(newIdea.title, newIdea.description, apiKey);
            setNewIdea(prev => ({ ...prev, proposed_solution: solution }));
        } catch (error: any) {
            alert('Error generando solución: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Delete Quick Win
    const handleDeleteWin = async (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
            try {
                const { error } = await supabase.from('quick_wins').delete().eq('id', id);
                if (error) throw error;

                fetchWins();
                setSelectedWin(null);
            } catch (error: any) {
                alert('Error al eliminar: ' + error.message);
            }
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'Alto': return 'bg-rose-50 text-rose-600 border-rose-200';
            case 'Medio': return 'bg-amber-50 text-amber-600 border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quick Wins</h1>
                    <p className="text-gray-900 mt-1">Registro y seguimiento de mejoras rápidas de alto impacto</p>
                </div>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                >
                    <Plus size={20} />
                    <span>Nueva Idea</span>
                </button>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <Lightbulb className="h-8 w-8 text-blue-600" />
                        <span className="text-3xl font-bold text-blue-900">{kpiData.total}</span>
                    </div>
                    <p className="text-sm font-medium text-blue-700">Total Ideas</p>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <span className="text-3xl font-bold text-green-900">{kpiData.done}</span>
                    </div>
                    <p className="text-sm font-medium text-green-700">Completadas</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="h-8 w-8 text-amber-600" />
                        <span className="text-3xl font-bold text-amber-900">{kpiData.ideas}</span>
                    </div>
                    <p className="text-sm font-medium text-amber-700">Pendientes</p>
                </div>

                <div className="bg-rose-50 rounded-xl p-6 border border-rose-100">
                    <div className="flex items-center justify-between mb-2">
                        <Zap className="h-8 w-8 text-rose-600" />
                        <span className="text-3xl font-bold text-rose-900">{kpiData.highImpact}</span>
                    </div>
                    <p className="text-sm font-medium text-rose-700">Alto Impacto</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" />
                    <input
                        type="text"
                        placeholder="Buscar ideas..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" />
                        <select
                            className="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="idea">Ideas</option>
                            <option value="done">Completadas</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" />
                        <select
                            className="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                            value={filterImpact}
                            onChange={(e) => setFilterImpact(e.target.value as any)}
                        >
                            <option value="all">Cualquier Impacto</option>
                            <option value="Alto">Alto</option>
                            <option value="Medio">Medio</option>
                            <option value="Bajo">Bajo</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ideas Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                            <Lightbulb size={20} />
                            Ideas Pendientes
                        </h3>
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-amber-700 border border-amber-200">
                            {filteredWins.filter(w => w.status !== 'done').length}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {filteredWins.filter(w => w.status !== 'done').map(win => (
                            <div
                                key={win.id}
                                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                                onClick={() => setSelectedWin(win)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md border ${getImpactColor(win.impact)}`}>
                                        {win.impact}
                                    </span>
                                    <span className="text-xs text-gray-900 flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(win.date).toLocaleDateString()}
                                    </span>
                                </div>

                                <h4 className="font-bold text-gray-900 text-lg mb-2">{win.title}</h4>
                                <p className="text-sm text-gray-800 line-clamp-2 mb-4">{win.description}</p>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {win.responsible ? win.responsible.charAt(0) : <User size={12} />}
                                        </div>
                                        <span className="text-xs text-gray-900">{win.responsible || 'Sin asignar'}</span>
                                    </div>
                                    <button
                                        className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                                        onClick={(e) => { e.stopPropagation(); setCompletionModal(win.id); }}
                                    >
                                        Completar
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredWins.filter(w => w.status !== 'done').length === 0 && (
                            <div className="py-12 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center text-gray-900">
                                <Lightbulb size={48} className="opacity-40 mb-2" />
                                <p>No hay ideas pendientes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                            <CheckCircle size={20} />
                            Completadas
                        </h3>
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200">
                            {filteredWins.filter(w => w.status === 'done').length}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {filteredWins.filter(w => w.status === 'done').map(win => (
                            <div
                                key={win.id}
                                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer opacity-90 hover:opacity-100"
                                onClick={() => setSelectedWin(win)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold uppercase px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <CheckCircle size={10} /> COMPLETADO
                                    </span>
                                    <span className="text-xs text-gray-900">{new Date(win.date).toLocaleDateString()}</span>
                                </div>

                                <h4 className="font-bold text-gray-900 text-lg mb-2 line-through">{win.title}</h4>

                                {win.completion_comment && (
                                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 mb-3">
                                        <p className="text-sm text-gray-800 italic">"{win.completion_comment}"</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredWins.filter(w => w.status === 'done').length === 0 && (
                            <div className="py-12 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center text-gray-900">
                                <CheckCircle size={48} className="opacity-40 mb-2" />
                                <p>No hay tareas completadas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Idea Modal */}
            {isNewModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setIsNewModalOpen(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <Lightbulb className="text-blue-600" size={20} />
                                Nueva Idea
                            </h3>
                            <button onClick={() => setIsNewModalOpen(false)} className="text-gray-900 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Título</label>
                                <input
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-500"
                                    value={newIdea.title}
                                    onChange={e => setNewIdea({ ...newIdea, title: e.target.value })}
                                    placeholder="Ej: Instalar dispensador de EPP"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Descripción</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 placeholder-gray-500"
                                    rows={4}
                                    value={newIdea.description}
                                    onChange={e => setNewIdea({ ...newIdea, description: e.target.value })}
                                    placeholder="¿Qué problema resuelve?"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-800 uppercase">Solución Propuesta</label>
                                    <button
                                        onClick={handleGenerateSolution}
                                        disabled={isGenerating}
                                        className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:text-blue-700 disabled:opacity-50"
                                    >
                                        <Zap size={12} className={isGenerating ? "animate-pulse" : ""} />
                                        {isGenerating ? "Generando..." : "Generar con IA"}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 placeholder-gray-500"
                                    rows={3}
                                    value={newIdea.proposed_solution}
                                    onChange={e => setNewIdea({ ...newIdea, proposed_solution: e.target.value })}
                                    placeholder="Describe la solución..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Impacto</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                        value={newIdea.impact}
                                        onChange={e => setNewIdea({ ...newIdea, impact: e.target.value as any })}
                                    >
                                        <option value="Bajo">Bajo</option>
                                        <option value="Medio">Medio</option>
                                        <option value="Alto">Alto</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Fecha Límite</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                        value={newIdea.deadline}
                                        onChange={e => setNewIdea({ ...newIdea, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Responsable</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" />
                                    <select
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 appearance-none cursor-pointer"
                                        value={newIdea.responsible}
                                        onChange={e => setNewIdea({ ...newIdea, responsible: e.target.value })}
                                    >
                                        <option value="">Seleccionar Responsable...</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.full_name || user.email || ''}>
                                                {user.full_name || user.email} {user.role === 'superadmin' ? '(Superadmin)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-900 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                            <button onClick={() => setIsNewModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-900 hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button onClick={handleCreateIdea} className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                                Crear Idea
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Modal */}
            {completionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setCompletionModal(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-emerald-800 flex items-center gap-2">
                                <CheckCircle className="text-emerald-600" size={20} />
                                Completar Quick Win
                            </h3>
                            <button onClick={() => setCompletionModal(null)} className="text-gray-900 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                <p className="text-sm text-emerald-800">
                                    Para cerrar esta tarea, sube una evidencia fotográfica y un comentario final.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Comentario de Cierre</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-gray-900 placeholder-gray-500"
                                    rows={3}
                                    placeholder="Explica qué se hizo..."
                                    value={completionData.comment}
                                    onChange={(e) => setCompletionData({ ...completionData, comment: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-800 uppercase mb-2">Evidencia Fotográfica</label>
                                <div
                                    onClick={() => completionImageRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer flex flex-col items-center"
                                >
                                    {completionData.image ? (
                                        <img src={completionData.image} alt="Evidence" className="w-full rounded-lg mb-2" />
                                    ) : (
                                        <>
                                            <Upload size={32} className="text-gray-900 mb-2" />
                                            <span className="text-sm text-gray-900">Subir Foto</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={completionImageRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const url = await handleImageUpload(file, 'completion');
                                            if (url) setCompletionData({ ...completionData, image: url });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                            <button onClick={() => setCompletionModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-900 hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button onClick={confirmCompletion} className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md">
                                Confirmar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedWin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setSelectedWin(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-gray-100 px-6 py-5 flex justify-between items-start">
                            <div>
                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md border ${selectedWin.status === 'done' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {selectedWin.status === 'done' ? 'COMPLETADO' : 'EN PROGRESO'}
                                </span>
                                <h3 className="font-bold text-2xl text-gray-900 mt-2">{selectedWin.title}</h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDeleteWin(selectedWin.id)}
                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    title="Eliminar"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button onClick={() => setSelectedWin(null)} className="text-gray-900 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-6">
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-900 uppercase mb-2">Descripción</h4>
                                <p className="text-gray-800">{selectedWin.description}</p>
                            </div>

                            {selectedWin.proposed_solution && (
                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-2">
                                        <Zap size={14} /> Solución Propuesta
                                    </h4>
                                    <p className="text-gray-800">{selectedWin.proposed_solution}</p>
                                </div>
                            )}

                            {selectedWin.completion_comment && (
                                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                                    <h4 className="text-xs font-bold text-emerald-700 uppercase mb-2">Comentario de Cierre</h4>
                                    <p className="text-gray-800 italic">"{selectedWin.completion_comment}"</p>
                                </div>
                            )}

                            {(selectedWin.image_url || selectedWin.completion_image_url) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedWin.image_url && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 uppercase mb-2">Imagen Inicial</h4>
                                            <img src={selectedWin.image_url} alt="Initial" className="w-full rounded-lg border border-gray-200" />
                                        </div>
                                    )}
                                    {selectedWin.completion_image_url && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 uppercase mb-2">Evidencia Final</h4>
                                            <img src={selectedWin.completion_image_url} alt="Completion" className="w-full rounded-lg border border-gray-200" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
