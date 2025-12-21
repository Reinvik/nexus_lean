import React from 'react';
import { Target, Trash2, Plus, GitBranch, CheckCircle, XCircle, HelpCircle, ArrowRight } from 'lucide-react';

const A3FiveWhys = ({ items = [], onChange }) => {
    // items is array of { id: number, problem: '', whys: ['', '', '', '', ''], status: 'neutral'|'root'|'discarded' }

    const handleAddRow = (parentId = null, parentWhyIndex = -1) => {
        const newItem = {
            id: Date.now(),
            problem: '',
            whys: ['', '', '', '', ''],
            status: 'neutral',
            parentId,
            parentWhyIndex
        };
        onChange([...items, newItem]);
    };

    const handleDeleteRow = (index) => {
        if (!confirm('¿Eliminar esta fila de análisis?')) return;
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange(newItems);
    };

    const updateWhy = (rowIndex, whyIndex, value) => {
        const newItems = [...items];
        const newWhys = [...(newItems[rowIndex].whys || ['', '', '', '', ''])];
        newWhys[whyIndex] = value;
        newItems[rowIndex].whys = newWhys;
        onChange(newItems);
    };

    const toggleStatus = (index) => {
        const statuses = ['neutral', 'root', 'discarded'];
        const currentCheck = items[index].status || 'neutral';
        const nextStatus = statuses[(statuses.indexOf(currentCheck) + 1) % statuses.length];
        updateItem(index, 'status', nextStatus);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'root': return 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-50/50';
            case 'discarded': return 'bg-slate-50 border-slate-200 opacity-60 grayscale';
            default: return 'bg-white border-slate-200 hover:border-brand-300';
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="min-w-[1200px]">

                {/* HEADERS */}
                <div className="grid grid-cols-7 gap-6 mb-6 text-center px-2">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col justify-center h-24 border border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Target size={40} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Punto de Partida</span>
                        <h4 className="font-bold text-lg leading-tight">Problema Directo</h4>
                    </div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center h-24 relative overflow-hidden group">
                            <div className="absolute -right-2 -bottom-4 text-slate-100 font-black text-6xl group-hover:text-brand-50 transition-colors z-0 select-none">
                                {i}
                            </div>
                            <span className="relative z-10 text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Nivel {i}</span>
                            <h4 className="relative z-10 font-bold text-lg text-slate-700 leading-tight">¿Por qué?</h4>
                        </div>
                    ))}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center h-24 relative">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Conclusión</span>
                        <h4 className="font-bold text-lg text-slate-700 leading-tight">Resultado</h4>
                    </div>
                </div>

                {/* ROWS */}
                <div className="space-y-6 px-2">
                    {items.map((item, rowIdx) => (
                        <div key={item.id || rowIdx} className="grid grid-cols-7 gap-6 items-stretch relative group animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${rowIdx * 100}ms` }}>

                            {/* Line Connector for branching (visual cues can be added here) */}

                            {/* Primary Cause Input */}
                            <div className="relative">
                                <textarea
                                    className="w-full h-full min-h-[140px] p-4 rounded-xl border-2 border-slate-200 bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm font-medium text-slate-700 resize-none shadow-sm transition-all outline-none"
                                    placeholder="Describe la causa directa observada..."
                                    value={item.problem || ''}
                                    onChange={(e) => updateItem(rowIdx, 'problem', e.target.value)}
                                />
                                <div className="absolute top-1/2 -right-3 sm:-right-4 transform -translate-y-1/2 z-10 text-brand-200">
                                    <ArrowRight size={20} strokeWidth={3} />
                                </div>
                            </div>

                            {/* 5 Whys Inputs */}
                            {[0, 1, 2, 3, 4].map((whyIdx) => (
                                <div key={whyIdx} className="relative">
                                    <textarea
                                        className={`
                                            w-full h-full min-h-[140px] p-4 rounded-xl border-2
                                            focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none
                                            text-sm text-slate-600 resize-none shadow-sm transition-all
                                            ${(item.whys || [])[whyIdx]
                                                ? 'bg-white border-slate-200'
                                                : 'bg-slate-50 border-slate-100 opacity-70 hover:opacity-100 hover:bg-white'}
                                        `}
                                        placeholder={`Causa nivel ${whyIdx + 1}...`}
                                        value={(item.whys || [])[whyIdx] || ''}
                                        onChange={(e) => updateWhy(rowIdx, whyIdx, e.target.value)}
                                    />

                                    {/* Arrow to next, except for the last one */}
                                    {whyIdx < 4 && (
                                        <div className="absolute top-1/2 -right-3 sm:-right-4 transform -translate-y-1/2 z-10 text-slate-200">
                                            <ArrowRight size={20} strokeWidth={3} />
                                        </div>
                                    )}

                                    {/* Branching Button for this Specific Why */}
                                    <button
                                        className="absolute bottom-2 right-2 z-10 bg-white rounded-lg p-1.5 shadow-sm border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                                        onClick={() => handleAddRow(item.id, whyIdx)}
                                        title="Crear ramificación desde este punto"
                                    >
                                        <GitBranch size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* Status/Conclusion Column */}
                            <div className="relative">
                                <div
                                    className={`
                                        rounded-xl border-2 p-2 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all shadow-sm h-full w-full relative group/status select-none
                                        ${getStatusStyles(item.status)}
                                    `}
                                    onClick={() => toggleStatus(rowIdx)}
                                >
                                    {item.status === 'root' && (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-in zoom-in duration-300">
                                                <CheckCircle size={28} />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase leading-none text-center bg-emerald-100 px-2 py-1 rounded-full">Causa Raíz</span>
                                        </>
                                    )}
                                    {item.status === 'discarded' && (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                <XCircle size={28} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase leading-none text-center bg-slate-200 px-2 py-1 rounded-full">Descartado</span>
                                        </>
                                    )}
                                    {(!item.status || item.status === 'neutral') && (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/status:text-brand-400 group-hover/status:bg-brand-50 transition-colors">
                                                <HelpCircle size={28} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase text-center leading-none group-hover/status:text-brand-500">Evaluar</span>
                                        </>
                                    )}
                                </div>

                                {/* Row Delete Action */}
                                <button
                                    onClick={() => handleDeleteRow(rowIdx)}
                                    className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar fila completa"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Row Button */}
                <div className="mt-8 px-2">
                    <button
                        onClick={() => handleAddRow()}
                        className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-slate-400 font-bold hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <div className="bg-slate-100 group-hover:bg-brand-100 p-1.5 rounded-full transition-colors">
                            <Plus size={20} />
                        </div>
                        <span>Agregar Nueva Línea de Análisis</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default A3FiveWhys;
