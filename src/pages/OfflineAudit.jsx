import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';
import { offlineService } from '../services/offlineService';

const DEFAULT_QUESTIONS = {
    'S1': [
        '¿Se han eliminado los elementos innecesarios del área?',
        '¿Las herramientas y materiales están clasificados correctamente?',
        '¿Los pasillos y zonas de paso están libres de obstáculos?'
    ],
    'S2': [
        '¿Cada cosa tiene un lugar asignado y está en su lugar?',
        '¿Las ubicaciones están claramente etiquetadas?',
        '¿Es fácil encontrar y devolver las herramientas?'
    ],
    'S3': [
        '¿El área de trabajo está limpia y libre de polvo/aceite?',
        '¿Existen programas de limpieza visibles y se siguen?',
        '¿Los equipos de limpieza están disponibles y en buen estado?'
    ],
    'S4': [
        '¿Existen estándares visuales claros para el estado "normal"?',
        '¿Se utiliza código de colores para identificar anomalías?',
        '¿Todos conocen los procedimientos estándar?'
    ],
    'S5': [
        '¿Se realizan auditorías periódicas?',
        '¿Se respetan las normas establecidas consistentemente?',
        '¿Existe un plan de mejora continua activo?'
    ]
};

const OfflineAudit = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedSection, setExpandedSection] = useState('S1');


    // Initialize Form Data
    const [auditData, setAuditData] = useState(() => {
        const entries = {};
        Object.keys(DEFAULT_QUESTIONS).forEach(section => {
            entries[section] = DEFAULT_QUESTIONS[section].map(q => ({
                question: q,
                score: 0,
                comment: ''
            }));
        });
        return {
            title: '',
            area: '',
            auditor: '',
            date: new Date().toISOString().split('T')[0],
            entries: entries,
            companyId: ''
        };
    });

    const updateEntry = (section, index, field, value) => {
        const newEntries = { ...auditData.entries };
        newEntries[section][index][field] = value;
        setAuditData({ ...auditData, entries: newEntries });
    };

    const addQuestion = (section) => {
        const newEntries = { ...auditData.entries };
        newEntries[section].push({ question: 'Nueva pregunta', score: 0, comment: '' });
        setAuditData({ ...auditData, entries: newEntries });
    };

    const removeQuestion = (section, index) => {
        const newEntries = { ...auditData.entries };
        newEntries[section].splice(index, 1);
        setAuditData({ ...auditData, entries: newEntries });
    };

    const calculateScore = () => {
        let totalSum = 0;
        let totalCount = 0;
        Object.keys(auditData.entries).forEach(section => {
            auditData.entries[section].forEach(entry => {
                totalSum += parseInt(entry.score);
                totalCount += 1;
            });
        });
        return totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!auditData.area || !auditData.auditor) {
            alert("Área y Auditor son obligatorios.");
            return;
        }

        setLoading(true);
        try {
            const totalScore = calculateScore();
            const payload = {
                ...auditData,
                total_score: totalScore,
                company_id: auditData.companyId
            };

            await offlineService.saveAudit(payload);
            setSaved(true);
        } catch (error) {
            console.error('Error saving offline audit:', error);
            alert('Error al guardar la auditoría localmente.');
        } finally {
            setLoading(false);
        }
    };

    if (saved) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Auditoría Guardada Offline</h2>
                    <p className="text-slate-600 mb-8">
                        La auditoría ha sido guardada en este dispositivo.
                        Cuando tengas conexión, inicia sesión para sincronizarla.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Crear Otra Auditoría
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Volver al Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-20">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => navigate('/login')} className="text-slate-500 hover:text-slate-700">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <WifiOff size={20} className="text-amber-500" />
                        Auditoría 5S Offline
                    </h1>
                    <div className="w-6"></div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-6">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* General Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                        <h2 className="font-bold text-slate-900 mb-4">Información General</h2>



                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Título de Referencia</label>
                            <input
                                type="text"
                                className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-indigo-500 text-black placeholder-slate-500 font-medium"
                                value={auditData.title}
                                onChange={(e) => setAuditData({ ...auditData, title: e.target.value })}
                                placeholder="Ej. Auditoría Q1"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Área *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-indigo-500 text-black placeholder-slate-500 font-medium"
                                    value={auditData.area}
                                    onChange={(e) => setAuditData({ ...auditData, area: e.target.value })}
                                    placeholder="Ej. Producción"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Auditor *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-indigo-500 text-black placeholder-slate-500 font-medium"
                                    value={auditData.auditor}
                                    onChange={(e) => setAuditData({ ...auditData, auditor: e.target.value })}
                                    placeholder="Tu Nombre"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Fecha *</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:border-indigo-500 text-black font-medium"
                                value={auditData.date}
                                onChange={(e) => setAuditData({ ...auditData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Sections S1-S5 */}
                    <div className="space-y-4">
                        {['S1', 'S2', 'S3', 'S4', 'S5'].map((section) => (
                            <div key={section} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                                    className={`w-full flex justify-between items-center p-4 text-left transition-colors ${expandedSection === section ? 'bg-indigo-50 text-indigo-900' : 'bg-white text-slate-900 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="font-bold text-lg">{section}</span>
                                    {expandedSection === section ? <ChevronUp /> : <ChevronDown />}
                                </button>

                                {expandedSection === section && (
                                    <div className="p-4 bg-slate-50 space-y-4">
                                        {auditData.entries[section]?.map((entry, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-slate-600 uppercase font-bold mb-1 block">Pregunta</label>
                                                            <input
                                                                type="text"
                                                                className="w-full border-b border-slate-300 focus:border-indigo-500 py-1 text-sm text-black font-medium focus:outline-none"
                                                                value={entry.question}
                                                                onChange={(e) => updateEntry(section, idx, 'question', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="w-20">
                                                            <label className="text-xs text-slate-600 uppercase font-bold mb-1 block text-center">Nota</label>
                                                            <select
                                                                className="w-full bg-slate-100 border border-slate-200 rounded py-1 px-2 text-center font-bold text-indigo-800"
                                                                value={entry.score}
                                                                onChange={(e) => updateEntry(section, idx, 'score', parseInt(e.target.value))}
                                                            >
                                                                {[0, 1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Observaciones..."
                                                            className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-black placeholder-slate-500"
                                                            value={entry.comment || ''}
                                                            onChange={(e) => updateEntry(section, idx, 'comment', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuestion(section, idx)}
                                                            className="text-red-400 hover:text-red-600 p-2"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addQuestion(section)}
                                            className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-lg text-indigo-500 font-medium hover:bg-indigo-50 flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Agregar Criterio
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="fixed bottom-6 right-6 left-6 md:left-auto md:w-64 bg-indigo-600 text-white py-4 rounded-xl shadow-xl shadow-indigo-500/30 font-bold text-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed z-20"
                    >
                        {loading ? 'Guardando...' : <><Save /> Guardar Auditoría</>}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default OfflineAudit;
