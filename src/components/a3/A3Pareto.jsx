import { useState, useEffect } from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Cell } from 'recharts';
import { Plus, Trash2, BarChart2 } from 'lucide-react';

const A3Pareto = ({ data = [], onChange }) => {
    // data structure: [{ name: 'Category A', value: 50 }, ...]
    const [items, setItems] = useState(data);
    const [newItemName, setNewItemName] = useState('');
    const [newItemValue, setNewItemValue] = useState('');

    useEffect(() => {
        setItems(data);
    }, [data]);

    const calculateParetoData = (rawData) => {
        if (!rawData || rawData.length === 0) return [];

        // 1. Sort by value descending
        const sorted = [...rawData].sort((a, b) => b.value - a.value);

        // 2. Calculate Total
        const total = sorted.reduce((sum, item) => sum + Number(item.value), 0);

        // 3. Calculate Cumulative %
        let accumulated = 0;
        return sorted.map(item => {
            accumulated += Number(item.value);
            return {
                ...item,
                cumulativePercentage: Math.round((accumulated / total) * 100)
            };
        });
    };

    const chartData = calculateParetoData(items);

    const handleAddItem = () => {
        if (!newItemName || !newItemValue) return;
        const newItems = [...items, { name: newItemName, value: Number(newItemValue) }];
        setItems(newItems);
        onChange(newItems);
        setNewItemName('');
        setNewItemValue('');
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        onChange(newItems);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 lg:col-span-1">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart2 size={18} /> Datos del Pareto
                    </h4>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-xs font-bold text-slate-900 uppercase mb-1 block">Categoría (Causa)</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Ej: Defecto A"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-900 uppercase mb-1 block">Frecuencia / Costo</label>
                            <input
                                type="number"
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Ej: 50"
                                value={newItemValue}
                                onChange={(e) => setNewItemValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            />
                        </div>
                        <button
                            onClick={handleAddItem}
                            className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Agregar al Gráfico
                        </button>
                    </div>

                    {/* List of Items */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {items.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center italic py-4">No hay datos agregados.</p>
                        ) : (
                            items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <span className="text-sm font-bold text-slate-700 truncate flex-1">{item.name}</span>
                                    <span className="text-sm font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded mx-2">{item.value}</span>
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                    {items.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                                <XAxis dataKey="name" scale="band" tick={{ fill: '#475569', fontSize: 12 }} />
                                <YAxis yAxisId="left" orientation="left" stroke="#475569" fontSize={12} />
                                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={12} unit="%" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="value" name="Frecuencia" fill="#0ea5e9" barSize={40} radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#0ea5e9' : '#94a3b8'} />
                                    ))}
                                </Bar>
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="cumulativePercentage"
                                    name="% Acumulado"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                />
                                {/* 80% Reference Line */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey={() => 80}
                                    stroke="#ef4444"
                                    strokeDasharray="5 5"
                                    strokeWidth={1}
                                    dot={false}
                                    activeDot={false}
                                    legendType="none"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <BarChart2 size={48} className="mb-4 opacity-50" />
                            <p>Agrega datos para visualizar el diagrama de Pareto 80/20</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Text */}
            {items.length > 0 && (
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-lg">
                    <h5 className="text-sm font-bold text-brand-800 mb-1 flex items-center gap-2">
                        💡 Análisis 80/20
                    </h5>
                    <p className="text-sm text-brand-700">
                        Las categorías <strong>{chartData.filter(i => i.cumulativePercentage <= 80).map(i => i.name).join(', ')}</strong> representan el ~80% del impacto total.
                    </p>
                </div>
            )}
        </div>
    );
};

export default A3Pareto;
