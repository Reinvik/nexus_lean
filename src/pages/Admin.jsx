import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Trash2, Building, Users, CheckCircle,
    Shield, Activity, AlertTriangle,
    RefreshCw, Wrench, Search, Plus, Ban, Send, X
} from 'lucide-react';

const AdminPage = () => {
    const { user, companies, addCompany, removeCompany, removeUser, adminAuthorizeUser, updateUserStatus, getAllUsers, updateUserRole, updateUserCompany, refreshData, repairAdminProfile, inviteUser } = useAuth();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyDomain, setNewCompanyDomain] = useState('');
    const [localUsers, setLocalUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [filterCompanyId, setFilterCompanyId] = useState('all');

    // Invite Modal State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteCompanyId, setInviteCompanyId] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        const data = await getAllUsers();
        setLocalUsers(data);
        setLoadingUsers(false);
    }, [getAllUsers]);

    const handleInviteUser = async (e) => {
        e.preventDefault();
        if (!inviteName || !inviteEmail || !inviteCompanyId) return;

        const { success, message } = await inviteUser(inviteEmail, inviteName, inviteCompanyId);

        if (success) {
            alert('Invitación enviada con éxito a ' + inviteEmail);
            setShowInviteModal(false);
            setInviteName('');
            setInviteEmail('');
            setInviteCompanyId('');
            fetchUsers(); // Refresh list (though they might not appear yet until they click the link)
        } else {
            alert('Error al enviar invitación: ' + message);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Auto-set invite company for Company Admins
    useEffect(() => {
        if (user && !user.isGlobalAdmin && user.companyId) {
            setInviteCompanyId(user.companyId);
        }
    }, [user]);

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
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
            const { success, error } = await addCompany(newCompanyName, newCompanyDomain.toLowerCase().trim());
            if (success) {
                setNewCompanyName('');
                setNewCompanyDomain('');
                alert('Empresa creada correctamente.');
            } else {
                // Check if it's a conflict
                if (error.code === '23505') {
                    alert('Error: Ya existe una empresa con ese dominio.');
                } else {
                    alert('Error al crear empresa: ' + (error?.message || 'Error desconocido'));
                }
            }
        }
    };

    const handleAuthorize = async (userId) => {
        await adminAuthorizeUser(userId);
        fetchUsers();
    };

    const handleRemoveUser = async (userId) => {
        if (window.confirm('ADVERTENCIA: ¿Estás seguro de eliminar este usuario?\n\nSi el usuario tiene datos asociados (Tarjetas, Proyectos), la eliminación fallará para proteger la integridad de los datos.\n\nEn ese caso, se recomienda DESACTIVAR el acceso.')) {
            const { success, error } = await removeUser(userId);
            if (success) {
                fetchUsers();
                alert('Usuario eliminado correctamente.');
            } else {
                console.error('Error removing user:', error);

                // Check for Foreign Key Constraint error (Postgres error code 23503 usually, or message content)
                const isFKError = error?.message?.includes('violates foreign key constraint') || error?.code === '23503';

                if (isFKError) {
                    if (window.confirm('No se puede eliminar el usuario porque tiene datos asociados (historial de trabajo).\n\n¿Quieres DESACTIVAR SU ACCESO en lugar de eliminarlo? (Recomendado)')) {
                        handleStatusChange(userId);
                    }
                } else {
                    alert('Error al eliminar usuario: ' + (error?.message || 'Error desconocido'));
                }
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
        // Cycle: user -> admin -> superadmin -> user
        let newRole = 'user';

        // Logic for role cycling
        if (!currentRole || currentRole === 'user') {
            newRole = 'admin';
        } else if (currentRole === 'admin') {
            // Only Global Admin can promote to SuperAdmin
            newRole = user.isGlobalAdmin ? 'superadmin' : 'user';
        } else if (currentRole === 'superadmin') {
            newRole = 'user';
        }

        if (window.confirm(`¿Cambiar rol de ${currentRole || 'user'} a ${newRole}?`)) {
            await updateUserRole(userId, newRole);
            fetchUsers();
        }
    };

    const handleCompanyChange = async (userId, newCompanyId) => {
        if (!newCompanyId) return;

        if (newCompanyId === 'all') {
            if (window.confirm('¿Convertir a este usuario en SUPER ADMIN (ver todas las empresas)?')) {
                await updateUserRole(userId, 'superadmin');
                await updateUserCompany(userId, null);
                fetchUsers();
            }
            return;
        }

        if (window.confirm('¿Cambiar empresa del usuario?')) {
            await updateUserCompany(userId, newCompanyId);
            fetchUsers();
        }
    };

    const filteredUsers = (user.isGlobalAdmin && filterCompanyId !== 'all')
        ? localUsers.filter(u => u.company_id === filterCompanyId)
        : localUsers;

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

                {/* Admin Actions Toolbar */}
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors shadow-sm"
                        title="Invitar Nuevo Usuario"
                    >
                        <Send size={16} /> Invitar Usuario
                    </button>

                    {user.isGlobalAdmin && (
                        <>
                            <div className="w-px bg-slate-200 my-1 mx-2"></div>

                            {/* Maintenance Tools (Hidden unless needed usually, but kept for Superadmin) */}
                            <button
                                onClick={async () => {
                                    const res = await repairAdminProfile();
                                    alert(res.message);
                                    window.location.reload();
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors"
                                title="Restaurar permisos de Superadmin si se han perdido"
                            >
                                <Shield size={16} /> Restaurar Acceso
                            </button>

                            <button
                                onClick={async () => {
                                    try {
                                        const { supabase } = await import('../supabaseClient');
                                        const { data: orphanCards, error } = await supabase.from('five_s_cards').select('id, responsible').is('company_id', null);
                                        if (error) throw error;
                                        if (!orphanCards?.length) { alert('✅ No se encontraron tarjetas 5S huérfanas.'); return; }

                                        const { data: profiles } = await supabase.from('profiles').select('name, company_id');
                                        const profileMap = {}; profiles?.forEach(p => { if (p.name && p.company_id) profileMap[p.name] = p.company_id; });

                                        let fixed = 0;
                                        for (const card of orphanCards) {
                                            const cid = profileMap[card.responsible];
                                            if (cid) { await supabase.from('five_s_cards').update({ company_id: cid }).eq('id', card.id); fixed++; }
                                        }
                                        alert(`✅ Mantenimiento completado: ${fixed} tarjetas vinculadas a sus empresas.`);
                                    } catch (err) { alert('Error: ' + err.message); }
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-emerald-600 hover:bg-slate-50 rounded-md transition-colors"
                                title="Buscar y reparar tarjetas que perdieron su asociación de empresa"
                            >
                                <Activity size={16} /> Vincular Huérfanos
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* SECTION: EMPRESAS (Left Column) - GLOBAL ADMIN ONLY */}
                {user.isGlobalAdmin ? (
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
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        placeholder="Nombre de la empresa"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
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


                    </div>
                ) : null}

                {/* SECTION: USUARIOS (Right Column - Wider) - EXPANDS if no left column */}
                <div className={`${user.isGlobalAdmin ? 'xl:col-span-2' : 'col-span-3'} space-y-6`}>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[600px]">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                    <Users size={20} className="text-brand-500" />
                                    Gestión de Usuarios
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Autoriza y administra el acceso al sistema</p>
                            </div>

                            {user.isGlobalAdmin && (
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
                            )}
                        </div>

                        {/* Invite Modal */}
                        {showInviteModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Send size={18} className="text-brand-600" />
                                            Invitar Usuario
                                        </h3>
                                        <button
                                            onClick={() => setShowInviteModal(false)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleInviteUser} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="Ej: Juan Pérez"
                                                value={inviteName}
                                                onChange={e => setInviteName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
                                                placeholder="juan@empresa.com"
                                                value={inviteEmail}
                                                onChange={e => setInviteEmail(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Empresa</label>
                                            <select
                                                required
                                                disabled={!user.isGlobalAdmin}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                                value={inviteCompanyId}
                                                onChange={e => setInviteCompanyId(e.target.value)}
                                            >
                                                <option value="">Seleccionar empresa...</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={!inviteName || !inviteEmail || !inviteCompanyId}
                                                className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                <Send size={16} /> Enviar Invitación
                                            </button>
                                            <p className="text-[10px] text-slate-400 text-center mt-3">
                                                El usuario recibirá un "Magic Link" para acceder sin contraseña inicialmente.
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

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
                                                    <th className="px-5 py-3 text-center">Último Acceso</th>
                                                    {user.isGlobalAdmin && (
                                                        <th className="px-5 py-3">Empresa</th>
                                                    )}
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
                                                            {/* User Role can always be changed by superadmin/global admin */
                                                                <button
                                                                    onClick={() => handleRoleChange(u.id, u.role)}
                                                                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition-all border ${u.role === 'superadmin'
                                                                        ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                                                                        : u.role === 'admin'
                                                                            ? 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                                                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                                        }`}
                                                                >
                                                                    {u.role === 'superadmin' ? 'Super Admin' : u.role || 'user'}
                                                                </button>
                                                            }
                                                        </td>
                                                        <td className="px-5 py-3 text-center text-xs text-slate-500">
                                                            {u.last_login ? new Date(u.last_login).toLocaleString('es-CL', {
                                                                day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                                            }) : <span className="opacity-50">Nunca</span>}
                                                        </td>
                                                        {
                                                            user.isGlobalAdmin && (
                                                                <td className="px-5 py-3">
                                                                    <select
                                                                        value={u.company_id || ''}
                                                                        onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                                                                        className="bg-transparent text-sm text-slate-600 border-none focus:ring-0 cursor-pointer hover:text-brand-600 font-medium py-0 pl-0"
                                                                    >
                                                                        <option value="" disabled>Seleccionar...</option>
                                                                        <option value="all" className="font-bold text-amber-600">★ Todas (Super Admin)</option>
                                                                        {companies.map(c => (
                                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                            )
                                                        }
                                                        < td className="px-5 py-3 text-right flex justify-end gap-2" >
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
            </div >
        </div >
    );
};

export default AdminPage;
