import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, WifiOff, ClipboardCheck } from 'lucide-react';

const LoginPage = () => {
    const { login, user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        const result = await login(email, password);
        if (!result.success) {
            setError(result.message);
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

                {/* Grid Overlay for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10 animate-fade-in-up">
                {/* Glass Card */}
                <div className="glass-panel p-8 sm:p-10 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl relative overflow-hidden group">

                    {/* Top decoration line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center mb-10 relative">
                        <div className="inline-block relative">
                            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                            <h1 className="relative text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-200 tracking-tight mb-2">
                                Nexus
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                            Be Lean • Be Efficient
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-cyan-400 transition-colors">Correo Electrónico</label>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="nombre@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1 group">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-focus-within:text-cyan-400 transition-colors">Contraseña</label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors hover:underline decoration-blue-400/30 underline-offset-2"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn || loading}
                            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transform transition-all duration-300 hover:shadow-cyan-500/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoggingIn || loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Ingresando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ingresar al Sistema</span>
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>

                            {/* Shiny effect overlay */}
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm">
                            ¿No tienes una cuenta?{' '}
                            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline decoration-cyan-400/30 underline-offset-4">
                                Solicitar acceso
                            </Link>
                        </p>

                        <div className="mt-8 pt-6 border-t border-slate-700/50">
                            <div className="grid grid-cols-1 gap-3">
                                <Link
                                    to="/offline-access"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-white rounded-lg transition-all border border-slate-700/50 hover:border-slate-600"
                                >
                                    <WifiOff size={16} />
                                    Tarjeta 5S (Offline)
                                </Link>
                                <Link
                                    to="/offline-audit"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-white rounded-lg transition-all border border-slate-700/50 hover:border-slate-600"
                                >
                                    <ClipboardCheck size={16} />
                                    Auditoría 5S (Offline)
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer simple text */}
                <div className="mt-6 text-center">
                    <p className="text-slate-600 text-xs">
                        &copy; {new Date().getFullYear()} Nexus System. v1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
