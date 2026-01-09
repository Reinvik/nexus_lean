import { useNavigate } from 'react-router-dom';
import { WifiOff, ClipboardList, CheckSquare, LogOut, Trash2, Edit2, UploadCloud } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type OfflineFiveSCard, type OfflineAudit } from '../lib/db';

export default function OfflineDashboard() {
    const navigate = useNavigate();

    // Live queries for pending items
    const pendingCards = useLiveQuery(() => db.offline_cards.where('status').equals('pending_sync').toArray()) || [];
    const pendingAudits = useLiveQuery(() => db.offline_audits.toArray()) || [];

    const deleteCard = async (id: number) => {
        if (confirm('¿Eliminar esta tarjeta offline?')) {
            await db.offline_cards.delete(id);
            await db.offline_images.where('card_local_id').equals(id).delete();
        }
    };

    const deleteAudit = async (id: number) => {
        if (confirm('¿Eliminar esta auditoría offline?')) {
            await db.offline_audits.delete(id);
            await db.offline_audit_entries.where('audit_local_id').equals(id).delete();
        }
    };

    const totalPending = pendingCards.length + pendingAudits.length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 text-white px-6 py-4 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 p-2 rounded-full">
                        <WifiOff className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Modo Offline</h1>
                        <p className="text-xs text-gray-300">Operación sin internet</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Salir al Login"
                >
                    <LogOut className="h-5 w-5 text-gray-300" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 flex flex-col gap-6 max-w-md mx-auto w-full">

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                    <WifiOff className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800">
                        Los datos se guardarán en tu dispositivo. Cuando recuperes conexión, inicia sesión y podrás sincronizarlos con la nube.
                    </p>
                </div>

                <div className="grid gap-4">
                    {/* Tarjeta 5S Button */}
                    <button
                        onClick={() => navigate('/offline/5s-cards')}
                        className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-left relative overflow-hidden"
                    >
                        <div className="bg-blue-100 p-4 rounded-xl group-hover:bg-blue-600 transition-colors duration-300">
                            <ClipboardList className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Tarjetas 5S</h3>
                            <p className="text-sm text-gray-900">Reportar tarjeta roja o hallazgo</p>
                        </div>
                    </button>

                    {/* Auditoría 5S Button */}
                    <button
                        onClick={() => navigate('/offline/5s-audits')}
                        className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all flex items-center gap-4 text-left relative overflow-hidden"
                    >
                        <div className="bg-purple-100 p-4 rounded-xl group-hover:bg-purple-600 transition-colors duration-300">
                            <CheckSquare className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Auditoría 5S</h3>
                            <p className="text-sm text-gray-900">Realizar auditoría completa 5S</p>
                        </div>
                    </button>
                </div>

                {/* Pending Items Section */}
                {totalPending > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-gray-900 font-bold">Pendientes de Sincronizar ({totalPending})</h3>
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                <UploadCloud className="h-4 w-4" />
                                Inicia sesión para sincronizar
                            </div>
                        </div>

                        {/* Pending Cards */}
                        {pendingCards.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-900">Tarjetas 5S ({pendingCards.length})</p>
                                {pendingCards.map((card: OfflineFiveSCard) => (
                                    <div key={card.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center hover:border-blue-300 transition-colors">
                                        <div>
                                            <div className="font-bold text-gray-800">{card.area}</div>
                                            <div className="text-sm text-gray-900 truncate max-w-[180px]">{card.description}</div>
                                            <div className="text-xs text-blue-600 mt-1 font-medium">{card.priority} • {card.category}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/offline/5s-cards?edit=${card.id}`)}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteCard(card.id!)}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pending Audits */}
                        {pendingAudits.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-900">Auditorías 5S ({pendingAudits.length})</p>
                                {pendingAudits.map((audit: OfflineAudit) => (
                                    <div key={audit.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center hover:border-purple-300 transition-colors">
                                        <div>
                                            <div className="font-bold text-gray-800">{audit.area}</div>
                                            <div className="text-sm text-gray-900">{audit.title || 'Sin título'}</div>
                                            <div className="text-xs text-purple-600 mt-1 font-medium">
                                                {audit.audit_date} • Puntaje: {audit.total_score.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => deleteAudit(audit.id!)}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {totalPending === 0 && (
                    <div className="text-center py-8 text-gray-900">
                        <p className="text-sm">No hay elementos pendientes de sincronizar.</p>
                        <p className="text-xs mt-1">Crea tarjetas o auditorías para guardarlas localmente.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
