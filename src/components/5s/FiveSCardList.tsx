import { useState } from 'react';
import type { FiveSCard } from '../../types/database.types';
import { BadgeCheck, Clock, MapPin, Edit2 } from 'lucide-react';
import FiveSCardEditModal from './FiveSCardEditModal';

import LoadingScreen from '../LoadingScreen';

interface FiveSCardListProps {
    cards: FiveSCard[];
    loading: boolean;
    onRefresh: () => void;
}

export default function FiveSCardList({ cards, loading, onRefresh }: FiveSCardListProps) {
    const [editingCard, setEditingCard] = useState<FiveSCard | null>(null);

    if (loading) {
        return <LoadingScreen message="Cargando tarjetas..." fullScreen={false} />;
    }

    if (cards.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="mx-auto h-12 w-12 text-gray-900 mb-4">
                    <BadgeCheck className="h-full w-full" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No hay tarjetas 5S</h3>
                <p className="mt-1 text-gray-900">Comienza creando una nueva tarjeta roja.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        onClick={() => setEditingCard(card)}
                        className="bg-white group rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                    >
                        {/* Image Section */}
                        {/* Image Section */}
                        <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                            {card.after_image_url ? (
                                // Split View for Closed Cards with After Evidence
                                <div className="flex w-full h-full">
                                    <div className="w-1/2 h-full relative border-r border-white/20">
                                        <img
                                            src={card.image_urls?.[0] || card.image_url!}
                                            alt="Antes"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-sm">
                                            Antes
                                        </div>
                                    </div>
                                    <div className="w-1/2 h-full relative">
                                        <img
                                            src={card.after_image_url}
                                            alt="Después"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-sm">
                                            Después
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Standard View (Only Before)
                                <>
                                    {card.image_urls && card.image_urls.length > 0 ? (
                                        <img
                                            src={card.image_urls[0]}
                                            alt={`Tarjeta ${card.area} `}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : card.image_url ? (
                                        <img
                                            src={card.image_url}
                                            alt={`Tarjeta ${card.area} `}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <span className="text-gray-900 text-sm">Sin imagen</span>
                                    )}
                                </>
                            )}

                            <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
                                <span className={`px - 2 py - 0.5 text - [10px] font - bold rounded - full shadow - sm backdrop - blur - sm border ${card.status === 'Abierto' ? 'bg-red-100/90 text-red-800 border-red-200'
                                    : card.status === 'En Progreso' ? 'bg-yellow-100/90 text-yellow-800 border-yellow-200'
                                        : 'bg-green-100/90 text-green-800 border-green-200'
                                    } `}>
                                    {card.status.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin className="h-4 w-4" />
                                    <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-xs">{card.area}</span>
                                </div>
                                {card.priority && (
                                    <span className={`text - [10px] font - bold px - 1.5 py - 0.5 rounded border ${card.priority === 'Alta' ? 'bg-red-50 text-red-600 border-red-100'
                                        : card.priority === 'Media' ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                            : 'bg-blue-50 text-blue-600 border-blue-100'
                                        } `}>
                                        {card.priority.toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-900 text-sm mb-4 line-clamp-2 flex-grow font-medium">{card.description}</p>

                            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(card.created_at).toLocaleDateString()}
                                </div>
                                <span className="flex items-center gap-1 text-blue-600 font-semibold group-hover:text-blue-800 transition-colors">
                                    <Edit2 className="h-3 w-3" />
                                    Ver detalles
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingCard && (
                <FiveSCardEditModal
                    card={editingCard}
                    onClose={() => setEditingCard(null)}
                    onSuccess={() => {
                        onRefresh();
                        setEditingCard(null);
                    }}
                />
            )}
        </>
    );
}
