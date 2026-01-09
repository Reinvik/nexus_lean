
import React, { useState, useEffect } from 'react';
import { AUDIT_SECTIONS } from '../../types/audit.types';
import { ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database.types';

interface AuditFormData {
    title: string;
    area: string;
    auditor: string;
    date: string;
    entries: Record<string, { question: string, score: number, comment: string }[]>;
    tempId?: string; // For offline drafts
}

interface AuditFormProps {
    initialData?: AuditFormData;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    isSaving?: boolean;
}

export const AuditForm: React.FC<AuditFormProps> = ({ initialData, onSave, onCancel, isSaving = false }) => {
    const { user, selectedCompanyId } = useAuth();
    const [formData, setFormData] = useState<AuditFormData>({
        title: '',
        area: '',
        auditor: user?.user_metadata?.name || '',
        date: new Date().toISOString().split('T')[0],
        entries: {}, // Will initialize below
        ...initialData
    });
    const [expandedSection, setExpandedSection] = useState<string>('S1');
    const [companyUsers, setCompanyUsers] = useState<Profile[]>([]);

    useEffect(() => {
        if (!initialData) {
            // Initialize with default questions if new
            const entries: any = {};
            Object.keys(AUDIT_SECTIONS).forEach(section => {
                entries[section] = AUDIT_SECTIONS[section as keyof typeof AUDIT_SECTIONS].map(q => ({
                    question: q,
                    score: 0,
                    comment: ''
                }));
            });
            setFormData(prev => ({ ...prev, entries, auditor: user?.user_metadata?.full_name || user?.email || '' }));
        }
    }, [initialData, user]);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase.from('profiles').select('*');

            if (error) {
                console.error("Error fetching users:", error);
                return;
            }

            let filteredUsers = data || [];
            if (selectedCompanyId) {
                filteredUsers = filteredUsers.filter(u =>
                    u.company_id === selectedCompanyId || u.role === 'superadmin'
                );
            }
            setCompanyUsers(filteredUsers);
        };
        fetchUsers();
    }, [selectedCompanyId]);

    const handleEntryChange = (section: string, index: number, field: string, value: any) => {
        const newEntries = { ...formData.entries };
        newEntries[section][index] = { ...newEntries[section][index], [field]: value };
        setFormData({ ...formData, entries: newEntries });
    };

    const calculateScore = () => {
        let totalSum = 0;
        let totalCount = 0;
        Object.keys(formData.entries).forEach(section => {
            formData.entries[section].forEach(entry => {
                totalSum += Number(entry.score);
                totalCount += 1;
            });
        });
        return totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({ ...formData, total_score: calculateScore() });
    };

    const getSectionTitle = (s: string) => {
        switch (s) {
            case 'S1': return 'Seiri (Clasificar)';
            case 'S2': return 'Seiton (Ordenar)';
            case 'S3': return 'Seiso (Limpiar)';
            case 'S4': return 'Seiketsu (Estandarizar)';
            case 'S5': return 'Shitsuke (Disciplina)';
            default: return s;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Formulario */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Nueva Auditoría</h2>
                    <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Título / Referencia</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-900 placeholder:text-slate-400"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej: Auditoría Semanal Línea 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Área Auditada</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2.5 bg-white border border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-black font-medium placeholder:text-slate-500"
                            value={formData.area}
                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                            placeholder="Ej: Almacén, Producción, Oficinas..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1.5">Auditor Responsable</label>
                        <select
                            required
                            className="w-full p-2.5 bg-white border border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer text-black font-medium"
                            value={formData.auditor}
                            onChange={e => setFormData({ ...formData, auditor: e.target.value })}
                        >
                            <option value="">-- Seleccionar Auditor --</option>
                            {companyUsers.map(u => (
                                <option key={u.id} value={u.full_name || u.email || ''}>{u.full_name || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1.5">Fecha de Auditoría</label>
                        <input
                            type="date"
                            required
                            className="w-full p-2.5 bg-white border border-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-black font-medium"
                            value={formData.date || ''}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Secciones de Preguntas */}
            <div className="p-6 bg-white space-y-4">
                {Object.keys(formData.entries).sort().map(section => (
                    <div key={section} className="border border-slate-300 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
                        <button
                            type="button"
                            onClick={() => setExpandedSection(expandedSection === section ? '' : section)}
                            className={`w-full flex justify-between items-center p-4 text-left transition-colors ${expandedSection === section
                                ? 'bg-orange-50 text-orange-900 border-b border-orange-100'
                                : 'bg-white text-black hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-bold text-lg flex items-center gap-3">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black border ${expandedSection === section ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                    {section}
                                </span>
                                {getSectionTitle(section)}
                            </span>
                            {expandedSection === section ? <ChevronUp className="text-orange-600 stroke-[3px]" /> : <ChevronDown className="text-slate-500 stroke-[3px]" />}
                        </button>

                        {expandedSection === section && (
                            <div className="p-4 sm:p-6 bg-white border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300 divide-y divide-slate-200">
                                {formData.entries[section].map((entry, idx) => (
                                    <div key={idx} className="py-6 first:pt-0 last:pb-0">
                                        <div className="mb-4">
                                            <span className="inline-block px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-bold mb-2 border border-slate-300">Pregunta {idx + 1}</span>
                                            <p className="text-black font-bold text-lg leading-relaxed">{entry.question}</p>
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-6">
                                            <div className="flex-1">
                                                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Puntaje (0 - 5)</label>
                                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                                    {[0, 1, 2, 3, 4, 5].map(score => (
                                                        <button
                                                            key={score}
                                                            type="button"
                                                            onClick={() => handleEntryChange(section, idx, 'score', score)}
                                                            className={`
                                                                w-12 h-12 rounded-xl font-black text-lg transition-all duration-200 flex items-center justify-center border-2
                                                                ${Number(entry.score) === score
                                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/30 scale-105 ring-2 ring-orange-500 ring-offset-2'
                                                                    : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700'
                                                                }
                                                            `}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="mt-2 flex justify-between text-xs text-slate-500 font-bold px-1">
                                                    <span>Malo</span>
                                                    <span>Excelente</span>
                                                </div>
                                            </div>

                                            <div className="flex-[1.5]">
                                                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Observaciones / Hallazgos</label>
                                                <textarea
                                                    className="w-full p-3 bg-white border border-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-[100px] text-black font-medium placeholder:text-slate-500"
                                                    value={entry.comment}
                                                    onChange={e => handleEntryChange(section, idx, 'comment', e.target.value)}
                                                    placeholder="Describe los hallazgos encontrados..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-sm bg-slate-50/90">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition-all duration-200 shadow-sm hover:shadow"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Guardar Auditoría
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};
