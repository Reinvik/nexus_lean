import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trash2, Building, Users, CheckCircle, XCircle } from 'lucide-react';

const AdminPage = () => {
    const { user, companies, addCompany, removeCompany, removeUser, adminAuthorizeUser, getAllUsers, updateUserRole, updateUserCompany, refreshData, repairAdminProfile } = useAuth();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [localUsers, setLocalUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [filterCompanyId, setFilterCompanyId] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const data = await getAllUsers();
        setLocalUsers(data);
        setLoadingUsers(false);
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="page-container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h2 style={{ color: '#ef4444' }}>Acceso Denegado</h2>
                <p>Solo los administradores pueden ver esta página.</p>
            </div>
        );
    }

    const handleAddCompany = async (e) => {
        e.preventDefault();
        if (newCompanyName.trim()) {
            const domain = newCompanyName.toLowerCase().replace(/\s+/g, '') + '.cl';
            await addCompany(newCompanyName, domain);
            setNewCompanyName('');
        }
    };

    const handleAuthorize = async (userId) => {
        await adminAuthorizeUser(userId);
        fetchUsers();
    };

    const handleRemoveUser = async (userId) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            await removeUser(userId);
            fetchUsers();
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
        if (!window.confirm('ADVERTENCIA: ¿Estás seguro de eliminar todos los datos (5S, QuickWins, A3, VSM) que no tienen una empresa asignada? Esta acción es irreversible.')) {
            return;
        }

        let deletedCount = 0;

        // Cleanup Helper
        const cleanupKey = (key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return 0;
            try {
                const data = JSON.parse(raw);
                if (!Array.isArray(data)) return 0;

                const cleanData = data.filter(item => !!item.companyId);
                const diff = data.length - cleanData.length;

                if (diff > 0) {
                    localStorage.setItem(key, JSON.stringify(cleanData));
                }
                return diff;
            } catch (e) {
                console.error('Error cleaning ' + key, e);
                return 0;
            }
        };

        deletedCount += cleanupKey('fiveSData');
        deletedCount += cleanupKey('quickWinsData');
        deletedCount += cleanupKey('a3ProjectsData');
        deletedCount += cleanupKey('vsmData');

        alert(`Limpieza completada. Se eliminaron ${deletedCount} elementos huérfanos.`);
        // Recargar la página para reflejar cambios si el admin estaba viendo datos
        window.location.reload();
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Administración del Sistema</h2>
                <p>Gestión de Empresas y Usuarios</p>
            </header>

            {/* DIAGNOSTIC TOOLS */}
            <div className="card mb-6" style={{ background: '#f0f9ff', borderColor: '#bae6fd', padding: '1rem', marginBottom: '2rem' }}>
                <h4 style={{ color: '#0369a1', margin: '0 0 10px 0', fontSize: '1rem' }}>🔧 Herramientas de Diagnóstico</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => refreshData()}
                        className="btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                    >
                        🔄 Recargar Datos
                    </button>
                    <button
                        onClick={async () => {
                            const res = await repairAdminProfile();
                            alert(res.message);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', backgroundColor: '#0284c7' }}
                    >
                        🛠️ Reparar Permisos de Admin en DB
                    </button>
                    <button
                        onClick={async () => {
                            // FIX ORPHAN 5S CARDS
                            try {
                                const { supabase } = await import('../supabaseClient');

                                // 1. Get all 5S cards without company_id
                                const { data: orphanCards, error: fetchError } = await supabase
                                    .from('five_s_cards')
                                    .select('id, responsible')
                                    .is('company_id', null);

                                if (fetchError) throw fetchError;

                                if (!orphanCards || orphanCards.length === 0) {
                                    alert('✅ No hay tarjetas 5S huérfanas. Todo está correcto.');
                                    return;
                                }

                                // 2. Get all profiles to map responsible -> company_id
                                const { data: profiles, error: profileError } = await supabase
                                    .from('profiles')
                                    .select('name, company_id');

                                if (profileError) throw profileError;

                                const profileMap = {};
                                profiles.forEach(p => {
                                    if (p.name && p.company_id) profileMap[p.name] = p.company_id;
                                });

                                // 3. Update each orphan card
                                let fixedCount = 0;
                                let unfixableIds = [];

                                for (const card of orphanCards) {
                                    const companyId = profileMap[card.responsible];
                                    if (companyId) {
                                        const { error: updateError } = await supabase
                                            .from('five_s_cards')
                                            .update({ company_id: companyId })
                                            .eq('id', card.id);

                                        if (!updateError) fixedCount++;
                                    } else {
                                        unfixableIds.push(card.id);
                                    }
                                }

                                let msg = `✅ Reparación completada.\n\n- Tarjetas corregidas: ${fixedCount}`;
                                if (unfixableIds.length > 0) {
                                    msg += `\n- Sin poder arreglar (responsable no encontrado): ${unfixableIds.length} (IDs: ${unfixableIds.join(', ')})`;
                                }
                                alert(msg);

                            } catch (err) {
                                console.error('Error fixing orphan cards:', err);
                                alert('❌ Error al reparar: ' + err.message);
                            }
                        }}
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', backgroundColor: '#059669' }}
                    >
                        🩹 Reparar Tarjetas 5S Huérfanas
                    </button>
                </div>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                {/* SECTION: EMPRESAS */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px', color: '#1e293b', fontWeight: 'bold' }}>
                        <Building size={20} /> Gestión de Empresas
                    </h3>

                    {/* Add Company Form */}
                    <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Nombre de la empresa"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" disabled={!newCompanyName.trim()}>
                            Agregar Empresa
                        </button>
                    </form>

                    {/* Company List */}
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {companies.map(comp => (
                            <li key={comp.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px',
                                borderBottom: '1px solid #f3f4f6',
                                background: '#f9fafb',
                                marginBottom: '5px',
                                borderRadius: '6px'
                            }}>
                                <div>
                                    <span style={{ fontWeight: '500', display: 'block', color: '#334155' }}>{comp.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{comp.domain || 'Sin dominio'}</span>
                                </div>
                                <button
                                    onClick={() => removeCompany(comp.id)}
                                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                    title="Eliminar Empresa"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* DEMO DATA TOOL */}
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #e5e7eb' }}>
                        <button
                            onClick={async () => {
                                const { generateTransportesDemoData } = await import('../utils/demoData');
                                generateTransportesDemoData(companies, addCompany);
                            }}
                            className="btn-secondary"
                            style={{ width: '100%', fontSize: '0.85rem', justifyContent: 'center', background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                        >
                            + Generar Datos Demo "Transportes del Sur"
                        </button>
                    </div>
                </div>

                {/* SECTION: USUARIOS */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '15px', color: '#1e293b', fontWeight: 'bold' }}>
                        <Users size={20} /> Gestión de Usuarios
                    </h3>

                    <div style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                        <p>Los usuarios deben registrarse ellos mismos en la página de registro. Aquí puedes autorizar su acceso.</p>
                    </div>

                    {/* COMPANY FILTER */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>Filtrar por Empresa:</label>
                        <select
                            value={filterCompanyId}
                            onChange={(e) => setFilterCompanyId(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white', color: '#334155' }}
                        >
                            <option value="all">Todas las Empresas</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* PENDING AUTHORIZATIONS */}
                    {pendingUsers.length > 0 && (
                        <div style={{ marginBottom: '2rem', background: '#fff7ed', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                            <h4 style={{ color: '#c2410c', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={18} /> Solicitudes Pendientes
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pendingUsers.map(u => (
                                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#f97316' }}>
                                                Empresa: {companies.find(c => c.id === u.company_id)?.name || 'Desconocida'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleAuthorize(u.id)}
                                                className="btn-primary"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#16a34a' }}
                                            >
                                                Autorizar
                                            </button>
                                            <button
                                                onClick={() => handleRemoveUser(u.id)}
                                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem' }}
                                                title="Rechazar"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users List */}
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#64748b' }}>Usuarios Activos</h4>
                    {loadingUsers ? <p>Cargando usuarios...</p> : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>
                                        <th style={{ paddingBottom: '8px' }}>Usuario</th>
                                        <th style={{ paddingBottom: '8px' }}>Rol</th>
                                        <th style={{ paddingBottom: '8px' }}>Empresa</th>
                                        <th style={{ paddingBottom: '8px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {authorizedUsers.map(u => (
                                        <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 0' }}>
                                                <div style={{ fontWeight: '500', color: '#334155' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</div>
                                            </td>
                                            <td style={{ padding: '8px 0' }}>
                                                <button
                                                    onClick={() => handleRoleChange(u.id, u.role)}
                                                    style={{
                                                        background: u.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                                                        color: u.role === 'admin' ? '#1e40af' : '#475569',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        border: '1px solid transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Click para cambiar rol"
                                                >
                                                    {u.role || 'user'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '8px 0', color: '#64748b' }}>
                                                {/* Edit Company Dropdown */}
                                                <select
                                                    value={u.company_id || ''}
                                                    onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                                                    style={{
                                                        padding: '2px 4px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid #cbd5e1',
                                                        background: 'white',
                                                        maxWidth: '100%'
                                                    }}
                                                >
                                                    <option value="" disabled>Seleccionar...</option>
                                                    {companies.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '8px 0' }}>
                                                <button
                                                    onClick={() => handleRemoveUser(u.id)}
                                                    style={{ color: '#cbd5e1', cursor: 'pointer', background: 'none', border: 'none' }}
                                                    className="hover-danger"
                                                >
                                                    <Trash2 size={14} />
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

            {/* NEW MAINTENANCE SECTION */}
            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', borderColor: '#fee2e2' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '1rem' }}>
                    <Trash2 size={20} /> Zona de Mantenimiento
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '1rem' }}>
                    Utilice estas herramientas para limpiar datos antiguos o corruptos que no están asignados a ninguna empresa válida.
                    Esto eliminará tareas de 5S, Quick Wins, A3 y VSM que no tengan asociada una empresa.
                </p>
                <button
                    onClick={handlePurgeLegacyData}
                    className="btn-secondary"
                    style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' }}
                >
                    Eliminar Datos Huerfanos (Sin Empresa)
                </button>
            </div>
        </div>
    );
};

export default AdminPage;
