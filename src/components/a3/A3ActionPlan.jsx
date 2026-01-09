import { useState } from 'react';
import { Plus, Trash2, Calendar, User, CheckCircle, Circle, AlertCircle } from 'lucide-react';

const A3ActionPlan = ({ actions, onChange, users = [] }) => {
    // actions: [{ id, activity, responsible, date, status }]
    const [newItem, setNewItem] = useState({ activity: '', responsible: '', date: '' });

    const handleAdd = () => {
        if (!newItem.activity) return;
        const newAction = {
            id: Date.now(),
            activity: newItem.activity,
            responsible: newItem.responsible,
            date: newItem.date,
            status: 'pending' // pending, done
        };
        onChange([...(actions || []), newAction]);
        setNewItem({ activity: '', responsible: '', date: '' });
    };

    const handleDelete = (id) => {
        onChange((actions || []).filter(a => a.id !== id));
    };

    const toggleStatus = (id) => {
        const updated = (actions || []).map(a =>
            a.id === id ? { ...a, status: a.status === 'pending' ? 'done' : 'pending' } : a
        );
        onChange(updated);
    };

    return (
        <div className="w-full">
            {/* Input Container */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                    <Plus size={14} className="text-brand-500" /> Nueva Acción
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6">
                        <label className="text-xs font-bold text-slate-700 mb-1 block uppercase tracking-wider">Actividad / Contramedida</label>
                        <input
                            type="text"
                            placeholder="Descripción detallada de la acción a realizar..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all shadow-sm placeholder:text-slate-400 text-slate-900"
                            value={newItem.activity}
                            onChange={e => setNewItem({ ...newItem, activity: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-700 mb-1 block uppercase tracking-wider">Responsable</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            {users.length > 0 ? (
                                <select
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm appearance-none shadow-sm cursor-pointer text-slate-900 font-medium"
                                    value={newItem.responsible}
                                    onChange={e => setNewItem({ ...newItem, responsible: e.target.value })}
                                >
                                    <option value="" className="text-slate-500">Seleccionar...</option>
                                    {users.map(u => (
                                        <option key={u.uid || u.id || u.name} value={u.name} className="text-slate-900">{u.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Nombre..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm"
                                    value={newItem.responsible}
                                    onChange={e => setNewItem({ ...newItem, responsible: e.target.value })}
                                />
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 mb-1 block uppercase tracking-wider">Fecha Límite</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm shadow-sm cursor-pointer text-slate-900"
                                value={newItem.date}
                                onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <button
                            onClick={handleAdd}
                            disabled={!newItem.activity}
                            className="w-full h-[42px] bg-brand-600 hover:bg-brand-700 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-500/30 active:scale-95"
                            title="Agregar tarea al plan"
                        >
                            <Plus size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200 font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4 w-16 text-center">Estado</th>
                            <th className="px-6 py-4">Actividad Planificada</th>
                            <th className="px-6 py-4 w-56">Responsable</th>
                            <th className="px-6 py-4 w-40">Fecha Límite</th>
                            <th className="px-6 py-4 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(!actions || actions.length === 0) ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                            <AlertCircle size={24} className="text-slate-300" />
                                        </div>
                                        <p className="font-medium">No hay acciones definidas en este plan.</p>
                                        <p className="text-xs mt-1 text-slate-300">Agrega nuevas acciones utilizando el formulario superior.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            actions.map(action => (
                                <tr key={action.id} className={`group hover:bg-slate-50 transition-colors ${action.status === 'done' ? 'bg-slate-50/50' : ''}`}>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => toggleStatus(action.id)}
                                            className={`transform transition-all duration-200 active:scale-90 ${action.status === 'done' ? 'text-emerald-500 scale-110' : 'text-slate-300 hover:text-emerald-400'}`}
                                            title={action.status === 'done' ? 'Marcar como pendiente' : 'Marcar como completado'}
                                        >
                                            {action.status === 'done' ? <CheckCircle size={22} className="drop-shadow-sm" /> : <Circle size={22} />}
                                        </button>
                                    </td>
                                    <td className={`px-6 py-4 font-medium transition-colors ${action.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {action.activity}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-3 ${action.status === 'done' && 'opacity-50'}`}>
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xs font-bold shadow-sm">
                                                {action.responsible ? <span className="uppercase">{action.responsible.charAt(0)}</span> : <User size={12} />}
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 truncate max-w-[140px]">{action.responsible || 'Sin asignar'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md w-fit border ${action.status === 'done' ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            <Calendar size={12} />
                                            {action.date || 'Sin fecha'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(action.id)}
                                            className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                            title="Eliminar acción"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 justify-end">
                <InfoIcon />
                <span>Las tareas completadas se archivarán en el historial del proyecto.</span>
            </div>
        </div>
    );
};

const InfoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export default A3ActionPlan;
