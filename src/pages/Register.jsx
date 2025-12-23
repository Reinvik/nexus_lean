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

        // Auto-assign company based on email domain
        const lowerEmail = formData.email.toLowerCase().trim();
        const emailDomain = lowerEmail.split('@')[1];

        // Wait for companies to load
        if (!companies || companies.length === 0) {
            setError('Cargando empresas... Por favor intenta de nuevo en un momento.');
            setIsLoading(false);
            return;
        }

        // Find company by domain (flexible matching - trim and lowercase both sides)
        let assignedCompany = companies.find(c => {
            const companyDomain = (c.domain || '').toLowerCase().trim();
            return companyDomain === emailDomain;
        });
        let companyId = assignedCompany ? assignedCompany.id : null;

        // Allow specific admin email to bypass domain check
        if (!assignedCompany && lowerEmail !== 'ariel.mellag@gmail.com') {
            setError(`El dominio "${emailDomain}" no pertenece a una empresa registrada. Contacta al administrador.`);
            setIsLoading(false);
            return;
        }

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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

                {/* Grid Overlay for texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            <div className="w-full max-w-lg p-8 relative z-10 animate-fade-in-up">
                {/* Glass Card */}
                <div className="glass-panel p-8 sm:p-10 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl relative overflow-hidden group">

                    {/* Top decoration line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center mb-10 relative">
                        <div className="inline-block relative">
                            <h1 className="relative text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-200 tracking-tight mb-2">
                                Registro de Usuario
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">
                            Únete a Nexus BE LEAN
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

                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center animate-fade-in-up">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-1 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-cyan-400 transition-colors">Nombre Completo</label>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="Juan Pérez"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-cyan-400 transition-colors">Correo de Empresa</label>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="nombre@empresa.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 px-1 font-medium">Solo correos corporativos autorizados.</p>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-cyan-400 transition-colors">Contraseña</label>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-1 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1 group-focus-within:text-cyan-400 transition-colors">Confirmar Contraseña</label>
                            <div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl py-3 pl-10 pr-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300 shadow-inner"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transform transition-all duration-300 hover:shadow-cyan-500/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Registrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Registrarse</span>
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
                            ¿Ya tienes una cuenta?{' '}
                            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline decoration-cyan-400/30 underline-offset-4">
                                Inicia sesión
                            </Link>
                        </p>
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

export default RegisterPage;
