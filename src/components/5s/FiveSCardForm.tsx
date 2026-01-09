import { useState, useRef, useEffect } from 'react';
import { Upload, X, Calendar, AlertTriangle, Tag, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database.types';

interface FiveSCardFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function FiveSCardForm({ onClose, onSuccess }: FiveSCardFormProps) {
    const { selectedCompanyId, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [area, setArea] = useState('');
    const [description, setDescription] = useState('');
    const [findings, setFindings] = useState('');
    const [priority, setPriority] = useState<'Baja' | 'Media' | 'Alta'>('Media');
    const [category, setCategory] = useState<string>('Seiri');
    const [dueDate, setDueDate] = useState('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [companyUsers, setCompanyUsers] = useState<Profile[]>([]);

    // Image State
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase.from('profiles').select('*');

            if (error) {
                console.error("Error fetching users:", error);
                return;
            }

            let filteredUsers = data || [];
            if (selectedCompanyId) {
                filteredUsers = filteredUsers.filter(u =>
                    u.company_id === selectedCompanyId || u.role === 'superadmin'
                );
            }
            setCompanyUsers(filteredUsers);
        };
        fetchUsers();
    }, [selectedCompanyId]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = [];

        for (const file of imageFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('five-s-images')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                continue; // Skip failed uploads but try others
            }

            const { data } = supabase.storage.from('five-s-images').getPublicUrl(filePath);
            if (data.publicUrl) {
                uploadedUrls.push(data.publicUrl);
            }
        }
        return uploadedUrls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("No user session");

            // Company Logic
            let targetCompanyId = selectedCompanyId;
            if (!targetCompanyId && profile?.company_id) targetCompanyId = profile.company_id;
            if (!targetCompanyId && profile?.role === 'superadmin') {
                const { data: companies } = await supabase.from('companies').select('id').limit(1);
                if (companies?.[0]) targetCompanyId = companies[0].id;
            }

            if (!targetCompanyId) throw new Error("No company selected.");

            // Upload Images
            const uploadedImageUrls = await uploadImages();

            // Insert Card
            const { error } = await supabase.from('five_s_cards').insert({
                area,
                description,
                findings,
                priority,
                category,
                due_date: dueDate || null,
                status: 'Abierto',
                image_urls: uploadedImageUrls,
                image_url: uploadedImageUrls[0] || null, // Backward compatibility
                assigned_to: assignedTo || null,
                company_id: targetCompanyId,
                created_by: session.user.id
            });

            if (error) throw error;

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error creating card:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Nueva Tarjeta 5S</h2>
                            <p className="text-xs text-gray-500">Reporte de hallazgo o anomalía</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-900 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    <form id="5s-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left Column: Context */}
                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1.5">
                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                        Área / Ubicación
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                                        placeholder="Ej. Línea 1 - Estación de Carga"
                                        value={area}
                                        onChange={e => setArea(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1.5">
                                        <Tag className="h-4 w-4 text-indigo-500" />
                                        Categoría 5S
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                    >
                                        <option value="Seiri">1. Seiri (Clasificar)</option>
                                        <option value="Seiton">2. Seiton (Ordenar)</option>
                                        <option value="Seiso">3. Seiso (Limpiar)</option>
                                        <option value="Seiketsu">4. Seiketsu (Estandarizar)</option>
                                        <option value="Shitsuke">5. Shitsuke (Disciplinar)</option>
                                        <option value="Seguridad">⚠️ Seguridad</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">Responsable</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
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
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1.5">
                                        <AlertTriangle className={`h-4 w-4 ${priority === 'Alta' ? 'text-red-500' : priority === 'Media' ? 'text-yellow-500' : 'text-green-500'}`} />
                                        Prioridad
                                    </label>
                                    <div className="flex gap-2">
                                        {(['Baja', 'Media', 'Alta'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${priority === p
                                                    ? p === 'Alta' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500'
                                                        : p === 'Media' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 ring-1 ring-yellow-500'
                                                            : 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1.5">
                                        <Calendar className="h-4 w-4 text-blue-500" />
                                        Fecha Límite
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Descripción del Problema</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                    placeholder="¿Qué anomalía se detectó? Sea específico..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Hallazgos / Análisis (Opcional)</label>
                                <textarea
                                    rows={2}
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-gray-50"
                                    placeholder="Posible causa raíz o comentarios adicionales..."
                                    value={findings}
                                    onChange={e => setFindings(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Image Upload Section */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Evidencia Fotográfica</label>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="bg-white/20 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group bg-white"
                                >
                                    <div className="p-2 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors mb-2">
                                        <Upload className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600">Agregar</span>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <p className="text-xs text-gray-900 mt-2">Puede subir múltiples imágenes.</p>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="5s-form"
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </div>
                        ) : 'Guardar Tarjeta 5S'}
                    </button>
                </div>
            </div>
        </div>
    );
}
