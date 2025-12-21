import React, { useState } from 'react';
import { Plus, Trash2, Calendar, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const A3Countermeasures = ({ data, onChange }) => {
    const { companyUsers } = useAuth();
    // data.countermeasures = [{ id, action, deadline, responsible, status }]
    const [newItem, setNewItem] = useState({ action: '', deadline: '', responsible: '', status: 'Pendiente' });

    const handleAddItem = () => {
        if (!newItem.action || !newItem.deadline) {
            alert("Por favor completa la acción y la fecha límite.");
            return;
        }
        const updatedList = [
            ...(data || []),
            { ...newItem, id: Date.now() }
        ];
        onChange(updatedList);
        setNewItem({ action: '', deadline: '', responsible: '', status: 'Pendiente' });
    };

    const handleRemoveItem = (id) => {
        const updatedList = data.filter(item => item.id !== id);
        onChange(updatedList);
    };

    const handleStatusChange = (id, newStatus) => {
        const updatedList = data.map(item =>
            item.id === id ? { ...item, status: newStatus } : item
        );
        onChange(updatedList);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completado': return 'bg-green-100 text-green-800 border-green-200';
            case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Atrasado': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h3>3. Plan de Acción (Contramedidas)</h3>
                <p className="text-muted">Define las acciones para eliminar las causas raíz.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                            <th className="p-3">Contramedida / Acción</th>
                            <th className="p-3">Fecha Límite</th>
                            <th className="p-3">Responsable</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data && data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-medium text-gray-700">{item.action}</td>
                                <td className="p-3 text-gray-600 font-mono text-sm">{item.deadline}</td>
                                <td className="p-3 text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                            {item.responsible ? item.responsible.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        {item.responsible}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <select
                                        className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(item.status)} focus:outline-none cursor-pointer`}
                                        value={item.status}
                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Completado">Completado</option>
                                        <option value="Atrasado">Atrasado</option>
                                    </select>
                                </td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* Add Row */}
                        <tr className="bg-gray-50">
                            <td className="p-2">
                                <input
                                    type="text"
                                    placeholder="Nueva acción..."
                                    className="input-field text-sm"
                                    value={newItem.action}
                                    onChange={(e) => setNewItem({ ...newItem, action: e.target.value })}
                                />
                            </td>
                            <td className="p-2">
                                <input
                                    type="date"
                                    className="input-field text-sm"
                                    value={newItem.deadline}
                                    onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })}
                                />
                            </td>
                            <td className="p-2">
                                <select
                                    className="input-field text-sm"
                                    value={newItem.responsible}
                                    onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })}
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {companyUsers && companyUsers.length > 0 ? (
                                        companyUsers.map(u => (
                                            <option key={u.id} value={u.name}>{u.name}</option>
                                        ))
                                    ) : (
                                        <option value="" disabled>Sin usuarios</option>
                                    )}
                                </select>
                            </td>
                            <td className="p-2">
                                <span className="text-xs text-gray-400 pl-2">Pendiente</span>
                            </td>
                            <td className="p-2 text-right">
                                <button onClick={handleAddItem} className="btn-primary" style={{ padding: '6px 12px' }}>
                                    <Plus size={16} />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {(data && data.length === 0) && (
                <div className="text-center p-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg mt-4">
                    <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                    <p>No hay contramedidas definidas aún.</p>
                </div>
            )}
        </div>
    );
};

export default A3Countermeasures;
