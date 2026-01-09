import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, Activity, X, Calendar, User, FileText, ArrowRight, Clock, Target, Trash2, CheckCircle, Building } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';

const VSMPage = () => {
    const { user, globalFilterCompanyId, companyUsers, companies } = useAuth();
    const location = useLocation();
    const [selectedVsm, setSelectedVsm] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Datos Iniciales
    const [vsms, setVsms] = useState([]);
    const [_loading, setLoading] = useState(true);

    const fetchVsms = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vsm_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formatted = data.map(v => ({
                    id: v.id,
                    name: v.name,
                    responsible: v.responsible,
                    date: v.date,
                    status: v.status,
                    leadTime: v.lead_time,
                    processTime: v.process_time,
                    efficiency: v.efficiency,
                    image: v.image_url,
                    miroLink: v.miro_link,
                    description: v.description,
                    companyId: v.company_id,
                    taktTime: v.takt_time
                }));
                setVsms(formatted);
            }
        } catch (error) {
            console.error('Error fetching VSMs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchVsms();
        }
    }, [user, globalFilterCompanyId]);

    // Handle Deep Linking
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const vsmId = params.get('vsmId');
        if (vsmId && vsms.length > 0) {
            const vsmToOpen = vsms.find(v => v.id === parseInt(vsmId) || v.id === vsmId);
            if (vsmToOpen) {
                setSelectedVsm(vsmToOpen);
            }
        }
    }, [location.search, vsms]);

    // Filtrado Global por Empresa (Admin)
    const visibleVsms = useMemo(() => {
        if (!user) return [];

        // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
        const isSuperAdmin = user.isGlobalAdmin;
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        if (targetCompanyId === 'all') {
            // Only Super Admins can see 'all'
            return isSuperAdmin ? vsms : [];
        }

        // Strict filtering for Standard Admins
        return vsms.filter(v => v.companyId === targetCompanyId || (!v.companyId && isSuperAdmin));
    }, [vsms, user, globalFilterCompanyId]);

    const filteredVsms = useMemo(() => {
        return visibleVsms.filter(v =>
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.responsible.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [visibleVsms, searchTerm]);

    // Nuevo VSM
    const handleNewVsm = () => {
        setSelectedVsm({
            id: null,
            name: '',
            responsible: user ? user.name : '',
            date: new Date().toISOString().split('T')[0],
            status: 'current',
            leadTime: '',
            processTime: '',
            efficiency: '',
            image: null,
            miroLink: '',
            description: '',
            taktTime: '',
            companyId: user?.isGlobalAdmin && globalFilterCompanyId !== 'all' ? globalFilterCompanyId : (user?.companyId || '')
        });
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de eliminar este VSM?')) {
            // Optimistic
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
        if (!selectedVsm.name) {
            alert('El nombre es obligatorio');
            return;
        }

        let resolvedCompanyId = selectedVsm.companyId;

        // Fallback: Infer from responsible user if not explicitly set (or if logic demands consistency)
        if (!resolvedCompanyId && companyUsers && selectedVsm.responsible) {
            const responsibleUser = companyUsers.find(u => u.name === selectedVsm.responsible);
            if (responsibleUser && responsibleUser.company_id) {
                resolvedCompanyId = responsibleUser.company_id;
            }
        }

        // Final Fallback: Current User's company or Global Filter
        if (!resolvedCompanyId) {
            resolvedCompanyId = user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null);
        }

        const vsmData = {
            name: selectedVsm.name,
            responsible: selectedVsm.responsible,
            date: selectedVsm.date,
            status: selectedVsm.status,
            lead_time: selectedVsm.leadTime,
            process_time: selectedVsm.processTime,
            efficiency: selectedVsm.efficiency,
            image_url: selectedVsm.image,
            miro_link: selectedVsm.miroLink,
            description: selectedVsm.description,
            company_id: resolvedCompanyId,
            takt_time: selectedVsm.taktTime
        };

        try {
            if (selectedVsm.id) {
                // Update
                const { error } = await supabase
                    .from('vsm_projects')
                    .update(vsmData)
                    .eq('id', selectedVsm.id);
                if (error) throw error;

                // Optimistic
                setVsms(vsms.map(v => v.id === selectedVsm.id ? { ...selectedVsm, ...vsmData, companyId: resolvedCompanyId } : v));
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('vsm_projects')
                    .insert([vsmData])
                    .select();
                if (error) throw error;

                if (data) fetchVsms();
            }
            setSelectedVsm(null);
        } catch (error) {
            console.error("Error saving VSM:", error);
            alert("Error al guardar el mapa VSM");
        }
    };

    const _handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSelectedVsm({ ...selectedVsm, image: url });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <HeaderWithFilter
                title="VSM (Value Stream Mapping)"
                subtitle="Mapeo y análisis de flujos de valor"
            >
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                    onClick={handleNewVsm}
                >
                    <Plus size={18} /> Nuevo Mapa
                </button>
            </HeaderWithFilter>

            {/* Search Bar */}
            <div className="px-6 md:px-8 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar mapas VSM..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-600 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* VSM Grid */}
            <div className="px-6 md:px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVsms.map(vsm => (
                        <div key={vsm.id} className="group bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200 hover:border-brand-200 transition-all duration-300 cursor-pointer flex flex-col h-full overflow-hidden" onClick={() => setSelectedVsm(vsm)}>
                            {/* Image Header */}
                            <div className="h-40 bg-slate-100 relative overflow-hidden group-hover:opacity-95 transition-opacity">
                                {vsm.image ? (
                                    <img src={vsm.image} alt="VSM Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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

                                {/* Quick Toggle Button (Visible on Hover or always if Mobile) */}
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
                                <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-brand-600 transition-colors">{vsm.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-1">{vsm.description || 'Sin descripción disponible.'}</p>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="text-center">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Lead Time</span>
                                        <span className="text-sm font-bold text-slate-700">{vsm.leadTime || '-'}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Proceso</span>
                                        <span className="text-sm font-bold text-slate-700">{vsm.processTime || '-'}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Eficiencia</span>
                                        <span className="text-sm font-bold text-emerald-600">{vsm.efficiency || '-'}</span>
                                    </div>
                                    <div className="text-center border-l border-slate-200">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Takt Time</span>
                                        <span className="text-sm font-bold text-slate-700">{vsm.taktTime || '-'}</span>
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

                    {filteredVsms.length === 0 && (
                        <div className="col-span-full py-16 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search size={24} />
                            </div>
                            <h3 className="text-slate-900 font-medium text-lg">No se encontraron mapas</h3>
                            <p className="text-slate-500">Prueba ajustando los filtros o crea un nuevo VSM.</p>
                        </div>
                    )}
                </div>
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
                                        onClick={() => handleDelete(selectedVsm.id)}
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
                                        {/* Company Selector for SuperAdmins */}
                                        {user?.isGlobalAdmin && (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Empresa</label>
                                                <div className="relative">
                                                    <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <select
                                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 appearance-none cursor-pointer"
                                                        value={selectedVsm.companyId || ''}
                                                        onChange={(e) => {
                                                            const newCompanyId = e.target.value;
                                                            setSelectedVsm({
                                                                ...selectedVsm,
                                                                companyId: newCompanyId,
                                                                responsible: '' // Reset responsible when company changes to avoid mismatch
                                                            });
                                                        }}
                                                    >
                                                        <option value="" disabled>Seleccionar Empresa...</option>
                                                        {companies.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre del Mapa</label>
                                            <input
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 placeholder:text-slate-400"
                                                value={selectedVsm.name}
                                                onChange={(e) => setSelectedVsm({ ...selectedVsm, name: e.target.value })}
                                                placeholder="Ej: Flujo de Producción Línea 3"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
                                            <textarea
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 placeholder:text-slate-400 h-24 resize-none"
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
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 appearance-none cursor-pointer"
                                                    value={selectedVsm.responsible}
                                                    onChange={(e) => setSelectedVsm({ ...selectedVsm, responsible: e.target.value })}
                                                >
                                                    <option value="" disabled>Seleccionar...</option>
                                                    {(() => {
                                                        // Filter users based on selected company
                                                        const targetCompanyId = selectedVsm.companyId || (user?.isGlobalAdmin ? null : user?.companyId);
                                                        const filteredUsers = targetCompanyId
                                                            ? companyUsers.filter(u => u.company_id === targetCompanyId)
                                                            : companyUsers;

                                                        if (filteredUsers && filteredUsers.length > 0) {
                                                            return filteredUsers.map(u => (
                                                                <option key={u.id} value={u.name}>{u.name}</option>
                                                            ));
                                                        } else {
                                                            return (
                                                                <>
                                                                    {selectedVsm.responsible && <option value={selectedVsm.responsible}>{selectedVsm.responsible}</option>}
                                                                    <option value="" disabled>No hay usuarios disponibles</option>
                                                                </>
                                                            );
                                                        }
                                                    })()}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input
                                                    type="date"
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700"
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
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedVsm.status === 'current' ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'}`}>
                                                    {selectedVsm.status === 'current' && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={selectedVsm.status === 'current'}
                                                    onChange={() => setSelectedVsm({ ...selectedVsm, status: 'current' })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700">Estado Actual</span>
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
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 placeholder:text-slate-400"
                                                    value={selectedVsm.miroLink}
                                                    onChange={(e) => setSelectedVsm({ ...selectedVsm, miroLink: e.target.value })}
                                                    placeholder="https://miro.com/..."
                                                />
                                            </div>
                                            {selectedVsm.miroLink && (
                                                <a
                                                    href={selectedVsm.miroLink}
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
                                            <Activity size={18} className="text-brand-600" />
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
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.leadTime}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, leadTime: e.target.value })}
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
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.processTime}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, processTime: e.target.value })}
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
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium"
                                                        value={selectedVsm.taktTime}
                                                        onChange={(e) => setSelectedVsm({ ...selectedVsm, taktTime: e.target.value })}
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
                                                currentImage={selectedVsm.image}
                                                onUpload={(url) => setSelectedVsm({ ...selectedVsm, image: url })}
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
                                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm hover:shadow hover:-translate-y-0.5 transition-all"
                            >
                                Guardar Mapa
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default VSMPage;
