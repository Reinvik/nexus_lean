
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { db, type OfflineAudit } from '../lib/db';
import { AuditCharts } from '../components/5s/AuditCharts';
import { AuditForm } from '../components/5s/AuditForm';
import HeaderWithFilter from '../components/HeaderWithFilter';
import type { Audit5S } from '../types/audit.types';
import { Plus, UploadCloud, Edit, Trash2, Activity, Trophy, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import LoadingScreen from '../components/LoadingScreen';

export default function FiveSLogbook() {
    const { user, profile, selectedCompanyId } = useAuth();
    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
    const [audits, setAudits] = useState<Audit5S[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [editingAudit, setEditingAudit] = useState<any>(null);

    // Live Query for Offline Audits
    const offlineAudits = useLiveQuery(() => db.offline_audits.toArray()) || [];

    const fetchOnlineAudits = useCallback(async () => {
        if (!selectedCompanyId) return;
        setLoading(true);
        try {
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;

            const { data, error } = await supabase
                .from('audit_5s')
                .select(`
                    *,
                    audit_5s_entries (*)
                `)
                .eq('company_id', selectedCompanyId)
                .gte('audit_date', startDate)
                .lte('audit_date', endDate)
                .order('audit_date', { ascending: false });

            if (error) {
                console.error('Error details fetching audits:', error);
                throw error;
            }
            setAudits(data || []);
        } catch (error) {
            console.error('Error fetching audits:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCompanyId, selectedYear]);

    useEffect(() => {
        fetchOnlineAudits();
    }, [fetchOnlineAudits]);

    const handleSync = async () => {
        if (!selectedCompanyId) return;
        setIsSyncing(true);
        let successCount = 0;

        try {
            const drafts = await db.offline_audits.toArray();
            for (const draft of drafts) {
                try {
                    // 1. Insert Audit
                    const { data: insertedAudit, error: auditError } = await supabase
                        .from('audit_5s')
                        .insert([{
                            company_id: selectedCompanyId, // Ensure company_id is set
                            title: draft.title,
                            area: draft.area,
                            auditor: draft.auditor,
                            audit_date: draft.audit_date,
                            total_score: draft.total_score
                        }])
                        .select()
                        .single();

                    if (auditError) {
                        console.error('Error syncing individual audit:', auditError);
                        throw auditError;
                    }

                    // 2. Insert Entries
                    // Fetch entries from local DB
                    const entries = await db.offline_audit_entries.where('audit_local_id').equals(draft.id!).toArray();
                    const entriesToInsert = entries.map(e => ({
                        audit_id: insertedAudit.id,
                        section: e.section,
                        question: e.question,
                        score: e.score,
                        comment: e.comment
                    }));

                    if (entriesToInsert.length > 0) {
                        const { error: entriesError } = await supabase
                            .from('audit_5s_entries')
                            .insert(entriesToInsert);

                        if (entriesError) throw entriesError;
                    }

                    // 3. Delete from Local
                    if (draft.id) {
                        await db.offline_audits.delete(draft.id);
                        await db.offline_audit_entries.where('audit_local_id').equals(draft.id!).delete();
                    }
                    successCount++;

                } catch (err) {
                    console.error("Error syncing specific audit:", err);
                }
            }
            alert(`Sincronización completada: ${successCount} auditorías subidas.`);
            fetchOnlineAudits();
        } catch (error) {
            console.error("Sync error:", error);
            alert("Error en sincronización");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveAudit = async (data: any) => {
        try {
            setLoading(true);
            const isOffline = !navigator.onLine;

            const payload = {
                title: data.title,
                area: data.area,
                auditor: data.auditor,
                audit_date: data.date,
                total_score: data.total_score,
                company_id: selectedCompanyId || '', // Fallback
            };

            if (isOffline) {
                // SAVE LOCAL
                const auditId = await db.offline_audits.add({
                    tempId: `offline_${Date.now()}`,
                    ...payload,
                    user_id: user?.id || '',
                    status: 'pending_sync',
                    created_at: new Date().toISOString()
                });

                // Save Entries
                const entriesToSave: any[] = [];
                Object.keys(data.entries).forEach(section => {
                    data.entries[section].forEach((entry: any) => {
                        entriesToSave.push({
                            audit_local_id: auditId, // Use the proper number ID from Dexie
                            section,
                            question: entry.question,
                            score: entry.score,
                            comment: entry.comment
                        });
                    });
                });
                await db.offline_audit_entries.bulkAdd(entriesToSave);
                alert('Guardado en modo OFFLINE. Recuerda sincronizar cuando tengas internet.');

            } else {
                // SAVE ONLINE
                if (!selectedCompanyId) {
                    alert('Error: No company assigned');
                    return;
                }
                const { data: insertedAudit, error: auditError } = await supabase
                    .from('audit_5s')
                    .insert([{ ...payload, company_id: selectedCompanyId }])
                    .select()
                    .single();

                if (auditError) {
                    console.error('Supabase Error saving Audit Header:', auditError);
                    throw auditError;
                }

                const entriesToInsert: any[] = [];
                Object.keys(data.entries).forEach(section => {
                    data.entries[section].forEach((entry: any) => {
                        entriesToInsert.push({
                            audit_id: insertedAudit.id,
                            section,
                            question: entry.question,
                            score: entry.score,
                            comment: entry.comment,
                            company_id: selectedCompanyId
                        });
                    });
                });

                if (entriesToInsert.length > 0) {
                    const { error: entriesError } = await supabase.from('audit_5s_entries').insert(entriesToInsert);
                    if (entriesError) {
                        console.error('Supabase Error saving Audit Entries:', entriesError);
                        throw entriesError;
                    }
                }
                alert('Auditoría guardada exitosamente.');
                fetchOnlineAudits();
            }

            setView('dashboard');
            setEditingAudit(null);

        } catch (error) {
            console.error('Error saving audit (full object):', error);
            alert('Error al guardar la auditoría');
        } finally {
            setLoading(false);
        }
    };

    const deleteOfflineAudit = async (id?: number) => {
        if (!id) return;
        if (confirm('¿Eliminar este borrador?')) {
            await db.offline_audits.delete(id);
            await db.offline_audit_entries.where('audit_local_id').equals(id).delete();
        }
    }

    const loadDraft = async (draft: OfflineAudit) => {
        if (!draft.id) return;
        const entries = await db.offline_audit_entries.where('audit_local_id').equals(draft.id).toArray();

        // Reconstruct entries object
        const entriesObj: any = {};
        entries.forEach(e => {
            if (!entriesObj[e.section]) entriesObj[e.section] = [];
            entriesObj[e.section].push(e);
        });

        const formData = {
            title: draft.title,
            area: draft.area,
            auditor: draft.auditor,
            date: draft.audit_date,
            entries: entriesObj,
            tempId: draft.tempId
        };
        setEditingAudit(formData);
        setView('form');

        // Note: For now we don't support "editing" a draft in place perfectly (updating the same ID), 
        // simplifies to "Load as new form based on draft" or we'd need to pass ID to Form.
        // For simple MVP "Load Draft" -> "Save as New Draft" (duplication) or "Save Online". 
        // We will just let it save as new for now or improve `AuditForm` to handle `tempId` properly if wanted.
        // But `AuditForm` logic I wrote handled `tempId`? Yes.
        // Let's pass tempId to form if we want to update.
    }


    return (
        <div className="space-y-6">
            <HeaderWithFilter
                title="Bitácora 5S"
                subtitle="Gestión y auditoría de estándares 5S"
            >
                {view === 'dashboard' && (
                    <div className="flex gap-2">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white border border-slate-300 text-slate-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold shadow-sm h-[48px]"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>

                        {offlineAudits.length > 0 && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 rounded-xl flex items-center gap-2 transition-colors font-bold border border-amber-200 animate-pulse h-[48px]"
                            >
                                <UploadCloud size={20} />
                                {isSyncing ? 'Sincronizando...' : `Sincronizar (${offlineAudits.length})`}
                            </button>
                        )}

                        <button
                            onClick={() => { setEditingAudit(null); setView('form'); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 h-[48px]"
                        >
                            <Plus size={20} className="stroke-[3px]" /> Nueva Auditoría
                        </button>
                    </div>
                )}
            </HeaderWithFilter>

            {loading && view === 'dashboard' ? (
                <LoadingScreen message="Cargando auditorías..." fullScreen={false} />
            ) : view === 'form' ? (
                <AuditForm
                    initialData={editingAudit}
                    onSave={handleSaveAudit}
                    onCancel={() => setView('dashboard')}
                    isSaving={loading}
                />
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* KPIs Section - Full Width Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Total Audits */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">{audits.length}</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Auditorías Realizadas</p>
                            </div>
                        </div>

                        {/* 2. Average Score */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">
                                    {audits.length > 0 ? (audits.reduce((acc, curr) => acc + curr.total_score, 0) / audits.length).toFixed(2) : '-'}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Promedio General</p>
                            </div>
                        </div>

                        {/* 3. Top Area */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                <Trophy size={24} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-2xl font-black text-slate-800 truncate" title={(() => {
                                    if (audits.length === 0) return '-';
                                    const areaScores: Record<string, { sum: number, count: number }> = {};
                                    audits.forEach(a => {
                                        if (!areaScores[a.area]) areaScores[a.area] = { sum: 0, count: 0 };
                                        areaScores[a.area].sum += Number(a.total_score);
                                        areaScores[a.area].count++;
                                    });
                                    let maxAvg = 0;
                                    let bestArea = '-';
                                    Object.entries(areaScores).forEach(([area, stats]) => {
                                        const avg = stats.sum / stats.count;
                                        if (avg > maxAvg) {
                                            maxAvg = avg;
                                            bestArea = area;
                                        }
                                    });
                                    return bestArea;
                                })()}>
                                    {(() => {
                                        if (audits.length === 0) return '-';
                                        const areaScores: Record<string, { sum: number, count: number }> = {};
                                        audits.forEach(a => {
                                            if (!areaScores[a.area]) areaScores[a.area] = { sum: 0, count: 0 };
                                            areaScores[a.area].sum += Number(a.total_score);
                                            areaScores[a.area].count++;
                                        });
                                        let maxAvg = 0;
                                        let bestArea = '-';
                                        Object.entries(areaScores).forEach(([area, stats]) => {
                                            const avg = stats.sum / stats.count;
                                            if (avg > maxAvg) {
                                                maxAvg = avg;
                                                bestArea = area;
                                            }
                                        });
                                        return bestArea;
                                    })()}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mejor Área</p>
                            </div>
                        </div>

                        {/* 4. Weakest S */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">
                                    {(() => {
                                        if (audits.length === 0) return '-';
                                        const sScores: Record<string, { sum: number, count: number }> = { S1: { sum: 0, count: 0 }, S2: { sum: 0, count: 0 }, S3: { sum: 0, count: 0 }, S4: { sum: 0, count: 0 }, S5: { sum: 0, count: 0 } };
                                        audits.forEach(a => {
                                            a.audit_5s_entries?.forEach(e => {
                                                if (sScores[e.section]) {
                                                    sScores[e.section].sum += Number(e.score);
                                                    sScores[e.section].count++;
                                                }
                                            });
                                        });
                                        let minAvg = 5;
                                        let weakestS = '-';
                                        Object.entries(sScores).forEach(([s, stats]) => {
                                            if (stats.count === 0) return;
                                            const avg = stats.sum / stats.count;
                                            if (avg < minAvg) {
                                                minAvg = avg;
                                                weakestS = s;
                                            }
                                        });
                                        return weakestS;
                                    })()}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Punto Crítico (S)</p>
                            </div>
                        </div>
                    </div>

                    {/* Offline Drafts Section */}
                    {offlineAudits.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                                <span className="bg-amber-100 p-2 rounded-lg"><Edit size={20} /></span>
                                Auditorías Pendientes (Borradores Locales)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {offlineAudits.map((draft: OfflineAudit) => (
                                    <div key={draft.id} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-700">{draft.area}</span>
                                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">Borrador</span>
                                        </div>
                                        <p className="text-sm text-slate-500">{draft.audit_date}</p>
                                        <p className="text-xs text-slate-400 italic mb-3">{draft.title}</p>
                                        <div className="flex gap-2 border-t pt-2 border-slate-100">
                                            <button
                                                onClick={() => loadDraft(draft)}
                                                className="text-indigo-600 font-bold text-sm hover:underline flex-1"
                                            >
                                                Editar/Cargar
                                            </button>
                                            <button
                                                onClick={() => deleteOfflineAudit(draft.id)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <AuditCharts audits={audits} year={selectedYear} />

                    {/* List View */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 col-span-1 lg:col-span-2">
                        <h3 className="text-xl font-semibold mb-4 text-slate-800">Historial de Auditorías - {selectedYear}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="p-3 font-semibold text-slate-600">Fecha</th>
                                        <th className="p-3 font-semibold text-slate-600">Área</th>
                                        <th className="p-3 font-semibold text-slate-600">Auditor</th>
                                        <th className="p-3 font-semibold text-slate-600">Puntaje</th>
                                        <th className="p-3 font-semibold text-slate-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audits.map(audit => (
                                        <tr key={audit.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-slate-700">{audit.audit_date}</td>
                                            <td className="p-3 font-medium text-slate-800">{audit.area}</td>
                                            <td className="p-3 text-slate-500">{audit.auditor}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${audit.total_score >= 4.0 ? 'bg-emerald-100 text-emerald-700' :
                                                    audit.total_score >= 3.0 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {Number(audit.total_score).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    onClick={async () => {
                                                        if (confirm('¿Eliminar auditoría?')) {
                                                            await supabase.from('audit_5s').delete().eq('id', audit.id);
                                                            fetchOnlineAudits();
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {audits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                No hay auditorías registradas en este año.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
