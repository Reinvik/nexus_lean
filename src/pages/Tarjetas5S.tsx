import { useState, useEffect } from 'react';
import { Plus, WifiOff, UploadCloud, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db, type OfflineFiveSCard } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FiveSCard } from '../types/database.types';
import { useAuth } from '../context/AuthContext';
import FiveSCardList from '../components/5s/FiveSCardList';
import FiveSCardForm from '../components/5s/FiveSCardForm';

export default function Tarjetas5S() {
    const { selectedCompanyId, user } = useAuth();
    const [cards, setCards] = useState<FiveSCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    // Live query for offline cards
    const offlineCards = useLiveQuery(() => db.offline_cards.where('status').equals('pending_sync').toArray()) || [];

    const fetchCards = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('five_s_cards')
                .select('*')
                .order('created_at', { ascending: false });

            if (selectedCompanyId) {
                query = query.eq('company_id', selectedCompanyId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setCards(data || []);
        } catch (error) {
            console.error('Error fetching 5S cards:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCompanyId) {
            fetchCards();
        } else {
            setCards([]);
            setLoading(false);
        }
    }, [selectedCompanyId]);

    // Sync a single offline card to the database
    const syncCard = async (localCard: OfflineFiveSCard) => {
        if (!localCard.id || !selectedCompanyId || !user) return;

        setSyncingId(localCard.id);
        try {
            // Get associated images
            const images = await db.offline_images.where('card_local_id').equals(localCard.id).toArray();
            const uploadedUrls: string[] = [];

            // Upload images to Supabase Storage
            for (const img of images) {
                const fileExt = img.blob.type.split('/')[1] || 'jpg';
                const fileName = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('five-s-images')
                    .upload(fileName, img.blob);

                if (!uploadError) {
                    const { data } = supabase.storage.from('five-s-images').getPublicUrl(fileName);
                    uploadedUrls.push(data.publicUrl);
                }
            }

            // Insert card into database
            const { error: insertError } = await supabase.from('five_s_cards').insert({
                area: localCard.area,
                description: localCard.description,
                findings: localCard.findings,
                priority: localCard.priority,
                category: localCard.category,
                status: 'Abierto',
                company_id: selectedCompanyId,
                created_by: user.id,
                image_urls: uploadedUrls,
                image_url: uploadedUrls[0] || null
            });

            if (insertError) {
                console.error('Error syncing card:', insertError);
                alert('Error al sincronizar: ' + insertError.message);
                return;
            }

            // Delete local record on success
            await db.offline_cards.delete(localCard.id);
            await db.offline_images.where('card_local_id').equals(localCard.id).delete();

            // Refresh online cards list
            fetchCards();
        } catch (error) {
            console.error('Sync error:', error);
            alert('Error al sincronizar la tarjeta');
        } finally {
            setSyncingId(null);
        }
    };

    // Delete offline card without syncing
    const deleteOfflineCard = async (id: number) => {
        if (confirm('¿Eliminar esta tarjeta sin guardarla en la base de datos?')) {
            await db.offline_cards.delete(id);
            await db.offline_images.where('card_local_id').equals(id).delete();
        }
    };

    // Sync all offline cards
    const syncAllCards = async () => {
        for (const card of offlineCards) {
            if (card.id) {
                await syncCard(card);
            }
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8 animate-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tarjetas 5S</h1>
                    <p className="text-slate-600 font-medium mt-1">Gestiona las tarjetas rojas y hallazgos de 5S.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                    <Plus className="h-5 w-5" />
                    Nueva Tarjeta
                </button>
            </div>

            {/* Offline Cards Panel */}
            {offlineCards.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg">
                                <WifiOff className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-800">Tarjetas Offline Pendientes</h3>
                                <p className="text-xs text-amber-600">{offlineCards.length} tarjeta(s) guardada(s) localmente</p>
                            </div>
                        </div>
                        <button
                            onClick={syncAllCards}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-medium text-sm"
                        >
                            <UploadCloud className="h-4 w-4" />
                            Sincronizar Todo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {offlineCards.map((card: OfflineFiveSCard) => (
                            <div key={card.id} className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-800">{card.area}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                                        card.priority === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {card.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-900 line-clamp-2 mb-2">{card.description}</p>
                                <p className="text-xs text-gray-900 mb-3">{card.category}</p>

                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => syncCard(card)}
                                        disabled={syncingId === card.id}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm disabled:opacity-50"
                                    >
                                        {syncingId === card.id ? (
                                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-green-700 border-t-transparent" />
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Guardar
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => deleteOfflineCard(card.id!)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <FiveSCardList cards={cards} loading={loading} onRefresh={fetchCards} />

            {showForm && (
                <FiveSCardForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        fetchCards();
                        setShowForm(false);
                    }}
                />
            )}
        </div>
    );
}
