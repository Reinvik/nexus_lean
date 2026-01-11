import { useState, useMemo, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offlineService';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, Camera, X, Calendar, MapPin, User, FileText, CheckCircle, AlertCircle, Clock, BarChart as BarIcon, ChevronDown, Activity, ArrowRight, Trash2, CloudOff, Save, Building } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AuditService } from '../services/AuditService';
import ImageUpload from '../components/ImageUpload';
import StatCard from '../components/StatCard';
import MobileFab from '../components/mobile/MobileFab';
import CameraCapture from '../components/mobile/CameraCapture';

// Helper: Convert timestamp to yyyy-MM-dd for date inputs
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch {
        return '';
    }
};

const FiveSPage = () => {
    const { user, globalFilterCompanyId, companyUsers } = useAuth();
    // Use the complete destructuring from legacy code
    const { fiveSCards: cards, loadingFiveS: loading, fetchFiveSCards, addFiveSCard, updateFiveSCard, removeFiveSCard } = useData();
    const location = useLocation();

    // State
    const [selectedCard, setSelectedCard] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [filterResponsible, setFilterResponsible] = useState('');
    const [filterLocation, setFilterLocation] = useState('');

    // New Companies State
    const [companies, setCompanies] = useState([]);

    // Fetch Companies for Global Admin
    useEffect(() => {
        if (user?.isGlobalAdmin) {
            supabase.from('companies').select('id, name').then(({ data }) => {
                if (data) setCompanies(data);
            });
        }
    }, [user]);

    const [showHistory, setShowHistory] = useState(false);

    // --- OFFLINE SYNC STATE ---
    const [isSyncing, setIsSyncing] = useState(false);

    // Derive offline count directly from cards to ensure UI consistency
    const offlineCount = useMemo(() => cards.filter(c => c.isOffline).length, [cards]);

    // View Mode State: 'active' or 'history'
    const [viewMode, setViewMode] = useState('active');

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        // Client-side filtering only
    };

    // Initial Fetch handled by DataContext background prefetch now.
    // We only refetch if user changes view mode or explicitly refreshes.

    // Auto-refresh when entering page if data is empty (and not loading), just in case prefetch failed or timed out
    // Initial Fetch handled by DataContext background prefetch now.
    // We only refetch if user changes view mode or explicitly refreshes.
    useEffect(() => {
        // Fetch ALL cards so charts show complete data
        fetchFiveSCards('all');
    }, [fetchFiveSCards, user?.companyId, globalFilterCompanyId]); // Trigger refetch on filter change

    const uploadFileToSupabase = useCallback(async (file) => {
        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage.from('images').upload(filePath, file);
        if (error) throw error;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    }, []);

    const syncOfflineCards = useCallback(async () => {
        // Prevent double syncs
        if (isSyncing) return;

        try {
            setIsSyncing(true);

            // 1. Get cards from IDB
            const offlineCards = await offlineService.getAllCards();

            if (offlineCards.length === 0) {
                // If IDB is empty but UI shows offline cards, we have a state mismatch. 
                // Force a refresh.
                if (offlineCount > 0) {
                    alert("No se encontraron datos locales. Actualizando lista...");
                    fetchFiveSCards();
                } else {
                    alert("No hay tarjetas pendientes para sincronizar.");
                }
                return;
            }

            // Notify user we are starting (if called manually)
            console.log(`Intentando sincronizar ${offlineCards.length} tarjetas...`);

            let successCount = 0;
            let errorCount = 0;
            let errors = [];

            for (const cardRecord of offlineCards) {
                try {
                    // Upload Images First
                    let urlBefore = cardRecord.data.image_before;
                    let urlAfter = cardRecord.data.image_after;

                    // Upload Image Before
                    if (cardRecord.files && cardRecord.files.imageBefore instanceof Blob) {
                        urlBefore = await uploadFileToSupabase(cardRecord.files.imageBefore);
                    }

                    // Upload Image After
                    if (cardRecord.files && cardRecord.files.imageAfter instanceof Blob) {
                        urlAfter = await uploadFileToSupabase(cardRecord.files.imageAfter);
                    }

                    // RESOLVE COMPANY ID logic
                    let finalCompanyId = cardRecord.data.company_id;
                    if (!finalCompanyId && user?.companyId) finalCompanyId = user.companyId;
                    if (!finalCompanyId && globalFilterCompanyId !== 'all') finalCompanyId = globalFilterCompanyId;

                    if (!finalCompanyId) {
                        // Fallback for Superadmin or Orphans: don't crash loop, but log error
                        console.error(`Skipping card ${cardRecord.tempId}: No company association found.`);
                        errors.push(`Tarjeta ${cardRecord.tempId}: Sin empresa asociada.`);
                        errorCount++;
                        continue;
                    }

                    // Prepare payload for Supabase
                    const payload = {
                        ...cardRecord.data,
                        image_before: urlBefore,
                        image_after: urlAfter,
                        company_id: finalCompanyId
                    };

                    // Insert to Supabase
                    // Insert to Supabase
                    const { error } = await supabase.from('five_s_cards').insert([payload]);

                    if (error) {
                        // Check for RLS Policy Violation
                        if (error.message.includes("row-level security policy") || error.code === '42501') {
                            console.warn(`RLS Violation for card ${cardRecord.tempId}. Retrying with current user company...`);
                            // Retry with current user's company ID as fallback
                            const fallbackPayload = { ...payload, company_id: user.companyId };
                            const { error: retryError } = await supabase.from('five_s_cards').insert([fallbackPayload]);
                            if (retryError) throw new Error(`RLS Retry Failed: ${retryError.message}`);
                        } else {
                            throw new Error(error.message);
                        }
                    }

                    // Remove from IDB on success
                    await offlineService.deleteCard(cardRecord.tempId);
                    successCount++;

                } catch (err) {
                    console.error(`Failed to sync card ${cardRecord.tempId}:`, err);
                    errorCount++;
                    errors.push(err.message);
                }
            }

            // Always refetch live data to update UI
            await fetchFiveSCards();

            // Feedback
            if (successCount > 0 && errorCount === 0) {
                alert(`¡Sincronización exitosa! Se subieron ${successCount} tarjetas.`);
            } else if (errorCount > 0) {
                alert(`Sincronización parcial.\nSubidas: ${successCount}\nFallidos: ${errorCount}\nErrores: ${errors.join(', ')}`);
            }

        } catch (error) {
            console.error("Critical Sync error:", error);
            alert("Error crítico al sincronizar: " + error.message);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, offlineCount, fetchFiveSCards, uploadFileToSupabase, user, globalFilterCompanyId]);

    // Auto-sync when back online
    useEffect(() => {
        const handleOnline = () => {
            console.log("App is back online! Syncing...");
            syncOfflineCards();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncOfflineCards]);


    // Handle deep linking via query params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cardId = params.get('cardId');
        if (cardId && cards.length > 0) {
            const cardToOpen = cards.find(c => c.id === parseInt(cardId) || c.id === cardId);
            if (cardToOpen) {
                setSelectedCard(cardToOpen);
            }
        }
    }, [location.search, cards]);

    // Filter cards by Company
    const visibleCards = useMemo(() => {
        if (!user) return [];

        // ALWAYS show offline cards (they're local and not yet synced)
        const offlineCards = cards.filter(c => c.isOffline);
        const onlineCards = cards.filter(c => !c.isOffline);

        // ADMIN FILTER LOGIC for ONLINE cards only
        const isSuperAdmin = user.isGlobalAdmin;
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        console.log('FiveS visibleCards filter:', {
            isSuperAdmin,
            targetCompanyId,
            globalFilterCompanyId,
            userCompanyId: user.companyId,
            totalCards: cards.length,
            offlineCards: offlineCards.length,
            onlineCards: onlineCards.length
        });

        let filteredOnlineCards = onlineCards;

        if (targetCompanyId === 'all') {
            // Only Super Admins can see 'all'
            filteredOnlineCards = isSuperAdmin ? onlineCards : [];
        } else if (targetCompanyId) {
            // Filter by specific company
            if (isSuperAdmin) {
                filteredOnlineCards = onlineCards.filter(c => c.companyId == targetCompanyId);
            } else {
                filteredOnlineCards = onlineCards.filter(c => c.companyId == targetCompanyId || !c.companyId);
            }
        }
        // If no targetCompanyId, show all online cards

        // ALWAYS include offline cards at the beginning
        return [...offlineCards, ...filteredOnlineCards];
    }, [cards, user, globalFilterCompanyId]);

    // Listas para filtros y autocompletar
    const personSuggestions = useMemo(() => {
        const usersNames = companyUsers ? companyUsers.map(u => u.full_name) : [];
        const cardNames = visibleCards.map(c => c.responsible).concat(visibleCards.map(c => c.reporter));
        const all = [...usersNames, ...cardNames].filter(n => n && n.trim().length > 0);
        return [...new Set(all)].sort();
    }, [visibleCards, companyUsers]);

    const uniqueLocations = useMemo(() => {
        const locs = visibleCards.map(c => c.location).filter(n => n && n.trim().length > 0);
        return [...new Set(locs)].sort();
    }, [visibleCards]);

    // Filtrado de cartas
    const filteredCards = useMemo(() => {
        return visibleCards.filter(card => {
            const searchLower = searchTerm.toLowerCase();
            const locationMatch = filterLocation ? card.location === filterLocation : true;
            const responsibleMatch = filterResponsible ? card.responsible === filterResponsible : true;

            // Búsqueda general
            const textMatch =
                (card.location?.toLowerCase() || '').includes(searchLower) ||
                (card.article?.toLowerCase() || '').includes(searchLower) ||
                (card.responsible?.toLowerCase() || '').includes(searchLower) ||
                (card.reason?.toLowerCase() || '').includes(searchLower);

            return locationMatch && responsibleMatch && textMatch;
        });
    }, [visibleCards, searchTerm, filterLocation, filterResponsible]);

    // Cálculo de KPIs
    const kpiData = useMemo(() => {
        const total = filteredCards.length;
        if (total === 0) return { statusData: [], locationData: [], completionRate: 0, pending: 0, inProcess: 0, closed: 0, total: 0 };

        const statusCounts = filteredCards.reduce((acc, curr) => {
            // Normalize status for counting
            let status = curr.status;
            if (status === 'En Progreso') status = 'En Proceso';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const closed = statusCounts['Cerrado'] || 0;
        const open = statusCounts['Abierto'] || 0;
        const inProgress = (statusCounts['En Proceso'] || 0) + (statusCounts['En Progreso'] || 0);

        const statusData = [
            { name: 'Cerrado', value: closed, color: '#10b981' },
            { name: 'En Progreso', value: inProgress, color: '#f59e0b' },
            { name: 'Abierto', value: open, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Datos por Ubicación (Top 5)
        const locationCounts = filteredCards.reduce((acc, curr) => {
            acc[curr.location] = (acc[curr.location] || 0) + 1;
            return acc;
        }, {});

        const locationData = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            statusData,
            locationData,
            completionRate: Math.round((closed / total) * 100),
            closed,
            pending: open,
            inProcess: inProgress,
            total
        };
    }, [filteredCards]);


    // Filter for Grid Display (Active vs History)
    const gridCards = useMemo(() => {
        return filteredCards.filter(c => {
            if (viewMode === 'active') return c.status !== 'Cerrado';
            if (viewMode === 'history') return c.status === 'Cerrado';
            return true;
        });
    }, [filteredCards, viewMode]);


    // Abrir Modal para Nueva Tarjeta
    const handleNewCard = () => {
        setSelectedCard({
            id: null, // ID null indica nueva tarjeta
            date: new Date().toISOString().split('T')[0],
            location: '',
            article: '',
            reporter: '',
            reason: '',
            proposedAction: '',
            responsible: '',
            targetDate: '',
            solutionDate: '',
            status: 'Abierto',
            statusColor: '#ef4444',
            type: 'Mejora', // Default category (shown as Mejora, saved as Otro)
            category: 'Mejora',
            imageBefore: null,
            imageAfter: null
        });
    };

    // Abrir Modal Edición
    const handleCardClick = (card) => {
        // Normalize status for UI if needed
        let uiStatus = card.status;
        let uiColor = card.statusColor || '#ef4444';

        if (uiStatus === 'En Proceso') {
            uiStatus = 'En Progreso'; // Normalize to matches Dropdown option
            uiColor = '#f59e0b';
        }

        setSelectedCard({
            ...card,
            status: uiStatus,
            statusColor: uiColor,
            company_id: card.companyId || card.company_id // Normalize for form selector
        });
    };

    // ... existing helper

    // Guardar Tarjeta (Offline Aware)
    const handleSaveCard = async () => {
        if (!selectedCard.location || !selectedCard.reason) {
            alert("Por favor completa al menos la ubicación y el hallazgo.");
            return;
        }

        // Validación: No permitir cerrar sin imágenes
        if (selectedCard.status === 'Cerrado') {
            if (!selectedCard.imageBefore || !selectedCard.imageAfter) {
                alert("Para cerrar la tarjeta, debes adjuntar ambas evidencias fotográficas (Antes y Después).");
                return;
            }
        }

        // AUTO-ASSIGN COMPANY based on Responsible
        let idToAssign = selectedCard.company_id || selectedCard.companyId;

        // If we don't have an explicit company assigned, try to deduce from responsible user
        if (!idToAssign && companyUsers && selectedCard.responsible) {
            const responsibleUser = companyUsers.find(u => u.full_name === selectedCard.responsible);
            if (responsibleUser && responsibleUser.company_id) idToAssign = responsibleUser.company_id;
        }

        // Fallback to current context
        if (!idToAssign) {
            idToAssign = user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null);
        }

        // Validate Company ID
        if (!idToAssign) {
            console.warn("No company ID found for card. Card will be saved without company association.");
        }

        // Valid categories for DB constraint
        const validCategories = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke', 'Seguridad', 'Otro'];
        let category = selectedCard.type || selectedCard.category || 'Mejora';

        // Map "Mejora" to "Otro" for database (but show as "Mejora" in UI)
        if (category === 'Mejora') category = 'Otro';

        const finalCategory = validCategories.includes(category) ? category : 'Otro';

        // Validate Status for DB constraint
        // DB expects: 'Abierto', 'En Proceso', 'Cerrado'
        // UI might use: 'Abierto', 'En Progreso', 'Cerrado'
        let finalStatus = selectedCard.status;
        if (finalStatus === 'En Progreso') finalStatus = 'En Proceso';

        const validStatuses = ['Abierto', 'En Proceso', 'Cerrado'];
        if (!validStatuses.includes(finalStatus)) finalStatus = 'Abierto';

        // Find the UUID for the responsible user if possible
        let assignedToUserId = null;
        if (selectedCard.responsible && companyUsers) {
            const responsibleUser = companyUsers.find(u => u.full_name === selectedCard.responsible);
            if (responsibleUser) {
                assignedToUserId = responsibleUser.id;
            }
        }

        const cardData = {
            // created_at is auto-generated by DB
            area: selectedCard.location || selectedCard.area, // Map frontend 'location' to DB 'area'
            description: selectedCard.article || selectedCard.description, // Map 'article' to 'description'
            findings: selectedCard.reason || selectedCard.findings, // Map 'reason' to 'findings'
            status: finalStatus,
            category: finalCategory, // Validated category
            due_date: selectedCard.targetDate || selectedCard.due_date || null,
            close_date: selectedCard.solutionDate || selectedCard.close_date || null,
            closure_comment: selectedCard.proposedAction || selectedCard.closure_comment || null,
            company_id: idToAssign,
            assigned_to: assignedToUserId // Mapped UUID
        };

        const isOffline = !window.navigator.onLine;
        const isEditingOfflineCard = selectedCard.id && selectedCard.isOffline;

        try {
            // Priority 1: If editing an existing OFFLINE card
            if (isEditingOfflineCard) {
                // Check if card is ready to sync (has all required data)
                const hasResponsible = selectedCard.responsible && selectedCard.responsible.trim().length > 0;
                const hasLocation = selectedCard.location && selectedCard.location.trim().length > 0;
                const hasReason = selectedCard.reason && selectedCard.reason.trim().length > 0;
                const isReadyToSync = hasResponsible && hasLocation && hasReason;

                if (isReadyToSync && window.navigator.onLine) {
                    // Card is complete, sync to server
                    console.log('Offline card is complete, syncing to server...');
                    // Fall through to online save logic below
                } else {
                    // Update locally only
                    const savePayload = { ...cardData };
                    await offlineService.updateCard(
                        selectedCard.id,
                        savePayload,
                        selectedCard.imageBeforeFile,
                        selectedCard.imageAfterFile
                    );

                    // Update the card in state
                    const updatedCard = {
                        ...selectedCard,
                        ...cardData,
                        companyId: cardData.company_id,
                        location: cardData.area,
                        article: cardData.description,
                        reason: cardData.findings,
                    };
                    updateFiveSCard(selectedCard.id, updatedCard);

                    alert(isReadyToSync ?
                        "Sin conexión: Tarjeta actualizada. Se sincronizará cuando recuperes la conexión." :
                        "Tarjeta local actualizada. Agrega responsable y detalles para sincronizar al servidor.");
                    handleCloseModal();
                    return;
                }
            }

            if (isOffline) {
                // --- OFFLINE SAVE (new card) ---
                if (selectedCard.id) {
                    // Check if we are updating a local offline card
                    if (selectedCard.isOffline) {
                        const savePayload = { ...cardData };
                        await offlineService.updateCard(
                            selectedCard.id,
                            savePayload,
                            selectedCard.imageBeforeFile,
                            selectedCard.imageAfterFile
                        );

                        // Optimistic Update
                        updateFiveSCard(selectedCard.id, {
                            ...selectedCard,
                            ...cardData,
                            // Ensure previews are kept if no new file
                            imageBefore: selectedCard.imageBefore,
                            imageAfter: selectedCard.imageAfter
                        });

                        alert("Tarjeta local actualizada.");
                        handleCloseModal();
                        return;
                    } else {
                        alert("En modo offline solo puedes crear nuevas tarjetas o editar las locales (pendientes).");
                        return;
                    }
                }

                // Prepare file blobs for saving
                const savePayload = { ...cardData };

                const savedRecord = await offlineService.saveCard(
                    savePayload,
                    selectedCard.imageBeforeFile,
                    selectedCard.imageAfterFile
                );

                // Create Optimistic UI Card
                const optimisticCard = {
                    id: savedRecord.tempId,
                    cardNumber: 'OFF',
                    ...cardData,
                    companyId: cardData.company_id, // Map snake_case to camelCase for UI
                    location: cardData.area, // Map area back to location for UI
                    article: cardData.description, // Map description back to article for UI
                    reason: cardData.findings, // Map findings back to reason for UI
                    status: 'Abierto',
                    statusColor: '#ef4444',
                    isOffline: true,
                    // Create preview URLs for immediate display
                    imageBefore: selectedCard.imageBeforeFile ? URL.createObjectURL(selectedCard.imageBeforeFile) : selectedCard.imageBefore,
                    imageAfter: selectedCard.imageAfterFile ? URL.createObjectURL(selectedCard.imageAfterFile) : selectedCard.imageAfter,
                    files: {
                        imageBefore: selectedCard.imageBeforeFile,
                        imageAfter: selectedCard.imageAfterFile
                    }
                };

                // Add to state immediately (prepend) via context
                addFiveSCard(optimisticCard);

                alert("Sin conexión: Tarjeta guardada localmente. Se subirá automáticamente cuando recuperes la conexión, o puedes sincronizar manualmente.");
                handleCloseModal();

            } else {
                // --- ONLINE SAVE ---
                let finalUrlBefore = selectedCard.imageBefore;
                let finalUrlAfter = selectedCard.imageAfter;

                // Handle Promoting Offline to Online (Ensure we have files)
                if (selectedCard.isOffline) {
                    // Try to recover Blob files from 'files' property if not in 'imageXFile'
                    const files = selectedCard.files || {};
                    if (!selectedCard.imageBeforeFile && files.imageBefore instanceof Blob) {
                        selectedCard.imageBeforeFile = files.imageBefore;
                    }
                    if (!selectedCard.imageAfterFile && files.imageAfter instanceof Blob) {
                        selectedCard.imageAfterFile = files.imageAfter;
                    }
                }

                // Guard: Prevent saving Blob URLs without upload
                if (finalUrlBefore && typeof finalUrlBefore === 'string' && finalUrlBefore.startsWith('blob:') && !selectedCard.imageBeforeFile) {
                    console.error("Invalid state: Blob URL present but no file to upload (Before)", selectedCard);
                    alert("Error de estado: Imagen 'Antes' inválida o perdida. Por favor selecciona la imagen nuevamente.");
                    return;
                }
                if (finalUrlAfter && typeof finalUrlAfter === 'string' && finalUrlAfter.startsWith('blob:') && !selectedCard.imageAfterFile) {
                    console.error("Invalid state: Blob URL present but no file to upload (After)", selectedCard);
                    alert("Error de estado: Imagen 'Después' inválida o perdida. Por favor selecciona la imagen nuevamente.");
                    return;
                }

                if (selectedCard.imageBeforeFile) {
                    finalUrlBefore = await uploadFileToSupabase(selectedCard.imageBeforeFile);
                }
                if (selectedCard.imageAfterFile) {
                    finalUrlAfter = await uploadFileToSupabase(selectedCard.imageAfterFile);
                }

                cardData.image_url = finalUrlBefore;
                cardData.after_image_url = finalUrlAfter;

                const isPromotingOffline = selectedCard.isOffline && selectedCard.id;

                if (selectedCard.id && !isPromotingOffline) {
                    // Normal Update
                    const { error } = await supabase
                        .from('five_s_cards')
                        .update(cardData)
                        .eq('id', selectedCard.id);

                    if (error) throw error;

                    // Log Audit Update
                    AuditService.logAction('UPDATE', '5S_CARD', selectedCard.id, {
                        changes: cardData,
                        previousStatus: selectedCard.status
                    });

                    // Optimistic update via context
                    updateFiveSCard(selectedCard.id, {
                        ...cardData,
                        companyId: cardData.company_id, // Fix: Explicitly update camelCase field for frontend state
                        statusColor: cardData.status === 'Cerrado' ? '#10b981' : (cardData.status === 'En Progreso' ? '#f59e0b' : '#ef4444')
                    });
                } else {
                    // Insert (New or Promotion)
                    let { data, error } = await supabase
                        .from('five_s_cards')
                        .insert([cardData])
                        .select();

                    // RLS Fallback Retry
                    if (error && (error.message.includes("row-level security policy") || error.code === '42501')) {
                        console.warn("RLS Violation during insert. Retrying with current user company...");
                        const fallbackData = { ...cardData, company_id: user.companyId };
                        const retryResult = await supabase
                            .from('five_s_cards')
                            .insert([fallbackData])
                            .select();

                        data = retryResult.data;
                        error = retryResult.error;
                    }

                    if (error) throw error;

                    // Log Audit Create
                    if (data && data[0]) {
                        AuditService.logAction('CREATE', '5S_CARD', data[0].id, {
                            initialData: cardData
                        });
                    }

                    // Clean up offline logic
                    if (isPromotingOffline) {
                        await offlineService.deleteCard(selectedCard.id);
                        removeFiveSCard(selectedCard.id);
                    }

                    if (data) fetchFiveSCards(); // Re-fetch to get correct ID/Number
                }
                handleCloseModal();
            }
        } catch (error) {
            console.error("Error saving card:", error);
            let msg = error.message;
            if (msg.includes("violates not-null constraint") || msg.includes("company_card_counters")) {
                msg = "Error interno de base de datos (conteo de tarjetas). Por favor contacta a soporte.";
            } else if (msg.includes("upload")) {
                msg = "Error al subir imagen. Verifica tu conexión.";
            }
            alert("Error al guardar la tarjeta: " + msg);
        }
    };


    const handleDeleteCard = async () => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta tarjeta? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            if (selectedCard.isOffline) {
                // Offline delete
                await offlineService.deleteCard(selectedCard.id);
                removeFiveSCard(selectedCard.id);
                alert("Tarjeta local eliminada.");
            } else {
                // Online delete
                const { error } = await supabase
                    .from('five_s_cards')
                    .delete()
                    .eq('id', selectedCard.id);

                if (error) throw error;

                // Log Audit Delete
                AuditService.logAction('DELETE', '5S_CARD', selectedCard.id, {
                    deletedData: {
                        location: selectedCard.location,
                        reason: selectedCard.reason,
                        cardNumber: selectedCard.cardNumber,
                        responsible: selectedCard.responsible
                    }
                });

                removeFiveSCard(selectedCard.id);
                alert("Tarjeta eliminada correctamente.");
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error deleting card:", error);
            alert("Error al eliminar la tarjeta: " + error.message);
        }
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
    };

    const handleFileSelect = (field, file, previewUrl) => {
        // field is 'imageBefore' or 'imageAfter'
        // Atomic update to ensure both URL and File are set together
        setSelectedCard(prev => ({
            ...prev,
            [field]: previewUrl,
            [`${field}File`]: file
        }));
    };

    // Replace updateField to handle generic
    const updateField = (field, value) => {
        setSelectedCard(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <HeaderWithFilter
                title="Tarjetas 5S"
                subtitle="Gestión visual de anomalías y mejoras continuas"
            >
                <button
                    onClick={handleNewCard}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm shadow-brand-500/30 hover:shadow-brand-500/50 font-medium active:scale-95"
                >
                    <Plus size={20} />
                    <span>Nueva Tarjeta</span>
                </button>
            </HeaderWithFilter>

            {/* View Mode Toggles */}
            <div className="flex gap-2">
                <button
                    onClick={() => handleViewModeChange('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'active'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Activas
                </button>
                <button
                    onClick={() => handleViewModeChange('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'history'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Historial (Cerradas)
                </button>
                <button
                    onClick={() => handleViewModeChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'all'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    Todas
                </button>
            </div>

            {/* Action Bar & Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por ubicación, artículo, responsable..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm outline-none text-black placeholder-slate-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtros Dropdown */}
                <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                    <div className="relative min-w-[200px]">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm appearance-none outline-none cursor-pointer text-black font-medium"
                            value={filterResponsible}
                            onChange={(e) => setFilterResponsible(e.target.value)}
                        >
                            <option value="" className="text-gray-500">Todos los Responsables</option>
                            {personSuggestions.map((p, i) => <option key={i} value={p} className="text-black">{p}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[180px]">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm appearance-none outline-none cursor-pointer text-black font-medium"
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                        >
                            <option value="" className="text-gray-500">Todas las Áreas</option>
                            {uniqueLocations.map((l, i) => <option key={i} value={l} className="text-black">{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {(filterResponsible || filterLocation || searchTerm) && (
                        <button
                            onClick={() => { setFilterResponsible(''); setFilterLocation(''); setSearchTerm(''); }}
                            className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                            title="Limpiar Filtros"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                        title="Ver Historial de Cambios"
                    >
                        <Clock size={20} />
                    </button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading && cards.length === 0 ? (
                    // SKELETON LOADERS
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[380px] animate-pulse">
                            <div className="h-1.5 bg-slate-200 w-full mb-0"></div>
                            <div className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-6 w-16 bg-slate-200 rounded"></div>
                                    <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                                    <div className="h-4 w-full bg-slate-200 rounded"></div>
                                    <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-0.5 mb-4 h-32">
                                    <div className="bg-slate-200 h-full w-full"></div>
                                    <div className="bg-slate-200 h-full w-full"></div>
                                </div>
                                <div className="mt-auto pt-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-slate-200"></div>
                                        <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                    </div>
                                    <div className="h-4 w-16 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : gridCards.length > 0 ?
                    gridCards.map((card) => (
                        <div
                            key={card.id}
                            className={`group bg-white rounded-xl shadow-sm border ${card.isOffline ? 'border-dashed border-slate-400 bg-slate-50' : 'border-slate-200'} overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full`}
                            onClick={() => handleCardClick(card)}

                        >
                            {/* Status Bar */}
                            <div className={`h-1.5 w-full transition-all ${card.isOffline ? 'bg-slate-400' : ''}`} style={{ backgroundColor: !card.isOffline ? card.statusColor : undefined }}></div>

                            <div className="p-5 flex flex-col flex-1">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors ${card.isOffline
                                        ? 'bg-slate-200 text-slate-600 border-slate-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100'
                                        }`}>
                                        #{!isNaN(card.cardNumber) ? String(card.cardNumber).padStart(3, '0') : (card.cardNumber || '?')}
                                    </span>
                                    {card.isOffline ? (
                                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded-full border border-yellow-200">
                                            <CloudOff size={12} /> Pendiente
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                            {card.date}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="mb-4">
                                    <h4 className="font-bold text-slate-800 mb-1 line-clamp-1 text-lg group-hover:text-brand-600 transition-colors">{card.location}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed h-[42px]">{card.reason}</p>
                                </div>

                                {/* Images */}
                                <div className="grid grid-cols-2 gap-0.5 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-4 h-32 relative">
                                    {card.imageBefore ? (
                                        <div className="relative h-full overflow-hidden w-full">
                                            <img src={card.imageBefore} alt="Antes" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] uppercase font-bold text-center py-1 backdrop-blur-sm">Antes</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-slate-50 text-slate-300 w-full">
                                            <Camera size={20} />
                                        </div>
                                    )}

                                    {card.imageAfter ? (
                                        <div className="relative h-full overflow-hidden w-full">
                                            <img src={card.imageAfter} alt="Después" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-white text-[9px] uppercase font-bold text-center py-1 backdrop-blur-sm">Después</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-slate-50 text-slate-200 border-l border-slate-200 w-full">
                                            {card.imageBefore && <ArrowRight size={16} className="text-slate-300" />}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center bg-white">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white shadow-sm ring-1 ring-slate-100">
                                            {card.responsible ? card.responsible.charAt(0) : '?'}
                                        </div>
                                        <span className="text-xs font-medium text-slate-600 truncate max-w-[90px]">{card.responsible || 'Sin asignar'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: card.statusColor }}></div>
                                        <span className="text-xs font-bold" style={{ color: card.statusColor }}>{card.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No se encontraron tarjetas</h3>
                            <p className="text-slate-500">Intenta ajustar los filtros de búsqueda.</p>
                        </div>
                    )}
            </div>

            {/* KPI Dashboard Section (Footer) */}
            {
                filteredCards.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 mt-8">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-lg">
                                <BarIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Indicadores de Gestión</h3>
                                <p className="text-sm text-slate-500">Análisis visual de anomalías y mejoras</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Stats Cards Column */}
                            <div className="grid grid-cols-2 gap-4 content-start">
                                <StatCard
                                    title="Total Tarjetas"
                                    value={kpiData.total}
                                    variant="blue"
                                    type="outlined"
                                />
                                <StatCard
                                    title="Cumplimiento"
                                    value={`${kpiData.completionRate}%`}
                                    variant="green"
                                    type="outlined"
                                />
                                <StatCard
                                    title="Abierto"
                                    value={kpiData.pending}
                                    variant="red"
                                    type="outlined"
                                />
                                <StatCard
                                    title="En Progreso"
                                    value={kpiData.inProcess}
                                    variant="orange"
                                    type="outlined"
                                />
                            </div>

                            {/* Charts Columns */}
                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-center text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                                    Distribución por Estado
                                </h4>
                                <div className="h-[200px]" style={{ width: '100%', height: 200 }}>
                                    {kpiData.statusData && kpiData.statusData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={kpiData.statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {kpiData.statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
                                            No hay datos registrados
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-center text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                                    Top Áreas con Hallazgos
                                </h4>
                                <div className="h-[200px]" style={{ width: '100%', height: 200 }}>
                                    {kpiData.locationData && kpiData.locationData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={kpiData.locationData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={100}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
                                            No hay áreas registradas
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Detalle */}
            {
                selectedCard && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
                        <div
                            className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto max-w-4xl max-h-[100vh] md:max-h-[90vh] overflow-y-auto flex flex-col"
                        >
                            {/* Modal Header with Action Icons */}
                            <div className="px-4 md:px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${selectedCard.id ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'}`}>
                                        {selectedCard.id ? <FileText size={20} /> : <Plus size={20} />}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            {selectedCard.id ? (
                                                <>
                                                    Tarjeta {companies.find(c => c.id === selectedCard.company_id)?.name} #{String(selectedCard.cardNumber).padStart(3, '0')}
                                                </>
                                            ) : 'Nueva Tarjeta 5S'}
                                        </h2>
                                        <p className="text-xs text-slate-500 hidden sm:block">
                                            Complete la información del hallazgo
                                        </p>
                                    </div>
                                </div>

                                {/* Action Icons */}
                                <div className="flex items-center gap-2">
                                    {/* Delete Button */}
                                    {selectedCard.id && (
                                        <button
                                            onClick={handleDeleteCard}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    )}
                                    {/* Save Button */}
                                    <button
                                        onClick={handleSaveCard}
                                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                                        title="Guardar"
                                    >
                                        <Save size={22} />
                                    </button>
                                    {/* Close Button */}
                                    <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content - Form Grid */}
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                <datalist id="person-suggestions">
                                    {personSuggestions.map((name, index) => (
                                        <option key={index} value={name} />
                                    ))}
                                </datalist>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <Calendar size={16} className="text-slate-400" /> Fecha Tarjeta
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                        value={formatDateForInput(selectedCard.date) || ''}
                                        onChange={e => updateField('date', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <MapPin size={16} className="text-slate-600" /> Ubicación
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium text-black placeholder-slate-500 shadow-sm"
                                        value={selectedCard.location || ''}
                                        onChange={e => updateField('location', e.target.value)}
                                        placeholder="Ej: Pasillo 4, Línea 2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <FileText size={16} className="text-slate-600" /> Artículo / Equipo
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium text-black placeholder-slate-500 shadow-sm"
                                        value={selectedCard.article || ''}
                                        onChange={e => updateField('article', e.target.value)}
                                        placeholder="Ej: Estantería B, Motor 3"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <User size={16} className="text-slate-600" /> Reportado Por
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium text-black placeholder-slate-500 shadow-sm"
                                        value={selectedCard.reporter || ''}
                                        onChange={e => updateField('reporter', e.target.value)}
                                        list="person-suggestions"
                                        placeholder="Escribe o selecciona..."
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <AlertCircle size={16} className="text-amber-500" /> Razón de Tarjeta (Hallazgo)
                                    </label>
                                    <textarea
                                        className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none shadow-sm font-medium text-black placeholder-slate-500"
                                        rows="3"
                                        value={selectedCard.reason || ''}
                                        onChange={e => updateField('reason', e.target.value)}
                                        placeholder="Describe detalladamente la anomalía detectada..."
                                    ></textarea>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <CheckCircle size={16} className="text-emerald-600" /> Acción Propuesta
                                    </label>
                                    <textarea
                                        className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none shadow-sm font-medium text-black placeholder-slate-500"
                                        rows="2"
                                        value={selectedCard.proposedAction || ''}
                                        onChange={e => updateField('proposedAction', e.target.value)}
                                        placeholder="Describe la acción correctiva sugerida..."
                                    ></textarea>
                                </div>

                                {/* Categoría 5S (SOLES) */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <Activity size={16} className="text-indigo-600" /> Categoría 5S (SOLES)
                                    </label>
                                    <select
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm text-black font-medium cursor-pointer"
                                        value={selectedCard.type || selectedCard.category || 'Mejora'}
                                        onChange={e => updateField('type', e.target.value)}
                                    >
                                        <option value="Seiri">Seiri (Clasificar)</option>
                                        <option value="Seiton">Seiton (Ordenar)</option>
                                        <option value="Seiso">Seiso (Limpiar)</option>
                                        <option value="Seiketsu">Seiketsu (Estandarizar)</option>
                                        <option value="Shitsuke">Shitsuke (Disciplina)</option>
                                        <option value="Seguridad">Seguridad</option>
                                        <option value="Mejora">Mejora</option>
                                    </select>
                                </div>

                                <hr className="md:col-span-2 border-slate-100 my-2" />

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <User size={16} className="text-slate-600" /> Responsable Asignado
                                    </label>
                                    <select
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm text-black font-medium"
                                        value={selectedCard.responsible || ''}
                                        onChange={e => updateField('responsible', e.target.value)}
                                    >
                                        <option value="" disabled>Selecciona Responsable</option>
                                        {companyUsers && companyUsers.length > 0 ? (
                                            companyUsers.map(u => (
                                                <option key={u.id} value={u.full_name}>{u.full_name}</option>
                                            ))
                                        ) : (
                                            <>
                                                {selectedCard.responsible && <option value={selectedCard.responsible}>{selectedCard.responsible}</option>}
                                                <option value="" disabled>No hay usuarios disponibles</option>
                                            </>

                                        )}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <Activity size={16} className="text-slate-600" /> Estado
                                    </label>
                                    <select
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium shadow-sm text-black cursor-pointer"
                                        value={selectedCard.status || 'Abierto'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            let color = '#ef4444';
                                            if (val === 'En Progreso') color = '#f59e0b';
                                            if (val === 'Cerrado') color = '#10b981';
                                            setSelectedCard(prev => ({ ...prev, status: val, statusColor: color }));
                                        }}
                                    >
                                        <option value="Abierto">Abierto</option>
                                        <option value="En Progreso">En Progreso</option>
                                        <option value="Cerrado">Cerrado</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-black flex items-center gap-2">
                                        <Clock size={16} className="text-slate-600" /> Fecha Propuesta
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm text-black font-medium"
                                        value={formatDateForInput(selectedCard.targetDate) || ''}
                                        onChange={e => updateField('targetDate', e.target.value)}
                                    />
                                </div>

                            </div>

                            <div className="space-y-2">
                                <label className={`text-sm font-bold flex items-center gap-2 ${selectedCard.status === 'Cerrado' ? 'text-emerald-700' : 'text-slate-500'}`}>
                                    <CheckCircle size={16} /> Fecha Solución
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:border-slate-300 disabled:cursor-not-allowed shadow-sm text-black font-medium"
                                    value={formatDateForInput(selectedCard.solutionDate) || ''}
                                    onChange={e => updateField('solutionDate', e.target.value)}
                                    disabled={selectedCard.status !== 'Cerrado'}
                                />
                            </div>

                            {/* Sección de Imágenes */}
                            <div className="md:col-span-2 mt-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Camera size={18} className="text-brand-500" /> Evidencia Fotográfica
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Antes */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">1. El Problema (Antes)</span>
                                            {selectedCard.imageBefore && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12} /> Cargada</span>}
                                        </div>
                                        <div className="h-48 bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden hover:border-brand-400 transition-colors group relative">
                                            {/* Mobile Camera First approach */}
                                            <div className="block md:hidden h-full">
                                                <CameraCapture
                                                    currentImage={selectedCard.imageBefore}
                                                    onCapture={(file, url) => handleFileSelect('imageBefore', file, url)}
                                                    label="Tomar Foto (Antes)"
                                                />
                                            </div>
                                            {/* Desktop existing component */}
                                            <div className="hidden md:block h-full">
                                                <ImageUpload
                                                    currentImage={selectedCard.imageBefore}
                                                    onFileSelect={(file, url) => handleFileSelect('imageBefore', file, url)}
                                                    placeholderText="Subir foto del hallazgo"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Después */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">2. La Solución (Después)</span>
                                            {selectedCard.imageAfter && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={12} /> Cargada</span>}
                                        </div>
                                        <div className="h-48 bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden hover:border-brand-400 transition-colors group relative">
                                            {/* Mobile Camera First approach */}
                                            <div className="block md:hidden h-full">
                                                <CameraCapture
                                                    currentImage={selectedCard.imageAfter}
                                                    onCapture={(file, url) => handleFileSelect('imageAfter', file, url)}
                                                    label="Tomar Foto (Después)"
                                                />
                                            </div>
                                            {/* Desktop existing component */}
                                            <div className="hidden md:block h-full">
                                                <ImageUpload
                                                    currentImage={selectedCard.imageAfter}
                                                    onFileSelect={(file, url) => handleFileSelect('imageAfter', file, url)}
                                                    placeholderText="Subir foto de la mejora"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }

            {
                !selectedCard && (
                    <MobileFab icon={Camera} onClick={handleNewCard} label="Nueva Tarjeta 5S" />
                )
            }

            {
                showHistory && (
                    <AuditHistoryModal onClose={() => setShowHistory(false)} />
                )
            }

        </div >
    );
};

// Componente para ver historial
const AuditHistoryModal = ({ onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            const data = await AuditService.getLogs('5S_CARD', 50);
            setLogs(data);
            setLoading(false);
        };
        loadLogs();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock size={20} className="text-slate-500" />
                        Historial de Cambios
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">Cargando historial...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">No hay registros de cambios recientes.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold text-xs px-2 py-0.5 rounded ${log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {log.action === 'DELETE' ? 'ELIMINADO' : log.action === 'CREATE' ? 'CREADO' : 'MODIFICADO'}
                                    </span>
                                    <span className="text-slate-400 text-xs">
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-slate-600">
                                    {log.user_email && <div className="text-xs text-slate-400 mb-1">Por: {log.user_email}</div>}
                                    {log.action === 'DELETE' && log.details?.deletedData && (
                                        <div className="mt-1 p-2 bg-white rounded border border-slate-100">
                                            <div><strong>Ubicación:</strong> {log.details.deletedData.location}</div>
                                            <div><strong>Razón:</strong> {log.details.deletedData.reason}</div>
                                            <div><strong>Responsable:</strong> {log.details.deletedData.responsible}</div>
                                        </div>
                                    )}
                                    {log.action === 'UPDATE' && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Tarjeta ID: {log.entity_id} actualizada.
                                        </div>
                                    )}
                                    {log.action === 'CREATE' && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Nueva tarjeta creada.
                                            {log.details?.initialData?.location && <span> ({log.details.initialData.location})</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Start of dummy Save icon component for fix


export default FiveSPage;
