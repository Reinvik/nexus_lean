import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Trash2, Building, Users, CheckCircle,
    Shield, Activity, AlertTriangle,
    RefreshCw, Wrench, Search, Plus, Ban
} from 'lucide-react';

const AdminPage = () => {
    const { user, companies, addCompany, removeCompany, removeUser, adminAuthorizeUser, updateUserStatus, getAllUsers, updateUserRole, updateUserCompany, refreshData, repairAdminProfile } = useAuth();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyDomain, setNewCompanyDomain] = useState('');
    const [localUsers, setLocalUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [filterCompanyId, setFilterCompanyId] = useState('all');

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        const data = await getAllUsers();
        setLocalUsers(data);
        setLoadingUsers(false);
    }, [getAllUsers]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md border border-slate-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
                    <p className="text-slate-500">Solo los administradores tienen permiso para ver esta página.</p>
                </div>
            </div>
        );
    }

    const handleAddCompany = async (e) => {
        e.preventDefault();
        if (newCompanyName.trim() && newCompanyDomain.trim()) {
            await addCompany(newCompanyName, newCompanyDomain.toLowerCase().trim());
            setNewCompanyName('');
            setNewCompanyDomain('');
        }
    };

    const handleAuthorize = async (userId) => {
        await adminAuthorizeUser(userId);
        fetchUsers();
    };

    const handleRemoveUser = async (userId) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario? Esto no se puede deshacer.')) {
            const { success, error } = await removeUser(userId);
            if (success) {
                fetchUsers();
            } else {
                alert('Error al eliminar usuario: ' + (error?.message || 'Error desconocido'));
                console.error('Error removing user:', error);
            }
        }
    };


    const handleStatusChange = async (userId) => {
        if (window.confirm('¿Desactivar acceso de este usuario? Pasará a la lista de pendientes.')) {
            const { success, error } = await updateUserStatus(userId, false);
            if (success) {
                fetchUsers();
            } else {
                alert('Error al actualizar estado: ' + error.message);
            }
        }
    };

    const handleRoleChange = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (window.confirm(`¿Cambiar rol de ${currentRole} a ${newRole}?`)) {
            await updateUserRole(userId, newRole);
            fetchUsers();
        }
    };

    const handleCompanyChange = async (userId, newCompanyId) => {
        if (!newCompanyId) return;
        if (window.confirm('¿Cambiar empresa del usuario?')) {
            await updateUserCompany(userId, newCompanyId);
            fetchUsers();
        }
    };

    const filteredUsers = filterCompanyId === 'all'
        ? localUsers
        : localUsers.filter(u => u.company_id === filterCompanyId);

    const pendingUsers = filteredUsers.filter(u => !u.is_authorized);
    const authorizedUsers = filteredUsers.filter(u => u.is_authorized);

    const handlePurgeLegacyData = () => {
        if (!window.confirm('ADVERTENCIA: ¿Estás seguro de eliminar todos los datos huérfanos? Esta acción es irreversible.')) {
            return;
        }

        let deletedCount = 0;
        const cleanupKey = (key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return 0;
            try {
                const data = JSON.parse(raw);
                if (!Array.isArray(data)) return 0;
                const cleanData = data.filter(item => !!item.companyId);
                const diff = data.length - cleanData.length;
                if (diff > 0) localStorage.setItem(key, JSON.stringify(cleanData));
                return diff;
            } catch (e) { return 0; }
        };

        deletedCount += cleanupKey('fiveSData');
        deletedCount += cleanupKey('quickWinsData');
        deletedCount += cleanupKey('a3ProjectsData');
        deletedCount += cleanupKey('vsmData');

        alert(`Limpieza completada. Se eliminaron ${deletedCount} elementos huérfanos.`);
        window.location.reload();
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Shield className="text-brand-600" size={28} />
                        Administración del Sistema
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión centralizada de empresas, usuarios y mantenimiento.</p>
                </div>

                {/* Diagnostic Actions Bar */}
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    <button
                        onClick={() => refreshData()}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-md transition-colors"
                        title="Recargar Datos"
                    >
                        <RefreshCw size={16} /> Recargar
                    </button>
                    <div className="w-px bg-slate-200 my-1 mx-1"></div>
                    <button
                        onClick={async () => {
                            const res = await repairAdminProfile();
                            alert(res.message);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                        title="Reparar Permisos"
                    >
                        <Wrench size={16} /> Permisos
                    </button>
                    <div className="w-px bg-slate-200 my-1 mx-1"></div>
                    <button
                        onClick={async () => {
                            // Logic remains the same, just keeping the cleaner UI trigger
                            try {
                                const { supabase } = await import('../supabaseClient');
                                const { data: orphanCards, error } = await supabase.from('five_s_cards').select('id, responsible').is('company_id', null);
                                if (error) throw error;
                                if (!orphanCards?.length) { alert('✅ No hay tarjetas 5S huérfanas.'); return; }
                                const { data: profiles } = await supabase.from('profiles').select('name, company_id');
                                const profileMap = {}; profiles?.forEach(p => { if (p.name && p.company_id) profileMap[p.name] = p.company_id; });
                                let fixed = 0;
                                for (const card of orphanCards) {
                                    const cid = profileMap[card.responsible];
                                    if (cid) { await supabase.from('five_s_cards').update({ company_id: cid }).eq('id', card.id); fixed++; }
                                }
                                alert(`✅ Reparación completada: ${fixed} tarjetas correjidas.`);
                            } catch (err) { alert('Error: ' + err.message); }
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-slate-50 rounded-md transition-colors"
                        title="Reparar 5S"
                    >
                        <Activity size={16} /> Reparar 5S
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* SECTION: EMPRESAS (Left Column) */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Building size={18} className="text-slate-400" />
                                Empresas Registradas
                            </h3>
                            <span className="text-xs font-bold bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full">
                                {companies.length}
                            </span>
                        </div>

                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nueva Empresa</h4>
                            <form onSubmit={handleAddCompany} className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                    placeholder="Nombre de la empresa"
                                    value={newCompanyName}
                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        placeholder="Dominio (ej: acme.com)"
                                        value={newCompanyDomain}
                                        onChange={(e) => setNewCompanyDomain(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newCompanyName.trim() || !newCompanyDomain.trim()}
                                        className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <ul className="divide-y divide-slate-100">
                                {companies.map(comp => (
                                    <li key={comp.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{comp.name}</p>
                                            <p className="text-xs text-slate-500">{comp.domain || 'Sin dominio configurado'}</p>
                                        </div>
                                        <button
                                            onClick={() => removeCompany(comp.id)}
                                            className="text-slate-300 hover:text-rose-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Eliminar Empresa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                            <button
                                onClick={async () => {
                                    const { generateTransportesDemoData } = await import('../utils/demoData');
                                    generateTransportesDemoData(companies, addCompany);
                                }}
                                className="w-full py-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                                + Generar Datos Demo
                            </button>
                        </div>
                    </div>

                    {/* Maintenance Zone moved to side column for better layout in large screens */}
                    <div className="bg-red-50 rounded-xl border border-red-100 p-5">
                        <h3 className="flex items-center gap-2 text-red-700 font-bold mb-2">
                            <AlertTriangle size={18} /> Zona de Riesgo
                        </h3>
                        <p className="text-xs text-red-600 mb-4 leading-relaxed">
                            Acciones destructivas para mantenimiento de la base de datos.
                            Elimina registros huérfanos que no pertenecen a ninguna empresa.
                        </p>
                        <button
                            onClick={handlePurgeLegacyData}
                            className="w-full py-2 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                        >
                            Eliminar Datos Huerfanos
                        </button>
                    </div>
                </div>

                {/* SECTION: USUARIOS (Right Column - Wider) */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[600px]">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                    <Users size={20} className="text-brand-500" />
                                    Gestión de Usuarios
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Autoriza y administra el acceso al sistema</p>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={filterCompanyId}
                                    onChange={(e) => setFilterCompanyId(e.target.value)}
                                    className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors min-w-[200px]"
                                >
                                    <option value="all">Todas las Empresas</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-5 flex-1 bg-slate-50/30">

                            {/* Pending Requests */}
                            {pendingUsers.length > 0 && (
                                <div className="mb-8 animate-in slide-in-from-top-2">
                                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <CheckCircle size={14} /> Solicitudes Pendientes ({pendingUsers.length})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {pendingUsers.map(u => (
                                            <div key={u.id} className="bg-white p-4 rounded-xl border-l-4 border-l-amber-400 border-y border-r border-slate-200 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                                                <div>
                                                    <div className="font-bold text-slate-800">{u.name}</div>
                                                    <div className="text-xs text-slate-500 mb-1">{u.email}</div>
                                                    <div className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded uppercase">
                                                        {companies.find(c => c.id === u.company_id)?.name || 'Desconocida'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAuthorize(u.id)}
                                                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveUser(u.id)}
                                                        className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                                                        title="Rechazar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active Users Table */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Usuarios Activos
                                    </h4>
                                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                        {authorizedUsers.length} usuarios
                                    </span>
                                </div>

                                {loadingUsers ? (
                                    <div className="text-center py-12 text-slate-400 italic">Cargando usuarios...</div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                                                <tr>
                                                    <th className="px-5 py-3">Usuario</th>
                                                    <th className="px-5 py-3 text-center">Rol</th>
                                                    <th className="px-5 py-3">Empresa</th>
                                                    <th className="px-5 py-3 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {authorizedUsers.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="font-semibold text-slate-700">{u.name}</div>
                                                            <div className="text-xs text-slate-400">{u.email}</div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <button
                                                                onClick={() => handleRoleChange(u.id, u.role)}
                                                                className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all border ${u.role === 'admin'
                                                                    ? 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                                    }`}
                                                            >
                                                                {u.role || 'user'}
                                                            </button>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <select
                                                                value={u.company_id || ''}
                                                                onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                                                                className="bg-transparent text-sm text-slate-600 border-none focus:ring-0 cursor-pointer hover:text-brand-600 font-medium py-0 pl-0"
                                                            >
                                                                <option value="" disabled>Seleccionar...</option>
                                                                {companies.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-5 py-3 text-right flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleStatusChange(u.id)}
                                                                className="text-slate-300 hover:text-amber-500 p-1.5 rounded-md hover:bg-amber-50 transition-colors"
                                                                title="Desactivar Acceso"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveUser(u.id)}
                                                                className="text-slate-300 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                                                                title="Eliminar Usuario"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
