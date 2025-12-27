import { useState } from 'react';
import { Plus, Trash2, TrendingUp, Settings, Maximize2, Minimize2, Calendar, Target, Gauge } from 'lucide-react';
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
        interventionDate = '',
        kpiType = 'simple', // 'simple' or 'oee'
        oeeConfig = {
            standardSpeed: 100, // piezas/hora
            shiftDuration: 8    // horas por turno
        }
    } = data;

    const handleChange = (field, value) => {
        onChange(field, value);
    };

    // Calculate OEE metrics for a data point
    const calculateOEE = (point) => {
        const availableTime = parseFloat(point.availableTime) || 0;
        const productiveTime = parseFloat(point.productiveTime) || 0;
        const producedPieces = parseFloat(point.producedPieces) || 0;
        const defectPieces = parseFloat(point.defectPieces) || 0;
        const standardSpeed = parseFloat(oeeConfig.standardSpeed) || 100;

        // Avoid division by zero
        const availability = availableTime > 0 ? (productiveTime / availableTime) * 100 : 0;
        const theoreticalOutput = productiveTime * standardSpeed;
        const performance = theoreticalOutput > 0 ? (producedPieces / theoreticalOutput) * 100 : 0;
        const quality = producedPieces > 0 ? ((producedPieces - defectPieces) / producedPieces) * 100 : 0;
        const oee = (availability * performance * quality) / 10000;

        return {
            availability: Math.round(availability * 10) / 10,
            performance: Math.round(performance * 10) / 10,
            quality: Math.round(quality * 10) / 10,
            oee: Math.round(oee * 10) / 10
        };
    };

    const addDataPoint = () => {
        const newPoint = kpiType === 'oee' ? {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            availableTime: oeeConfig.shiftDuration || 8,
            productiveTime: 0,
            producedPieces: 0,
            defectPieces: 0
        } : {
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
            default: {
                const [y, m, d] = dateStr.split('-');
                return `${d}-${m}-${y.slice(2)}`;
            }
        }
    };

    // Prepare chart data - Inject Intervention Date if needed to ensure X-Axis covers it
    const chartData = [...dataPoints];

    // Check if intervention date exists and is not in dataPoints
    if (interventionDate && !chartData.some(p => p.date === interventionDate)) {
        chartData.push({ date: interventionDate, value: null }); // Null value so it doesn't plot a point but exists on axis
    }

    // For simple KPI mode
    const sortedData = chartData
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(point => ({
            date: point.date,
            value: point.value !== null ? (parseFloat(point.value) || 0) : null
        }));

    // For OEE mode - calculate metrics for each data point
    const sortedOEEData = kpiType === 'oee' ? chartData
        .filter(p => p.availableTime !== undefined) // Only OEE points
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(point => {
            const metrics = calculateOEE(point);
            return {
                date: point.date,
                ...metrics
            };
        }) : [];

    // Get current OEE metrics (last data point)
    const currentOEEMetrics = sortedOEEData.length > 0 ? sortedOEEData[sortedOEEData.length - 1] : null;

    // Get color based on OEE value
    const getOEEColor = (value, type = 'oee') => {
        if (type === 'oee') {
            if (value >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            if (value >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
            return 'text-rose-600 bg-rose-50 border-rose-200';
        }
        // For sub-metrics (availability, performance, quality)
        if (value >= 90) return 'text-emerald-600';
        if (value >= 70) return 'text-amber-600';
        return 'text-rose-600';
    };

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
                            {/* KPI Type Selector */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tipo de Indicador</label>
                                <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                    <button
                                        onClick={() => handleChange('kpiType', 'simple')}
                                        className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-md transition-all ${kpiType === 'simple' ? 'bg-slate-100 text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <TrendingUp size={14} /> KPI Simple
                                    </button>
                                    <button
                                        onClick={() => handleChange('kpiType', 'oee')}
                                        className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-md transition-all ${kpiType === 'oee' ? 'bg-cyan-50 text-cyan-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Gauge size={14} /> OEE
                                    </button>
                                </div>
                            </div>

                            {/* OEE Specific Config */}
                            {kpiType === 'oee' && (
                                <div className="mb-4 p-3 bg-cyan-50 border border-cyan-100 rounded-lg">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-cyan-700 uppercase mb-1 block">Velocidad Estándar (pzs/hr)</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                                placeholder="100"
                                                value={oeeConfig.standardSpeed}
                                                onChange={(e) => handleChange('oeeConfig', { ...oeeConfig, standardSpeed: parseFloat(e.target.value) || 100 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-cyan-700 uppercase mb-1 block">Duración Turno (hrs)</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                                placeholder="8"
                                                value={oeeConfig.shiftDuration}
                                                onChange={(e) => handleChange('oeeConfig', { ...oeeConfig, shiftDuration: parseFloat(e.target.value) || 8 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{kpiType === 'oee' ? 'Nombre (Línea/Máquina)' : 'Nombre del KPI'}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-all shadow-sm"
                                        placeholder={kpiType === 'oee' ? 'Ej: Línea 1' : 'Ej: Tiempo de cambio (min)'}
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

                        {/* OEE Cards Display */}
                        {kpiType === 'oee' && currentOEEMetrics && (
                            <div className="mb-4">
                                <div className="grid grid-cols-4 gap-3">
                                    {/* Availability Card */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-black ${getOEEColor(currentOEEMetrics.availability, 'sub')}`}>
                                            {currentOEEMetrics.availability}%
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Disponibilidad</div>
                                    </div>
                                    {/* Performance Card */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-black ${getOEEColor(currentOEEMetrics.performance, 'sub')}`}>
                                            {currentOEEMetrics.performance}%
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Rendimiento</div>
                                    </div>
                                    {/* Quality Card */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                                        <div className={`text-2xl font-black ${getOEEColor(currentOEEMetrics.quality, 'sub')}`}>
                                            {currentOEEMetrics.quality}%
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Calidad</div>
                                    </div>
                                    {/* OEE Card */}
                                    <div className={`rounded-xl p-3 text-center shadow-sm border ${getOEEColor(currentOEEMetrics.oee, 'oee')}`}>
                                        <div className="text-2xl font-black">
                                            {currentOEEMetrics.oee}%
                                        </div>
                                        <div className="text-[10px] font-bold uppercase mt-1 opacity-70">OEE</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Simple KPI Big Value Display */}
                        {kpiType !== 'oee' && sortedData.length > 0 && (
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
                            {/* OEE Chart */}
                            {kpiType === 'oee' && sortedOEEData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={sortedOEEData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatXAxis}
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={[0, 100]}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            formatter={(value, name) => [`${value}%`, name]}
                                            labelFormatter={(label) => formatXAxis(label)}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        {kpiGoal && !isNaN(parseFloat(kpiGoal)) && (
                                            <ReferenceLine
                                                y={parseFloat(kpiGoal)}
                                                stroke="#10b981"
                                                strokeDasharray="4 4"
                                                strokeWidth={2}
                                                label={{ value: `Meta: ${kpiGoal}%`, position: 'right', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                        )}
                                        <Line type="monotone" dataKey="oee" stroke="#06b6d4" strokeWidth={3} name="OEE" dot={{ fill: '#06b6d4', r: 4 }} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" name="Disponibilidad" dot={false} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" name="Rendimiento" dot={false} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" name="Calidad" dot={false} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : kpiType !== 'oee' && sortedData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={sortedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                            domain={['auto', 'auto']}
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
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            name={kpiName || 'Valor Real'}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                                            connectNulls={true}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                    {kpiType === 'oee' ? <Gauge size={48} className="opacity-20" /> : <TrendingUp size={48} className="opacity-20" />}
                                    <div className="text-center">
                                        <p className="font-medium text-slate-400">Sin datos para mostrar</p>
                                        <p className="text-xs">{kpiType === 'oee' ? 'Agrega registros OEE para ver el gráfico' : 'Agrega registros en la tabla lateral para generar el gráfico'}</p>
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
                        ) : kpiType === 'oee' ? (
                            /* OEE Data Table */
                            <table className="w-full text-sm">
                                <thead className="bg-cyan-50 border-b border-cyan-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left px-2 py-2 text-[9px] font-bold text-cyan-700 uppercase">Fecha</th>
                                        <th className="text-center px-1 py-2 text-[9px] font-bold text-cyan-700 uppercase">T.Disp</th>
                                        <th className="text-center px-1 py-2 text-[9px] font-bold text-cyan-700 uppercase">T.Prod</th>
                                        <th className="text-center px-1 py-2 text-[9px] font-bold text-cyan-700 uppercase">Piezas</th>
                                        <th className="text-center px-1 py-2 text-[9px] font-bold text-cyan-700 uppercase">Defec.</th>
                                        <th className="text-center px-1 py-2 text-[9px] font-bold text-cyan-700 uppercase">OEE</th>
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dataPoints
                                        .filter(p => p.availableTime !== undefined)
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(point => {
                                            const metrics = calculateOEE(point);
                                            return (
                                                <tr key={point.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="date"
                                                            className="w-full bg-transparent border-none p-0 text-[10px] font-medium text-slate-600 focus:ring-0"
                                                            value={point.date}
                                                            onChange={(e) => updateDataPoint(point.id, 'date', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="w-12 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                                                            value={point.availableTime}
                                                            onChange={(e) => updateDataPoint(point.id, 'availableTime', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className="w-12 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                                                            value={point.productiveTime}
                                                            onChange={(e) => updateDataPoint(point.id, 'productiveTime', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input
                                                            type="number"
                                                            className="w-14 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                                                            value={point.producedPieces}
                                                            onChange={(e) => updateDataPoint(point.id, 'producedPieces', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input
                                                            type="number"
                                                            className="w-12 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-cyan-500 rounded px-1 py-0.5 text-[10px] font-medium focus:ring-1 focus:ring-cyan-500 outline-none"
                                                            value={point.defectPieces}
                                                            onChange={(e) => updateDataPoint(point.id, 'defectPieces', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-1 py-1.5 text-center">
                                                        <span className={`text-[10px] font-bold ${getOEEColor(metrics.oee, 'sub')}`}>
                                                            {metrics.oee}%
                                                        </span>
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <button
                                                            onClick={() => deleteDataPoint(point.id)}
                                                            className="text-slate-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        ) : (
                            /* Simple KPI Data Table */
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
