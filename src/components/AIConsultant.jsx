import { useState, useEffect, useRef } from 'react';
import {
    Brain,
    RefreshCw,
    AlertTriangle,
    Lightbulb,
    Target,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    ChevronUp,
    Sparkles,
    BookOpen,
    CheckCircle,
    AlertCircle,
    Info,
    MessageSquare,
    Send,
    ArrowRightCircle,
    ListTodo,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { prepareCompanyData, generateAIInsight, sendChatMessage, shouldGenerateNewInsight } from '../services/geminiService';

const AIConsultant = ({ data, companyName, apiKey, fullScreen = false, isSyncing = false, fetchError = null }) => {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(true);
    const [showCoaching, setShowCoaching] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    // Chat State
    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'chat'
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Load cached insight on mount
    // Load cached insight on mount
    useEffect(() => {
        const cached = localStorage.getItem(`ai_insight_${companyName || 'default'}`);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Only set if valid
                if (parsed && parsed.resumenEjecutivo && parsed.resumenEjecutivo.trim().length > 0) {
                    setInsight(parsed);
                }
            } catch (e) {
                console.error('Error parsing cached insight:', e);
            }
        }
    }, [companyName]);

    // Auto-scroll chat
    useEffect(() => {
        if (activeTab === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, activeTab]);

    const generateInsight = async () => {
        if (!apiKey) {
            setError('Configura VITE_GEMINI_API_KEY en las variables de entorno');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const preparedData = prepareCompanyData(data, companyName);
            const newInsight = await generateAIInsight(preparedData, companyName, apiKey);

            setInsight(newInsight);

            try {
                localStorage.setItem(`ai_insight_${companyName || 'default'}`, JSON.stringify(newInsight));
            } catch (e) {
                console.warn('Could not save insight to localStorage (Quota Exceeded?):', e);
            }

            // Generate initial chat greeting if empty
            if (chatHistory.length === 0) {
                setChatHistory([{
                    role: 'model',
                    content: `Hola, he analizado los datos de ${companyName || 'la empresa'}. Veo ${preparedData?.a3?.total || 0} proyectos A3 activos y ${preparedData?.fiveS?.pending + preparedData?.fiveS?.inProcess || 0} tarjetas 5S pendientes. ¿En qué puedo profundizar?`
                }]);
            }
        } catch (err) {
            console.error('Error generating insight:', err);
            setError(err.message || 'Error al generar análisis');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || chatLoading) return;

        const newUserMsg = { role: 'user', content: inputMessage };
        const newHistory = [...chatHistory, newUserMsg];

        setChatHistory(newHistory);
        setInputMessage('');
        setChatLoading(true);

        try {
            const preparedData = prepareCompanyData(data, companyName);
            const response = await sendChatMessage(newHistory, inputMessage, preparedData, companyName, apiKey);

            setChatHistory(prev => [...prev, { role: 'model', content: response }]);
        } catch (err) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model', content: "Lo siento, hubo un error al procesar tu mensaje." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'bueno': return 'bg-emerald-500';
            case 'regular': return 'bg-amber-500';
            case 'critico': return 'bg-red-500';
            default: return 'bg-slate-400';
        }
    };

    const getAlertIcon = (tipo) => {
        switch (tipo) {
            case 'critica': return <AlertCircle size={14} className="text-red-500" />;
            case 'advertencia': return <AlertTriangle size={14} className="text-amber-500" />;
            default: return <Info size={14} className="text-blue-500" />;
        }
    };

    const getAlertBg = (tipo) => {
        switch (tipo) {
            case 'critica': return 'bg-red-50 border-red-100';
            case 'advertencia': return 'bg-amber-50 border-amber-100';
            default: return 'bg-blue-50 border-blue-100';
        }
    };

    const getTrendIcon = (tendencia) => {
        switch (tendencia) {
            case 'up': return <TrendingUp size={16} className="text-emerald-500" />;
            case 'down': return <TrendingDown size={16} className="text-red-500" />;
            default: return <Minus size={16} className="text-slate-400" />;
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // No API Key - Show setup message
    if (!apiKey) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-cyan-500/20 rounded-xl">
                        <Brain size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Consultor IA</h3>
                        <p className="text-slate-400 text-xs">Mejora Continua</p>
                    </div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                    <p className="text-sm text-slate-300 mb-3">
                        Para activar el análisis inteligente, configura tu API Key de Gemini:
                    </p>
                    <code className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400">
                        VITE_GEMINI_API_KEY=tu_api_key
                    </code>
                </div>
            </div>
        );
    }

    const containerClasses = isMaximized
        ? "fixed inset-0 z-50 bg-white h-screen w-screen rounded-none flex flex-col"
        : `bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col ${fullScreen ? 'h-full' : 'max-h-[800px]'}`;

    // In maximized mode, ensure it's always expanded
    const isExpanded = isMaximized ? true : expanded;

    return (
        <div className={containerClasses} style={isMaximized ? { margin: 0 } : {}}>
            {/* Header */}
            <div
                className="bg-gradient-to-r from-slate-800 via-slate-800 to-cyan-900 p-0 flex flex-col shrink-0"
            >
                <div
                    className={`p-3 lg:p-4 flex items-center justify-between ${!fullScreen && !isMaximized ? 'cursor-pointer' : ''}`}
                    onClick={() => !fullScreen && !isMaximized && setExpanded(!expanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl shadow-lg shadow-cyan-500/30">
                            <Brain size={22} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                Consultor IA
                                <Sparkles size={14} className="text-cyan-400" />
                            </h3>
                            <p className="text-slate-400 text-xs">Análisis de Mejora Continua</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {insight?.generatedAt && (
                            <span className="text-[10px] text-slate-500 hidden sm:block text-right">
                                {formatDate(insight.generatedAt)} <br />
                                <span className="text-cyan-600 font-bold">
                                    {(data?.fiveS?.length || 0) + (data?.a3?.length || 0)} registros analizados
                                </span>
                            </span>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); generateInsight(); }}
                            disabled={loading || isSyncing || !!fetchError}
                            className={`p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isSyncing ? "Sincronizando historial completo..." : "Regenerar análisis"}
                        >
                            <RefreshCw size={16} className={`text-white ${loading || isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
                            title={isMaximized ? "Minimizar" : "Maximizar pantalla completa"}
                        >
                            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        {!isMaximized && (
                            <button className="p-1 text-slate-400">
                                {!fullScreen && (expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                {isExpanded && (
                    <div className="flex bg-slate-900/50 backdrop-blur-sm px-2 pt-2 gap-1 border-t border-white/5">
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'analysis'
                                ? 'bg-white text-slate-800'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                        >
                            <Target size={14} /> Análisis
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'chat'
                                ? 'bg-white text-slate-800'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                        >
                            <MessageSquare size={14} /> Chat Asistente
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative min-h-[400px]">

                    {/* LOADING OVERLAY - Always on top if loading, but allows content underneath */}
                    {loading && (
                        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300">
                            <div className="relative">
                                <Brain size={48} className="text-slate-300 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-600 font-bold animate-pulse">
                                {insight ? 'Actualizando análisis...' : 'Generando análisis inicial...'}
                            </p>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {error && !loading && (
                        <div className="p-6">
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">Error al generar análisis</p>
                                    <p className="text-xs text-red-600 mt-1">{error}</p>
                                    <button onClick={generateInsight} className="mt-2 text-xs font-bold text-red-600 hover:text-red-800">
                                        Reintentar →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NO INSIGHT */}
                    {!insight && !loading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <Brain size={48} className={`text-slate-200 mb-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                            <p className="text-slate-500 mb-4">
                                {isSyncing ? 'Sincronizando historial completo...' : 'No hay análisis generado aún'}
                            </p>
                            <button
                                onClick={generateInsight}
                                disabled={isSyncing}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                {isSyncing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                        Sincronizando...
                                    </>
                                ) : (
                                    'Generar Análisis IA'
                                )}
                            </button>
                        </div>
                    )}

                    {/* CONTENT - ANALYSIS TAB - Render if insight exists (even if loading) */}
                    {insight && !error && activeTab === 'analysis' && (
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">

                            {/* Executive Summary */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <p className="text-slate-700 text-sm leading-relaxed italic">
                                    &quot;{insight.resumenEjecutivo}&quot;
                                </p>
                            </div>

                            {/* Metric Highlight */}
                            {insight.metricaDestacada && (
                                <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {insight.metricaDestacada.nombre}
                                        </p>
                                        <p className="text-2xl font-black text-slate-800">{insight.metricaDestacada.valor}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        {getTrendIcon(insight.metricaDestacada.tendencia)}
                                    </div>
                                </div>
                            )}

                            {/* Progress Observations */}
                            {insight.evaluacionProgreso?.observaciones?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Target size={14} /> Evaluación de Progreso
                                    </h4>
                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(insight.evaluacionProgreso.estado)}`}></div>
                                            <span className="text-xs font-bold uppercase text-slate-600">Estado: {insight.evaluacionProgreso.estado}</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {insight.evaluacionProgreso.observaciones.map((obs, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <CheckCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                    {obs}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Alerts */}
                            {insight.alertas?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <AlertTriangle size={14} /> Alertas
                                    </h4>
                                    <div className="space-y-2">
                                        {insight.alertas.map((alerta, i) => (
                                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alerta.tipo)}`}>
                                                {getAlertIcon(alerta.tipo)}
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700">{alerta.mensaje}</p>
                                                    {alerta.proyecto && (
                                                        <p className="text-xs text-slate-500 mt-1">Proyecto: {alerta.proyecto}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Next Steps Section */}
                            {insight.proximosPasos?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <ListTodo size={14} /> Próximos Pasos Sugeridos
                                    </h4>
                                    <div className="space-y-3">
                                        {insight.proximosPasos.map((paso, i) => (
                                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-cyan-300 transition-colors group">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${paso.prioridad === 'alta' ? 'bg-red-100 text-red-600' : (paso.prioridad === 'media' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600')}`}>
                                                            <ArrowRightCircle size={16} />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition-colors">{paso.titulo}</h5>
                                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{paso.descripcion}</p>
                                                        </div>
                                                    </div>
                                                    {paso.prioridad && (
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${paso.prioridad === 'alta' ? 'bg-red-50 text-red-600 border border-red-100' : (paso.prioridad === 'media' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100')}`}>
                                                            {paso.prioridad}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coaching Section */}
                            {insight.coachingPracticas?.length > 0 && (
                                <div className="border border-cyan-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <button
                                        onClick={() => setShowCoaching(!showCoaching)}
                                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-white hover:from-cyan-100 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-bold text-cyan-800">
                                            <BookOpen size={16} />
                                            Coaching en Buenas Prácticas
                                        </span>
                                        {showCoaching ? <ChevronUp size={18} className="text-cyan-600" /> : <ChevronDown size={18} className="text-cyan-600" />}
                                    </button>

                                    {showCoaching && (
                                        <div className="p-4 space-y-4 animate-in fade-in duration-200">
                                            {insight.coachingPracticas.map((tip, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="p-1.5 bg-cyan-100 rounded-lg shrink-0">
                                                        <Lightbulb size={14} className="text-cyan-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{tip.tema}</p>
                                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tip.consejo}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Focus of the Day */}
                            {insight.enfoqueDelDia && (
                                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-4 text-white shadow-lg shadow-cyan-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Enfoque del Día</span>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{insight.enfoqueDelDia}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTENT - CHAT TAB - Render if insight exists (even if loading) */}
                    {insight && !error && activeTab === 'chat' && (
                        <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {chatHistory.length === 0 && (
                                    <div className="text-center py-12 px-6">
                                        <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-600">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h4 className="text-slate-800 font-bold mb-2">Asistente de Mejora Continua</h4>
                                        <p className="text-slate-500 text-sm">Pregúntame sobre tus Ishikawas, 5 Porqués o cómo mejorar tus KPIs.</p>
                                    </div>
                                )}

                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-cyan-600 text-white rounded-br-none'
                                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                            }`}>
                                            {/* Simple Markdown rendering could be added here if needed */}
                                            {msg.content.split('\n').map((line, i) => (
                                                <p key={i} className="mb-1 last:mb-0">{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
                                            <div className="flex gap-1.5">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef}></div>
                            </div>

                            {/* Chat Input */}
                            <div className="p-3 bg-white border-t border-slate-200">
                                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                                    <input
                                        type="text"
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm text-slate-800 placeholder-slate-400 transition-all"
                                        placeholder="Escribe tu pregunta sobre los datos..."
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        disabled={chatLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputMessage.trim() || chatLoading}
                                        className="absolute right-2 p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AIConsultant;
