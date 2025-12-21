import { useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Settings, Maximize2, Minimize2, Calendar, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';

const A3FollowUp = ({ data = {}, onChange }) => {
    const [showConfig, setShowConfig] = useState(false);

    // Extract data with defaults
    const {
        kpiName = '',
        kpiGoal = '',
        goalType = 'minimize', // 'minimize' or 'maximize'
        dataPoints = [],
        isPercentage = false,
        dateFormat = 'date', // 'date', 'month'
        interventionDate = ''
    } = data;

    const handleChange = (field, value) => {
        onChange(field, value);
    };

    const addDataPoint = () => {
        const newPoint = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            value: 0
        };
        handleChange('dataPoints', [...dataPoints, newPoint]);
    };

    const updateDataPoint = (id, field, value) => {
        const updated = dataPoints.map(point =>
            point.id === id ? { ...point, [field]: value } : point
        );
        handleChange('dataPoints', updated);
    };

    const deleteDataPoint = (id) => {
        if (!confirm('¿Eliminar este punto de datos?')) return;
        handleChange('dataPoints', dataPoints.filter(p => p.id !== id));
    };

    // Format X Axis
    const formatXAxis = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);

        switch (dateFormat) {
            case 'month':
                return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
            case 'date':
            default:
                const [y, m, d] = dateStr.split('-');
                return `${d}-${m}-${y.slice(2)}`;
        }
    };

    // Prepare chart data - Inject Intervention Date if needed to ensure X-Axis covers it
    const chartData = [...dataPoints];

    // Check if intervention date exists and is not in dataPoints
    if (interventionDate && !chartData.some(p => p.date === interventionDate)) {
        chartData.push({ date: interventionDate, value: null }); // Null value so it doesn't plot a point but exists on axis
    }

    const sortedData = chartData
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(point => ({
            date: point.date,
            value: point.value !== null ? (parseFloat(point.value) || 0) : null
        }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CHART SECTION */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Gráfico de Tendencia</h5>
                            <div className="text-xs text-slate-400 font-medium">Visualización del desempeño del indicador</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
                            >
                                <Settings size={14} />
                                {showConfig ? 'Ocultar' : 'Configurar'}
                            </button>
                            {/* Delete Button passed from parent if needed, but for now kept simple */}
                        </div>
                    </div>

                    {/* CONFIGURATION PANEL (Collapsible) */}
                    {showConfig && (
                        <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nombre del KPI</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all shadow-sm"
                                        placeholder="Ej: Tiempo de cambio (min)"
                                        value={kpiName}
                                        onChange={(e) => handleChange('kpiName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Fecha Intervención</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="date"
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all shadow-sm"
                                            value={interventionDate}
                                            onChange={(e) => handleChange('interventionDate', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Meta Objetivo</label>
                                    <div className="relative">
                                        <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all shadow-sm"
                                            placeholder="0.00"
                                            value={kpiGoal}
                                            onChange={(e) => handleChange('kpiGoal', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Dirección de Mejora</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleChange('goalType', 'minimize')}
                                            className={`flex items-center justify-center gap-1 text-xs font-bold py-2 px-3 rounded-lg border transition-all ${goalType === 'minimize' ? 'bg-blue-50 text-blue-600 border-blue-200 ring-1 ring-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Minimize2 size={14} /> Minimizar
                                        </button>
                                        <button
                                            onClick={() => handleChange('goalType', 'maximize')}
                                            className={`flex items-center justify-center gap-1 text-xs font-bold py-2 px-3 rounded-lg border transition-all ${goalType === 'maximize' ? 'bg-blue-50 text-blue-600 border-blue-200 ring-1 ring-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Maximize2 size={14} /> Maximizar
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Formatting Options */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tipo de Dato</label>
                                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                        <button
                                            onClick={() => handleChange('isPercentage', false)}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${!isPercentage ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Numérico
                                        </button>
                                        <button
                                            onClick={() => handleChange('isPercentage', true)}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${isPercentage ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Porcentaje %
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Formato Eje X</label>
                                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                        {[
                                            { id: 'date', label: 'Fecha (dd-mm-yy)' },
                                            { id: 'month', label: 'Mes (mmm-yy)' }
                                        ].map(fmt => (
                                            <button
                                                key={fmt.id}
                                                onClick={() => handleChange('dateFormat', fmt.id)}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${dateFormat === fmt.id ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {fmt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Opciones de Visualización</label>
                                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                                            checked={!!data.showInDashboard}
                                            onChange={(e) => handleChange('showInDashboard', e.target.checked)}
                                        />
                                        <span className="text-xs font-bold text-slate-700">Mostrar en Dashboard</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* METRICS SUMMARY & CHART */}
                    <div className="p-6 flex-1 min-h-[320px] flex flex-col">

                        {/* Big Value Display */}
                        {sortedData.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-black text-slate-700 tracking-tight">
                                        {sortedData[sortedData.length - 1].value}
                                        {isPercentage && <span className="text-3xl font-bold text-slate-400 ml-1">%</span>}
                                    </span>
                                    {sortedData.length > 1 && (() => {
                                        const start = sortedData[0].value || 0;
                                        const end = sortedData[sortedData.length - 1].value || 0;
                                        const delta = start !== 0 ? ((end - start) / start) * 100 : 0;
                                        const isPositive = delta >= 0;
                                        return (
                                            <span className={`text-sm font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {isPositive ? '+' : ''}{Math.round(delta)}% vs inicio
                                            </span>
                                        );
                                    })()}
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Valor Actual</p>
                            </div>
                        )}

                        <div className="flex-1 w-full min-h-[240px]">
                            {sortedData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={sortedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatXAxis}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                            domain={['auto', 'auto']} // Auto scale even for percentages as requested
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                            }}
                                            formatter={(value) => [isPercentage ? `${value}%` : value, kpiName || 'Valor']}
                                            labelFormatter={(label) => formatXAxis(label)}
                                            itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        {kpiGoal && !isNaN(parseFloat(kpiGoal)) && (
                                            <ReferenceLine
                                                y={parseFloat(kpiGoal)}
                                                stroke="#f59e0b"
                                                strokeDasharray="4 4"
                                                strokeWidth={2}
                                                label={{
                                                    value: `Meta: ${kpiGoal}${isPercentage ? '%' : ''}`,
                                                    position: 'right',
                                                    fill: '#d97706',
                                                    fontSize: 11,
                                                    fontWeight: 'bold',
                                                    bg: 'white'
                                                }}
                                            />
                                        )}
                                        {interventionDate && (
                                            <ReferenceLine
                                                x={interventionDate}
                                                stroke="#64748b"
                                                strokeDasharray="3 3"
                                                label={{
                                                    value: 'Intervención',
                                                    position: 'top',
                                                    fill: '#64748b',
                                                    fontSize: 10,
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        )}
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            name={kpiName || 'Valor Real'}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                                            connectNulls={true} // Important so the line ignores the injected null point
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                    <TrendingUp size={48} className="opacity-20" />
                                    <div className="text-center">
                                        <p className="font-medium text-slate-400">Sin datos para mostrar</p>
                                        <p className="text-xs">Agrega registros en la tabla lateral para generar el gráfico</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DATA TABLE SECTION */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Registro de Datos</h5>
                        <button
                            onClick={addDataPoint}
                            className="text-xs flex items-center gap-1 px-2.5 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm shadow-brand-500/30 active:scale-95 font-medium"
                        >
                            <Plus size={14} /> Agregar
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {dataPoints.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-slate-400 text-xs italic p-4 text-center">
                                No hay registros. Comienza agregando un dato.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dataPoints
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(point => {
                                            const value = parseFloat(point.value) || 0;
                                            const goal = parseFloat(kpiGoal);
                                            let statusColor = 'text-slate-400';

                                            // Determine status color
                                            if (goal && !isNaN(goal)) {
                                                const isGood = goalType === 'minimize' ? value <= goal : value >= goal;
                                                statusColor = isGood ? 'text-emerald-500' : 'text-rose-500';
                                            }

                                            return (
                                                <tr key={point.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2">
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                className="w-full bg-transparent border-none p-0 text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer"
                                                                value={point.date}
                                                                onChange={(e) => updateDataPoint(point.id, 'date', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={`w-20 bg-transparent border border-transparent hover:border-slate-200 focus:border-brand-500 rounded px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-brand-500 outline-none transition-all ${statusColor}`}
                                                                value={point.value}
                                                                onChange={(e) => updateDataPoint(point.id, 'value', e.target.value)}
                                                            />
                                                            {isPercentage && <span className="text-xs text-slate-400 font-bold">%</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <button
                                                            onClick={() => deleteDataPoint(point.id)}
                                                            className="text-slate-300 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                                            title="Eliminar registro"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default A3FollowUp;
