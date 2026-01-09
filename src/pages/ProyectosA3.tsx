import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/database.types';
import { Plus, Search, X, Save, FileText, BarChart2, Target, Calendar, User, Trash2, ChevronDown } from 'lucide-react';

// Import A3 Components
import A3Context from '../components/a3/A3Context';
import A3Ishikawa from '../components/a3/A3Ishikawa';
import A3FiveWhys from '../components/a3/A3FiveWhys';
import A3FollowUp from '../components/a3/A3FollowUp';
import A3Pareto from '../components/a3/A3Pareto';
import A3Countermeasures from '../components/a3/A3Countermeasures';

interface A3Project {
    id?: string | null;
    title: string;
    status: string;
    responsible: string;
    date: string;
    background: string;
    backgroundImageUrl?: string;
    currentCondition: string;
    currentConditionImageUrl?: string;
    goal: string;
    rootCause?: string;
    paretoData: any[];
    countermeasures?: string;
    plan?: string;
    followUp?: string;
    ishikawas: any[];
    multipleFiveWhys: any[];
    followUpData: any[];
    actionPlan: any[];
    companyId?: string;
}

const ProyectosA3 = () => {
    const { user, profile, selectedCompanyId } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [selectedA3, setSelectedA3] = useState<A3Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('definition'); // definition, analysis, plan
    const [a3Projects, setA3Projects] = useState<A3Project[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const fetchProjects = async () => {
        try {
            let query = supabase
                .from('a3_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (selectedCompanyId) {
                query = query.eq('company_id', selectedCompanyId);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                const formatted = data.map((p: any) => ({
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
                    plan: p.execution_plan,
                    followUp: p.follow_up_notes,
                    ishikawas: p.ishikawas || [],
                    multipleFiveWhys: p.five_whys || [],
                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data && Object.keys(p.follow_up_data).length > 0 ? [p.follow_up_data] : []),
                    actionPlan: p.action_plan || [],
                    companyId: p.company_id
                }));
                setA3Projects(formatted);
            }
        } catch (error) {
            console.error('Error fetching A3 projects:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;

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
            fetchProjects();
            fetchUsers();
        } else {
            setA3Projects([]);
            fetchUsers();
        }
    }, [selectedCompanyId]);

    const filteredProjects = useMemo(() => {
        return a3Projects.filter(p =>
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.responsible && p.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [a3Projects, searchTerm]);

    const handleNewA3 = () => {
        setSelectedA3({
            id: null,
            title: '',
            status: 'Nuevo',
            responsible: profile?.full_name || user?.email || '',
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
            ishikawas: [{ id: Date.now(), problem: '', categories: {}, rootCause: '' }],
            multipleFiveWhys: [],
            followUpData: [],
            actionPlan: [],
            companyId: undefined
        });
        setActiveTab('definition');
    };

    const handleDelete = async () => {
        if (!selectedA3?.id) return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este proyecto A3? Esta acción es irreversible.')) return;

        try {
            const { error } = await supabase.from('a3_projects').delete().eq('id', selectedA3.id);
            if (error) throw error;

            setA3Projects(prev => prev.filter(p => p.id !== selectedA3.id));
            setSelectedA3(null);
            alert('Proyecto eliminado correctamente.');
        } catch (error: any) {
            console.error('Error delete:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleSave = async () => {
        if (!selectedA3 || !selectedA3.title) {
            alert('El título es obligatorio');
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                title: selectedA3.title,
                status: selectedA3.status,
                responsible: selectedA3.responsible,
                date: selectedA3.date,
                background: selectedA3.background,
                background_image_url: selectedA3.backgroundImageUrl,
                current_condition: selectedA3.currentCondition,
                current_condition_image_url: selectedA3.currentConditionImageUrl,
                goal: selectedA3.goal,
                root_cause: selectedA3.rootCause,
                pareto_data: selectedA3.paretoData,
                countermeasures: selectedA3.countermeasures,
                execution_plan: selectedA3.plan,
                follow_up_notes: selectedA3.followUp,
                ishikawas: selectedA3.ishikawas,
                five_whys: selectedA3.multipleFiveWhys,
                follow_up_data: selectedA3.followUpData,
                action_plan: selectedA3.actionPlan,
                company_id: selectedCompanyId // Use active company context
            };

            if (selectedA3.id) {
                // Update
                const { data, error } = await supabase
                    .from('a3_projects')
                    .update(payload)
                    .eq('id', selectedA3.id)
                    .select()
                    .single();

                if (error) throw error;

                setA3Projects(prev => prev.map(p => p.id === selectedA3.id ? { ...selectedA3, ...data } : p));
                alert('Proyecto actualizado correctamente.');
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('a3_projects')
                    .insert(payload)
                    .select()
                    .single();

                if (error) throw error;

                const newProject = { ...selectedA3, id: data.id };
                setA3Projects(prev => [newProject, ...prev]);
                setSelectedA3(newProject);
                alert('Proyecto A3 creado correctamente.');
            }
        } catch (error: any) {
            console.error('Error saving A3:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (field: 'backgroundImageUrl' | 'currentConditionImageUrl', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedA3) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `a3_images/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('public').getPublicUrl(filePath);

            setSelectedA3({ ...selectedA3, [field]: data.publicUrl });
        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen: ' + error.message);
        }
    };

    // Helper functions for managing multiple items
    const handleAddIshikawa = () => {
        setSelectedA3({
            ...selectedA3!,
            ishikawas: [...(selectedA3!.ishikawas || []), { id: Date.now(), problem: '', categories: {}, rootCause: '' }]
        });
    };

    const handleUpdateIshikawa = (index: number, field: string, value: any) => {
        const updated = [...selectedA3!.ishikawas];
        updated[index] = { ...updated[index], [field]: value };
        setSelectedA3({ ...selectedA3!, ishikawas: updated });
    };

    const handleDeleteIshikawa = (index: number) => {
        setSelectedA3({ ...selectedA3!, ishikawas: selectedA3!.ishikawas.filter((_, i) => i !== index) });
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-gray-900">Debes iniciar sesión para acceder a esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <FileText size={28} /> Proyectos A3
                        </h1>
                        <p className="text-slate-600 font-medium mt-1">Gestión de proyectos de resolución estructurada de problemas</p>
                    </div>
                    <button
                        onClick={handleNewA3}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all"
                    >
                        <Plus size={20} /> Nuevo A3
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" size={20} />
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Buscar por título o responsable..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => { setSelectedA3(project); setActiveTab('definition'); }}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800 flex-1">{project.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${project.status === 'Cerrado' ? 'bg-green-100 text-green-800' :
                                project.status === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {project.status}
                            </span>
                        </div>
                        <div className="text-sm text-gray-900 space-y-1">
                            <div className="flex items-center gap-2">
                                <User size={14} />
                                <span>{project.responsible}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>{project.date}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-gray-900">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay proyectos A3. Crea uno para comenzar.</p>
                </div>
            )}

            {/* Modal for A3 Details - Fullscreen */}
            {selectedA3 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-stretch justify-center" onClick={() => setSelectedA3(null)}>
                    <div className="bg-slate-50 w-full h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-8 py-5 flex justify-between items-center border-b border-slate-700/50">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    className="bg-transparent border-none text-2xl font-bold text-white placeholder-slate-400 outline-none w-full tracking-tight"
                                    placeholder="Título del A3..."
                                    value={selectedA3.title}
                                    onChange={(e) => setSelectedA3({ ...selectedA3, title: e.target.value })}
                                />
                                <div className="flex gap-4 mt-3 text-sm">
                                    <div className="flex items-center gap-2 relative">
                                        <User size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                                        <select
                                            className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 pl-8 text-sm text-slate-200 outline-none appearance-none cursor-pointer hover:bg-slate-700 hover:border-slate-500 transition-all min-w-[180px] focus:ring-2 focus:ring-blue-500/50"
                                            value={selectedA3.responsible}
                                            onChange={(e) => setSelectedA3({ ...selectedA3, responsible: e.target.value })}
                                        >
                                            <option value="" className="text-slate-900 bg-white">Responsable...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.full_name || u.email || ''} className="text-slate-900 bg-white">
                                                    {u.full_name || u.email}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 hover:border-slate-500 transition-all">
                                        <Calendar size={14} className="text-slate-400" />
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-sm text-slate-200 outline-none"
                                            value={selectedA3.date}
                                            onChange={(e) => setSelectedA3({ ...selectedA3, date: e.target.value })}
                                        />
                                    </div>
                                    <select
                                        className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none cursor-pointer hover:bg-slate-700 hover:border-slate-500 transition-all focus:ring-2 focus:ring-blue-500/50"
                                        value={selectedA3.status}
                                        onChange={(e) => setSelectedA3({ ...selectedA3, status: e.target.value })}
                                    >
                                        <option value="Nuevo">Nuevo</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Cerrado">Cerrado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 items-center">
                                {selectedA3.id && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 font-medium shadow-lg shadow-blue-600/25"
                                >
                                    <Save size={18} />
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button onClick={() => setSelectedA3(null)} className="p-2.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-slate-200 bg-white shadow-sm">
                            <div className="flex gap-1 px-8">
                                {[
                                    { id: 'definition', label: 'Definición', icon: Target },
                                    { id: 'analysis', label: 'Análisis', icon: BarChart2 },
                                    { id: 'plan', label: 'Plan & Seguimiento', icon: Calendar }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${activeTab === tab.id
                                            ? 'text-blue-600'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <tab.icon size={18} />
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
                            {activeTab === 'definition' && (
                                <>
                                    <A3Context
                                        data={{
                                            context: selectedA3.background,
                                            currentSituation: selectedA3.currentCondition,
                                            goal: selectedA3.goal
                                        }}
                                        onChange={(field, value) => {
                                            if (field === 'context') setSelectedA3({ ...selectedA3, background: value });
                                            if (field === 'currentSituation') setSelectedA3({ ...selectedA3, currentCondition: value });
                                            if (field === 'goal') setSelectedA3({ ...selectedA3, goal: value });
                                        }}
                                    />

                                    {/* Image Uploads */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Imagen de Antecedentes</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('backgroundImageUrl', e)} className="w-full" />
                                            {selectedA3.backgroundImageUrl && (
                                                <img src={selectedA3.backgroundImageUrl} alt="Background" className="mt-2 w-full rounded-lg" />
                                            )}
                                        </div>
                                        <div className="bg-white rounded-xl p-4 border border-slate-200">
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Imagen de Condición Actual</label>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload('currentConditionImageUrl', e)} className="w-full" />
                                            {selectedA3.currentConditionImageUrl && (
                                                <img src={selectedA3.currentConditionImageUrl} alt="Current" className="mt-2 w-full rounded-lg" />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'analysis' && (
                                <>
                                    <A3Pareto data={selectedA3.paretoData} onChange={(data) => setSelectedA3({ ...selectedA3, paretoData: data })} />

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold">Diagramas de Ishikawa</h3>
                                            <button onClick={handleAddIshikawa} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                                                <Plus size={16} /> Agregar Diagrama
                                            </button>
                                        </div>
                                        {selectedA3.ishikawas.map((ish, idx) => (
                                            <A3Ishikawa
                                                key={idx}
                                                index={idx}
                                                data={ish}
                                                onChange={(field, value) => handleUpdateIshikawa(idx, field, value)}
                                                onDelete={() => handleDeleteIshikawa(idx)}
                                            />
                                        ))}
                                    </div>

                                    <A3FiveWhys
                                        items={selectedA3.multipleFiveWhys}
                                        onChange={(items) => setSelectedA3({ ...selectedA3, multipleFiveWhys: items })}
                                    />
                                </>
                            )}

                            {activeTab === 'plan' && (
                                <>
                                    <A3Countermeasures
                                        data={selectedA3.actionPlan}
                                        onChange={(data) => setSelectedA3({ ...selectedA3, actionPlan: data })}
                                        users={users.map(u => ({ id: u.id, name: u.full_name || u.email || 'Unnamed' }))}
                                    />

                                    {selectedA3.followUpData.map((chart, idx) => (
                                        <A3FollowUp
                                            key={idx}
                                            data={chart}
                                            onChange={(field, value) => {
                                                const updated = [...selectedA3.followUpData];
                                                updated[idx] = { ...updated[idx], [field]: value };
                                                setSelectedA3({ ...selectedA3, followUpData: updated });
                                            }}
                                        />
                                    ))}

                                    <button
                                        onClick={() => setSelectedA3({
                                            ...selectedA3,
                                            followUpData: [...selectedA3.followUpData, { kpiName: '', kpiGoal: '', dataPoints: [] }]
                                        })}
                                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-900 hover:border-blue-400 hover:text-blue-600 transition-all"
                                    >
                                        + Agregar Gráfico de Seguimiento
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProyectosA3;
