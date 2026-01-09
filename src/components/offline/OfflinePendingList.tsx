import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import type { OfflineFiveSCard } from '../../lib/db';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit2 } from 'lucide-react';

export default function OfflinePendingList() {
    const [cards, setCards] = useState<OfflineFiveSCard[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        const pending = await db.offline_cards.where('status').equals('pending_sync').reverse().toArray();
        setCards(pending);
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta tarjeta offline?')) {
            await db.offline_cards.delete(id);
            await db.offline_images.where('card_local_id').equals(id).delete();
            loadCards();
        }
    };

    if (cards.length === 0) return null;

    return (
        <div className="w-full max-w-md mx-auto mt-6">
            <h3 className="text-gray-900 font-bold mb-3 px-1">Pendientes de Subir ({cards.length})</h3>
            <div className="space-y-3">
                {cards.map(card => (
                    <div key={card.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                        <div>
                            <div className="font-bold text-gray-800">{card.area}</div>
                            <div className="text-sm text-gray-900 truncate max-w-[180px]">{card.description}</div>
                            <div className="text-xs text-orange-600 mt-1 font-medium">{card.priority} - {card.category}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/offline/5s-cards?edit=${card.id}`)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Editar / Subir"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(card.id!)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Eliminar Localmente"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
