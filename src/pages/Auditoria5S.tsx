import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AuditCharts } from '../components/5s/AuditCharts';
import { AuditForm } from '../components/5s/AuditForm';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import type { Audit5S } from '../types/audit.types';
import { LoadingScreen } from '../components/LoadingScreen';

export default function Auditoria5S() {
    const { user, selectedCompanyId } = useAuth();
    const [audits, setAudits] = useState<Audit5S[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; auditId: string | null }>({
        isOpen: false,
        auditId: null
    });

    useEffect(() => {
        if (selectedCompanyId) { // Only fetch if we have a company ID
            fetchAudits();
        } else {
            setIsLoading(false); // Stop loading if no company selected (e.g. waiting for context)
        }
    }, [selectedCompanyId, selectedYear]);

    const fetchAudits = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('five_s_audits')
                .select(`
                    *,
                    audit_5s_entries (*)
                `)
                .eq('company_id', selectedCompanyId)
                .order('audit_date', { ascending: false });

            if (error) throw error;
            setAudits(data || []);
        } catch (error: any) {
            console.error('Error al cargar auditorías:', error);
            setError('Error al cargar las auditorías: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAudit = async (formData: any) => {
        setIsSaving(true);
        setError(null);
        try {
            // 1. Create Audit
            const { data: auditData, error: auditError } = await supabase
                .from('five_s_audits')
                .insert({
                    company_id: selectedCompanyId,
                    title: formData.title,
                    area: formData.area,
                    auditor: formData.auditor,
                    audit_date: formData.date,
                    total_score: formData.total_score
                })
                .select()
                .single();

            if (auditError) throw auditError;

            // 2. Create Entries
            const entriesToInsert: any[] = [];
            Object.keys(formData.entries).forEach(section => {
                formData.entries[section].forEach((entry: any) => {
                    entriesToInsert.push({
                        audit_id: auditData.id,
                        section, // S1, S2, etc.
                        question: entry.question,
                        score: entry.score,
                        comment: entry.comment
                    });
                });
            });

            const { error: entriesError } = await supabase
                .from('audit_5s_entries')
                .insert(entriesToInsert);

            if (entriesError) throw entriesError;

            await fetchAudits();
            setShowForm(false);
        } catch (error: any) {
            console.error('Error al guardar auditoría:', error);
            setError('Error al guardar la auditoría: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteConfirmation({ isOpen: true, auditId: id });
    };

    const handleDeleteAudit = async () => {
        const id = deleteConfirmation.auditId;
        if (!id) return;

        try {
            setError(null);
            console.log('Intentando eliminar auditoría con ID:', id);

            // Rely on ON DELETE CASCADE for entries
            const { error, data } = await supabase
                .from('five_s_audits')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error('Supabase error deleting audit:', error);
                throw error;
            }

            console.log('Auditoría eliminada:', data);

            await fetchAudits();
            setDeleteConfirmation({ isOpen: false, auditId: null });
        } catch (error: any) {
            console.error('Error al eliminar auditoría:', error);
            setError(`Error al eliminar auditoría: ${error.message || JSON.stringify(error)}`);
            setDeleteConfirmation({ isOpen: false, auditId: null });
        }
    };

    if (isLoading) return <LoadingScreen />;

    // Filter audits for the table (current year mainly, or show all?)
    const auditsForYear = audits.filter(a => parseInt(a.audit_date.split('-')[0]) === selectedYear);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r shadow-sm flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                {error}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-500">
                        <span className="sr-only">Cerrar</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Auditoría 5S</h1>
                    <p className="text-slate-500 font-medium">Evaluación y seguimiento de estándares de orden y limpieza</p>
                </div>
                <div className="flex gap-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-bold shadow-sm"
                    >
                        {[2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Auditoría
                    </button>
                </div>
            </div>

            {/* Modal de Nueva Auditoría */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl my-8">
                        <AuditForm
                            onSave={handleSaveAudit}
                            onCancel={() => setShowForm(false)}
                            isSaving={isSaving}
                        />
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AuditCharts audits={audits} year={selectedYear} />
            </div>

            {/* Historial de Auditorías */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-slate-400" size={20} />
                        Historial de Auditorías - {selectedYear}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <th className="p-4 border-b border-slate-200">Fecha</th>
                                <th className="p-4 border-b border-slate-200">Título / Ref</th>
                                <th className="p-4 border-b border-slate-200">Área</th>
                                <th className="p-4 border-b border-slate-200">Auditor</th>
                                <th className="p-4 border-b border-slate-200 text-center">Puntaje</th>
                                <th className="p-4 border-b border-slate-200 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {auditsForYear.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                                        No se encontraron auditorías para este año.
                                    </td>
                                </tr>
                            ) : (
                                auditsForYear.map((audit) => (
                                    <tr key={audit.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">{audit.audit_date}</td>
                                        <td className="p-4 text-slate-600">{audit.title || '-'}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                                {audit.area}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{audit.auditor}</td>
                                        <td className="p-4 text-center">
                                            <span className={`
                                                inline-block px-3 py-1 rounded-lg font-black text-white shadow-sm
                                                ${audit.total_score >= 4 ? 'bg-emerald-500 shadow-emerald-200' :
                                                    audit.total_score >= 3 ? 'bg-amber-500 shadow-amber-200' :
                                                        'bg-rose-500 shadow-rose-200'}
                                            `}>
                                                {Number(audit.total_score).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                {/* Edit functionality could be added here later */}
                                                <button
                                                    className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                    title="Editar (Próximamente)"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(audit.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Confirmación de Eliminación */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Confirmar Eliminación</h3>
                        <p className="text-slate-600 mb-6">
                            ¿Estás seguro de que deseas eliminar esta auditoría? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: false, auditId: null })}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAudit}
                                className="px-4 py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                            >
                                Eliminar Auditoría
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
