import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, CircuitBoard, ArrowRight, WifiOff, FileCheck, HelpCircle } from 'lucide-react';
import DebugBanner from '../components/DebugBanner';

export default function Login() {
    const { user, signInWithPassword, signUpWithPassword, signInWithMagicLink, loading } = useAuth();
    const navigate = useNavigate();
    const [isMagicLink, setIsMagicLink] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showEmergencyReset, setShowEmergencyReset] = useState(false);

    // Show emergency reset button after 8 seconds of loading
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setShowEmergencyReset(true);
            }, 8000);
            return () => clearTimeout(timer);
        } else {
            setShowEmergencyReset(false);
        }
    }, [loading]);

    const handleEmergencyReset = () => {
        console.log('[Emergency] Clearing all storage...');
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB) {
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    if (db.name) {
                        indexedDB.deleteDatabase(db.name);
                    }
                });
            });
        }
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0f172a] to-[#0f172a]">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <h1 className="text-5xl font-bold text-white tracking-tight animate-pulse drop-shadow-2xl">
                            Nexus Lean
                        </h1>
                    </div>
                </div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isMagicLink) {
                await signInWithMagicLink(email);
                setMessage('¡Enlace enviado! Revisa tu correo electrónico.');
            } else if (isSignUp) {
                await signUpWithPassword(email, password, fullName);
                setMessage('¡Cuenta creada! Si no entraste automáticamente, revisa tu correo.');
            } else {
                await signInWithPassword(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Error de autenticación');
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e3a8a_0%,_#0f172a_50%,_#0f172a_100%)] opacity-80"></div>
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-[420px] mx-4 animate-fade-in-up">
                <div className="rounded-3xl bg-[#1e293b]/30 backdrop-blur-xl border border-white/10 p-8 shadow-2xl ring-1 ring-white/5 relative overflow-hidden">

                    {/* Alexa-style Light Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 w-full animate-shimmer shadow-[0_0_20px_rgba(56,189,248,0.8)] z-20 mix-blend-plus-lighter"></div>

                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="mb-6 relative group">
                            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                Nexus Lean
                            </h1>
                        </div>
                        <div className="text-center space-y-1">
                            <h1 className="hidden">Nexus Lean</h1>
                            <p className="text-sm text-gray-400 font-medium tracking-wide">Continuous improvement</p>
                        </div>
                        <div className="mt-6">
                            <span className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] uppercase tracking-[0.2em] font-bold text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                Be Lean • Be Efficient
                            </span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignUp && !isMagicLink && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                    Nombre Completo
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-[#0f172a]/50 border border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                        placeholder="Ej. Juan Pérez"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0f172a]/50 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3.5 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                                    placeholder="nombre@empresa.com"
                                    required
                                />
                            </div>
                        </div>

                        {!isMagicLink && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Contraseña
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setMessage('Contacte al administrador para restablecer su contraseña.')}
                                        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#0f172a]/50 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3.5 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 tracking-widest"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 animate-slide-in-down">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2 animate-slide-in-down">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full group bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed border border-white/10"
                        >
                            {authLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Procesando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-base">
                                        {isSignUp ? 'Crear Cuenta' : 'Ingresar al Sistema'}
                                    </span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="mt-8 pt-6 border-t border-white/5 space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                {isSignUp ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
                                <button
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition-all"
                                >
                                    {isSignUp ? 'Inicia sesión' : 'Solicitar acceso'}
                                </button>
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/offline/5s-cards')}
                                className="w-full flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-[#1e293b] text-gray-400 hover:text-gray-200 py-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-300 text-sm font-medium group"
                            >
                                <WifiOff className="h-4 w-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                Tarjeta 5S (Offline)
                            </button>
                            <button
                                onClick={() => navigate('/offline/5s-audits')}
                                className="w-full flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-[#1e293b] text-gray-400 hover:text-gray-200 py-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-300 text-sm font-medium group"
                            >
                                <FileCheck className="h-4 w-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                Auditoría 5S (Offline)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-600 font-medium tracking-wide">
                        © 2026 Nexus System. v1.0.0
                    </p>
                </div>
            </div>

            <DebugBanner />
        </div>
    );
}
