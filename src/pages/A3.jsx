import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, X, Save, FileText, BarChart2, GitBranch, Target, Layout, Calendar, User, Trash2, Image as ImageIcon, Building } from 'lucide-react';

// Import A3 Components
import A3Ishikawa from '../components/a3/A3Ishikawa';
import A3FiveWhys from '../components/a3/A3FiveWhys';
import A3FollowUp from '../components/a3/A3FollowUp';
import A3ActionPlan from '../components/a3/A3ActionPlan';
import A3Pareto from '../components/a3/A3Pareto';


const AutoResizeTextarea = ({ value, onChange, placeholder, minHeight = "100px", className }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = minHeight; // Reset
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.max(scrollHeight, parseInt(minHeight))}px`;
        }
    }, [value, minHeight]);

    return (
        <textarea
            ref={textareaRef}
            className={`${className} overflow-hidden resize-none`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            style={{ minHeight }}
        />
    );
};

const A3Page = () => {
    const { user, globalFilterCompanyId, companyUsers } = useAuth();
    const location = useLocation();
    const [selectedA3, setSelectedA3] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('definition'); // definition, analysis, plan
    const [companies, setCompanies] = useState([]);

    // Fetch Companies for Global Admin
    useEffect(() => {
        if (user?.isGlobalAdmin) {
            supabase.from('companies').select('id, name').then(({ data }) => {
                if (data) setCompanies(data);
            });
        }
    }, [user]);

    const handleDelete = async () => {
        if (!selectedA3?.id) return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto A3? Esta acción es irreversible.')) return;

        try {
            const { error } = await supabase.from('a3_projects').delete().eq('id', selectedA3.id);
            if (error) throw error;

            setA3Projects(prev => prev.filter(p => p.id !== selectedA3.id));
            setSelectedA3(null);
            alert('Proyecto eliminado correctamente.');
        } catch (error) {
            console.error('Error delete:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    // Load data from Supabase
    const [a3Projects, setA3Projects] = useState([]);
    // const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        try {
            // setLoading(true);
            const { data, error } = await supabase
                .from('a3_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formatted = data.map(p => ({
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    date: p.date,
                    responsible: p.responsible,
                    background: p.background,
                    backgroundImageUrl: p.background_image_url,
                    currentCondition: p.current_condition,
                    currentConditionImageUrl: p.current_condition_image_url,
                    goal: p.goal,
                    rootCause: p.root_cause,
                    paretoData: p.pareto_data || [],
                    countermeasures: p.countermeasures,
                    plan: p.execution_plan,       // Fixed column name
                    followUp: p.follow_up_notes,  // Fixed column name
                    ishikawas: p.ishikawas || [],
                    multipleFiveWhys: p.five_whys || [],
                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data && Object.keys(p.follow_up_data).length > 0 ? [p.follow_up_data] : []),
                    actionPlan: p.action_plan || [],
                    companyId: p.company_id
                }));
                // Migration safety check (handled by DB default usually, but good to be safe)
                setA3Projects(formatted);
            }
        } catch (error) {
            console.error('Error fetching A3 projects:', error);
        } finally {
            // setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, globalFilterCompanyId]);


    // Handle Deep Linking
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const projectId = params.get('projectId');
        if (projectId && a3Projects.length > 0) {
            const projectToOpen = a3Projects.find(p => p.id === parseInt(projectId) || p.id === projectId);
            if (projectToOpen) {
                setSelectedA3(projectToOpen);
                setActiveTab('definition');
            }
        }
    }, [location.search, a3Projects]);

    // Filtrado Global
    const visibleProjects = useMemo(() => {
        if (!user) return [];
        // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
        const isSuperAdmin = user.isGlobalAdmin;
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        if (targetCompanyId === 'all') {
            // Only Super Admins can see 'all'
            return isSuperAdmin ? a3Projects : [];
        }

        // Strict filtering: User must match company OR be Global Admin matching 'all'
        // Legacy support: (!p.companyId && isSuperAdmin)
        return a3Projects.filter(p => p.companyId === targetCompanyId || (!p.companyId && isSuperAdmin));
    }, [a3Projects, user, globalFilterCompanyId]);

    const filteredProjects = useMemo(() => {
        return visibleProjects.filter(p =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.responsible.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [visibleProjects, searchTerm]);

    const handleNewA3 = () => {
        setSelectedA3({
            id: null,
            title: '',
            status: 'Nuevo',
            responsible: user ? user.name : '',
            date: new Date().toISOString().split('T')[0],
            background: '',
            backgroundImageUrl: '',
            currentCondition: '',
            currentConditionImageUrl: '',
            goal: '',
            rootCause: '',
            paretoData: [],
            countermeasures: '',
            plan: '',
            followUp: '',
            ishikawas: [],
            multipleFiveWhys: [],
            followUpData: [],
            actionPlan: []
        });
        setActiveTab('definition');
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!selectedA3.title) {
            alert('El título es obligatorio');
            return;
        }

        setIsSaving(true);

        // AUTO-ASSIGN COMPANY based on Responsible
        let resolvedCompanyId = selectedA3.companyId || selectedA3.company_id;

        // If explicitly set, we primarily use it. 
        // Logic: Only override if the responsible user BELONGS to a different company.
        // If responsible is "Global" (company_id null), we KEEP the manual selection.
        if (companyUsers && selectedA3.responsible) {
            const responsibleUser = companyUsers.find(u => u.name === selectedA3.responsible);
            // Only force override if the user has a specific company assigned
            if (responsibleUser && responsibleUser.company_id) {
                resolvedCompanyId = responsibleUser.company_id;
            }
        }

        // Fallback only if still null
        if (!resolvedCompanyId) {
            resolvedCompanyId = user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null);
        }

        const projectData = {
            title: selectedA3.title,
            status: selectedA3.status,
            date: selectedA3.date,
            responsible: selectedA3.responsible,
            background: selectedA3.background,
            background_image_url: selectedA3.backgroundImageUrl,
            current_condition: selectedA3.currentCondition,
            current_condition_image_url: selectedA3.currentConditionImageUrl,
            goal: selectedA3.goal,
            root_cause: selectedA3.rootCause,
            pareto_data: selectedA3.paretoData,
            countermeasures: selectedA3.countermeasures,
            execution_plan: selectedA3.plan,      // Mapped to DB column
            follow_up_notes: selectedA3.followUp, // Mapped to DB column
            ishikawas: selectedA3.ishikawas,
            five_whys: selectedA3.multipleFiveWhys,
            follow_up_data: selectedA3.followUpData,
            action_plan: selectedA3.actionPlan,
            company_id: resolvedCompanyId
        };

        try {
            if (selectedA3.id) {
                // Update
                const { error } = await supabase
                    .from('a3_projects')
                    .update(projectData)
                    .eq('id', selectedA3.id);

                if (error) throw error;
                // Optimistic
                setA3Projects(a3Projects.map(p => p.id === selectedA3.id ? { ...selectedA3, ...projectData, multipleFiveWhys: projectData.five_whys, companyId: resolvedCompanyId } : p));

            } else {
                // Insert
                const { data, error } = await supabase
                    .from('a3_projects')
                    .insert([projectData])
                    .select();

                if (error) throw error;
                if (data) fetchProjects();
            }
            setSelectedA3(null);
        } catch (error) {
            console.error("Error saving A3:", error);
            alert("Error al guardar el proyecto A3: " + (error.message || "Error desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    // --- MANAGE MULTIPLE ISHIKAWAS ---
    const addIshikawa = () => {
        setSelectedA3(prev => ({
            ...prev,
            ishikawas: [...(prev.ishikawas || []), { problem: '', categories: {} }]
        }));
    };

    const removeIshikawa = (index) => {
        if (!confirm("¿Eliminar este diagrama de Ishikawa?")) return;
        setSelectedA3(prev => ({
            ...prev,
            ishikawas: prev.ishikawas.filter((_, i) => i !== index)
        }));
    };

    const updateIshikawa = (index, field, value) => {
        setSelectedA3(prev => {
            const newIshikawas = [...(prev.ishikawas || [])];
            newIshikawas[index] = { ...newIshikawas[index], [field]: value };
            return {
                ...prev,
                ishikawas: newIshikawas
            };
        });
    };

    const addChart = () => {
        const newChart = {
            id: Date.now(),
            kpiName: '',
            dataPoints: [],
            goal: ''
        };
        setSelectedA3(prev => ({
            ...prev,
            followUpData: [...(prev.followUpData || []), newChart]
        }));
    };

    const removeChart = (index) => {
        if (!confirm('¿Eliminar este gráfico?')) return;
        setSelectedA3(prev => ({
            ...prev,
            followUpData: (prev.followUpData || []).filter((_, i) => i !== index)
        }));
    };

    const updateFollowUp = (index, field, value) => {
        setSelectedA3(prev => {
            const newCharts = [...(prev.followUpData || [])];
            // Ensure object at index exists
            if (!newCharts[index]) return prev;

            newCharts[index] = { ...newCharts[index], [field]: value };
            return {
                ...prev,
                followUpData: newCharts
            };
        });
    };

    const updateActionPlan = (newPlan) => {
        setSelectedA3(prev => ({
            ...prev,
            actionPlan: newPlan
        }));
    };

    // --- MANAGE IMAGE UPLOADS ---
    const handleImageUpload = async (file, field) => {
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`; // Organized by user

            const { error } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setSelectedA3(prev => ({
                ...prev,
                [field]: publicUrl
            }));

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir la imagen');
        }
    };


    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <HeaderWithFilter
                title="Proyectos A3"
                subtitle="Metodología estructurada para análisis y resolución de problemas"
            >
                <button
                    onClick={handleNewA3}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm shadow-brand-500/30 hover:shadow-brand-500/50 font-medium active:scale-95"
                >
                    <Plus size={20} />
                    <span>Nuevo A3</span>
                </button>
            </HeaderWithFilter>

            {/* List View Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar proyectos por título o responsable..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm text-slate-900 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                <div className="text-sm text-slate-500 hidden md:block">
                    Mostrando <span className="font-bold text-slate-800">{filteredProjects.length}</span> proyectos
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <div
                        key={project.id}
                        className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
                        onClick={() => {
                            setSelectedA3({
                                ...project,
                                companyId: project.companyId || project.company_id // Normalize for form
                            });
                            setActiveTab('definition');
                        }}
                    >
                        {/* Status Strip */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 transition-colors ${project.status === 'Cerrado' ? 'bg-emerald-500' : (project.status === 'En Proceso' ? 'bg-amber-500' : 'bg-blue-500')}`}></div>

                        <div className="p-6 flex flex-col flex-1 ml-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} /> A3 Report
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${project.status === 'Cerrado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : (project.status === 'En Proceso' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100')}`}>
                                    {project.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-3 leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">
                                {project.title}
                            </h3>

                            <div className="space-y-4 mb-6 flex-1">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Meta / Objetivo</span>
                                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed h-[40px]">
                                        {project.goal || 'Sin objetivo definido'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                        {project.responsible ? project.responsible.charAt(0) : '?'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">Responsable</span>
                                        <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{project.responsible || 'Sin asignar'}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">
                                    {project.date}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
                            <FileText size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No se encontraron proyectos</h3>
                        <p className="text-slate-500">Crea un nuevo reporte A3 para comenzar</p>
                    </div>
                )}
            </div>

            {/* Modal A3 Completo - MAXIMIZED */}
            {selectedA3 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 overflow-hidden" onClick={() => setSelectedA3(null)}>
                    <div
                        className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-tighter mb-1">
                                    <FileText size={12} /> Hoja de Trabajo A3
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        className="text-xl font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300 w-full max-w-lg truncate"
                                        value={selectedA3.title}
                                        onChange={(e) => setSelectedA3({ ...selectedA3, title: e.target.value })}
                                        placeholder="Escribe el Título del Proyecto..."
                                    />
                                    <span className="text-slate-200 text-2xl font-light hidden sm:inline">|</span>

                                    {/* Company Selector (Admin) */}
                                    {(companies.length > 0) && (
                                        <div className="hidden sm:block min-w-[200px]">
                                            <div className="relative">
                                                <Building size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <select
                                                    className="w-full py-1 pl-8 pr-2 text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer hover:bg-white transition-colors text-slate-700"
                                                    value={selectedA3.companyId || 'all'}
                                                    onChange={(e) => setSelectedA3({ ...selectedA3, companyId: e.target.value === 'all' ? null : e.target.value })}
                                                >
                                                    <option value="all">Todas / Sin Asignar</option>
                                                    {companies.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="hidden sm:block min-w-[140px]">
                                        <select
                                            className={`w-full py-1 pl-2 pr-8 text-sm font-bold rounded-lg border-none focus:ring-2 cursor-pointer ${selectedA3.status === 'Cerrado' ? 'bg-emerald-50 text-emerald-700' :
                                                selectedA3.status === 'En Proceso' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}
                                            value={selectedA3.status}
                                            onChange={(e) => setSelectedA3({ ...selectedA3, status: e.target.value })}
                                        >
                                            <option>Nuevo</option>
                                            <option>En Proceso</option>
                                            <option>Cerrado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="hidden sm:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm active:scale-95"
                                >
                                    <Save size={18} /> <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="sm:hidden p-2 bg-brand-600 disabled:opacity-50 text-white rounded-lg"
                                >
                                    <Save size={20} />
                                </button>

                                {selectedA3.id && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar Proyecto"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                )}

                                <button
                                    onClick={() => setSelectedA3(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center justify-start gap-1 overflow-x-auto shrink-0">
                            {[
                                { id: 'definition', label: '1. Definición', icon: Layout, color: 'brand' },
                                { id: 'analysis', label: '2. Análisis de Causa', icon: GitBranch, color: 'purple' },
                                { id: 'plan', label: '3. Plan & Seguimiento', icon: Target, color: 'emerald' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        relative py-4 px-6 text-sm font-bold flex items-center gap-2 transition-all border-b-2
                                        ${activeTab === tab.id
                                            ? `text-${tab.color}-600 border-${tab.color}-600 bg-white rounded-t-lg shadow-sm -mb-[1px] z-10`
                                            : 'text-slate-900 border-transparent hover:text-black hover:bg-slate-100/50 rounded-t-lg'
                                        }
                                    `}
                                >
                                    <tab.icon size={16} /> <span className="whitespace-nowrap">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8 scroll-smooth">

                            {/* TAB 1: DEFINICIÓN */}
                            {activeTab === 'definition' && (
                                <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group hover:shadow-md transition-shadow">
                                            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-3">
                                                <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">1</span>
                                                Antecedentes
                                            </h4>
                                            <AutoResizeTextarea
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-700 leading-relaxed"
                                                placeholder="Describa el contexto y la razón de seleccionar este problema..."
                                                value={selectedA3.background}
                                                onChange={(e) => setSelectedA3({ ...selectedA3, background: e.target.value })}
                                                minHeight="160px"
                                            />
                                            {/* Image Upload Area */}
                                            <div className="mt-3">
                                                {selectedA3.backgroundImageUrl ? (
                                                    <div className="relative group/img">
                                                        <img src={selectedA3.backgroundImageUrl} alt="Antecedentes" className="w-full h-auto max-h-[300px] object-contain rounded-lg border border-slate-200" />
                                                        <button
                                                            onClick={() => setSelectedA3({ ...selectedA3, backgroundImageUrl: '' })}
                                                            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex items-center gap-2 text-sm text-brand-600 font-bold cursor-pointer hover:bg-brand-50 p-2 rounded-lg transition-colors w-fit">
                                                        <ImageIcon size={16} /> Adjuntar Imagen
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload(e.target.files[0], 'backgroundImageUrl')}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group hover:shadow-md transition-shadow">
                                            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-3">
                                                <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                                                Condición Actual
                                            </h4>
                                            <AutoResizeTextarea
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-700 leading-relaxed"
                                                placeholder="Datos actuales, gráficos simples, estado del problema..."
                                                value={selectedA3.currentCondition}
                                                onChange={(e) => setSelectedA3({ ...selectedA3, currentCondition: e.target.value })}
                                                minHeight="160px"
                                            />
                                            {/* Image Upload Area */}
                                            <div className="mt-3">
                                                {selectedA3.currentConditionImageUrl ? (
                                                    <div className="relative group/img">
                                                        <img src={selectedA3.currentConditionImageUrl} alt="Condición Actual" className="w-full h-auto max-h-[300px] object-contain rounded-lg border border-slate-200" />
                                                        <button
                                                            onClick={() => setSelectedA3({ ...selectedA3, currentConditionImageUrl: '' })}
                                                            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex items-center gap-2 text-sm text-brand-600 font-bold cursor-pointer hover:bg-brand-50 p-2 rounded-lg transition-colors w-fit">
                                                        <ImageIcon size={16} /> Adjuntar Imagen
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleImageUpload(e.target.files[0], 'currentConditionImageUrl')}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2 group hover:shadow-md transition-shadow">
                                            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-3">
                                                <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">3</span>
                                                Objetivo / Meta
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-2">
                                                    <AutoResizeTextarea
                                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-700 leading-relaxed"
                                                        placeholder="Meta específica, medible y acotada en el tiempo..."
                                                        value={selectedA3.goal}
                                                        onChange={(e) => setSelectedA3({ ...selectedA3, goal: e.target.value })}
                                                        minHeight="100px"
                                                    />
                                                </div>
                                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Responsable</label>
                                                        <div className="relative">
                                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <select
                                                                className="w-full py-2 pl-9 pr-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm text-slate-900 font-medium"
                                                                value={selectedA3.responsible}
                                                                onChange={(e) => setSelectedA3({ ...selectedA3, responsible: e.target.value })}
                                                            >
                                                                <option value="" disabled className="text-slate-500">Seleccionar</option>
                                                                {companyUsers && companyUsers.length > 0 ? (
                                                                    companyUsers.map(u => (
                                                                        <option key={u.id} value={u.name} className="text-slate-900">{u.name}</option>
                                                                    ))
                                                                ) : (
                                                                    <>
                                                                        {selectedA3.responsible && <option value={selectedA3.responsible} className="text-slate-900">{selectedA3.responsible}</option>}
                                                                        <option value="" disabled className="text-slate-500">No disponible</option>
                                                                    </>
                                                                )}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Fecha Inicio</label>
                                                        <div className="relative">
                                                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="date"
                                                                className="w-full py-2 pl-9 pr-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm text-slate-900 font-medium"
                                                                value={selectedA3.date}
                                                                onChange={(e) => setSelectedA3({ ...selectedA3, date: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: ANÁLISIS WITH MULTIPLE TOOLS */}
                            {activeTab === 'analysis' && (
                                <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Text Summary */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-3">
                                            <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">4</span>
                                            Resumen Análisis Causa Raíz
                                        </h4>
                                        <AutoResizeTextarea
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-700 leading-relaxed"
                                            placeholder="Resumen de las conclusiones principales y hallazgos..."
                                            value={selectedA3.rootCause}
                                            onChange={(e) => setSelectedA3({ ...selectedA3, rootCause: e.target.value })}
                                            minHeight="100px"
                                        />
                                    </div>



                                    {/* ISHIKAWA SECTION */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <h5 className="font-bold text-slate-700 text-lg uppercase flex items-center gap-2 tracking-tight">
                                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><GitBranch size={20} /></div>
                                                Diagramas de Ishikawa
                                            </h5>
                                            <button
                                                onClick={addIshikawa}
                                                className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span>Agregar Diagrama</span>
                                            </button>
                                        </div>

                                        {(!selectedA3.ishikawas || selectedA3.ishikawas.length === 0) ? (
                                            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <div className="inline-flex p-4 rounded-full bg-white shadow-sm mb-4">
                                                    <GitBranch size={32} className="text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 text-sm mb-4 font-medium">No hay diagramas de causa-efecto.</p>
                                                <button onClick={addIshikawa} className="btn-primary py-2 px-4 shadow-sm">
                                                    Crear Diagrama Ishikawa
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {selectedA3.ishikawas.map((ishikawaData, idx) => (
                                                    <div key={idx} className="relative group bg-white p-1 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                                        <A3Ishikawa
                                                            index={idx}
                                                            data={ishikawaData}
                                                            onChange={(field, val) => updateIshikawa(idx, field, val)}
                                                            onDelete={() => removeIshikawa(idx)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 5 WHYS SECTION */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2 border-t border-slate-200 pt-8">
                                            <h5 className="font-bold text-slate-700 text-lg uppercase flex items-center gap-2 tracking-tight">
                                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Target size={20} /></div>
                                                Análisis de 5 Porqués
                                            </h5>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                            <A3FiveWhys
                                                items={selectedA3.multipleFiveWhys || []}
                                                onChange={(newItems) => setSelectedA3({ ...selectedA3, multipleFiveWhys: newItems })}
                                            />
                                        </div>
                                    </div>

                                    {/* PARETO SECTION */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2 border-t border-slate-200 pt-8">
                                            <h5 className="font-bold text-slate-900 text-lg uppercase flex items-center gap-2 tracking-tight">
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><BarChart2 size={20} /></div>
                                                Análisis de Pareto (80/20)
                                            </h5>
                                        </div>
                                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                                            <A3Pareto
                                                data={selectedA3.paretoData || []}
                                                onChange={(newData) => setSelectedA3({ ...selectedA3, paretoData: newData })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: PLAN & SEGUIMIENTO */}
                            {activeTab === 'plan' && (
                                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

                                    {/* Contramedidas */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-3">
                                            <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">5</span>
                                            Contramedidas (Estrategia)
                                        </h4>
                                        <AutoResizeTextarea
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-700 leading-relaxed"
                                            placeholder="Estrategia general para eliminar causas raíz..."
                                            value={selectedA3.countermeasures}
                                            onChange={(e) => setSelectedA3({ ...selectedA3, countermeasures: e.target.value })}
                                            minHeight="120px"
                                        />
                                    </div>

                                    {/* Action Plan Component */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-3">
                                                <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">6</span>
                                                Plan de Acción
                                            </h4>
                                        </div>
                                        <div className="p-2">
                                            <A3ActionPlan
                                                actions={selectedA3.actionPlan || []}
                                                onChange={updateActionPlan}
                                                users={companyUsers || []}
                                            />
                                        </div>
                                    </div>

                                    {/* Chart Component */}
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-3">
                                                <span className="bg-slate-900 text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold">7</span>
                                                Seguimiento y Resultados
                                            </h4>
                                        </div>

                                        <div className="p-6">
                                            {/* Charts List using Array */}
                                            {(!selectedA3.followUpData || selectedA3.followUpData.length === 0) ? (
                                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mb-6">
                                                    <BarChart2 className="mx-auto text-slate-300 mb-3" size={32} />
                                                    <p className="text-slate-500 text-sm mb-4">No hay gráficos de seguimiento.</p>
                                                    <button onClick={addChart} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-brand-700">
                                                        + Crear Primer Gráfico
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-12">
                                                    {selectedA3.followUpData.map((chartData, idx) => (
                                                        <div key={idx} className="relative group">
                                                            {/* Delete Button for Chart */}
                                                            <div className="absolute top-0 right-0 z-10 p-2">
                                                                <button
                                                                    onClick={() => removeChart(idx)}
                                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Eliminar Gráfico"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <A3FollowUp
                                                                data={chartData}
                                                                onChange={(field, value) => updateFollowUp(idx, field, value)}
                                                            />
                                                            {/* Divider if not last */}
                                                            {idx < selectedA3.followUpData.length - 1 && (
                                                                <div className="h-px bg-slate-200 my-8 mx-auto w-3/4"></div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <div className="flex justify-center pt-4">
                                                        <button
                                                            onClick={addChart}
                                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            <Plus size={16} /> Agregar Otro Gráfico
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <label className="text-xs font-bold text-slate-700 uppercase mb-2 block flex items-center gap-2">
                                                    <FileText size={14} /> Notas de Cierre / Estandarización
                                                </label>
                                                <AutoResizeTextarea
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                                    placeholder="Comentarios finales sobre los resultados y próximos pasos..."
                                                    value={selectedA3.followUp}
                                                    onChange={(e) => setSelectedA3({ ...selectedA3, followUp: e.target.value })}
                                                    minHeight="80px"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default A3Page;
