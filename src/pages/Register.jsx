import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const RegisterPage = () => {
    const { register, companies } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setIsLoading(false);
            return;
        }

        // Auto-assign company
        // Default to 'BeLean / Workshop Demo' ID if company lookup fails or list is empty
        const DEFAULT_COMPANY_ID = '529b0d1d-1513-4b90-b902-8db95d74407f';
        let companyId = DEFAULT_COMPANY_ID;

        // Try to find specific company if list is available (Optional)
        if (companies && companies.length > 0) {
            const lowerEmail = formData.email.toLowerCase().trim();
            const emailDomain = lowerEmail.split('@')[1];

            const assignedCompany = companies.find(c => {
                const companyDomain = (c.domain || '').toLowerCase().trim();
                return companyDomain === emailDomain;
            });

            if (assignedCompany) {
                companyId = assignedCompany.id;
            }
        }

        // Removed blocking check for companies loading
        // Removed domain restrictions - allowing all registrations to default company until changed by admin

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyId: companyId
        });

        if (result.success) {
            setSuccess(result.message);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } else {
            setError(result.message);
            setIsLoading(false);
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
                        Únete a la <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Revolución</span> <br />
                        Nexus.
                    </h1>

                    <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                        Crea tu cuenta corporativa y accede a herramientas de auditoría y gestión de clase mundial.
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
                        <h2 className="text-3xl font-bold text-white mb-2">Registro de Usuario</h2>
                        <p className="text-slate-400">Completa tus datos para solicitar acceso.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-shake">
                            <span className="mr-2">⚠️</span>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-fade-in-up">
                            <span className="mr-2">✅</span>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="Juan Pérez"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo de Empresa</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="nombre@empresa.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium text-right">Solo correos corporativos.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="••••••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                                    placeholder="••••••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-6"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Registrando...</span>
                                </>
                            ) : (
                                <>
                                    <span>REGISTRARSE</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-800/50">
                        <p className="text-slate-500 text-sm">
                            ¿Ya tienes una cuenta?{' '}
                            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
