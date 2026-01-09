import { useState } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle, Circle, User, Calendar } from 'lucide-react';

interface CountermeasureItem {
    id: number;
    action: string;
    deadline: string;
    responsible: string;
    status: 'Pendiente' | 'En Proceso' | 'Completado' | 'Atrasado';
}

interface A3CountermeasuresProps {
    data: CountermeasureItem[];
    onChange: (data: CountermeasureItem[]) => void;
    users?: { id: string; name: string }[];
}

const A3Countermeasures = ({ data = [], onChange, users = [] }: A3CountermeasuresProps) => {
    const [newItem, setNewItem] = useState<Omit<CountermeasureItem, 'id'>>({
        action: '',
        deadline: '',
        responsible: '',
        status: 'Pendiente'
    });

    const handleAddItem = () => {
        if (!newItem.action) {
            alert("Por favor completa la acción.");
            return;
        }

        // Use default empty arrays if data is null/undefined
        const currentData = Array.isArray(data) ? data : [];

        const updatedList = [
            ...currentData,
            { ...newItem, id: Date.now() }
        ];
        onChange(updatedList);
        setNewItem({ action: '', deadline: '', responsible: '', status: 'Pendiente' });
    };

    const handleRemoveItem = (id: number) => {
        const currentData = Array.isArray(data) ? data : [];
        const updatedList = currentData.filter(item => item.id !== id);
        onChange(updatedList);
    };

    const handleStatusChange = (id: number, newStatus: CountermeasureItem['status']) => {
        const currentData = Array.isArray(data) ? data : [];
        const updatedList = currentData.map(item =>
            item.id === id ? { ...item, status: newStatus } : item
        );
        onChange(updatedList);
    };

    const getStatusColor = (status: CountermeasureItem['status']) => {
        switch (status) {
            case 'Completado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Atrasado': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">3. Plan de Acción (Contramedidas)</h3>
                    <p className="text-sm text-slate-500 mt-1">Define las acciones, responsables y fechas para eliminar las causas raíz.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                            <th className="p-4 w-[40%]">Contramedida / Acción</th>
                            <th className="p-4 w-[15%]">Fecha Límite</th>
                            <th className="p-4 w-[20%]">Responsable</th>
                            <th className="p-4 w-[15%]">Estado</th>
                            <th className="p-4 w-[10%] text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {Array.isArray(data) && data.map((item) => (
                            <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-slate-700 text-sm">{item.action}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-slate-600 text-xs font-medium bg-slate-100/50 px-2 py-1 rounded inline-flex">
                                        <Calendar size={12} className="text-slate-400" />
                                        {item.deadline || 'S/F'}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">
                                            {item.responsible ? item.responsible.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <span className="text-sm text-slate-600 truncate max-w-[120px]" title={item.responsible}>{item.responsible || 'Sin asignar'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <select
                                        className={`text-[10px] font-bold uppercase py-1 px-2.5 rounded-full border ${getStatusColor(item.status)} focus:outline-none cursor-pointer appearance-none text-center min-w-[90px]`}
                                        value={item.status}
                                        onChange={(e) => handleStatusChange(item.id, e.target.value as CountermeasureItem['status'])}
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Completado">Completado</option>
                                        <option value="Atrasado">Atrasado</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-rose-50 rounded-lg"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Input Row */}
                        <tr className="bg-slate-50/50">
                            <td className="p-3">
                                <div className="relative">
                                    <Circle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Escribe la acción a realizar..."
                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                                        value={newItem.action}
                                        onChange={(e) => setNewItem({ ...newItem, action: e.target.value })}
                                    />
                                </div>
                            </td>
                            <td className="p-3">
                                <input
                                    type="date"
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-600 shadow-sm"
                                    value={newItem.deadline}
                                    onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })}
                                />
                            </td>
                            <td className="p-3">
                                {users.length > 0 ? (
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <select
                                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-600 appearance-none shadow-sm cursor-pointer"
                                            value={newItem.responsible}
                                            onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.name}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Responsable..."
                                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-600 shadow-sm"
                                            value={newItem.responsible}
                                            onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })}
                                        />
                                    </div>
                                )}
                            </td>
                            <td className="p-3">
                                <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-xs font-bold text-center uppercase shadow-sm select-none">
                                    Pendiente
                                </div>
                            </td>
                            <td className="p-3 text-right">
                                <button
                                    onClick={handleAddItem}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-all shadow-md shadow-blue-600/20 hover:scale-105 active:scale-95"
                                    title="Agregar Acción"
                                >
                                    <Plus size={18} />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {(!data || data.length === 0) && (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 border-t border-slate-100">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle className="text-slate-300" size={24} />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">No hay acciones definidas</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Utiliza el formulario superior para agregar nuevas contramedidas al plan de acción.</p>
                </div>
            )}
        </div>
    );
};

export default A3Countermeasures;
