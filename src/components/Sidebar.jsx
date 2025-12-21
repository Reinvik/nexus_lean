import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileText, Activity, Zap, ShieldCheck, Settings, Users, LogOut, Camera, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import ImageUpload from './ImageUpload';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAvatar();
        }
    }, [user]);

    const fetchAvatar = async () => {
        try {
            const { data, error } = await supabase
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

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ClipboardList, label: 'Tarjetas 5S', path: '/5s' },
        { icon: ShieldCheck, label: 'Auditoría 5S', path: '/auditorias-5s' },
        { icon: FileText, label: 'Proyectos A3', path: '/a3' },
        { icon: Activity, label: 'VSM', path: '/vsm' },
        { icon: Zap, label: 'Quick Wins', path: '/quick-wins' },
        { icon: Users, label: 'Responsables', path: '/responsables' },
    ];

    if (user && user.role === 'admin') {
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
                    w-64 bg-sidebar text-sidebar-text flex flex-col h-screen border-r border-sidebar-border shadow-xl
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Header / Logo */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <img src="/nexus-logo.svg" alt="Nexus Logo" className="w-10 h-10 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" />
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Nexus</h1>
                            <span className="text-xs font-medium text-brand-500 tracking-wider">BE LEAN</span>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">Menu Principal</div>
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose && window.innerWidth < 768 && onClose()} // Close on mobile click
                                className={({ isActive }) => `
                                    relative group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-0
                                    ${isActive
                                        ? 'bg-gradient-to-r from-brand-600/20 to-brand-600/5 text-brand-400 shadow-lg shadow-brand-900/20 border border-brand-500/10'
                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                                    }
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"></div>
                                        )}
                                        <item.icon
                                            size={20}
                                            className={`mr-3 transition-transform duration-300 ${isActive ? 'text-brand-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-105'}`}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                        <span className={`tracking-wide ${isActive ? 'font-bold' : ''}`}>
                                            {item.label}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-sidebar-border bg-sidebar/30">
                    <div
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-hover transition-colors cursor-pointer group"
                        onClick={() => setIsAvatarModalOpen(true)}
                        title="Cambiar Foto de Perfil"
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-slate-600/50 group-hover:border-brand-500/50 transition-colors">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.name ? user.name.charAt(0) : 'U'}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-sidebar border border-sidebar-border rounded-full p-0.5 text-slate-400 group-hover:text-brand-500 transition-colors">
                                <Camera size={10} />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-brand-100 transition-colors">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-lg transition-all duration-200"
                    >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                {/* Avatar Modal */}
                {
                    isAvatarModalOpen && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsAvatarModalOpen(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg text-slate-800">Foto de Perfil</h3>
                                    <button onClick={() => setIsAvatarModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="h-64 mb-6 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 relative group">
                                    <ImageUpload
                                        currentImage={avatarUrl}
                                        onUpload={handleAvatarUpdate}
                                        bucketName="images"
                                        placeholderText="Subir nueva foto"
                                    />
                                </div>

                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                    <span className="text-xs font-medium text-slate-500">Avatares predefinidos:</span>
                                    <div className="flex gap-3">
                                        {['https://cdn-icons-png.flaticon.com/512/3135/3135715.png', 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png'].map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleAvatarUpdate(url)}
                                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 hover:ring-brand-500 hover:scale-110 transition-all duration-200 overflow-hidden"
                                            >
                                                <img src={url} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsAvatarModalOpen(false)}
                                    className="w-full py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium text-sm shadow-md shadow-brand-500/20 active:scale-95 duration-200"
                                >
                                    Guardar Cambios
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
