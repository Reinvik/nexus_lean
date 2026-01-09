import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, WifiOff, Plus, Minus } from 'lucide-react';
import { db } from '../../lib/db';

// 5S Audit Questions
const AUDIT_SECTIONS = {
    S1: {
        name: 'Seiri (Clasificar)',
        questions: [
            '¿Se distinguen fácilmente los elementos necesarios de los innecesarios?',
            '¿Hay objetos personales fuera de las áreas designadas?',
            '¿Existen materiales o equipos obsoletos o dañados?',
            '¿Se han eliminado herramientas, plantillas o útiles innecesarios?',
            '¿Están claramente identificados los elementos necesarios?'
        ]
    },
    S2: {
        name: 'Seiton (Ordenar)',
        questions: [
            '¿Están claramente delimitadas las áreas de trabajo, pasillos y almacenaje?',
            '¿Cada objeto tiene un lugar asignado y está en su lugar?',
            '¿Las herramientas están ordenadas y almacenadas correctamente?',
            '¿Hay señales visuales para identificar ubicaciones?',
            '¿Los materiales son fáciles de localizar y acceder?'
        ]
    },
    S3: {
        name: 'Seiso (Limpiar)',
        questions: [
            '¿El área de trabajo está libre de polvo, suciedad y desperdicios?',
            '¿Los equipos y maquinaria están limpios y en buen estado?',
            '¿Existen fuentes de contaminación identificadas?',
            '¿Se realizan limpiezas programadas regularmente?',
            '¿Los contenedores de residuos están en buen estado y bien ubicados?'
        ]
    },
    S4: {
        name: 'Seiketsu (Estandarizar)',
        questions: [
            '¿Existen estándares visuales de orden y limpieza?',
            '¿Se siguen procedimientos escritos para mantener las 3 primeras S?',
            '¿Los tableros de información están actualizados?',
            '¿Se realizan auditorías 5S de forma regular?',
            '¿Hay evidencia de mejora continua en el área?'
        ]
    },
    S5: {
        name: 'Shitsuke (Disciplina)',
        questions: [
            '¿El personal usa correctamente el EPP requerido?',
            '¿Se respetan los horarios de pausa y limpieza?',
            '¿Los colaboradores participan activamente en las mejoras del área?',
            '¿Se corrigen desviaciones del estándar rápidamente?',
            '¿Hay cultura de respeto por las normas establecidas?'
        ]
    }
};

type SectionKey = keyof typeof AUDIT_SECTIONS;

interface AuditEntry {
    question: string;
    score: number;
    comment: string;
}

export default function OfflineAuditForm() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [area, setArea] = useState('');
    const [auditor, setAuditor] = useState('');
    const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);

    // Initialize entries with all questions at score 3 (neutral)
    const [entries, setEntries] = useState<Record<SectionKey, AuditEntry[]>>(() => {
        const initial: Record<string, AuditEntry[]> = {};
        (Object.keys(AUDIT_SECTIONS) as SectionKey[]).forEach(section => {
            initial[section] = AUDIT_SECTIONS[section].questions.map(q => ({
                question: q,
                score: 3,
                comment: ''
            }));
        });
        return initial as Record<SectionKey, AuditEntry[]>;
    });

    const [expandedSection, setExpandedSection] = useState<SectionKey | null>('S1');

    const updateScore = (section: SectionKey, index: number, score: number) => {
        setEntries(prev => ({
            ...prev,
            [section]: prev[section].map((e, i) => i === index ? { ...e, score } : e)
        }));
    };

    const updateComment = (section: SectionKey, index: number, comment: string) => {
        setEntries(prev => ({
            ...prev,
            [section]: prev[section].map((e, i) => i === index ? { ...e, comment } : e)
        }));
    };

    const calculateSectionAverage = (section: SectionKey) => {
        const sectionEntries = entries[section];
        const sum = sectionEntries.reduce((acc, e) => acc + e.score, 0);
        return sum / sectionEntries.length;
    };

    const calculateTotalScore = () => {
        let totalSum = 0;
        let totalCount = 0;
        (Object.keys(entries) as SectionKey[]).forEach(section => {
            entries[section].forEach(e => {
                totalSum += e.score;
                totalCount++;
            });
        });
        return totalCount > 0 ? totalSum / totalCount : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!area.trim() || !auditor.trim()) {
            alert('Por favor completa los campos requeridos (Área y Auditor)');
            return;
        }

        setLoading(true);

        try {
            const totalScore = calculateTotalScore();

            // Create the audit in IndexedDB
            const auditId = await db.offline_audits.add({
                tempId: `offline_${Date.now()}`,
                title: title || `Auditoría ${area} - ${auditDate}`,
                area,
                auditor,
                audit_date: auditDate,
                total_score: totalScore,
                company_id: 'offline_placeholder',
                user_id: 'offline_user',
                status: 'pending_sync',
                created_at: new Date().toISOString()
            });

            // Save all entries
            const entriesToSave: any[] = [];
            (Object.keys(entries) as SectionKey[]).forEach(section => {
                entries[section].forEach(entry => {
                    entriesToSave.push({
                        audit_local_id: auditId,
                        section,
                        question: entry.question,
                        score: entry.score,
                        comment: entry.comment
                    });
                });
            });

            await db.offline_audit_entries.bulkAdd(entriesToSave);

            setSuccess(true);
            setTimeout(() => navigate('/offline'), 1500);

        } catch (error) {
            console.error("Error saving offline audit:", error);
            alert("Error al guardar localmente.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">¡Guardado Localmente!</h2>
                <p className="text-gray-500 mt-2">Tu auditoría ha sido guardada en el dispositivo.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => navigate('/offline')}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">
                    Nueva Auditoría 5S
                    <span className="text-orange-500 text-xs ml-1">(Offline)</span>
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3 text-xs text-orange-800">
                    <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Modo sin conexión. Datos guardados solo en este dispositivo.</p>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
                    <h3 className="font-bold text-gray-800">Información General</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Área *</label>
                            <input
                                required
                                value={area}
                                onChange={e => setArea(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Producción"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Auditor *</label>
                            <input
                                required
                                value={auditor}
                                onChange={e => setAuditor(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Tu nombre"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={auditDate}
                                onChange={e => setAuditDate(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Título (opcional)</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Auditoría Mensual"
                            />
                        </div>
                    </div>
                </div>

                {/* Score Overview */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-xs uppercase tracking-wide font-bold">Puntaje Total</p>
                            <p className="text-4xl font-black">{calculateTotalScore().toFixed(2)}</p>
                        </div>
                        <div className="text-right text-sm text-blue-100">
                            <p>Escala: 1-5</p>
                            <p>Promedio de 25 ítems</p>
                        </div>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                    {(Object.keys(AUDIT_SECTIONS) as SectionKey[]).map(sectionKey => (
                        <div key={sectionKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Section Header */}
                            <button
                                type="button"
                                onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-sm">
                                        {sectionKey}
                                    </span>
                                    <span className="font-medium text-gray-800">
                                        {AUDIT_SECTIONS[sectionKey].name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${calculateSectionAverage(sectionKey) >= 4 ? 'bg-green-100 text-green-700' :
                                        calculateSectionAverage(sectionKey) >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {calculateSectionAverage(sectionKey).toFixed(1)}
                                    </span>
                                    {expandedSection === sectionKey ? <Minus size={18} /> : <Plus size={18} />}
                                </div>
                            </button>

                            {/* Section Questions */}
                            {expandedSection === sectionKey && (
                                <div className="border-t border-gray-100 p-4 space-y-4">
                                    {entries[sectionKey].map((entry, index) => (
                                        <div key={index} className="space-y-2">
                                            <p className="text-sm text-gray-900">{entry.question}</p>

                                            {/* Score Buttons */}
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(score => (
                                                    <button
                                                        key={score}
                                                        type="button"
                                                        onClick={() => updateScore(sectionKey, index, score)}
                                                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${entry.score === score
                                                            ? 'bg-blue-600 text-white shadow-md scale-105'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {score}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Comment */}
                                            <input
                                                type="text"
                                                value={entry.comment}
                                                onChange={e => updateComment(sectionKey, index, e.target.value)}
                                                placeholder="Comentario (opcional)"
                                                className="w-full p-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-blue-700"
                    >
                        {loading ? (
                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Guardar Auditoría
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Tus datos están seguros en este dispositivo.
                    </p>
                </div>
            </form>
        </div>
    );
}
