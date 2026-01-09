import { useState, useRef, useEffect } from 'react';
import { Upload, X, User, Trash2 } from 'lucide-react';
import type { FiveSCard, Profile } from '../../types/database.types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface FiveSCardEditModalProps {
    card: FiveSCard;
    onClose: () => void;
    onSuccess: () => void;
}

export default function FiveSCardEditModal({ card, onClose, onSuccess }: FiveSCardEditModalProps) {
    const { selectedCompanyId } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State (Initialized with Card Data)
    const [priority, setPriority] = useState<'Baja' | 'Media' | 'Alta'>(card.priority as any || 'Media');
    const [status, setStatus] = useState<'Abierto' | 'En Progreso' | 'Cerrado'>(card.status);
    const [assignedTo, setAssignedTo] = useState<string>(card.assigned_to || '');
    // Findings are read-only in edit mode for now
    const [closureComment, setClosureComment] = useState(card.closure_comment || '');

    const [companyUsers, setCompanyUsers] = useState<Profile[]>([]);

    // Image State (After Photo)
    const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
    const [afterPreviewUrl, setAfterPreviewUrl] = useState<string | null>(card.after_image_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!selectedCompanyId) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', selectedCompanyId);

            if (error) {
                console.error("Error fetching users:", error);
            }
            if (data) setCompanyUsers(data);
        };
        fetchUsers();
    }, [selectedCompanyId]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAfterImageFile(file);
            setAfterPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `after-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error } = await supabase.storage.from('five-s-images').upload(filePath, file);
        if (error) return null;
        const { data: publicData } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
        return publicData.publicUrl;
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta 5S? Esta acción no se puede deshacer.')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('five_s_cards')
                .delete()
                .eq('id', card.id);

            if (error) throw error;
            onSuccess(); // Triggers refresh
            onClose();
        } catch (error: any) {
            console.error('Error deleting card:', error);
            alert('Error al eliminar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Strict Closure Rule: MUST have After Photo
            if (status === 'Cerrado' && !afterPreviewUrl) {
                alert("⚠️ REGLA DE CIERRE: Es obligatorio subir una foto del 'Después' para cerrar la tarjeta.");
                setLoading(false);
                return;
            }

            let finalAfterImageUrl = card.after_image_url;
            if (afterImageFile) {
                const uploaded = await uploadImage(afterImageFile);
                if (uploaded) finalAfterImageUrl = uploaded;
            }

            const updates: any = {
                priority,
                status,
                assigned_to: assignedTo || null,
                findings: card.findings, // Keep original findings
                closure_comment: closureComment,
                after_image_url: finalAfterImageUrl,
                updated_at: new Date().toISOString()
            };

            if (status === 'Cerrado' && !card.close_date) {
                updates.close_date = new Date().toISOString();
            }

            const { error } = await supabase
                .from('five_s_cards')
                .update(updates)
                .eq('id', card.id);

            if (error) throw error;
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error updating card:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Gestionar Tarjeta 5S</h2>
                        <div className="flex gap-2 text-xs mt-1 text-gray-900">
                            <span className="font-mono bg-gray-200 px-1 rounded">{card.area}</span>
                            <span>•</span>
                            <span>Creada el {new Date(card.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-full hover:bg-red-50 text-gray-900 hover:text-red-600 transition-colors"
                            title="Eliminar Tarjeta"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <X className="h-5 w-5 text-gray-900" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <form id="edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT: Context & Before Evidence */}
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                                <div className="absolute -top-3 left-4 bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide">
                                    Antes (Hallazgo)
                                </div>
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Descripción del Problema</h4>
                                    <p className="text-base text-gray-900 font-medium bg-gray-50 p-2.5 rounded border border-gray-200">
                                        {card.description}
                                    </p>
                                </div>

                                {card.image_urls && card.image_urls.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {card.image_urls.map((url, i) => (
                                            <div key={i} className="h-32 bg-black/5 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                                                <img src={url} className="w-full h-full object-contain" />
                                            </div>
                                        ))}
                                    </div>
                                ) : card.image_url ? (
                                    <div className="h-48 bg-black/5 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                                        <img src={card.image_url} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-900 text-sm italic">Sin evidencia inicial</div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Análisis / Causa Raíz</h4>
                                    <p className={`text-sm p-2 rounded border ${card.findings ? 'text-gray-800 bg-orange-50 border-orange-100' : 'text-gray-900 bg-gray-50 border-gray-200 italic'}`}>
                                        {card.findings || "No se registró análisis de causa raíz."}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <User className="h-4 w-4" /> Asignación
                                </h3>
                                <div>
                                    <label className="text-xs font-semibold text-gray-900 mb-1 block">Responsable</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm"
                                        value={assignedTo}
                                        onChange={e => setAssignedTo(e.target.value)}
                                    >
                                        <option value="">-- Sin Asignar --</option>
                                        {companyUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-900 mb-1 block">Prioridad</label>
                                    <div className="flex gap-2">
                                        {(['Baja', 'Media', 'Alta'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded border ${priority === p ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Actions & After Evidence */}
                        <div className="space-y-6">
                            <div className={`p-4 rounded-xl border shadow-sm relative transition-all ${status === 'Cerrado' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                <div className={`absolute -top-3 left-4 px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide ${status === 'Cerrado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    Después (Solución)
                                </div>

                                <div className="mt-3 mb-4">
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">Estado Actual</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {(['Abierto', 'En Progreso', 'Cerrado'] as const).map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    if (s === 'Cerrado' && !afterPreviewUrl) {
                                                        alert("📸 Sube la foto del 'Después' antes de cerrar.");
                                                        return;
                                                    }
                                                    setStatus(s);
                                                }}
                                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${status === s
                                                    ? s === 'Cerrado' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-900 shadow'
                                                    : 'text-gray-900 hover:text-gray-700'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-gray-900 mb-2">Evidencia de Cierre (Obligatoria)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${afterPreviewUrl ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                                            }`}
                                    >
                                        {afterPreviewUrl ? (
                                            <div className="relative w-full h-full group bg-black/5 flex items-center justify-center">
                                                <img src={afterPreviewUrl} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium">
                                                    Cambiar Foto
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4">
                                                <Upload className="h-8 w-8 text-gray-900 mx-auto mb-2" />
                                                <span className="text-sm text-gray-900 font-medium">Subir Foto "Después"</span>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-900 mb-1">Comentario de Cierre</label>
                                    <textarea
                                        rows={2}
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none placeholder:text-gray-600"
                                        placeholder="Descripción de la solución implementada..."
                                        value={closureComment}
                                        onChange={e => setClosureComment(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="edit-form"
                        disabled={loading}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
