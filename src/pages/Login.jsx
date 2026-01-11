import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, WifiOff, ClipboardCheck, User } from 'lucide-react';

const LEAN_QUOTES = [
    { text: "  Sin estándares no puede haber mejora.", author: "  Taiichi Ohno" },
    { text: "  La mejor herramienta es la que se usa en el Gemba, no en la oficina.", author: "  Shigeo Shingo" },
    { text: "  ¿Para qué sirve la velocidad si no vas por el camino correcto?", author: "  Masaaki Imai" },
    { text: "  Los datos son importantes, pero confío más en mis ojos.", author: "  Kiichiro Toyoda" },
    { text: "  La excelencia no es un acto, es un hábito.", author: "  Aristóteles (Kaizen)" },
    { text: "  Muda (desperdicio) es cualquier cosa que no agrega valor al cliente.", author: "  Lean Philosophy" }
];

const LoginPage = () => {
    const { login, user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('colaborador'); // Default to collaborator
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    // Rotate quotes
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentQuoteIndex((prev) => (prev + 1) % LEAN_QUOTES.length);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        // Note: Role is typically determined by the backend/user profile, 
        // but passing rememberMe if supported by auth service
        const result = await login(email, password, rememberMe);
        if (!result.success) {
            setError('Credenciales no reconocidas. Revisa tu estándar de acceso.');
            setIsLoggingIn(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#050B14] flex font-sans selection:bg-cyan-500/30 overflow-hidden">
            {/* Left Panel - Hero Section (Premium Display) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-[#050B14] via-[#0A1628] to-[#050B14] overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150"></div>
                    <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
                    <div className="absolute top-[20%] -right-[20%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-[10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex flex-col gap-1 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 rounded-full"></div>
                                <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto relative" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">NEXUS <span className="text-cyan-400">LEAN</span></span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col justify-center">
                    <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        Excelencia Operacional 4.0
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white leading-tight mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Ingeniería, Gemba e IA:</span> <br />
                        Donde la excelencia <br />
                        converge.
                    </h1>

                    <p className="text-slate-400 text-2xl font-medium leading-relaxed mb-8 max-w-2xl">
                        Bienvenido a Nexus Lean. Minimizamos el tiempo de reporte para maximizar la resolución en el Gemba. Seguimientos claros, datos en tiempo real y resultados contundentes.
                    </p>

                    {/* Rotating Lean Quotes - Left Panel */}
                    {/* Rotating Lean Quotes - Left Panel - Adjusted Height and Spacing */}
                    {/* Rotating Lean Quotes - Left Panel */}
                    <div className="relative h-40 w-full overflow-hidden mb-10">
                        {/* Custom shorter vertical line (approx 60% height) */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-28 w-1 bg-cyan-500/50"></div>
                        {LEAN_QUOTES.map((quote, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 flex flex-col justify-center pl-16 transition-all duration-1000 transform ${index === currentQuoteIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                                    }`}
                            >
                                <p className="text-slate-300 italic text-lg leading-relaxed">"{quote.text}"</p>
                                <p className="text-cyan-500 text-base font-bold mt-4">— {quote.author}</p>
                            </div>
                        ))}
                    </div>


                    {/* Abstract Visualization */}
                    <div className="relative w-full h-96 overflow-hidden bg-transparent group">
                        <div className="absolute inset-0 bg-transparent"></div>

                        {/* Animated particles mockup */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-60">
                            <div className="absolute w-64 h-64 bg-cyan-500/20 rounded-full filter blur-xl animate-pulse"></div>
                            <div className="grid grid-cols-6 gap-8 transform rotate-12">
                                {[...Array(24)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-float" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute bottom-24 left-4 flex items-center gap-2 text-xs font-medium text-cyan-300/80">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                            Motor de IA Nexus: Calibrado y Activo
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500 font-medium">
                    © {new Date().getFullYear()} NEXUS ENTERPRISE. ALL RIGHTS RESERVED.
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#050B14]">
                {/* Mobile Background Effects */}
                <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl opacity-20"></div>
                </div>

                <div className="w-full max-w-[420px] relative z-10">
                    <div className="mb-10 lg:hidden text-center">
                        <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-12 w-auto mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">Nexus Lean</h2>
                        <p className="text-cyan-500 text-sm font-medium tracking-widest uppercase">Enterprise</p>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Bienvenido al <br /> Ecosistema Nexus</h2>
                        <p className="text-slate-400">Centro de comando para la Excelencia Operacional 4.0.</p>
                    </div>

                    {/* Role Tabs */}
                    <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl mb-8 border border-slate-800">
                        <button
                            onClick={() => setRole('admin')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${role === 'admin'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <ClipboardCheck size={16} />
                            <span>Administrador</span>
                        </button>
                        <button
                            onClick={() => setRole('colaborador')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${role === 'colaborador'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <User size={16} />
                            <span>Colaborador</span>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
                            <span className="mr-2">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CORREO CORPORATIVO</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="usuario@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CLAVE DE ACCESO</label>
                                <Link to="/forgot-password" className="text-xs text-cyan-500 hover:text-cyan-400 font-bold transition-colors">
                                    ¿OLVIDASTE TU CLAVE?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-offset-slate-900 focus:ring-cyan-500/30 accent-cyan-500"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                                Recordar mi sesión
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn || loading}
                            className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {isLoggingIn || loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Sincronizando con el Gemba...</span>
                                </>
                            ) : (
                                <>
                                    <span>INICIAR SESIÓN</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>




                    <div className="mt-4 relative flex py-5 items-center">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-600 text-xs font-bold uppercase tracking-widest">Modo Offline</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            to="/offline-access"
                            className="flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-slate-300 text-sm font-medium group"
                        >
                            <WifiOff size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="font-bold">Tarjeta 5S</span>
                        </Link>
                        <Link
                            to="/offline-audit"
                            className="flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-slate-300 text-sm font-medium group"
                        >
                            <WifiOff size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="font-bold">Auditoría 5S</span>
                        </Link>
                    </div>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 text-sm">
                            ¿No tienes acceso? <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">Solicita una invitación</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default LoginPage;
