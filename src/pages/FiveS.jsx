import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import HeaderWithFilter from '../components/HeaderWithFilter';
import { Plus, Search, Filter, Camera, X, Calendar, MapPin, User, FileText, CheckCircle, AlertCircle, Clock, PieChart as PieIcon, BarChart as BarIcon, ChevronDown, Activity, ArrowRight, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ImageUpload from '../components/ImageUpload';
import StatCard from '../components/StatCard';
import MobileFab from '../components/mobile/MobileFab';
import CameraCapture from '../components/mobile/CameraCapture';

const FiveSPage = () => {
    const { user, companyUsers, globalFilterCompanyId } = useAuth();
    const location = useLocation();
    const [selectedCard, setSelectedCard] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterResponsible, setFilterResponsible] = useState('');
    const [filterLocation, setFilterLocation] = useState('');

    // Datos iniciales
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos de Supabase
    useEffect(() => {
        if (user) {
            fetchCards();
        }
    }, [user, globalFilterCompanyId]);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('five_s_cards')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // 1. Sort by created_at ASCENDING to assign numbering (1st created = #1)
                const sortedByCreation = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                // 2. Map with numbering
                const formatted = sortedByCreation.map((c, index) => ({
                    id: c.id,
                    cardNumber: index + 1, // Virtual Number based on creation order
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
                    imageBefore: c.image_before, // Fixed column name
                    imageAfter: c.image_after,   // Fixed column name
                    companyId: c.company_id
                }));

                // 3. Reverse to show newest first in UI
                setCards(formatted.reverse());
            }
        } catch (error) {
            console.error('Error fetching 5S cards:', error);
        } finally {
            setLoading(false);
        }
    };

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

        return cards.filter(c => c.companyId === targetCompanyId || c.responsible === user.name || !c.companyId);
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

    // Guardar Tarjeta
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

        // AUTO-ASSIGN COMPANY based on Responsible (like QuickWins, VSM, A3)
        let idToAssign = selectedCard.companyId;

        // Try to get company from the assigned responsible user
        if (companyUsers && selectedCard.responsible) {
            const responsibleUser = companyUsers.find(u => u.name === selectedCard.responsible);
            if (responsibleUser && responsibleUser.company_id) {
                idToAssign = responsibleUser.company_id;
            }
        }

        // Fallback to current user's company or global filter
        if (!idToAssign) {
            idToAssign = user.companyId || (globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null);
        }

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
            image_before: selectedCard.imageBefore,
            image_after: selectedCard.imageAfter,
            company_id: idToAssign
        };

        try {
            if (selectedCard.id) {
                // Update
                const { error } = await supabase
                    .from('five_s_cards')
                    .update(cardData)
                    .eq('id', selectedCard.id);

                if (error) throw error;

                // Optimistic Update
                setCards(cards.map(c => c.id === selectedCard.id ? { ...selectedCard, ...cardData, statusColor: cardData.status === 'Cerrado' ? '#10b981' : (cardData.status === 'En Proceso' ? '#f59e0b' : '#ef4444') } : c));
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('five_s_cards')
                    .insert([cardData])
                    .select();

                if (error) throw error;

                if (data) {
                    fetchCards(); // Refetch to get ID
                }
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving card:", error);
            alert("Error al guardar la tarjeta");
        }
    };

    const handleDeleteCard = async () => {
        if (!selectedCard.id) return;
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.")) return;

        try {
            const { error } = await supabase
                .from('five_s_cards')
                .delete()
                .eq('id', selectedCard.id);

            if (error) throw error;

            setCards(cards.filter(c => c.id !== selectedCard.id));
            handleCloseModal();
        } catch (error) {
            console.error("Error deleting card:", error);
            alert("Error al eliminar la tarjeta");
        }
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
    };

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
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtros Dropdown */}
                <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
                    <div className="relative min-w-[200px]">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm appearance-none outline-none cursor-pointer"
                            value={filterResponsible}
                            onChange={(e) => setFilterResponsible(e.target.value)}
                        >
                            <option value="">Todos los Responsables</option>
                            {personSuggestions.map((p, i) => <option key={i} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[180px]">
                        <select
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm appearance-none outline-none cursor-pointer"
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                        >
                            <option value="">Todas las Áreas</option>
                            {uniqueLocations.map((l, i) => <option key={i} value={l}>{l}</option>)}
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
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCards.length > 0 ? filteredCards.map((card) => (
                    <div
                        key={card.id}
                        className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
                        onClick={() => handleCardClick(card)}
                    >
                        {/* Status Bar */}
                        <div className="h-1.5 w-full transition-all" style={{ backgroundColor: card.statusColor }}></div>

                        <div className="p-5 flex flex-col flex-1">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-200 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-colors">
                                    #{card.cardNumber ? String(card.cardNumber).padStart(3, '0') : '?'}
                                </span>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    {card.date}
                                </span>
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
                            <div className="h-[200px]">
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
                            </div>
                        </div>

                        <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                            <h4 className="text-center text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                                Top Áreas con Hallazgos
                            </h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
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
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${selectedCard.id ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'}`}>
                                    {selectedCard.id ? <FileText size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {selectedCard.id ? `Tarjeta #${String(selectedCard.cardNumber).padStart(3, '0')}` : 'Nueva Tarjeta 5S'}
                                    </h2>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        Complete la información del hallazgo detectado
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                                <X size={24} />
                            </button>
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
                                    value={selectedCard.date}
                                    onChange={e => updateField('date', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <MapPin size={16} className="text-slate-400" /> Ubicación
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                    value={selectedCard.location}
                                    onChange={e => updateField('location', e.target.value)}
                                    placeholder="Ej: Pasillo 4, Línea 2"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <FileText size={16} className="text-slate-400" /> Artículo / Equipo
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                    value={selectedCard.article}
                                    onChange={e => updateField('article', e.target.value)}
                                    placeholder="Ej: Estantería B, Motor 3"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <User size={16} className="text-slate-400" /> Reportado Por
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                    value={selectedCard.reporter}
                                    onChange={e => updateField('reporter', e.target.value)}
                                    list="person-suggestions"
                                    placeholder="Escribe o selecciona..."
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <AlertCircle size={16} className="text-amber-500" /> Razón de Tarjeta (Hallazgo)
                                </label>
                                <textarea
                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none shadow-sm"
                                    rows="3"
                                    value={selectedCard.reason}
                                    onChange={e => updateField('reason', e.target.value)}
                                    placeholder="Describe detalladamente la anomalía detectada..."
                                ></textarea>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <CheckCircle size={16} className="text-emerald-500" /> Acción Propuesta
                                </label>
                                <textarea
                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none shadow-sm"
                                    rows="2"
                                    value={selectedCard.proposedAction}
                                    onChange={e => updateField('proposedAction', e.target.value)}
                                    placeholder="Describe la acción correctiva sugerida..."
                                ></textarea>
                            </div>

                            <hr className="md:col-span-2 border-slate-100 my-2" />

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <User size={16} className="text-slate-400" /> Responsable Asignado
                                </label>
                                <select
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                    value={selectedCard.responsible}
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
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Activity size={16} className="text-slate-400" /> Estado
                                </label>
                                <select
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium shadow-sm"
                                    value={selectedCard.status}
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
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Clock size={16} className="text-slate-400" /> Fecha Propuesta
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                    value={selectedCard.targetDate}
                                    onChange={e => updateField('targetDate', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={`flex items-center gap-2 text-sm font-semibold ${selectedCard.status === 'Cerrado' ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    <CheckCircle size={16} /> Fecha Solución
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:border-slate-200 disabled:cursor-not-allowed shadow-sm"
                                    value={selectedCard.solutionDate}
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
                                                    onCapture={(url) => updateField('imageBefore', url)}
                                                    label="Tomar Foto (Antes)"
                                                />
                                            </div>
                                            {/* Desktop existing component */}
                                            <div className="hidden md:block h-full">
                                                <ImageUpload
                                                    currentImage={selectedCard.imageBefore}
                                                    onUpload={(url) => updateField('imageBefore', url)}
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
                                                    onCapture={(url) => updateField('imageAfter', url)}
                                                    label="Tomar Foto (Después)"
                                                />
                                            </div>
                                            {/* Desktop existing component */}
                                            <div className="hidden md:block h-full">
                                                <ImageUpload
                                                    currentImage={selectedCard.imageAfter}
                                                    onUpload={(url) => updateField('imageAfter', url)}
                                                    placeholderText="Subir foto de la mejora"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3 sticky bottom-0 z-10 rounded-b-2xl">
                            {selectedCard.id ? (
                                <button
                                    onClick={handleDeleteCard}
                                    className="px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-xl border border-red-100 hover:bg-red-100 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    <span>Eliminar</span>
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3 ml-auto">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-cyan-600 text-white font-medium rounded-xl hover:from-brand-700 hover:to-cyan-700 transition-all shadow-lg shadow-brand-500/30 active:scale-95 flex items-center gap-2"
                                    onClick={handleSaveCard}
                                >
                                    <Save size={18} />
                                    <span>Guardar Tarjeta</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
            {selectedCard && selectedCard.id === null && (
                // Only show FAB if NOT in modal (modal covers it, but logic check is good)
                // Actually this logic is reversed, we want FAB when NO modal is open
                null
            )}
            {!selectedCard && (
                <MobileFab icon={Camera} onClick={handleNewCard} label="Nueva Tarjeta 5S" />
            )}
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
