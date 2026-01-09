import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { consultWithCompanyData, generatePlantAnalysis } from '../services/geminiService';
import {
    Send, Bot, Loader, Sparkles, BarChart2, MessageSquare,
    AlertTriangle, CheckCircle, Info, ChevronRight, BookOpen, AlertCircle, RefreshCw, ChevronDown, Target, TrendingUp, Award
} from 'lucide-react';

// --- Types ---
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AnalysisReport {
    executive_summary: string;
    kpis: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }[];
    progress_evaluation: {
        status: 'BUENO' | 'REGULAR' | 'CRITICO';
        points: string[];
    };
    alerts: { level: 'critical' | 'warning' | 'info'; message: string; context: string }[];
    next_steps: { title: string; description: string; priority: 'ALTA' | 'MEDIA' | 'BAJA' }[];
}

// --- Coaching Best Practices Data ---
const coachingPractices = [
    {
        category: '5S - Organización del Lugar de Trabajo',
        icon: Target,
        practices: [
            { title: 'Seiri (Clasificar)', description: 'Elimina lo innecesario del área de trabajo. Usa etiquetas rojas para identificar items a descartar.' },
            { title: 'Seiton (Ordenar)', description: 'Organiza los elementos necesarios. "Un lugar para cada cosa y cada cosa en su lugar".' },
            { title: 'Seiso (Limpiar)', description: 'Mantén el área limpia diariamente. La limpieza es inspección.' },
            { title: 'Seiketsu (Estandarizar)', description: 'Crea estándares visuales para mantener los primeros 3S.' },
            { title: 'Shitsuke (Disciplina)', description: 'Convierte las 5S en un hábito. Auditorías regulares y reconocimiento.' }
        ]
    },
    {
        category: 'Quick Wins - Mejoras Rápidas',
        icon: TrendingUp,
        practices: [
            { title: 'Regla de las 48 horas', description: 'Las mejoras rápidas deben implementarse en máximo 48 horas para mantener el momentum.' },
            { title: 'Bajo costo, alto impacto', description: 'Prioriza mejoras que no requieran inversión significativa pero generen valor visible.' },
            { title: 'Documentar el antes/después', description: 'Fotografía el estado inicial y final para demostrar el impacto.' },
            { title: 'Involucrar al operador', description: 'Las mejores ideas vienen de quienes realizan el trabajo diariamente.' }
        ]
    },
    {
        category: 'A3 - Resolución de Problemas',
        icon: Award,
        practices: [
            { title: 'Definir claramente el problema', description: 'Un problema bien definido está 50% resuelto. Usa datos, no suposiciones.' },
            { title: '5 Porqués', description: 'Pregunta "¿Por qué?" al menos 5 veces para llegar a la causa raíz.' },
            { title: 'Diagrama de Ishikawa', description: 'Analiza causas en las 6M: Máquina, Método, Material, Mano de obra, Medición, Medio ambiente.' },
            { title: 'PDCA riguroso', description: 'Planificar-Hacer-Verificar-Actuar. No saltes etapas, especialmente la verificación.' },
            { title: 'Un problema a la vez', description: 'Evita abordar múltiples problemas simultáneamente. Enfoque es clave.' }
        ]
    }
];

export default function Consultor() {
    const { selectedCompanyId } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
    const [isThinking, setIsThinking] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [input, setInput] = useState('');
    const [isCoachingExpanded, setIsCoachingExpanded] = useState(false);

    // Data State
    const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [contextData, setContextData] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Analysis Generation Handler
    const handleGenerateAnalysis = async (contextToUse: string = contextData) => {
        if (!contextToUse) return;

        try {
            setIsAnalyzing(true);
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const report = await generatePlantAnalysis(contextToUse, apiKey);
            setAnalysis(report);

            if (activeTab === 'chat') {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'He actualizado el análisis con los datos más recientes de la planta.',
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('Error generating analysis:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Initial Data & Analysis Fetch
    useEffect(() => {
        const loadModule = async () => {
            if (!selectedCompanyId) return;

            try {
                const [qw, fiveS, a3, profiles] = await Promise.all([
                    supabase.from('quick_wins').select('*').eq('company_id', selectedCompanyId),
                    supabase.from('five_s_cards').select('*').eq('company_id', selectedCompanyId),
                    supabase.from('a3_projects').select('*').eq('company_id', selectedCompanyId),
                    supabase.from('profiles').select('id, role').eq('company_id', selectedCompanyId)
                ]);

                const context = JSON.stringify({
                    company_id: selectedCompanyId,
                    date: new Date().toISOString(),
                    quick_wins: qw.data || [],
                    five_s_cards: fiveS.data || [],
                    a3_projects: a3.data || [],
                    team_stats: { count: (profiles.data || []).length },
                    summary: {
                        qw_count: (qw.data || []).length,
                        five_s_count: (fiveS.data || []).length,
                        a3_count: (a3.data || []).length
                    }
                });

                setContextData(context);

                if (!analysis) {
                    await handleGenerateAnalysis(context);
                }

                if (messages.length === 0) {
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: 'He analizado tus datos. Puedes ver el reporte detallado en la pestaña "Análisis" o hacerme preguntas específicas aquí.',
                        timestamp: new Date()
                    }]);
                }

            } catch (error) {
                console.error('Error loading consultant:', error);
            }
        };

        loadModule();
    }, [selectedCompanyId]);

    // Chat Logic
    const handleSendMessage = async () => {
        if (!input.trim() || isThinking) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const response = await consultWithCompanyData(userMsg.content, contextData, apiKey);

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsThinking(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    // Helpers for Analysis UI
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'BUENO': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'REGULAR': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'CRITICO': return 'text-rose-600 bg-rose-50 border-rose-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getAlertColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-rose-50 border-rose-100 text-rose-800';
            case 'warning': return 'bg-amber-50 border-amber-100 text-amber-800';
            case 'info': return 'bg-blue-50 border-blue-100 text-blue-800';
            default: return 'bg-slate-50 border-slate-100';
        }
    };

    const getAlertIcon = (level: string) => {
        switch (level) {
            case 'critical': return <AlertCircle className="text-rose-500 shrink-0" size={18} />;
            case 'warning': return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
            case 'info': return <Info className="text-blue-500 shrink-0" size={18} />;
            default: return <Info size={18} />;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const colors = priority === 'ALTA' ? 'bg-rose-100 text-rose-700' :
            priority === 'MEDIA' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors}`}>{priority}</span>
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-blue-400" size={20} />
                        Consultor IA
                    </h1>
                    <p className="text-xs text-slate-400">Analista de Mejora Continua</p>
                </div>

                <div className="flex items-center gap-4">
                    {isAnalyzing ? (
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-xs text-blue-300 animate-pulse border border-blue-500/30">
                            <RefreshCw size={14} className="animate-spin" />
                            Analizando datos...
                        </div>
                    ) : (
                        <button
                            onClick={() => handleGenerateAnalysis()}
                            className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 font-medium text-sm"
                        >
                            <div className="absolute inset-0 w-3 bg-white/30 skew-x-[-20deg] group-hover:animate-[shine_1.5s_infinite]" style={{ left: '-20%' }}></div>
                            <Sparkles size={16} className="text-yellow-300" />
                            Generar Análisis
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 sticky top-[68px] z-20">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('analysis')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart2 size={18} /> ANÁLISIS
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <MessageSquare size={18} /> CHAT ASISTENTE
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto">

                {/* --- ANALYSIS VIEW --- */}
                {activeTab === 'analysis' && (
                    <>
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <Loader size={40} className="text-blue-600 animate-spin" />
                                <p className="text-slate-500 font-medium animate-pulse">Generando diagnóstico de planta...</p>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* Executive Summary - More compact */}
                                <div className="bg-white border-l-4 border-blue-600 rounded-lg p-4 shadow-sm">
                                    <p className="text-slate-700 text-base italic leading-relaxed">"{analysis.executive_summary}"</p>
                                </div>

                                {/* KPIs - Better grid utilization */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {analysis.kpis.map((kpi, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px]">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide line-clamp-2">{kpi.label}</span>
                                            <div className="flex items-end justify-between mt-2">
                                                <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>
                                                {kpi.trend === 'up' && <span className="text-emerald-500 text-lg">↑</span>}
                                                {kpi.trend === 'down' && <span className="text-rose-500 text-lg">↓</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Two Column Layout for Progress & Alerts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Progress Evaluation */}
                                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                            <BarChart2 size={16} className="text-slate-400" />
                                            <h3 className="font-bold text-slate-700 uppercase text-xs">Evaluación de Progreso</h3>
                                        </div>
                                        <div className="p-4">
                                            <div className="mb-3">
                                                <span className={`px-3 py-1 rounded text-xs font-bold border ${getStatusColor(analysis.progress_evaluation.status)}`}>
                                                    ESTADO: {analysis.progress_evaluation.status}
                                                </span>
                                            </div>
                                            <ul className="space-y-2">
                                                {analysis.progress_evaluation.points.map((point, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                                                        <CheckCircle size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                                        <span className="line-clamp-2">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Alerts - Compact */}
                                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                            <AlertTriangle size={16} className="text-slate-400" />
                                            <h3 className="font-bold text-slate-700 uppercase text-xs">Alertas</h3>
                                        </div>
                                        <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
                                            {analysis.alerts.map((alert, idx) => (
                                                <div key={idx} className={`p-3 rounded-lg border flex gap-2 items-start ${getAlertColor(alert.level)}`}>
                                                    {getAlertIcon(alert.level)}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium line-clamp-1">{alert.message}</p>
                                                        <p className="text-xs opacity-75 mt-0.5 line-clamp-1">{alert.context}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Next Steps - Compact */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                        <Sparkles size={16} className="text-slate-400" />
                                        <h3 className="font-bold text-slate-700 uppercase text-xs">Próximos Pasos Sugeridos</h3>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {analysis.next_steps.map((step, idx) => (
                                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-slate-800 text-sm">{step.title}</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{step.description}</p>
                                                    </div>
                                                </div>
                                                {getPriorityBadge(step.priority)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coaching Section - Expandable with Content */}
                                <div className="border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setIsCoachingExpanded(!isCoachingExpanded)}
                                        className="w-full px-4 py-4 flex justify-between items-center hover:bg-cyan-100/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm">
                                            <BookOpen size={18} />
                                            Coaching en Buenas Prácticas Lean
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            className={`text-cyan-600 transition-transform duration-300 ${isCoachingExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* Coaching Content */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCoachingExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-4 pb-4 space-y-4">
                                            {coachingPractices.map((section, sectionIdx) => (
                                                <div key={sectionIdx} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center gap-2">
                                                        <section.icon size={16} className="text-cyan-600" />
                                                        <h4 className="font-bold text-slate-700 text-sm">{section.category}</h4>
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        {section.practices.map((practice, practiceIdx) => (
                                                            <div key={practiceIdx} className="p-3 bg-slate-50 rounded-lg hover:bg-cyan-50 transition-colors">
                                                                <div className="flex items-start gap-2">
                                                                    <ChevronRight size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                                                                    <div>
                                                                        <h5 className="font-semibold text-slate-700 text-sm">{practice.title}</h5>
                                                                        <p className="text-xs text-slate-500 mt-1">{practice.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : null}
                    </>
                )}

                {/* --- CHAT VIEW --- */}
                {activeTab === 'chat' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                                            <Bot size={16} />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                        <Bot size={16} className="text-slate-500" />
                                    </div>
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                                        <Loader size={16} className="text-blue-500 animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Profundiza sobre algún punto del análisis..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm"
                                    disabled={isThinking}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!input.trim() || isThinking}
                                    className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
