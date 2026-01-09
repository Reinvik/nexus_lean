import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Newspaper, Bot, GraduationCap, ArrowRight } from 'lucide-react';

const NexusNetwork = () => {
    const navigate = useNavigate();

    const apps = [
        {
            id: 'belean',
            name: 'Nexus Be Lean V2',
            description: 'Plataforma integral de gestión Lean Manufacturing y mejora continua.',
            icon: <LayoutDashboard className="w-12 h-12 text-blue-400" />,
            action: () => navigate('/dashboard'),
            color: 'from-blue-600 to-cyan-500',
            status: 'Active',
            version: '2.0'
        },
        {
            id: 'news',
            name: 'Nexus News',
            description: 'Mantente al día con las últimas noticias y tendencias del ecosistema Nexus.',
            icon: <Newspaper className="w-12 h-12 text-purple-400" />,
            action: () => window.open('http://localhost:3000', '_blank'),
            color: 'from-purple-600 to-pink-500',
            status: 'Coming Soon',
            version: '1.0'
        },
        {
            id: 'jarvis',
            name: 'Nexus Jarvis',
            description: 'Asistente de IA avanzado para optimización y análisis de datos en tiempo real.',
            icon: <Bot className="w-12 h-12 text-emerald-400" />,
            action: () => console.log('Jarvis clicked'),
            color: 'from-emerald-600 to-green-500',
            status: 'Beta',
            version: '0.9'
        },
        {
            id: 'skill',
            name: 'Nexus Skill',
            description: 'Centro de capacitación y desarrollo de habilidades para la industria 4.0.',
            icon: <GraduationCap className="w-12 h-12 text-amber-400" />,
            action: () => window.open('http://localhost:5174', '_blank'),
            color: 'from-amber-600 to-orange-500',
            status: 'Development',
            version: '0.5'
        }
    ];

    return (
        <div className="min-h-screen bg-[#0f172a] text-white relative overflow-hidden font-sans selection:bg-cyan-500/30">

            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse animation-delay-2000" />
            </div>

            <div className="relative z-10 container mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-screen">

                {/* Header */}
                <header className="text-center mb-16 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span className="text-sm font-medium text-cyan-200/80 tracking-wide uppercase">Nexus Ecosystem</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Nexus Network
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Unificando la inteligencia operativa. Accede a todas las herramientas del ecosistema Nexus desde un solo lugar.
                    </p>
                </header>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
                    {apps.map((app, index) => (
                        <div
                            key={app.id}
                            onClick={app.action}
                            className="group relative h-[400px] cursor-pointer"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl blur-xl`} />

                            <div className="relative h-full bg-slate-900/40 border border-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col justify-between overflow-hidden transition-all duration-300 group-hover:transform group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-white/20">

                                {/* Decoration Circle */}
                                <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${app.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-all duration-500`} />

                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                                            {app.icon}
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${app.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-slate-700/50 text-slate-400 border-slate-600/30'
                                            }`}>
                                            {app.status}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-200 transition-colors">{app.name}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{app.description}</p>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                    <span className="text-xs font-mono text-slate-500">v{app.version}</span>
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                        Explorar
                                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="mt-20 text-center text-slate-500 text-sm animate-fade-in">
                    <p>© {new Date().getFullYear()} Nexus Network. All systems operational.</p>
                </footer>
            </div>
        </div>
    );
};

export default NexusNetwork;
