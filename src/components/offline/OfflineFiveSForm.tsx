import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Camera, X, CheckCircle, WifiOff } from 'lucide-react';
import { db } from '../../lib/db';

export default function OfflineFiveSForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form State
    const [area, setArea] = useState('');
    const [description, setDescription] = useState('');
    const [findings, setFindings] = useState('');
    const [priority, setPriority] = useState<'Baja' | 'Media' | 'Alta'>('Media');
    const [category, setCategory] = useState<'Seiri' | 'Seiton' | 'Seiso' | 'Seiketsu' | 'Shitsuke' | 'Seguridad' | 'Otro'>('Seiri');

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load Data if Editing
    useEffect(() => {
        if (editId) {
            loadCard(Number(editId));
        }
    }, [editId]);

    const loadCard = async (id: number) => {
        try {
            const card = await db.offline_cards.get(id);
            if (card) {
                setArea(card.area);
                setDescription(card.description);
                setFindings(card.findings);
                setPriority(card.priority);
                setCategory(card.category);

                // Load Image
                const imgRecord = await db.offline_images.where('card_local_id').equals(id).first();
                if (imgRecord) {
                    setPreviewUrl(URL.createObjectURL(imgRecord.blob));
                }
            }
        } catch (error) {
            console.error("Error loading card:", error);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Determine ID
            let targetId = editId ? Number(editId) : undefined;
            const now = Date.now();

            if (targetId) {
                // UPDATE
                await db.offline_cards.update(targetId, {
                    area,
                    description,
                    findings,
                    priority,
                    category,
                    timestamp: now,
                    status: 'pending_sync' // Re-mark as pending
                });
                // Update Image if new one selected
                if (imageFile) {
                    await db.offline_images.where('card_local_id').equals(targetId).delete();
                    await db.offline_images.add({
                        card_local_id: targetId,
                        blob: imageFile,
                        timestamp: now
                    });
                }
            } else {
                // CREATE
                const newId = await db.offline_cards.add({
                    area,
                    description,
                    findings,
                    priority,
                    category,
                    status: 'pending_sync',
                    timestamp: now,
                    created_at: new Date().toISOString(),
                    company_id: 'offline_placeholder',
                    user_id: 'offline_user'
                });
                targetId = Number(newId);

                if (imageFile) {
                    await db.offline_images.add({
                        card_local_id: targetId,
                        blob: imageFile,
                        timestamp: now
                    });
                }
            }

            setSuccess(true);
            setTimeout(() => navigate('/offline'), 1500);

        } catch (error) {
            console.error("Error saving offline card:", error);
            alert("Error al guardar localmente.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">¡Guardado Localmente!</h2>
                <p className="text-gray-900 mt-2">Tu tarjeta ha sido actualizada.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button
                    onClick={() => navigate('/offline')}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">
                    {editId ? 'Editar Tarjeta' : 'Nueva Tarjeta 5S'}
                    <span className="text-orange-500 text-xs ml-1">(Offline)</span>
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full pb-24">

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3 text-xs text-orange-800">
                    <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>Modo sin conexión. Datos guardados solo en este dispositivo.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Área / Lugar</label>
                        <input
                            required
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                            placeholder="Ej: Línea 1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e: any) => setCategory(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Seiri">Seiri (Clasificar)</option>
                            <option value="Seiton">Seiton (Ordenar)</option>
                            <option value="Seiso">Seiso (Limpiar)</option>
                            <option value="Seiketsu">Seiketsu (Estandarizar)</option>
                            <option value="Shitsuke">Shitsuke (Disciplina)</option>
                            <option value="Seguridad">Seguridad</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Prioridad</label>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            {['Baja', 'Media', 'Alta'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p as any)}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${priority === p
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-900 hover:text-gray-700'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Hallazgo</label>
                        <textarea
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="¿Qué encontraste?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Acción Sugerida</label>
                        <textarea
                            value={findings}
                            onChange={e => setFindings(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                            placeholder="¿Qué se debería hacer?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Foto Evidencia</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative overflow-hidden border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all aspect-video ${previewUrl ? 'border-blue-500 bg-gray-900' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
                                }`}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewUrl(null);
                                            setImageFile(null);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full backdrop-blur-sm hover:bg-red-500/80 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                                        <Camera className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium">Tocar para tomar foto</p>
                                </>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-blue-700"
                    >
                        {loading ? (
                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                {editId ? 'Guardar Cambios' : 'Guardar Tarjeta'}
                            </>
                        )}
                    </button>
                    {!editId && (
                        <p className="text-center text-xs text-gray-900 mt-4">
                            Tus datos están seguros en este dispositivo.
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
