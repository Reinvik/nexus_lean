import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

const ForgotPasswordPage = () => {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        // Simulate a small delay for better UX if needed, or just call directly
        // await new Promise(resolve => setTimeout(resolve, 500));

        const result = await resetPassword(email);

        setIsLoading(false);
        if (result.success) {
            setMessage(result.message);
        } else {
            setError(result.message);
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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 rounded-full"></div>
                            <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto relative" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">NEXUS LEAN <span className="text-cyan-400">ULTRA BLUE</span></span>
                    </div>
                </div>

                <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col justify-center">
                    <div className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-6 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        Enterprise Premium
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
                        Recupera tu <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Acceso</span> <br />
                        Seguro.
                    </h1>

                    <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                        Restablece tu contraseña y vuelve a gestionar tu operación con la máxima seguridad.
                    </p>

                    {/* Abstract Visualization */}
                    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-800/50 shadow-2xl bg-slate-900/50 backdrop-blur-xl group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5"></div>

                        <div className="absolute inset-0 flex items-center justify-center opacity-60">
                            <div className="absolute w-40 h-40 bg-cyan-500/20 rounded-full filter blur-xl animate-pulse"></div>
                            <div className="grid grid-cols-6 gap-4 transform rotate-12">
                                {[...Array(24)].map((_, i) => (
                                    <div key={i} className="w-1 h-1 bg-cyan-400 rounded-full animate-float" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500 font-medium">
                    © {new Date().getFullYear()} NEXUS LEAN ULTRA BLUE. ALL RIGHTS RESERVED.
                </div>
            </div>

            {/* Right Panel - Register Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-[#050B14]">
                {/* Mobile Background Effects */}
                <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl opacity-20"></div>
                </div>

                <div className="w-full max-w-[420px] relative z-10">
                    <div className="mb-8">
                        <div className="mb-6 lg:hidden text-center">
                            <img src="/nexus-logo.svg" alt="Nexus Logo" className="h-10 w-auto mx-auto mb-2" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Recuperar Contraseña</h2>
                        <p className="text-slate-400">Ingresa tu correo para recibir las instrucciones.</p>
                    </div>

                    {message && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-fade-in-up">
                            <span className="mr-2">✅</span>
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
                            <span className="mr-2">⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="tu@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <span>ENVIAR ENLACE</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-800/50">
                        <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors hover:translate-x-[-4px] duration-300">
                            <ArrowLeft size={16} /> Volver al Inicio de Sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
