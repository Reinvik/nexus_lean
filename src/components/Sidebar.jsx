import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileText, Activity, Zap, ShieldCheck, Settings, Users, User, LogOut, Camera, X, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ImageUpload from './ImageUpload';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout, updatePassword, updateProfileName } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    // Name Change State
    const [name, setName] = useState('');
    const [nameLoading, setNameLoading] = useState(false);

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        const fetchAvatar = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data && data.avatar_url) {
                    setAvatarUrl(data.avatar_url);
                }
            } catch (error) {
                console.error('Error fetching avatar:', error);
            }
        };

        if (user) {
            fetchAvatar();
        }
    }, [user]);

    useEffect(() => {
        if (user?.name) {
            setName(user.name);
        }
    }, [user]);

    const handleAvatarUpdate = async (url) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', user.id);

            if (error) throw error;
            setAvatarUrl(url);
            // setIsAvatarModalOpen(false); // Optional: keep open to see result or close immediately
        } catch (error) {
            console.error('Error updating avatar:', error);
            alert('Error actualizando imagen de perfil');
        }
    };

    const handleNameChange = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setNameLoading(true);
        const { success, message } = await updateProfileName(name);
        setNameLoading(false);

        if (success) {
            alert('Nombre actualizado correctamente');
        } else {
            alert('Error al actualizar nombre: ' + message);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }
        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setPasswordLoading(true);
        const { success, message } = await updatePassword(newPassword);
        setPasswordLoading(false);

        if (success) {
            alert('Contraseña actualizada correctamente');
            setNewPassword('');
            setConfirmNewPassword('');
        } else {
            alert('Error al actualizar contraseña: ' + message);
        }
    };

    const allNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ClipboardList, label: 'Tarjetas 5S', path: '/5s', module: '5s' },
        { icon: ShieldCheck, label: 'Auditoría 5S', path: '/auditorias-5s', module: 'auditoria_5s' },
        { icon: FileText, label: 'Proyectos A3', path: '/a3', module: 'a3' },
        { icon: Activity, label: 'VSM', path: '/vsm', module: 'vsm' },
        { icon: Zap, label: 'Quick Wins', path: '/quick-wins', module: 'quick_wins' },
        { icon: Users, label: 'Responsables', path: '/responsables' },
    ];

    const enabledModules = user?.allowedModules || ['5s', 'a3', 'vsm', 'quick_wins', 'auditoria_5s', 'consultor_ia'];

    const navItems = allNavItems.filter(item => {
        if (!item.module) return true;
        return enabledModules.includes(item.module);
    });

    if (user && (user.role === 'admin' || user.role === 'superadmin' || user.has_ai_access)) {
        // Insert Consultant after Dashboard if enabled
        if (enabledModules.includes('consultor_ia')) {
            navItems.splice(1, 0, { icon: Brain, label: 'Consultor IA', path: '/consultant' });
        }
    }

    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
        navItems.push({ icon: Settings, label: 'Administración', path: '/admin' });
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-72 bg-[#050B14] text-slate-300 flex flex-col h-[133.33vh] md:h-full border-r border-[#1E293B] shadow-2xl
                    transition-transform duration-300 ease-in-out relative
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 brightness-100 contrast-150"></div>
                    <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-cyan-900/10 rounded-full blur-[60px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-900/10 rounded-full blur-[60px]"></div>
                </div>

                {/* Header / Logo */}
                <div className="h-24 flex items-center justify-between px-8 border-b border-[#1E293B] relative z-10 bg-[#050B14]/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500 blur-md opacity-30 rounded-full"></div>
                            <img
                                src="/nexus-logo.svg"
                                alt="Nexus Be Lean"
                                className="h-9 w-auto relative drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                            />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Lean</span></span>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 relative z-10 scrollbar-hide">
                    <div className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Menu Principal</div>
                    <div className="space-y-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose && window.innerWidth < 768 && onClose()} // Close on mobile click
                                className={({ isActive }) => `
                                    relative group flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300
                                    ${isActive
                                        ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/5 text-white shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
                                        )}
                                        <item.icon
                                            size={20}
                                            className={`mr-3 transition-transform duration-300 ${isActive ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'}`}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        <span className={`tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                                            {item.label}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-[#1E293B] bg-[#020617]/50 relative z-10 backdrop-blur-sm">
                    <div
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-slate-800"
                        onClick={() => setIsAvatarModalOpen(true)}
                        title="Cambiar Foto de Perfil"
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-slate-700 group-hover:border-cyan-500/50 shadow-lg transition-all">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.name ? user.name.charAt(0) : 'U'}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[#0F172A] border border-slate-700 rounded-full p-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
                                <Camera size={10} />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{user?.name || 'Usuario'}</p>
                            <p className="text-xs text-slate-500 truncate group-hover:text-cyan-400/70 transition-colors">
                                {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            await logout();
                            window.location.href = '/login'; // Force full redirect for Electron compatibility
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all duration-200"
                    >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                {/* Avatar Modal */}
                {
                    isAvatarModalOpen && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsAvatarModalOpen(false)}>
                            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                                {/* Modal Background Effects */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h3 className="font-bold text-lg text-white">Mi Perfil</h3>
                                    <button onClick={() => setIsAvatarModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="h-48 md:h-64 mb-6 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 bg-slate-900/50 relative group backdrop-blur-sm">
                                    <ImageUpload
                                        currentImage={avatarUrl}
                                        onUpload={handleAvatarUpdate}
                                        bucketName="images"
                                        placeholderText="Subir nueva foto"
                                    />
                                </div>

                                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6">
                                    <span className="text-xs font-medium text-slate-400">Avatares predefinidos:</span>
                                    <div className="flex gap-3">
                                        {['https://cdn-icons-png.flaticon.com/512/3135/3135715.png', 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png'].map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleAvatarUpdate(url)}
                                                className="w-10 h-10 rounded-full border-2 border-[#1E293B] hover:border-cyan-500 shadow-sm transition-all duration-200 overflow-hidden transform hover:scale-110"
                                            >
                                                <img src={url} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <hr className="my-6 border-slate-800" />

                                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <User size={16} className="text-cyan-400" /> Información Personal
                                </h4>

                                <form onSubmit={handleNameChange} className="space-y-4 mb-6">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Nombre Completo"
                                            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 text-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-medium placeholder-slate-600"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!name || name === user?.name || nameLoading}
                                        className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {nameLoading ? 'Actualizando...' : 'Actualizar Nombre'}
                                    </button>
                                </form>

                                <hr className="my-6 border-slate-800" />

                                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-cyan-400" /> Cambiar Contraseña
                                </h4>

                                <form onSubmit={handlePasswordChange} className="space-y-4 mb-6">
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Nueva Contraseña"
                                            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 text-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder-slate-600"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Confirmar Contraseña"
                                            className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700 text-white rounded-lg text-sm outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder-slate-600"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            minLength={6}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newPassword || passwordLoading}
                                        className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {passwordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                    </button>
                                </form>

                                <button
                                    onClick={() => setIsAvatarModalOpen(false)}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all font-bold text-sm shadow-lg shadow-cyan-900/20 active:scale-95 duration-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )
                }
            </aside >
        </>
    );
};

export default Sidebar;
