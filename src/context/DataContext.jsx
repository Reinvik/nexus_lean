import { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { offlineService } from '../services/offlineService';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    // 5S Cards State
    const [fiveSCards, setFiveSCards] = useState([]);
    const [loadingFiveS, setLoadingFiveS] = useState(true);
    const abortControllerRef = useRef(null);

    // Responsables Data State (Quick Wins, VSM, A3)
    const [quickWinsData, setQuickWinsData] = useState([]);
    const [vsmData, setVsmData] = useState([]);
    const [a3Data, setA3Data] = useState([]);
    const [loadingResponsables, setLoadingResponsables] = useState(true);

    // Fetch 5S Cards
    const fetchFiveSCards = useCallback(async () => {
        if (!user) {
            setFiveSCards([]);
            setLoadingFiveS(false);
            return;
        }

        // Abort previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoadingFiveS(true);
        let currentOffline = [];

        // 1. Load Offline Cards FAST
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
                timestamp: record.timestamp
            }));

            if (currentOffline.length > 0) {
                setFiveSCards(currentOffline);
            }
        } catch (e) {
            console.error("DataContext: Error fetching offline cards:", e);
        }

        // 2. Load Online Cards
        try {
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const { data, error } = await supabase
                .from('five_s_cards')
                .select('id, date, location, article, reporter, reason, proposed_action, responsible, target_date, solution_date, status, type, image_before, image_after, company_id, created_at, card_number')
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (error) throw error;

            if (data) {
                const onlineCardsData = data.map((c) => ({
                    id: c.id,
                    date: c.date,
                    location: c.location,
                    article: c.article,
                    reporter: c.reporter,
                    reason: c.reason,
                    proposedAction: c.proposed_action,
                    responsible: c.responsible,
                    targetDate: c.target_date,
                    solutionDate: c.solution_date,
                    status: c.status,
                    statusColor: c.status === 'Cerrado' ? '#10b981' : (c.status === 'En Proceso' ? '#f59e0b' : '#ef4444'),
                    type: c.type,
                    imageBefore: c.image_before,
                    imageAfter: c.image_after,
                    companyId: c.company_id,
                    // Use persistent card_number from DB, fallback to '?' if missing
                    cardNumber: c.card_number || '?',
                    isOffline: false,
                    createdAt: c.created_at
                }));

                // Merge Offline + Online
                const combinedData = [...currentOffline, ...onlineCardsData];
                combinedData.sort((a, b) => {
                    const dateA = a.isOffline ? new Date(a.timestamp) : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                    const dateB = b.isOffline ? new Date(b.timestamp) : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                    return dateB - dateA;
                });

                // Do NOT overwrite cardNumber with index anymore
                setFiveSCards(combinedData);
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                return; // Ignore abort errors
            }
            console.error('DataContext: Error fetching online 5S cards:', error.message);
        } finally {
            if (abortControllerRef.current === controller) {
                setLoadingFiveS(false);
                abortControllerRef.current = null;
            }
        }
    }, [user]);

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
            const [quickWinsRes, vsmRes, a3Res] = await Promise.all([
                supabase.from('quick_wins').select('*'),
                supabase.from('vsm_projects').select('*'),
                supabase.from('a3_projects').select('*')
            ]);

            if (quickWinsRes.data) {
                setQuickWinsData(quickWinsRes.data.map(w => ({
                    id: w.id,
                    responsible: w.responsible,
                    status: w.status,
                    title: w.title,
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
                    companyId: p.company_id
                })));
            }
        } catch (error) {
            console.error("DataContext: Error fetching responsables data:", error);
        } finally {
            setLoadingResponsables(false);
        }
    }, [user]);

    // Prefetch REMOVED to improve login performance
    // Pages will request data when needed.
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
            loadingResponsables,
            fetchResponsablesData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
