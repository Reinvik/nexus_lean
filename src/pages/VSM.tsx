
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import ImageUpload from '../components/ImageUpload';
import LoadingScreen from '../components/LoadingScreen';
import type { Profile } from '../types/database.types';
import { Plus, Search, Activity, X, Calendar, User, FileText, ArrowRight, Clock, Target, Trash2, CheckCircle, ChevronDown } from 'lucide-react';

interface VSMProject {
    id: number;
    name: string;
    responsible: string;
    date: string;
    status: 'current' | 'future' | 'completed';
    lead_time: string;
    process_time: string;
    efficiency: string;
    image_url: string | null;
    miro_link: string;
    description: string;
    company_id: string;
    takt_time: string;
}

export default function VSM() {
    const { user, profile, selectedCompanyId } = useAuth();
    const [selectedVsm, setSelectedVsm] = useState<Partial<VSMProject> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [vsms, setVsms] = useState<VSMProject[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVsms = async () => {
        if (!selectedCompanyId) return;

        try {
            setLoading(true);
            let query = supabase
                .from('vsm_projects')
                .select('*')
                .eq('company_id', selectedCompanyId)
                .order('created_at', { ascending: false });

            const { data, error } = await query;

            if (error) throw error;

            if (data) {
                setVsms(data as VSMProject[]);
            }
        } catch (error) {
            console.error('Error fetching VSMs:', error);
        } finally {
            setLoading(false);
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
            fetchVsms();
            fetchUsers();
        } else {
            setVsms([]);
            setLoading(false);
        }
    }, [selectedCompanyId]);

    const filteredVsms = useMemo(() => {
        return vsms.filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.responsible && v.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [vsms, searchTerm]);

    const handleNewVsm = () => {
        if (!selectedCompanyId) {
            alert("Selecciona una empresa primero");
            return;
        }
        setSelectedVsm({
            name: '',
            responsible: user ? (profile?.full_name || 'Usuario') : '',
            date: new Date().toISOString().split('T')[0],
            status: 'current',
            lead_time: '',
            process_time: '',
            efficiency: '',
            image_url: null,
            miro_link: '',
            description: '',
            takt_time: '',
            company_id: selectedCompanyId
        });
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Estás seguro de eliminar este VSM?')) {
            const oldVsms = [...vsms];
            setVsms(vsms.filter(v => v.id !== id));
            if (selectedVsm && selectedVsm.id === id) setSelectedVsm(null);

            try {
                const { error } = await supabase.from('vsm_projects').delete().eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error("Error deleting VSM:", error);
                alert("Error al eliminar el VSM");
                setVsms(oldVsms);
            }
        }
    };

    const handleSave = async () => {
        if (!selectedVsm || !selectedVsm.name) {
            alert('El nombre es obligatorio');
            return;
        }

        // Ensure we have a valid company ID
        const companyIdToUse = selectedCompanyId || selectedVsm.company_id;
        if (!companyIdToUse) {
            alert('Error: No hay empresa seleccionada');
            return;
        }

        try {
            const payload = {
                name: selectedVsm.name,
                responsible: selectedVsm.responsible,
                date: selectedVsm.date,
                status: selectedVsm.status,
                lead_time: selectedVsm.lead_time,
                process_time: selectedVsm.process_time,
                efficiency: selectedVsm.efficiency,
                image_url: selectedVsm.image_url,
                miro_link: selectedVsm.miro_link,
                description: selectedVsm.description,
                takt_time: selectedVsm.takt_time,
                company_id: companyIdToUse
            };

            if (selectedVsm.id) {
                // Update
                const { error } = await supabase
                    .from('vsm_projects')
                    .update(payload)
                    .eq('id', selectedVsm.id);
                if (error) {
                    console.error('Supabase Error updating VSM:', error);
                    throw error;
                }

                // Optimistic
                setVsms(vsms.map(v => v.id === selectedVsm.id ? { ...v, ...payload } as VSMProject : v));
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('vsm_projects')
                    .insert([payload])
                    .select();

                if (error) {
                    console.error('Supabase Error inserting VSM:', error);
                    throw error;
                }

                if (data) fetchVsms();
            }
            setSelectedVsm(null);
            alert("Proyecto VSM guardado correctamente.");
        } catch (error) {
            console.error("Error saving VSM (full details):", error);
            alert("Error al guardar el mapa VSM. Revisa la consola para más detalles.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-4rem)]">
            <HeaderWithFilter
                title="VSM (Value Stream Mapping)"
                subtitle="Mapeo y análisis de flujos de valor"
            >
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    onClick={handleNewVsm}
                >
                    <Plus size={18} /> Nuevo Mapa
                </button>
            </HeaderWithFilter>

            {/* Search Bar */}
            <div className="px-6 md:px-0 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar mapas VSM..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-600 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* VSM Grid */}
            <div className="pb-8 flex-1">
                {loading ? (
                    <LoadingScreen message="Cargando mapas..." fullScreen={false} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVsms.map(vsm => (
                            <div key={vsm.id} className="group bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200 hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden" onClick={() => setSelectedVsm(vsm)}>
                                {/* Image Header */}
                                <div className="h-40 bg-slate-100 relative overflow-hidden group-hover:opacity-95 transition-opacity">
                                    {vsm.image_url ? (
                                        <img src={vsm.image_url} alt="VSM Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                                            <Activity size={48} className="mb-2" />
                                            <span className="text-xs font-medium">Sin imagen</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex items-center gap-2">
                                        {/* Status Badge */}
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md ${vsm.status === 'current'
                                            ? 'bg-blue-500/90 text-white'
                                            : vsm.status === 'completed'
                                                ? 'bg-emerald-500/90 text-white'
                                                : 'bg-purple-500/90 text-white'
                                            }`}>
                                            {vsm.status === 'current' ? 'ESTADO ACTUAL' : (vsm.status === 'completed' ? 'FINALIZADO' : 'ESTADO FUTURO')}
                                        </span>
                                    </div>

                                    {/* Quick Toggle Button */}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const newStatus = vsm.status === 'completed' ? 'current' : 'completed';

                                            // Optimistic Update
                                            const oldVsms = [...vsms];
                                            setVsms(vsms.map(v => v.id === vsm.id ? { ...v, status: newStatus } : v));

                                            try {
                                                const { error } = await supabase.from('vsm_projects').update({ status: newStatus }).eq('id', vsm.id);
                                                if (error) throw error;
                                            } catch (err) {
                                                console.error("Error updating status:", err);
                                                setVsms(oldVsms); // Revert
                                            }
                                        }}
                                        className={`absolute bottom-3 right-3 p-2 rounded-full shadow-sm transition-all transform hover:scale-110 active:scale-95 ${vsm.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                            : 'bg-white/90 text-slate-400 hover:text-emerald-500 hover:bg-white'
                                            }`}
                                        title={vsm.status === 'completed' ? "Marcar como En Proceso" : "Marcar como Finalizado"}
                                    >
                                        <CheckCircle size={18} className={vsm.status === 'completed' ? 'fill-current' : ''} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition-colors">{vsm.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-1">{vsm.description || 'Sin descripción disponible.'}</p>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="text-center">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Lead Time</span>
                                            <span className="text-sm font-bold text-slate-700">{vsm.lead_time || '-'}</span>
                                        </div>
                                        <div className="text-center border-l border-slate-200">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Proceso</span>
                                            <span className="text-sm font-bold text-slate-700">{vsm.process_time || '-'}</span>
                                        </div>
                                        <div className="text-center border-l border-slate-200">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Eficiencia</span>
                                            <span className="text-sm font-bold text-emerald-600">{vsm.efficiency || '-'}</span>
                                        </div>
                                        <div className="text-center border-l border-slate-200">
                                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Takt Time</span>
                                            <span className="text-sm font-bold text-slate-700">{vsm.takt_time || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-100 mt-auto">
                                        <div className="flex items-center gap-1.5">
                                            <User size={14} />
                                            <span className="font-medium text-slate-600">{vsm.responsible}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            <span>{vsm.date}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredVsms.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Search size={24} />
                        </div>
                        <h3 className="text-slate-900 font-medium text-lg mb-2">No se encontraron mapas</h3>
                        <p className="text-slate-500 mb-6">Prueba asignando una empresa en el menú o crea un nuevo VSM.</p>

                        <button
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            onClick={handleNewVsm}
                        >
                            <Plus size={18} /> Nuevo Mapa
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Formulario */}
            {selectedVsm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedVsm(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">
                                    {selectedVsm.id ? 'Editar VSM' : 'Nuevo Mapa VSM'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {selectedVsm.id ? 'Modifica los detalles del flujo de valor' : 'Crea un nuevo análisis de flujo de valor'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedVsm.id && (
                                    <button
                                        onClick={() => handleDelete(selectedVsm.id!)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Eliminar Mapa"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedVsm(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Left Column: General Info */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre del Mapa</label>
                                            <input
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                                                value={selectedVsm.name}
                                                onChange={(e) => setSelectedVsm({ ...selectedVsm, name: e.target.value })}
                                                placeholder="Ej: Flujo de Producción Línea 3"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
                                            <textarea
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 h-24 resize-none"
                                                value={selectedVsm.description}
                                                onChange={(e) => setSelectedVsm({ ...selectedVsm, description: e.target.value })}
                                                placeholder="Describe el alcance y objetivo de este VSM..."
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsable</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <select
                                                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 appearance-none cursor-pointer"
                                                    value={selectedVsm.responsible || ''}
                                                    onChange={(e) => setSelectedVsm({ ...selectedVsm, responsible: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Responsable...</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.full_name || u.email || ''}>
                                                            {u.full_name || u.email}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input
                                                    type="date"
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                                                    value={selectedVsm.date}
                                                    onChange={(e) => setSelectedVsm({ ...selectedVsm, date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">Tipo de Mapa</label>
                                        <div className="flex gap-6">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedVsm.status === 'current' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                                    {selectedVsm.status === 'current' && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={selectedVsm.status === 'current'}
                                                    onChange={() => setSelectedVsm({ ...selectedVsm, status: 'current' })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Estado Actual</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedVsm.status === 'future' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 bg-white'}`}>
                                                    {selectedVsm.status === 'future' && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={selectedVsm.status === 'future'}
                                                    onChange={() => setSelectedVsm({ ...selectedVsm, status: 'future' })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">Estado Futuro</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedVsm.status === 'completed' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'}`}>
                                                    {selectedVsm.status === 'completed' && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={selectedVsm.status === 'completed'}
                                                    onChange={() => setSelectedVsm({ ...selectedVsm, status: 'completed' })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">Finalizado</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Enlace a Miro / Pizarra Digital</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                                                    value={selectedVsm.miro_link}
                                                    onChange={(e) => setSelectedVsm({ ...selectedVsm, miro_link: e.target.value })}
                                                    placeholder="https://miro.com/..."
                                                />
                                            </div>
                                            {selectedVsm.miro_link && (
                                                <a
                                                    href={selectedVsm.miro_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center transition-colors"
                                                    title="Abrir enlace"
                                                >
                                                    <ArrowRight size={18} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Metrics & Image */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Activity size={18} className="text-blue-600" />
                                            Métricas Clave (KPIs)
                                        </label>

                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Time Total</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                                                        <Clock size={18} />
                                                    </div>
                                                    <input
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.lead_time}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, lead_time: e.target.value })}
                                                        placeholder="Ej: 4.5 días"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiempo de Proceso (VA)</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                                                        <Activity size={18} />
                                                    </div>
                                                    <input
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.process_time}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, process_time: e.target.value })}
                                                        placeholder="Ej: 45 mins"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eficiencia de Ciclo (%)</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                                                        <Target size={18} />
                                                    </div>
                                                    <input
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-emerald-600 font-bold"
                                                        value={selectedVsm.efficiency}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, efficiency: e.target.value })}
                                                        placeholder="Ej: 15%"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Takt Time</span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                                                        <Clock size={18} />
                                                    </div>
                                                    <input
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.takt_time}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, takt_time: e.target.value })}
                                                        placeholder="Ej: 30 seg"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Imagen del Mapa</label>
                                        <div className="h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <ImageUpload
                                                currentImage={selectedVsm.image_url || null}
                                                onUpload={(url) => setSelectedVsm({ ...selectedVsm, image_url: url })}
                                                placeholderText="Subir captura o diagrama del VSM"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setSelectedVsm(null)}
                                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow hover:-translate-y-0.5 transition-all"
                            >
                                Guardar Mapa
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
