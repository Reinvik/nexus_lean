import { useState } from 'react';
import { Plus, X, Fish, Maximize2, Minimize2 } from 'lucide-react';

const CATEGORIES = [
    { id: 'man', label: 'Mano de Obra', color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100', dot: 'bg-blue-500' },
    { id: 'machine', label: 'Máquina', color: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100', dot: 'bg-red-500' },
    { id: 'material', label: 'Material', color: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100', dot: 'bg-emerald-500' },
    { id: 'method', label: 'Método', color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100', dot: 'bg-purple-500' },
    { id: 'measurement', label: 'Medición', color: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100', dot: 'bg-amber-500' },
    { id: 'environment', label: 'Medio Ambiente', color: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100', dot: 'bg-cyan-500' }
];

const PRIORITIES = {
    neutral: { color: 'bg-slate-200', ring: 'ring-slate-300', label: 'Sin priorizar', next: 'green', shadow: 'shadow-slate-200' },
    green: { color: 'bg-emerald-500', ring: 'ring-emerald-400', label: 'Si ocurre y Si puede ser abordada', next: 'yellow', shadow: 'shadow-emerald-200' },
    yellow: { color: 'bg-amber-400', ring: 'ring-amber-300', label: 'Ocurre ocasionalmente', next: 'red', shadow: 'shadow-amber-200' },
    red: { color: 'bg-rose-500', ring: 'ring-rose-400', label: 'No ocurre / No abordable', next: 'neutral', shadow: 'shadow-rose-200' }
};

const A3Ishikawa = ({ data, onChange, onDelete, index }) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const getCauseData = (cause) => {
        if (typeof cause === 'string') {
            return { text: cause, color: 'neutral' };
        }
        return {
            text: cause.text,
            color: cause.color || 'neutral'
        };
    };

    const handleAddCause = (catId) => {
        const currentCauses = data.categories?.[catId] || [];
        const causeText = prompt(`Agregar causa para ${CATEGORIES.find(c => c.id === catId).label}:`);
        if (causeText) {
            const newCategories = {
                ...data.categories,
                [catId]: [...currentCauses, { text: causeText, color: 'neutral' }]
            };
            onChange('categories', newCategories);
        }
    };

    const handleRemoveCause = (catId, causeIdx) => {
        const currentCauses = data.categories?.[catId] || [];
        const newCauses = currentCauses.filter((_, i) => i !== causeIdx);
        const newCategories = {
            ...data.categories,
            [catId]: newCauses
        };
        onChange('categories', newCategories);
    };

    const handleToggleColor = (catId, causeIdx) => {
        const currentCauses = data.categories?.[catId] || [];
        const cause = currentCauses[causeIdx];
        const causeData = getCauseData(cause);
        const nextColor = PRIORITIES[causeData.color].next;

        const newCauses = [...currentCauses];
        newCauses[causeIdx] = { ...causeData, color: nextColor };

        const newCategories = {
            ...data.categories,
            [catId]: newCauses
        };
        onChange('categories', newCategories);
    };

    const allCauses = CATEGORIES.flatMap(cat =>
        (data.categories?.[cat.id] || []).map(c => {
            const { text } = getCauseData(c);
            return { category: cat.label, cause: text };
        })
    );

    return (
        <div className={`
            card rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200 transition-all
            ${!isFullScreen ? 'animate-in fade-in zoom-in-95 duration-300' : ''}
            ${isFullScreen ? 'fixed inset-0 z-[10000] m-0 rounded-none h-screen flex flex-col' : ''}
        `}>
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                        <Fish size={18} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-wide">DIAGRAMA DE ISHIKAWA / ESPINA DE PESCADO</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Análisis #{index + 1}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="text-slate-300 hover:text-white hover:bg-slate-700/50 p-2 rounded-lg transition-all"
                        title={isFullScreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
                    >
                        {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {onDelete && (
                        <button onClick={onDelete} className="text-rose-300 hover:text-white hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all active:scale-95">
                            <X size={14} /> Eliminar
                        </button>
                    )}
                </div>
            </div>

            <div className={`p-2 bg-slate-50/50 relative overflow-auto ${isFullScreen ? 'flex-1 flex items-center justify-center' : ''}`}>
                <div className={`min-w-[900px] max-w-full mx-auto relative pb-10 pt-2 ${isFullScreen ? 'scale-110 transform origin-center' : ''}`}>

                    {/* Main Spine (Adjusted for Head margin right-24 = 96px) */}
                    <div className="absolute top-1/2 left-0 right-[336px] h-1 bg-slate-400 rounded-full z-0 shadow-sm"></div>
                    <div className="absolute top-1/2 right-[336px] w-4 h-4 rounded-full bg-slate-400 -mt-1.5 z-0"></div>

                    {/* Fish Head (Problem) - Added right-24 margin to deeply ensure no cutoff */}
                    <div className="absolute top-1/2 right-24 transform -translate-y-1/2 z-20 w-[240px] h-[180px] flex items-center">
                        <div className="bg-white border-2 border-slate-200 shadow-xl rounded-2xl p-6 w-full h-full flex flex-col justify-center items-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>
                            <label className="text-slate-900 text-[10px] font-bold uppercase tracking-widest mb-3">Problema Central</label>
                            <textarea
                                className="w-full h-full bg-transparent border-none text-black placeholder-slate-400 text-sm font-bold text-center focus:ring-0 resize-none overflow-hidden leading-relaxed"
                                rows="4"
                                placeholder="Describa el problema..."
                                value={data.problem || ''}
                                onChange={(e) => onChange('problem', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ribs Container - Adjusted spacing and padding */}
                    <div className="grid grid-cols-3 gap-x-12 gap-y-16 pr-[380px] relative z-10 ml-10">
                        {/* Top Ribs */}
                        {CATEGORIES.slice(0, 3).map((cat) => (
                            <div key={cat.id} className="h-56 flex flex-col justify-end items-center relative group px-4">
                                {/* Diagonal Rib Line */}
                                <div className="absolute bottom-0 left-1/2 w-0.5 h-[120%] bg-slate-300 origin-bottom transform -rotate-[30deg] group-hover:bg-brand-200 transition-colors"></div>

                                {/* Header Bubble */}
                                <div className={`relative mb-3 px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm z-20 transition-all cursor-default ${cat.color} active:scale-95`}>
                                    {cat.label}
                                </div>

                                {/* Causes List */}
                                <div className="z-20 w-full flex flex-col gap-2 items-end pr-6">
                                    {(data.categories?.[cat.id] || []).map((cause, cIdx) => {
                                        const { text, color } = getCauseData(cause);
                                        return (
                                            <div key={cIdx} className="relative group/chip bg-white border border-slate-200 text-slate-900 text-xs pl-2 pr-2 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all w-full flex items-center justify-between gap-2 hover:-translate-y-0.5">
                                                <span className="flex-grow text-right break-words leading-tight text-[11px] font-bold text-black">{text}</span>
                                                <button
                                                    onClick={() => handleToggleColor(cat.id, cIdx)}
                                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITIES[color].color} ring-2 ${PRIORITIES[color].ring} hover:scale-125 transition-transform shadow-sm`}
                                                    title={`Prioridad: ${PRIORITIES[color].label}`}
                                                />
                                                <button
                                                    onClick={() => handleRemoveCause(cat.id, cIdx)}
                                                    className="absolute -top-2 -right-2 bg-white border border-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/chip:opacity-100 shadow-sm z-30 hover:bg-red-50 transition-all"
                                                >
                                                    <X size={10} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => handleAddCause(cat.id)}
                                        className="self-end mt-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 border border-dashed border-slate-300 hover:border-brand-200 rounded-full p-1.5 transition-all"
                                        title="Agregar Causa"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Bottom Ribs */}
                        {CATEGORIES.slice(3, 6).map((cat) => (
                            <div key={cat.id} className="h-56 flex flex-col justify-start items-center relative group px-4 mt-4">
                                {/* Diagonal Rib Line */}
                                <div className="absolute top-0 left-1/2 w-0.5 h-[120%] bg-slate-300 origin-top transform rotate-[30deg] group-hover:bg-brand-200 transition-colors"></div>

                                {/* Header Bubble */}
                                <div className={`relative mt-3 px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm z-20 transition-all cursor-default ${cat.color} order-last active:scale-95`}>
                                    {cat.label}
                                </div>

                                {/* Causes List */}
                                <div className="z-20 w-full flex flex-col gap-2 items-end pr-6 pt-6 mb-2">
                                    {(data.categories?.[cat.id] || []).map((cause, cIdx) => {
                                        const { text, color } = getCauseData(cause);
                                        return (
                                            <div key={cIdx} className="relative group/chip bg-white border border-slate-200 text-slate-900 text-xs pl-2 pr-2 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all w-full flex items-center justify-between gap-2 hover:-translate-y-0.5">
                                                <span className="flex-grow text-right break-words leading-tight text-[11px] font-bold text-black">{text}</span>
                                                <button
                                                    onClick={() => handleToggleColor(cat.id, cIdx)}
                                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITIES[color].color} ring-2 ${PRIORITIES[color].ring} hover:scale-125 transition-transform shadow-sm`}
                                                    title={`Prioridad: ${PRIORITIES[color].label}`}
                                                />
                                                <button
                                                    onClick={() => handleRemoveCause(cat.id, cIdx)}
                                                    className="absolute -top-2 -right-2 bg-white border border-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/chip:opacity-100 shadow-sm z-30 hover:bg-red-50 transition-all"
                                                >
                                                    <X size={10} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => handleAddCause(cat.id)}
                                        className="self-end mt-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 border border-dashed border-slate-300 hover:border-brand-200 rounded-full p-1.5 transition-all"
                                        title="Agregar Causa"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend & Root Cause Selection */}
                {!isFullScreen && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-end max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Clasificación</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 p-1.5 rounded hover:bg-slate-50 transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-100"></div>
                                    <span className="text-[11px] font-medium text-slate-600">Causa Raíz Probable (Investigar)</span>
                                </div>
                                <div className="flex items-center gap-3 p-1.5 rounded hover:bg-slate-50 transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-100"></div>
                                    <span className="text-[11px] font-medium text-slate-600">Contribuyente (Acción indirecta)</span>
                                </div>
                                <div className="flex items-center gap-3 p-1.5 rounded hover:bg-slate-50 transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm ring-2 ring-rose-100"></div>
                                    <span className="text-[11px] font-medium text-slate-600">Descartada / No Abordable</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 shadow-inner">
                            <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 block">Seleccionar Causa Raíz Principal</label>
                            <div className="relative">
                                <select
                                    className="w-full text-sm p-2.5 border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 outline-none shadow-sm cursor-pointer text-black font-medium"
                                    value={data.rootCause || ''}
                                    onChange={(e) => onChange('rootCause', e.target.value)}
                                >
                                    <option value="">-- Ninguna seleccionada --</option>
                                    {allCauses.map((item, idx) => (
                                        <option key={idx} value={item.cause}>
                                            {item.category}: {item.cause}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default A3Ishikawa;
