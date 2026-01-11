import { useState, useEffect } from 'react';
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
        type: 'Clasificar',
        companyId: ''
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
                type: 'Clasificar',
                companyId: ''
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
                company_id: formData.companyId // Associated from offline selection
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
        <div className="min-h-screen bg-[#050B14] font-sans text-slate-300 selection:bg-cyan-500/30 pb-safe relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 brightness-100 contrast-150"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] opacity-40"></div>
            </div>

            {/* Navbar */}
            <div className="bg-[#050B14]/80 backdrop-blur-md px-4 py-4 border-b border-slate-800 sticky top-0 z-20 flex items-center justify-between">
                <Link to="/login" className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex flex-col items-center">
                    <h1 className="font-bold text-white flex items-center gap-2 text-lg tracking-tight">
                        <WifiOff size={20} className="text-cyan-400" />
                        Ingreso Offline
                    </h1>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>

            <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 backdrop-blur-sm">
                    <div className="bg-amber-500/20 p-2.5 rounded-xl h-fit text-amber-500">
                        <WifiOff size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-500 text-sm">Modo Sin Conexión</h3>
                        <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                            Las tarjetas se guardan en tu dispositivo. Inicia sesión con internet para sincronizarlas automáticamente.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">

                    {/* Sección: Qué y Dónde */}
                    <section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
                        <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Detalles del Hallazgo
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ubicación *</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-white placeholder-slate-600 font-medium transition-all"
                                    placeholder="Ej: Línea 1, Bodega..."
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción del Hallazgo *</label>
                                <textarea
                                    className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none min-h-[100px] text-white placeholder-slate-600 font-medium transition-all"
                                    placeholder="Describe la anomalía..."
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                                    <div className="relative">
                                        <select
                                            className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none text-white font-medium appearance-none focus:border-cyan-500/50 transition-all"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Clasificar">Clasificar</option>
                                            <option value="Ordenar">Ordenar</option>
                                            <option value="Limpiar">Limpiar</option>
                                            <option value="Seguridad">Seguridad</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none text-white font-medium focus:border-cyan-500/50 transition-all [color-scheme:dark]"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sección: Fotos */}
                    <section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
                        <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Evidencia
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 text-center uppercase tracking-wider">ANTES</label>
                                <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors bg-slate-950/30">
                                    <ImageUpload
                                        currentImage={previews.before}
                                        onFileSelect={(file, url) => handleFileSelect('imageBefore', file, url)}
                                        label="Foto"
                                        height="h-32"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 text-center uppercase tracking-wider">DESPUÉS (Opcional)</label>
                                <div className="rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors bg-slate-950/30">
                                    <ImageUpload
                                        currentImage={previews.after}
                                        onFileSelect={(file, url) => handleFileSelect('imageAfter', file, url)}
                                        label="Foto"
                                        height="h-32"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sección: Personas */}
                    <section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
                        <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Personas
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reportado por</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none text-white placeholder-slate-600 font-medium focus:border-cyan-500/50 transition-all"
                                    placeholder="Tu nombre"
                                    value={formData.reporter}
                                    onChange={e => setFormData({ ...formData, reporter: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Responsable Sugerido</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl outline-none text-white placeholder-slate-600 font-medium focus:border-cyan-500/50 transition-all"
                                    placeholder="Nombre del responsable"
                                    value={formData.responsible}
                                    onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
