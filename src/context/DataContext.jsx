import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { offlineService } from '../services/offlineService';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { user, globalFilterCompanyId } = useAuth();

    // 5S Cards State
    const [fiveSCards, setFiveSCards] = useState([]);
    const [loadingFiveS, setLoadingFiveS] = useState(true);
    const abortControllerRef = useRef(null);

    // Responsables Data State (Quick Wins, VSM, A3, Audits)
    const [quickWinsData, setQuickWinsData] = useState([]);
    const [vsmData, setVsmData] = useState([]);
    const [a3Data, setA3Data] = useState([]);
    const [auditData, setAuditData] = useState([]);
    const [loadingResponsables, setLoadingResponsables] = useState(true);

    // Fetch 5S Cards
    const fetchFiveSCards = useCallback(async (viewMode = 'active') => {
        if (!user) {
            setFiveSCards([]);
            setLoadingFiveS(false);
            return;
        }

        // Abort previous request (if any)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoadingFiveS(true);
        let currentOffline = [];

        // 1. Load Offline Cards (Relevant for Active and All views)
        if (viewMode === 'active' || viewMode === 'all') {
            try {
                const offlineCards = await offlineService.getAllCards();
                currentOffline = offlineCards.map((record) => ({
                    id: record.tempId,
                    cardNumber: 'OFF',
                    date: record.data.date,
                    location: record.data.location,
                    article: record.data.article,
                    reporter: record.data.reporter,
                    reason: record.data.reason,
                    proposedAction: record.data.proposed_action,
                    responsible: record.data.responsible,
                    targetDate: record.data.target_date,
                    solutionDate: record.data.solution_date,
                    status: 'Pendiente de subir',
                    statusColor: '#94a3b8',
                    type: record.data.type,
                    imageBefore: record.files.imageBefore ? URL.createObjectURL(record.files.imageBefore) : null,
                    imageAfter: record.files.imageAfter ? URL.createObjectURL(record.files.imageAfter) : null,
                    companyId: record.data.company_id,
                    isOffline: true,
                    files: record.files, // Pass original files/blobs for recovery during upload
                    timestamp: record.timestamp
                }));

                if (currentOffline.length > 0) {
                    setFiveSCards(currentOffline); // Show immediately
                }
            } catch (e) {
                console.error("DataContext: Error fetching offline cards:", e);
            }
        }

        // 2. Load Online Cards
        try {
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            let query = supabase
                .from('five_s_cards')
                // Use correct column names from database schema + JOIN with profiles for assigned user name
                .select(`
                    id, area, description, findings, priority, category, status, company_id, 
                    created_by, assigned_to, due_date, close_date, image_url, image_urls, 
                    after_image_url, closure_comment, created_at, updated_at,
                    assigned_user:profiles!five_s_cards_assigned_to_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            // FILTER: Active vs History vs All
            if (viewMode === 'active') {
                query = query.neq('status', 'Cerrado'); // Open Only
            } else if (viewMode === 'history') {
                query = query.eq('status', 'Cerrado'); // Closed Only
            }
            // If 'all', we don't apply status filter

            // LIMIT: Increase for 'all' to get better statistics for AI
            query = query.limit(viewMode === 'all' ? 200 : 50);

            // COMPANY FILTER
            // COMPANY FILTER
            if (!user.isGlobalAdmin) {
                // Regular User / Admin: Restrict to own company
                if (user.companyId && user.companyId !== 'null') {
                    query = query.eq('company_id', user.companyId);
                }
            } else {
                // SUPERADMIN: Use global filter. MUST have a value.
                if (globalFilterCompanyId && globalFilterCompanyId !== 'all' && globalFilterCompanyId !== 'null') {
                    query = query.eq('company_id', globalFilterCompanyId);
                } else {
                    // Safety: If superadmin but no company selected, return empty to avoid "All Companies" leak
                    setFiveSCards([]);
                    setLoadingFiveS(false);
                    return;
                }
            }

            // Execute
            const { data, error } = await query.abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (error) throw error;

            if (data) {
                const onlineCardsData = data.map((c) => ({
                    id: c.id,
                    // Map to legacy field names for component compatibility
                    date: c.created_at,
                    location: c.area, // area -> location
                    article: c.description, // description -> article
                    reporter: null, // No reporter column
                    reason: c.findings, // findings -> reason
                    proposedAction: null,
                    responsible: c.assigned_user?.full_name || c.assigned_to || null,
                    targetDate: c.due_date,
                    solutionDate: c.close_date, // close_date -> solutionDate
                    status: c.status,
                    statusColor: c.status === 'Cerrado' ? '#10b981' : ((c.status === 'En Progreso' || c.status === 'En Proceso') ? '#f59e0b' : '#ef4444'),
                    type: c.category === 'Otro' ? 'Mejora' : c.category, // Map 'Otro' to 'Mejora' for UI
                    imageBefore: c.image_url || (c.image_urls && c.image_urls[0]) || null,
                    imageAfter: c.after_image_url,
                    companyId: c.company_id,
                    priority: c.priority,
                    category: c.category === 'Otro' ? 'Mejora' : c.category, // Map 'Otro' to 'Mejora' for UI
                    area: c.area,
                    description: c.description,
                    findings: c.findings,
                    cardNumber: c.id?.toString().slice(-4) || '?',
                    isOffline: false,
                    createdAt: c.created_at
                }));

                // Combine (Offline goes on top of Active and All views)
                let combinedData = onlineCardsData;
                if (viewMode === 'active' || viewMode === 'all') {
                    combinedData = [...currentOffline, ...onlineCardsData];
                    combinedData.sort((a, b) => {
                        const dateA = a.isOffline ? new Date(a.timestamp) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                        const dateB = b.isOffline ? new Date(b.timestamp) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                        return dateB - dateA;
                    });
                }

                setFiveSCards(combinedData);

                // 2.1 Background Fetch Images (Optimization)
                // Only if we have server cards
                if (onlineCardsData.length > 0) {
                    const ids = onlineCardsData.map(c => c.id);
                    // Fetch images for these IDs
                    supabase
                        .from('five_s_cards')
                        .select('id, image_url, after_image_url')
                        .in('id', ids)
                        .then(({ data: images, error: imgError }) => {
                            if (!imgError && images?.length > 0) {
                                setFiveSCards(prev => prev.map(card => {
                                    // Only update if it's a server card (not offline)
                                    if (!card.isOffline) {
                                        const imgData = images.find(i => i.id === card.id);
                                        if (imgData) {
                                            return {
                                                ...card,
                                                imageBefore: imgData.image_url,
                                                imageAfter: imgData.after_image_url
                                            };
                                        }
                                    }
                                    return card;
                                }));
                            }
                        })
                        .catch(err => console.error("Error fetching images background:", err));
                }
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) return;
            console.error('DataContext: Error fetching online 5S cards:', error.message);
        } finally {
            setLoadingFiveS(false);
        }
    }, [user, globalFilterCompanyId]);

    // Fetch Responsables Data (Quick Wins, VSM, A3)
    const fetchResponsablesData = useCallback(async () => {
        if (!user) {
            setQuickWinsData([]);
            setVsmData([]);
            setA3Data([]);
            setLoadingResponsables(false);
            return;
        }

        setLoadingResponsables(true);
        try {
            let qwQuery = supabase.from('quick_wins').select('*');
            let vsmQuery = supabase.from('vsm_projects').select('*');
            let a3Query = supabase.from('a3_projects').select('*');

            // Apply Company Filter Logic
            const applyFilter = (query) => {
                if (user.isGlobalAdmin) {
                    // SUPERADMIN: Use global filter. MUST have a value.
                    if (globalFilterCompanyId && globalFilterCompanyId !== 'all' && globalFilterCompanyId !== 'null') {
                        return query.eq('company_id', globalFilterCompanyId);
                    } else {
                        // Safety: If superadmin but no company selected, return empty
                        // Using a dummy UUID to ensure no matches
                        return query.eq('company_id', '00000000-0000-0000-0000-000000000000');
                    }
                } else if (user.companyId && user.companyId !== 'null') {
                    // REGULAR USER / ADMIN: Restrict to own company
                    return query.eq('company_id', user.companyId);
                }
                return query;
            };

            qwQuery = applyFilter(qwQuery);
            vsmQuery = applyFilter(vsmQuery);
            a3Query = applyFilter(a3Query);

            const [quickWinsRes, vsmRes, a3Res] = await Promise.all([
                qwQuery,
                vsmQuery,
                a3Query
            ]);

            if (quickWinsRes.data) {
                setQuickWinsData(quickWinsRes.data.map(w => ({
                    id: w.id,
                    responsible: w.responsible,
                    status: w.status,
                    title: w.title,
                    description: w.description,
                    impact: w.impact,
                    effort: w.effort,
                    date: w.date,
                    companyId: w.company_id
                })));
            }

            if (vsmRes.data) {
                setVsmData(vsmRes.data.map(v => ({
                    id: v.id,
                    responsible: v.responsible,
                    status: v.status,
                    name: v.name,
                    description: v.description,
                    steps: v.steps,
                    leadTime: v.lead_time,
                    processTime: v.process_time,
                    efficiency: v.efficiency,
                    taktTime: v.takt_time,
                    date: v.date,
                    companyId: v.company_id
                })));
            }

            if (a3Res.data) {
                setA3Data(a3Res.data.map(p => ({
                    id: p.id,
                    responsible: p.responsible,
                    status: p.status,
                    title: p.title,
                    created_at: p.created_at,
                    actionPlan: p.action_plan || [],
                    background: p.background,
                    currentCondition: p.current_condition,
                    goal: p.goal, // IMPORTANT: Mapped from snake_case
                    rootCause: p.root_cause, // IMPORTANT
                    analysis: p.analysis,
                    countermeasures: p.countermeasures,
                    ishikawas: p.ishikawas,
                    multipleFiveWhys: p.multipleFiveWhys || p.five_whys,
                    followUpData: Array.isArray(p.follow_up_data)
                        ? p.follow_up_data
                        : (p.follow_up_data && Object.keys(p.follow_up_data).length > 0 ? [p.follow_up_data] : []),
                    companyId: p.company_id
                })));
            }
        } catch (error) {
            console.error("DataContext: Error fetching responsables data:", error);
        } finally {
            setLoadingResponsables(false);
        }
    }, [user, globalFilterCompanyId]);

    // Fetch 5S Audits (New)
    const fetchAudits = useCallback(async () => {
        if (!user) { setAuditData([]); return; }
        try {
            // OPTIMIZATION: Select specific columns instead of '*' to reduce payload
            let query = supabase
                .from('audit_5s')
                .select('id, audit_date, auditor, total_score, company_id')
                .order('audit_date', { ascending: false });

            // Apply Company Filter
            if (user.isGlobalAdmin) {
                if (globalFilterCompanyId && globalFilterCompanyId !== 'all' && globalFilterCompanyId !== 'null') {
                    query = query.eq('company_id', globalFilterCompanyId);
                } else {
                    setAuditData([]);
                    return;
                }
            } else if (user.companyId && user.companyId !== 'null') {
                query = query.eq('company_id', user.companyId);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;
            if (data) {
                setAuditData(data.map(a => ({
                    id: a.id,
                    date: a.audit_date,
                    auditor: a.auditor,
                    score: a.total_score,
                    status: 'Completada',
                    companyId: a.company_id
                })));
            }
        } catch (err) {
            console.error("Error fetching audits:", err);
        }
    }, [user, globalFilterCompanyId]);

    // BACKGROUND PREFETCH REMOVED to prevent AbortController race conditions
    // Components (FiveS, Responsables, Dashboard) are responsible for triggering their own data needs.
    useEffect(() => {
        if (!user) {
            setFiveSCards([]);
            setQuickWinsData([]);
            setVsmData([]);
            setA3Data([]);
            setLoadingFiveS(false);
            setLoadingResponsables(false);
        }
    }, [user]);

    // Optimistic update helpers for 5S
    const updateFiveSCard = useCallback((cardId, updatedData) => {
        setFiveSCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedData } : c));
    }, []);

    const addFiveSCard = useCallback((card) => {
        setFiveSCards(prev => [card, ...prev]);
    }, []);

    const removeFiveSCard = useCallback((cardId) => {
        setFiveSCards(prev => prev.filter(c => c.id !== cardId));
    }, []);

    return (
        <DataContext.Provider value={{
            // 5S Cards
            fiveSCards,
            loadingFiveS,
            fetchFiveSCards,
            updateFiveSCard,
            addFiveSCard,
            removeFiveSCard,
            // Responsables Data
            quickWinsData,
            vsmData,
            a3Data,
            auditData,
            loadingResponsables,
            fetchResponsablesData,
            fetchAudits
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
