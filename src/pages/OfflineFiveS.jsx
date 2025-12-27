import { useState } from 'react';
import { offlineService } from '../services/offlineService';
import { ArrowLeft, Save, CheckCircle, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';

const OfflineFiveS = () => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        location: '',
        article: '',
        reporter: '',
        responsible: '',
        reason: '',
        proposedAction: '',
        type: 'Clasificar'
    });

    // File states separate from form data
    const [imageBeforeFile, setImageBeforeFile] = useState(null);
    const [imageAfterFile, setImageAfterFile] = useState(null);
    const [previews, setPreviews] = useState({ before: null, after: null });

    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                location: '',
                article: '',
                reporter: '',
                responsible: '',
                reason: '',
                proposedAction: '',
                type: 'Clasificar'
            });
            setImageBeforeFile(null);
            setImageAfterFile(null);
            setPreviews({ before: null, after: null });
        }, 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.location || !formData.reason) {
            alert("Ubicación y Hallazgo son obligatorios.");
            return;
        }

        setIsSaving(true);
        try {
            // Structure must match what FiveS.jsx expects for sync
            const cardData = {
                date: formData.date,
                location: formData.location,
                article: formData.article,
                reporter: formData.reporter, // Manual input
                reason: formData.reason,
                proposed_action: formData.proposedAction,
                responsible: formData.responsible, // Manual input
                target_date: null,
                solution_date: null,
                status: 'Pendiente',
                type: formData.type,
                company_id: null // Will be assigned upon sync based on responsible or defaulting logic
            };

            await offlineService.saveCard(cardData, imageBeforeFile, imageAfterFile);
            handleSuccess();
        } catch (error) {
            console.error("Error saving offline card:", error);
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = (type, file, previewUrl) => {
        if (type === 'imageBefore') {
            setImageBeforeFile(file);
            setPreviews(prev => ({ ...prev, before: previewUrl }));
        } else {
            setImageAfterFile(file);
            setPreviews(prev => ({ ...prev, after: previewUrl }));
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle size={40} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-800 mb-2">¡Guardado Localmente!</h2>
                <p className="text-emerald-600 mb-8 max-w-xs">
                    Tu tarjeta ha sido guardada en este dispositivo. Se subirá automáticamente cuando inicies sesión con conexión.
                </p>
                <div className="space-y-3 w-full max-w-xs">
                    <button
                        onClick={() => setShowSuccess(false)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-500/30"
                    >
                        Ingresar Otra Tarjeta
                    </button>
                    <Link
                        to="/login"
                        className="block w-full py-3 text-emerald-700 hover:bg-emerald-100 rounded-xl font-medium transition-colors"
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-safe">
            {/* Navbar */}
            <div className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
                <Link to="/login" className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="font-bold text-slate-800 flex items-center gap-2">
                    <WifiOff size={18} className="text-slate-400" />
                    Ingreso Offline
                </h1>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <main className="max-w-lg mx-auto p-4 space-y-6">
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex gap-3 shadow-sm">
                    <div className="bg-yellow-100 p-2 rounded-lg h-fit text-yellow-600">
                        <WifiOff size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-yellow-900 text-sm">Modo Sin Conexión</h3>
                        <p className="text-xs text-yellow-800 mt-1">
                            Las tarjetas creadas aquí se guardan en tu dispositivo. Inicia sesión cuando tengas internet para sincronizarlas.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-5">

                    {/* Sección: Qué y Dónde */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Detalles del Hallazgo</h4>

                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Ubicación *</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black placeholder-slate-500 font-medium"
                                placeholder="Ej: Línea 1, Bodega..."
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Descripción del Hallazgo *</label>
                            <textarea
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-black placeholder-slate-500 font-medium"
                                placeholder="Describe la anomalía..."
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Tipo</label>
                                <select
                                    className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-black font-medium"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Clasificar">Clasificar</option>
                                    <option value="Ordenar">Ordenar</option>
                                    <option value="Limpiar">Limpiar</option>
                                    <option value="Seguridad">Seguridad</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-black font-medium"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Sección: Fotos */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Evidencia Fotográfica</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-900 mb-2 text-center">ANTES</label>
                                <ImageUpload
                                    currentImage={previews.before}
                                    onFileSelect={(file, url) => handleFileSelect('imageBefore', file, url)}
                                    label="Foto"
                                    height="h-32"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-900 mb-2 text-center">DESPUÉS (Opcional)</label>
                                <ImageUpload
                                    currentImage={previews.after}
                                    onFileSelect={(file, url) => handleFileSelect('imageAfter', file, url)}
                                    label="Foto"
                                    height="h-32"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Sección: Personas */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Personas</h4>
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Reportado por</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-black placeholder-slate-500 font-medium"
                                placeholder="Tu nombre"
                                value={formData.reporter}
                                onChange={e => setFormData({ ...formData, reporter: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-1">Responsable Sugerido</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-black placeholder-slate-500 font-medium"
                                placeholder="Nombre del responsable"
                                value={formData.responsible}
                                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                            />
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>Guardando...</>
                        ) : (
                            <>
                                <Save size={20} />
                                Guardar Tarjeta
                            </>
                        )}
                    </button>
                    <div className="h-10"></div>
                </form>
            </main>
        </div>
    );
};

export default OfflineFiveS;
