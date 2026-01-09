import HeaderWithFilter from '../components/HeaderWithFilter';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit, ChevronDown, ChevronUp, Save, X, Calendar, User, Building, BarChart2, Type, UploadCloud } from 'lucide-react';
import MobileFab from '../components/mobile/MobileFab';
import { offlineService } from '../services/offlineService';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

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

const Auditoria5S = () => {
    const { user, globalFilterCompanyId, companies } = useAuth();
    const [view, setView] = useState('dashboard'); // 'dashboard', 'form'
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offlineAudits, setOfflineAudits] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Fixed Configuration (removed user controls per request)
    const chartConfig = {
        granularity: 'month',
        valueUnit: 'number', // Changed from 'percent' per request (0-5 scale)
        yearFilter: selectedYear,
    };

    // Form State
    const [auditData, setAuditData] = useState({
        title: '',
        area: '',
        auditor: '',
        date: new Date().toISOString().split('T')[0],
        entries: {}
    });
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [expandedSection, setExpandedSection] = useState('S1');
    const [editingId, setEditingId] = useState(null);
    const [availableAuditors, setAvailableAuditors] = useState([]);

    const fetchAudits = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Offline Audits
            const localAudits = await offlineService.getAllAudits();
            setOfflineAudits(localAudits);

            // Filter by Year directly on Server (Performance Optimization)
            const year = chartConfig.yearFilter;
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // Fetch Online Audits
            let query = supabase
                .from('audit_5s')
                .select(`
                    *,
                    audit_5s_entries (*)
                `)
                .gte('audit_date', startDate)
                .lte('audit_date', endDate)
                .order('audit_date', { ascending: false });

            // Apply Company Filter
            // STRICT PERMISSION CHECK: usage of 'isGlobalAdmin' from AuthContext
            if (user?.isGlobalAdmin) {
                if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
                    query = query.eq('company_id', globalFilterCompanyId);
                } else {
                    setAudits([]);
                    setLoading(false);
                    return;
                }
            } else {
                // Non-global admins/users MUST see their own company (or nothing if no company)
                if (user.company_id) query = query.eq('company_id', user.company_id);
                else if (user.companyId) query = query.eq('company_id', user.companyId); // Fallback
            }

            const { data, error } = await query;
            if (error) throw error;

            setAudits(data || []);
        } catch (error) {
            console.error('Error fetching audits:', error);
        } finally {
            setLoading(false);
        }
    }, [user, globalFilterCompanyId, chartConfig.yearFilter]);

    // Fetch Audits
    useEffect(() => {
        if (user) {
            fetchAudits();
        }
    }, [user, globalFilterCompanyId, chartConfig.yearFilter, fetchAudits]);

    const handleSyncAudits = async () => {
        setIsSyncing(true);
        try {
            const localAudits = await offlineService.getAllAudits();
            if (localAudits.length === 0) return;

            let successCount = 0;
            for (const audit of localAudits) {
                try {
                    const payload = { ...audit.data };
                    // Remove entries from payload for the main insert
                    const entries = payload.entries; // object with S1..S5 arrays
                    delete payload.entries;

                    // Ensure company_id
                    // Ensure company_id: Prioritize offline data, then valid session data
                    // STRICT CHECK: Only Global Admins can use globalFilterCompanyId
                    const isGlobalAdmin = user?.isGlobalAdmin;
                    const sessionCompanyId = isGlobalAdmin && globalFilterCompanyId !== 'all' ? globalFilterCompanyId : (user.company_id || user.companyId);

                    // Critical Fix: Remove camelCase companyId if present to avoid 406/400 errors
                    if ('companyId' in payload) delete payload.companyId;

                    payload.company_id = payload.company_id || sessionCompanyId;

                    if (!payload.company_id) {
                        console.error("Missing company_id for sync (Audit)", audit);
                        // Try to use user.companyId as last resort even if logic above failed (redundant but safe)
                        if (user.companyId) payload.company_id = user.companyId;
                        else {
                            continue; // Skip if absolutely no ID found
                        }
                    }

                    // Insert Audit
                    const { data: insertedAudit, error: auditError } = await supabase
                        .from('audit_5s')
                        .insert([payload])
                        .select()
                        .single();

                    if (auditError) throw auditError;

                    // Insert Entries
                    const entriesToInsert = [];
                    Object.keys(entries).forEach(section => {
                        entries[section].forEach(entry => {
                            entriesToInsert.push({
                                audit_id: insertedAudit.id,
                                section,
                                question: entry.question,
                                score: entry.score,
                                comment: entry.comment
                            });
                        });
                    });

                    if (entriesToInsert.length > 0) {
                        const { error: entriesError } = await supabase
                            .from('audit_5s_entries')
                            .insert(entriesToInsert);
                        if (entriesError) throw entriesError;
                    }

                    // Delete from Offline DB
                    await offlineService.deleteAudit(audit.tempId);
                    successCount++;

                } catch (err) {
                    console.error("Error syncing specific audit:", err);
                }
            }

            alert(`Sincronización completada: ${successCount} auditorías subidas.`);
            fetchAudits();

        } catch (error) {
            console.error("Sync error:", error);
            alert("Error general en sincronización");
        } finally {
            setIsSyncing(false);
        }
    };

    // Fetch Potential Auditors (Users)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                let query = supabase.from('profiles').select('id, full_name, email');

                // If user is GLOBAL admin and a specific company is selected, filter by that company
                // If user is not global admin, filter by their own company
                // STRICT CHECK: user.isGlobalAdmin
                if (user?.isGlobalAdmin) {
                    if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
                        query = query.eq('company_id', globalFilterCompanyId);
                    }
                } else {
                    if (user.company_id) query = query.eq('company_id', user.company_id);
                    else if (user.companyId) query = query.eq('company_id', user.companyId);
                }

                const { data, error } = await query;
                if (!error && data) {
                    setAvailableAuditors(data);
                }
            } catch (err) {
                console.error("Error fetching users for auditor list:", err);
            }
        };

        if (user) fetchUsers();
    }, [user, globalFilterCompanyId]);

    // Initialize/Reset Form
    const initForm = (existingAudit = null) => {
        if (existingAudit) {
            const entries = {};
            // Check if it's a draft (has data property) or a online audit
            const sourceEntries = existingAudit.data ? existingAudit.data.entries : existingAudit.audit_5s_entries;

            // If it's a draft, entries is an object {S1:[], S2:[]}, if online it's array of objects
            if (existingAudit.data) {
                // Draft format logic
                setAuditData({
                    ...existingAudit.data,
                    tempId: existingAudit.tempId // Track that we are editing a draft
                });
                setEditingId(null); // It's not an online ID yet
            } else {
                // Online format logic
                existingAudit.audit_5s_entries.forEach(entry => {
                    if (!entries[entry.section]) entries[entry.section] = [];
                    entries[entry.section].push(entry);
                });

                setAuditData({
                    title: existingAudit.title || '',
                    area: existingAudit.area,
                    auditor: existingAudit.auditor,
                    date: existingAudit.audit_date,
                    entries: entries
                });
                setEditingId(existingAudit.id);
            }
        } else {
            // New Audit - Load Templates
            const entries = {};
            Object.keys(DEFAULT_QUESTIONS).forEach(section => {
                entries[section] = DEFAULT_QUESTIONS[section].map(q => ({
                    question: q,
                    score: 0,
                    comment: ''
                }));
            });

            const today = new Date();
            setAuditData({
                title: '',
                area: '',
                auditor: user?.name || '',
                date: today.toISOString().split('T')[0],
                entries: entries
            });
            setEditingId(null);
        }
        setView('form');
    };

    // Handle Form Changes including Year Logic
    const handleDateChange = (e) => {
        const val = e.target.value;
        setAuditData({ ...auditData, date: val });
    };

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

    // HELPER: Normalize Score for Legacy Data (0-100 -> 0-5)
    const getNormalizedScore = (score) => {
        const val = parseFloat(score);
        // If score is > 5, it is likely on the old 0-100 scale.
        // 5.0 is the max on new scale, which equals 100 on old scale.
        // We assume 100% = 5 points. So divide by 20.
        return val > 5 ? val / 20 : val;
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
        // Scale 0-5 Logic (Average)
        // If maxScore is totalCount * 5, then percentage was (sum / (count*5)) * 100
        // New logic: simply Average Score = sum / count
        return totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : 0;
    };

    const handleSaveLocal = async () => {
        try {
            const totalScore = calculateScore();
            const auditToSave = {
                ...auditData,
                total_score: totalScore,
                updatedAt: new Date().toISOString()
            };

            // If we are editing a draft, update it (delete old, save new or assume saveAudit handles new tempId)
            // Ideally we'd update, but saveAudit generates new tempId. 
            // Let's simple delete old draft if exists and save new.
            if (auditData.tempId) {
                await offlineService.deleteAudit(auditData.tempId);
            }

            // Ensure company_id is captured if available
            // STRICT CHECK: user.isGlobalAdmin
            const sessionCompanyId = user.isGlobalAdmin && globalFilterCompanyId !== 'all' ? globalFilterCompanyId : (user.company_id || user.companyId);
            if (sessionCompanyId) auditToSave.company_id = sessionCompanyId;

            await offlineService.saveAudit(auditToSave);
            alert('Borrador guardado localmente.');

            // Refresh local list and go back
            const localAudits = await offlineService.getAllAudits();
            setOfflineAudits(localAudits);
            setView('dashboard');
        } catch (error) {
            console.error("Error saving local draft:", error);
            alert("Error al guardar borrador.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar auditoría?')) return;
        try {
            await supabase.from('audit_5s').delete().eq('id', id);
            fetchAudits();
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: Ensure we can resolve a target company ID
        // If admin/superadmin & global filter is 'all', we fallback to user's assigned company.
        // If user has no company assigned and selects 'all', then we block.
        // STRICT CHECK: user.isGlobalAdmin
        const isGlobalAdmin = user?.isGlobalAdmin;
        let targetCompanyId = isGlobalAdmin
            ? globalFilterCompanyId
            : (user.company_id || user.companyId);

        // Fallback to manual selection
        if (!targetCompanyId && selectedCompanyId) {
            targetCompanyId = selectedCompanyId;
        }

        if (!targetCompanyId) {
            alert('Por favor, selecciona una empresa en el filtro superior o en el formulario para guardar.');
            return;
        }

        setLoading(true);
        try {
            const totalScore = calculateScore();
            let auditId = editingId;

            const payload = {
                area: auditData.area,
                auditor: auditData.auditor,
                audit_date: auditData.date,
                total_score: totalScore,
                title: auditData.title
            };

            if (editingId) {
                // Update
                const { error } = await supabase.from('audit_5s').update(payload).eq('id', editingId);
                if (error) throw error;
                await supabase.from('audit_5s_entries').delete().eq('audit_id', editingId);
            } else {
                // Insert
                payload.company_id = targetCompanyId;
                const { data, error } = await supabase.from('audit_5s').insert([payload]).select().single();
                if (error) throw error;
                auditId = data.id;
            }

            // Entries
            const entriesToInsert = [];
            Object.keys(auditData.entries).forEach(section => {
                auditData.entries[section].forEach(entry => {
                    entriesToInsert.push({
                        audit_id: auditId,
                        section,
                        question: entry.question,
                        score: entry.score,
                        comment: entry.comment
                    });
                });
            });
            await supabase.from('audit_5s_entries').insert(entriesToInsert);

            // Cleanup Draft if this was a draft
            if (auditData.tempId) {
                await offlineService.deleteAudit(auditData.tempId);
                // Also refresh offline list
                const loc = await offlineService.getAllAudits();
                setOfflineAudits(loc);
            }

            fetchAudits();
            setView('dashboard');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar la auditoría');
        } finally {
            setLoading(false);
        }
    };

    // --- CHART LOGIC ---

    const filteredAudits = useMemo(() => {
        // Already filtered by server, but we keep this safely or remove it. 
        // Let's rely on server filter + simple year match to be 100% sure with string parsing
        return audits.filter(a => {
            if (!a.audit_date) return false;
            // Robust Year Check: "YYYY-MM-DD" -> split[0]
            const auditYear = parseInt(a.audit_date.split('-')[0]);
            return auditYear === parseInt(chartConfig.yearFilter);
        });
    }, [audits, chartConfig.yearFilter]);

    const getRadarData = (audit) => {
        if (!audit || !audit.audit_5s_entries) return [];
        const sections = ['S1', 'S2', 'S3', 'S4', 'S5'];
        return sections.map(section => {
            const entries = audit.audit_5s_entries.filter(e => e.section === section);
            const total = entries.reduce((acc, curr) => acc + curr.score, 0);
            const count = entries.length;


            // Value Logic: Average Score instead of Total Sum
            const value = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
            const fullMark = 5;

            return {
                subject: section,
                A: value,
                fullMark
            };
        });
    };

    const getTrendData = () => {
        if (filteredAudits.length === 0) return [];

        const grouped = {};

        filteredAudits.forEach(a => {
            const d = new Date(a.audit_date + 'T12:00:00'); // Ensure date is treated correctly in local time or consistent timezone
            let key = '';

            if (chartConfig.granularity === 'day') {
                key = a.audit_date; // YYYY-MM-DD
            } else if (chartConfig.granularity === 'week') {
                const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                key = `W${weekNum}`;
            } else { // month
                key = d.toLocaleString('es-ES', { month: 'short' });
            }

            if (!grouped[key]) grouped[key] = {
                sum: 0,
                count: 0,
                sumPoints: 0,
                maxPoints: 0,
                sortTime: d.getTime()
            };

            // Aggregate Percentage
            // grouped[key].sum += Number(a.total_score); // Original line
            grouped[key].count += 1;

            const rawScore = a.audit_5s_entries.reduce((acc, curr) => acc + curr.score, 0);
            grouped[key].sum += getNormalizedScore(a.total_score); // Normalize here to ensure 0-5
            grouped[key].sumPoints += rawScore; // This might be redundant if we use normalized sum
        });

        return Object.keys(grouped)
            .map(key => {
                const item = grouped[key];
                // Average Calculation (Total Points / Total Questions Count)
                // To be precise we need total questions count, assuming 15 questions per audit roughly
                // But better: average of total_scores
                const avgScore = item.count > 0 ? parseFloat((item.sum / item.count).toFixed(2)) : 0;

                return {
                    date: key,
                    score: avgScore,
                    sortTime: item.sortTime
                };
            })
            .sort((a, b) => a.sortTime - b.sortTime);
    };

    const getAreaScores = () => {
        const counts = {};
        filteredAudits.forEach(a => {
            if (!counts[a.area]) counts[a.area] = { sum: 0, count: 0, rawSum: 0 };

            counts[a.area].sum += getNormalizedScore(a.total_score);
            const rawScore = a.audit_5s_entries.reduce((acc, curr) => acc + curr.score, 0);
            counts[a.area].rawSum += rawScore;
            counts[a.area].count += 1;
        });

        return Object.keys(counts).map(area => ({
            name: area,
            score: parseFloat((counts[area].sum / counts[area].count).toFixed(2))
        }));
    };

    const getComplianceByS = () => {
        // Aggregate scores by S1-S5 across all filtered audits
        const sScores = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };
        const sCounts = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 }; // number of questions answered

        filteredAudits.forEach(a => {
            a.audit_5s_entries.forEach(e => {
                if (sScores[e.section] !== undefined) {
                    sScores[e.section] += e.score;
                    sCounts[e.section] += 1;
                }
            });
        });

        return Object.keys(sScores).map(key => {
            const totalPoints = sScores[key];
            const count = sCounts[key];
            const avg = count > 0 ? parseFloat((totalPoints / count).toFixed(2)) : 0;

            return {
                name: key,
                value: avg
            };
        });
    };

    return (
        <div className="page-container relative min-h-screen">
            <HeaderWithFilter
                title="Auditoría 5S"
                subtitle="Evaluación y seguimiento de estándares de orden y limpieza"
            >
                {view === 'dashboard' && (
                    <div className="flex items-center gap-2">
                        {/* Selector de Año */}
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium shadow-sm h-[40px] cursor-pointer"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>

                        <button
                            onClick={() => initForm()}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-brand-500/30 h-[40px]"
                        >
                            <Plus size={20} /> Nueva Auditoría
                        </button>
                    </div>
                )}
                {view === 'form' && (
                    <button
                        onClick={() => setView('dashboard')}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
                    >
                        <X size={20} /> Cancelar
                    </button>
                )}
            </HeaderWithFilter>

            {view === 'dashboard' ? (
                <>
                    {/* MINI DASHBOARD KPIs - 4 cards in a row */}
                    {filteredAudits.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {/* Auditorías Realizadas */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                                        <BarChart2 size={20} className="text-sky-500" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">{selectedYear}</span>
                                </div>
                                <div className="text-3xl font-black text-slate-800">{filteredAudits.length}</div>
                                <div className="text-xs font-medium text-slate-500 mt-1">Auditorías<br />Realizadas</div>
                            </div>

                            {/* Promedio General */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-slate-800">
                                    {(filteredAudits.reduce((sum, a) => sum + getNormalizedScore(a.total_score), 0) / filteredAudits.length).toFixed(2)}
                                </div>
                                <div className="text-xs font-medium text-slate-500 mt-1">Promedio General</div>
                            </div>

                            {/* Mejor Área */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-slate-800">
                                    {(() => {
                                        const areaScores = getAreaScores();
                                        if (areaScores.length === 0) return 'N/A';
                                        const best = areaScores.reduce((prev, curr) => curr.score > prev.score ? curr : prev);
                                        return best.name || 'N/A';
                                    })()}
                                </div>
                                <div className="text-xs font-medium text-slate-500 mt-1">Mejor Área</div>
                            </div>

                            {/* Punto Crítico (S con menor puntaje) */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-slate-800">
                                    {(() => {
                                        const sScores = getComplianceByS();
                                        if (sScores.length === 0) return 'N/A';
                                        const worst = sScores.reduce((prev, curr) => curr.value < prev.value ? curr : prev);
                                        return worst.name || 'N/A';
                                    })()}
                                </div>
                                <div className="text-xs font-medium text-slate-500 mt-1">Punto Crítico (S)</div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Charts Section */}
                        {/* Charts Section */}
                        {filteredAudits.length > 0 || offlineAudits.length > 0 ? (
                            <>
                                {/* DRAFTS SECTION */}
                                {offlineAudits.length > 0 && (
                                    <div className="col-span-1 lg:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm mb-6">
                                        <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                                            <Edit size={20} /> Auditorías Pendientes (Borradores Locales)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {offlineAudits.map(draft => (
                                                <div key={draft.tempId} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-slate-700">{draft.data.area || 'Sin Área'}</span>
                                                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">Borrador</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 mb-1">{draft.data.date}</p>
                                                        <p className="text-xs text-slate-400 italic mb-3">{draft.data.title || 'Sin Título'}</p>
                                                    </div>
                                                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                                                        <button
                                                            onClick={() => initForm(draft)}
                                                            className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2 rounded text-sm font-bold transition-colors"
                                                        >
                                                            Revisar / Editar
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('¿Descartar este borrador?')) {
                                                                    await offlineService.deleteAudit(draft.tempId);
                                                                    setOfflineAudits(await offlineService.getAllAudits());
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            title="Descartar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Radar Chart */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-indigo-700">Última Auditoría (Radar)</h3>
                                        <span className="text-xs text-slate-500">{filteredAudits[0]?.title || filteredAudits[0]?.audit_date}</span>
                                    </div>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(filteredAudits[0])}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={true} axisLine={false} />
                                                <Radar name="Puntaje" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Evolution Chart */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-emerald-700">Evolución ({chartConfig.granularity})</h3>
                                        <div className="flex gap-2 text-xs">
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-medium">Promedio</span>
                                        </div>
                                    </div>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                            <LineChart data={getTrendData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
                                                <YAxis domain={[0, 5]} tickCount={6} stroke="#64748b" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend />
                                                <Line type="monotone" dataKey="score" stroke="#059669" strokeWidth={2} activeDot={{ r: 6 }} name="Puntaje" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Scores by Area */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                    <h3 className="text-lg font-semibold mb-4 text-purple-700">Puntaje Promedio por Área</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                            <BarChart data={getAreaScores()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                                <YAxis domain={[0, 5]} tickCount={6} stroke="#64748b" fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Bar dataKey="score" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Puntaje" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Scores by S Factor (Aggregate) */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                    <h3 className="text-lg font-semibold mb-4 text-orange-700">Desempeño Global por S</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                            <BarChart data={getComplianceByS()} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis type="number" domain={[0, 5]} tickCount={6} stroke="#64748b" fontSize={12} />
                                                <YAxis dataKey="name" type="category" stroke="#64748b" width={30} fontSize={12} />
                                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Bar dataKey="value" fill="#ea580c" radius={[0, 4, 4, 0]} name="Puntaje" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="col-span-2 p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                                <BarChart2 size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No hay datos para el año {chartConfig.yearFilter}</p>
                                <p className="text-sm">Intente cambiar el filtro de año o agregue una nueva auditoría.</p>
                            </div>
                        )}

                        {/* List Section */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 col-span-1 lg:col-span-2">
                            <h3 className="text-xl font-semibold mb-4 text-slate-800">Historial de Auditorías - {chartConfig.yearFilter}</h3>

                            {/* Mobile List View */}
                            <div className="block md:hidden space-y-4">
                                {filteredAudits.map((audit) => (
                                    <div key={audit.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-slate-800 font-bold">{audit.area}</div>
                                                <div className="text-xs text-slate-500">{audit.audit_date}</div>
                                            </div>
                                            {(() => {
                                                const normalizedScore = getNormalizedScore(audit.total_score);
                                                return (
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${normalizedScore >= 4.0 ? 'bg-emerald-100 text-emerald-700' :
                                                        normalizedScore >= 3.0 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {Number(normalizedScore).toFixed(2)}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="text-sm text-slate-600 mb-3 line-clamp-1">{audit.title || 'Sin título'}</div>
                                        <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                                            <span className="text-xs text-slate-500">{audit.auditor}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => initForm(audit)} className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(audit.id)} className="p-2 bg-red-50 text-red-600 rounded-lg">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredAudits.length === 0 && (
                                    <div className="text-center text-slate-500 py-4">No hay registros.</div>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-xs font-bold">
                                            <th className="p-4">Fecha</th>
                                            <th className="p-4">Título / Ref</th>
                                            <th className="p-4">Área</th>
                                            <th className="p-4">Auditor</th>
                                            <th className="p-4 text-center">Puntaje</th>
                                            <th className="p-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAudits.map((audit) => (
                                            <tr key={audit.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 text-slate-700 font-semibold">{audit.audit_date}</td>
                                                <td className="p-4 text-slate-600 group-hover:text-slate-800 transition-colors">{audit.title || '-'}</td>
                                                <td className="p-4 text-indigo-600 font-medium">{audit.area}</td>
                                                <td className="p-4 text-slate-500">{audit.auditor}</td>
                                                <td className="p-4 text-center">
                                                    {(() => {
                                                        const normalizedScore = getNormalizedScore(audit.total_score);
                                                        return (
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${normalizedScore >= 4.0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                                normalizedScore >= 3.0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                    'bg-red-100 text-red-700 border border-red-200'
                                                                }`}>
                                                                {Number(normalizedScore).toFixed(2)}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => initForm(audit)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => handleDelete(audit.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredAudits.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-slate-500">
                                                    No hay registros para este período.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 max-w-7xl mx-auto animate-fadeIn">
                    <form onSubmit={handleSubmit}>
                        {/* Company Selector for Superadmin if Global Filter is 'All' */}
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (!user.company_id && globalFilterCompanyId === 'all') && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <label className="block text-sm font-bold text-amber-900 mb-1">Empresa Cliente *</label>
                                <select
                                    className="w-full bg-white border border-amber-300 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    value={selectedCompanyId}
                                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Seleccionar Empresa para esta Auditoría --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Título de Referencia (Opcional)</label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                        value={auditData.title}
                                        onChange={(e) => setAuditData({ ...auditData, title: e.target.value })}
                                        placeholder="Ej. Auditoría Trimestral Q1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Área</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                        value={auditData.area}
                                        onChange={(e) => setAuditData({ ...auditData, area: e.target.value })}
                                        placeholder="Ej. Producción"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Auditor</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                    {availableAuditors.length > 0 ? (
                                        <select
                                            required
                                            className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 appearance-none focus:bg-white transition-colors"
                                            value={auditData.auditor}
                                            onChange={(e) => setAuditData({ ...auditData, auditor: e.target.value })}
                                        >
                                            <option value="">Seleccionar Auditor</option>
                                            {availableAuditors.map(u => (
                                                <option key={u.id} value={u.full_name || u.email}>
                                                    {u.full_name || u.email}
                                                </option>
                                            ))}
                                            <option value="Externo">Externo / Otro</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                            value={auditData.auditor}
                                            onChange={(e) => setAuditData({ ...auditData, auditor: e.target.value })}
                                            placeholder="Nombre del Auditor"
                                        />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                                        value={auditData.date}
                                        onChange={handleDateChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {['S1', 'S2', 'S3', 'S4', 'S5'].map((section) => (
                                <div key={section} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                                        className={`w-full flex justify-between items-center p-4 text-left transition-colors ${expandedSection === section ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="font-bold text-lg">{section} - {
                                            section === 'S1' ? 'Clasificar (Seiri)' :
                                                section === 'S2' ? 'Ordenar (Seiton)' :
                                                    section === 'S3' ? 'Limpiar (Seiso)' :
                                                        section === 'S4' ? 'Estandarizar (Seiketsu)' :
                                                            'Disciplina (Shitsuke)'
                                        }</span>
                                        {expandedSection === section ? <ChevronUp /> : <ChevronDown />}
                                    </button>

                                    {expandedSection === section && (
                                        <div className="p-4 bg-slate-50">
                                            {auditData.entries[section]?.map((entry, idx) => (
                                                <div key={idx} className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                                        {/* Pregunta */}
                                                        <div className="lg:col-span-5 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Criterio / Pregunta</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeQuestion(section, idx)}
                                                                    className="text-red-400 hover:text-red-600 lg:hidden p-1"
                                                                    title="Eliminar pregunta"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y"
                                                                value={entry.question}
                                                                onChange={(e) => updateEntry(section, idx, 'question', e.target.value)}
                                                                placeholder="Escriba el criterio a evaluar..."
                                                            />
                                                        </div>

                                                        {/* Calificación (Botones) */}
                                                        <div className="lg:col-span-3 space-y-2">
                                                            <label className="text-xs text-slate-500 uppercase font-bold tracking-wider block text-center lg:text-left">Calificación</label>
                                                            <div className="flex gap-2 justify-center lg:justify-start flex-wrap">
                                                                {[1, 2, 3, 4, 5].map((score) => (
                                                                    <button
                                                                        key={score}
                                                                        type="button"
                                                                        onClick={() => updateEntry(section, idx, 'score', score)}
                                                                        className={`
                                                                            w-10 h-10 rounded-lg font-bold text-sm transition-all transform hover:scale-105
                                                                            ${entry.score === score
                                                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                                                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                                            }
                                                                        `}
                                                                    >
                                                                        {score}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="text-center lg:text-left pt-1">
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    {entry.score === 0 ? 'Sin calificar' :
                                                                        entry.score === 1 ? 'Pésimo' :
                                                                            entry.score === 2 ? 'Malo' :
                                                                                entry.score === 3 ? 'Regular' :
                                                                                    entry.score === 4 ? 'Bueno' : 'Excelente'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Hallazgo / Observación */}
                                                        <div className="lg:col-span-4 space-y-2 relative">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hallazgo / Observación</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeQuestion(section, idx)}
                                                                    className="text-slate-300 hover:text-red-500 hidden lg:block p-1 hover:bg-red-50 rounded transition-colors"
                                                                    title="Eliminar línea"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-400"
                                                                value={entry.comment || ''}
                                                                onChange={(e) => updateEntry(section, idx, 'comment', e.target.value)}
                                                                placeholder="Describa el hallazgo o detalle..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addQuestion(section)}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                                            >
                                                <Plus size={16} /> Agregar Criterio
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setView('dashboard')}
                                className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveLocal}
                                className="px-6 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold transition-colors flex items-center gap-2 border border-amber-200"
                            >
                                <Save size={20} /> Guardar Borrador
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Guardando...' : <><Save size={20} /> Guardar Auditoría</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {view === 'dashboard' && (
                <MobileFab icon={Plus} onClick={() => initForm()} label="Nueva Auditoría" />
            )}
        </div>
    );
};

export default Auditoria5S;
