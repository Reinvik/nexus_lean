import { useState, useMemo, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offlineService';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, Camera, X, Calendar, MapPin, User, FileText, CheckCircle, AlertCircle, Clock, BarChart as BarIcon, ChevronDown, Activity, ArrowRight, Trash2, CloudOff } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AuditService } from '../services/AuditService';
import ImageUpload from '../components/ImageUpload';
import StatCard from '../components/StatCard';
import MobileFab from '../components/mobile/MobileFab';
import CameraCapture from '../components/mobile/CameraCapture';

const FiveSPage = () => {
    const { user, companyUsers, globalFilterCompanyId } = useAuth();
    const { fiveSCards: cards, loadingFiveS: loading, fetchFiveSCards, addFiveSCard, updateFiveSCard, removeFiveSCard } = useData();
    const location = useLocation();
    const [selectedCard, setSelectedCard] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterResponsible, setFilterResponsible] = useState('');
    const [filterLocation, setFilterLocation] = useState('');

    const [showHistory, setShowHistory] = useState(false);

    // --- OFFLINE SYNC STATE ---
    const [isSyncing, setIsSyncing] = useState(false);

    // Derive offline count directly from cards to ensure UI consistency
    const offlineCount = useMemo(() => cards.filter(c => c.isOffline).length, [cards]);

    // Fetch on Mount
    useEffect(() => {
        if (user) {
            fetchFiveSCards();
        }
    }, [user, fetchFiveSCards]);

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

                    // Prepare payload for Supabase
                    const payload = {
                        ...cardRecord.data,
                        image_before: urlBefore,
                        image_after: urlAfter,
                        company_id: cardRecord.data.company_id || user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null)
                    };

                    // Insert to Supabase
                    const { error } = await supabase.from('five_s_cards').insert([payload]);
                    if (error) throw new Error(error.message);

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

        // ADMIN FILTER LOGIC
        const isSuperAdmin = user.role === 'admin' || user.email === 'ariel.mellag@gmail.com';
        const targetCompanyId = isSuperAdmin ? globalFilterCompanyId : user.companyId;

        if (targetCompanyId === 'all') return cards;
        if (!targetCompanyId) return cards; // If no company ID (e.g. fallback), show what RLS returns

        // Use loose equality (==) to handle string '1' vs number 1 mismatch
        return cards.filter(c => c.companyId == targetCompanyId || c.responsible === user.name || !c.companyId);
    }, [cards, user, globalFilterCompanyId]);

    // Listas para filtros y autocompletar
    const personSuggestions = useMemo(() => {
        const usersNames = companyUsers ? companyUsers.map(u => u.name) : [];
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
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});

        const closed = statusCounts['Cerrado'] || 0;
        const pending = statusCounts['Pendiente'] || 0;
        const inProcess = statusCounts['En Proceso'] || 0;

        const statusData = [
            { name: 'Cerrado', value: closed, color: '#10b981' },
            { name: 'En Proceso', value: inProcess, color: '#f59e0b' },
            { name: 'Pendiente', value: pending, color: '#ef4444' },
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
            pending,
            inProcess,
            total
        };
    }, [filteredCards]);


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
            status: 'Pendiente',
            statusColor: '#ef4444',
            type: 'Clasificar',
            imageBefore: null,
            imageAfter: null
        });
    };

    // Abrir Modal Edición
    const handleCardClick = (card) => {
        setSelectedCard({ ...card });
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
        let idToAssign = selectedCard.companyId;
        if (companyUsers && selectedCard.responsible) {
            const responsibleUser = companyUsers.find(u => u.name === selectedCard.responsible);
            if (responsibleUser && responsibleUser.company_id) idToAssign = responsibleUser.company_id;
        }
        if (!idToAssign) {
            idToAssign = user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null);
        }

        // Prepare Base Data
        const cardData = {
            date: selectedCard.date,
            location: selectedCard.location,
            article: selectedCard.article,
            reporter: selectedCard.reporter,
            reason: selectedCard.reason,
            proposed_action: selectedCard.proposedAction,
            responsible: selectedCard.responsible,
            target_date: selectedCard.targetDate || null,
            solution_date: selectedCard.solutionDate || null,
            status: selectedCard.status,
            type: selectedCard.type,
            company_id: idToAssign
        };

        const isOffline = !window.navigator.onLine;

        try {
            if (isOffline) {
                // --- OFFLINE SAVE ---
                if (selectedCard.id) {
                    alert("En modo offline solo puedes crear nuevas tarjetas, no editar existentes.");
                    return;
                }

                // Prepare file blobs for saving
                // We expect 'imageBeforeFile' and 'imageAfterFile' to be present if new files were selected

                // Clean data for storage (remove UI props)
                const savePayload = { ...cardData };
                // Note: image_before/after URLs are not useful for offline DB, we need the files.
                // The service handles the 'files' object separately.

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
                    status: 'Pendiente de subir',
                    statusColor: '#94a3b8',
                    isOffline: true,
                    // Create preview URLs for immediate display
                    imageBefore: selectedCard.imageBeforeFile ? URL.createObjectURL(selectedCard.imageBeforeFile) : selectedCard.imageBefore,
                    imageAfter: selectedCard.imageAfterFile ? URL.createObjectURL(selectedCard.imageAfterFile) : selectedCard.imageAfter,
                };

                // Add to state immediately (prepend) via context
                addFiveSCard(optimisticCard);

                alert("Sin conexión: Tarjeta guardada localmente. Se subirá automáticamente cuando recuperes la conexión.");
                handleCloseModal();

            } else {
                // --- ONLINE SAVE ---
                let finalUrlBefore = selectedCard.imageBefore;
                let finalUrlAfter = selectedCard.imageAfter;

                if (selectedCard.imageBeforeFile) {
                    finalUrlBefore = await uploadFileToSupabase(selectedCard.imageBeforeFile);
                }
                if (selectedCard.imageAfterFile) {
                    finalUrlAfter = await uploadFileToSupabase(selectedCard.imageAfterFile);
                }

                cardData.image_before = finalUrlBefore;
                cardData.image_after = finalUrlAfter;

                if (selectedCard.id) {
                    // Update
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
                        statusColor: cardData.status === 'Cerrado' ? '#10b981' : (cardData.status === 'En Proceso' ? '#f59e0b' : '#ef4444')
                    });
                } else {
                    // Insert
                    const { data, error } = await supabase
                        .from('five_s_cards')
                        .insert([cardData])
                        .select();

                    if (error) throw error;

                    // Log Audit Create
                    if (data && data[0]) {
                        AuditService.logAction('CREATE', '5S_CARD', data[0].id, {
                            initialData: cardData
                        });
                    }

                    if (data) fetchFiveSCards(); // Re-fetch to get correct ID/Number
                }
                handleCloseModal();
            }
        } catch (error) {
            console.error("Error saving card:", error);
            alert("Error al guardar la tarjeta: " + error.message);
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
        // We set the preview URL to the main field so the UI shows it
        // We set the FILE object to a shadow field 'imageBeforeFile'
        updateField(field, previewUrl);
        updateField(field + 'File', file);
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

                    {offlineCount > 0 && (
                        <button
                            onClick={syncOfflineCards}
                            disabled={isSyncing}
                            className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm font-medium transition-all ${isSyncing
                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/30'
                                }`}
                        >
                            {isSyncing ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                                    <span>Sincronizando...</span>
                                </>
                            ) : (
                                <>
                                    <CloudOff size={20} />
                                    <span>Sincronizar ({offlineCount})</span>
                                </>
                            )}
                        </button>
                    )}
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
                ) : filteredCards.length > 0 ?
                    filteredCards.map((card) => (
                        <div
                            key={card.id}
                            className={`group bg-white rounded-xl shadow-sm border ${card.isOffline ? 'border-dashed border-slate-400 bg-slate-50' : 'border-slate-200'} overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full`}
                            onClick={() => {
                                if (card.isOffline) {
                                    if (window.confirm("Esta tarjeta está pendiente de subir. ¿Deseas intentar sincronizarla ahora?")) {
                                        syncOfflineCards();
                                    }
                                } else {
                                    handleCardClick(card);
                                }
                            }}
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
                                        #{!isNaN(card.cardNumber) ? String(card.cardNumber).padStart(3, '0') : '?'}
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
            {filteredCards.length > 0 && (
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
                                title="Pendientes"
                                value={kpiData.pending}
                                variant="red"
                                type="outlined"
                            />
                            <StatCard
                                title="En Proceso"
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
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
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
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                            <h4 className="text-center text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                                Top Áreas con Hallazgos
                            </h4>
                            <div className="h-[200px]" style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                                    <BarChart data={kpiData.locationData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle */}
            {selectedCard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200" onClick={handleCloseModal}>
                    <div
                        className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto max-w-4xl max-h-[100vh] md:max-h-[90vh] overflow-y-auto flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header with Action Icons */}
                        <div className="px-4 md:px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${selectedCard.id ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'}`}>
                                    {selectedCard.id ? <FileText size={20} /> : <Plus size={20} />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {selectedCard.id ? `Tarjeta #${String(selectedCard.cardNumber).padStart(3, '0')}` : 'Nueva Tarjeta 5S'}
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
                                    value={selectedCard.date || ''}
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
                                            <option key={u.id} value={u.name}>{u.name}</option>
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
                                    value={selectedCard.status || 'Pendiente'}
                                    onChange={e => {
                                        const val = e.target.value;
                                        let color = '#ef4444';
                                        if (val === 'En Proceso') color = '#f59e0b';
                                        if (val === 'Cerrado') color = '#10b981';
                                        setSelectedCard(prev => ({ ...prev, status: val, statusColor: color }));
                                    }}
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En Proceso">En Proceso</option>
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
                                    value={selectedCard.targetDate || ''}
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
                                value={selectedCard.solutionDate || ''}
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
            )}

            {!selectedCard && (
                <MobileFab icon={Camera} onClick={handleNewCard} label="Nueva Tarjeta 5S" />
            )}

            {showHistory && (
                <AuditHistoryModal onClose={() => setShowHistory(false)} />
            )}

        </div>
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
const Save = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);

export default FiveSPage;
