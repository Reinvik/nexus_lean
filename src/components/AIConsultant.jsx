import { useState, useEffect } from 'react';
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
    Zap
} from 'lucide-react';
import { prepareCompanyData, generateAIInsight, shouldGenerateNewInsight } from '../services/geminiService';

const AIConsultant = ({ data, companyName, apiKey }) => {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(true);
    const [showCoaching, setShowCoaching] = useState(false);

    // Load cached insight on mount
    useEffect(() => {
        const cached = localStorage.getItem(`ai_insight_${companyName || 'default'}`);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setInsight(parsed);

                // Check if we should auto-generate new insight
                if (shouldGenerateNewInsight(parsed) && apiKey) {
                    generateInsight();
                }
            } catch (e) {
                console.error('Error parsing cached insight:', e);
            }
        }
    }, [companyName]);

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
            localStorage.setItem(`ai_insight_${companyName || 'default'}`, JSON.stringify(newInsight));
        } catch (err) {
            console.error('Error generating insight:', err);
            setError(err.message || 'Error al generar análisis');
        } finally {
            setLoading(false);
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

    return (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            {/* Header */}
            <div
                className="bg-gradient-to-r from-slate-800 via-slate-800 to-cyan-900 p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
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
                            <span className="text-[10px] text-slate-500 hidden sm:block">
                                Generado: {formatDate(insight.generatedAt)}
                            </span>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); generateInsight(); }}
                            disabled={loading}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Regenerar análisis"
                        >
                            <RefreshCw size={16} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="p-1 text-slate-400">
                            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    </div>
                </div>

                {/* Status Badge */}
                {insight?.evaluacionProgreso && (
                    <div className="mt-4 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(insight.evaluacionProgreso.estado)}`}></div>
                        <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Estado: {insight.evaluacionProgreso.estado}
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            {expanded && (
                <div className="p-5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="relative">
                                <Brain size={48} className="text-slate-200 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-500 font-medium">Analizando datos...</p>
                            <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Error al generar análisis</p>
                                <p className="text-xs text-red-600 mt-1">{error}</p>
                                <button
                                    onClick={generateInsight}
                                    className="mt-2 text-xs font-bold text-red-600 hover:text-red-800"
                                >
                                    Reintentar →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No Insight Yet */}
                    {!insight && !loading && !error && (
                        <div className="text-center py-8">
                            <Brain size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 mb-4">No hay análisis generado aún</p>
                            <button
                                onClick={generateInsight}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Generar Análisis IA
                            </button>
                        </div>
                    )}

                    {/* Insight Content */}
                    {insight && !loading && (
                        <>
                            {/* Executive Summary */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200">
                                <p className="text-slate-700 text-sm leading-relaxed">
                                    "{insight.resumenEjecutivo}"
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
                                    <ul className="space-y-2">
                                        {insight.evaluacionProgreso.observaciones.map((obs, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                <CheckCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                {obs}
                                            </li>
                                        ))}
                                    </ul>
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

                            {/* Coaching Section - Collapsible */}
                            {insight.coachingPracticas?.length > 0 && (
                                <div className="border border-cyan-100 rounded-xl overflow-hidden">
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
                                        <div className="p-4 space-y-4 bg-white animate-in fade-in duration-200">
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

                            {/* Recommended Actions */}
                            {insight.accionesRecomendadas?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Zap size={14} /> Acciones Recomendadas
                                    </h4>
                                    <div className="space-y-2">
                                        {insight.accionesRecomendadas.map((accion, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${accion.impacto === 'alto' ? 'bg-emerald-500' :
                                                        accion.impacto === 'medio' ? 'bg-amber-500' : 'bg-slate-400'
                                                    }`}>
                                                    {accion.prioridad}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700">{accion.accion}</p>
                                                    {accion.responsableSugerido && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Sugerido: <span className="font-medium">{accion.responsableSugerido}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Focus of the Day */}
                            {insight.enfoqueDelDia && (
                                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Enfoque del Día</span>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">{insight.enfoqueDelDia}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIConsultant;
