import { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, Settings, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DataPoint {
    id: number;
    date: string;
    value: number; // For manual input or calculated OEE
    // OEE specific fields
    availability?: number;
    performance?: number;
    quality?: number;
    plannedTime?: number; // T.Disp
    runTime?: number; // T.Prod (or derived)
    totalPieces?: number;
    defectPieces?: number;
}

interface FollowUpChart {
    kpiName: string;
    kpiGoal: string;
    indicatorType: 'simple' | 'oee';
    interventionDate: string;
    improvementDirection: 'minimize' | 'maximize';
    dataType: 'numeric' | 'percentage';
    xAxisFormat: 'date' | 'month';
    showInDashboard: boolean;
    dataPoints: DataPoint[];
}

interface A3FollowUpProps {
    data: FollowUpChart;
    onChange: (field: string, value: any) => void;
}

const A3FollowUp = ({ data, onChange }: A3FollowUpProps) => {
    // Destructure with defaults
    const {
        kpiName = '',
        kpiGoal = '',
        dataPoints = [],
        indicatorType = 'simple',
        interventionDate = '',
        improvementDirection = 'maximize',
        dataType = 'numeric',
        xAxisFormat = 'date',
        showInDashboard = false
    } = data;

    const [showConfig, setShowConfig] = useState(true);

    const addDataPoint = () => {
        const newPoint: DataPoint = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            value: 0,
            plannedTime: 0,
            runTime: 0,
            totalPieces: 0,
            defectPieces: 0
        };
        onChange('dataPoints', [...dataPoints, newPoint]);
    };

    const updateDataPoint = (id: number, field: keyof DataPoint, value: any) => {
        let updatedPoints = dataPoints.map(point => {
            if (point.id !== id) return point;

            const updatedPoint = { ...point, [field]: value };

            // OEE Calculation Logic
            if (indicatorType === 'oee') {
                // Determine derived values if modifying raw inputs
                // OEE = (Good Pieces / Total Pieces) * (Total Pieces / (RunTime * IdealRunRate)) * (RunTime / PlannedTime)
                // Simplified usually: (Good Count / Ideal Cycle Time * Planned Time) or just Availability * Performance * Quality

                // Nexus Context:
                // T.Disp = Tiempo Disponible
                // T.Prod = Tiempo Producción
                // Piezas = Total producidas
                // Defec. = Total defectuosas

                // Availability = T.Prod / T.Disp
                const tDisp = field === 'plannedTime' ? Number(value) : (updatedPoint.plannedTime || 0);
                const tProd = field === 'runTime' ? Number(value) : (updatedPoint.runTime || 0);
                const totalPieces = field === 'totalPieces' ? Number(value) : (updatedPoint.totalPieces || 0);
                const defectPieces = field === 'defectPieces' ? Number(value) : (updatedPoint.defectPieces || 0);

                const availability = tDisp > 0 ? (tProd / tDisp) : 0;

                // Quality = (Total - Defect) / Total
                const goodPieces = totalPieces - defectPieces;
                const quality = totalPieces > 0 ? (goodPieces / totalPieces) : 0;

                // Performance is tricky without Ideal Cycle Time. 
                // Often users invoke OEE but just want to track the final calculated % they have from another source?
                // OR we infer Performance? 
                // Let's assume for this specific UI shown in screenshot:
                // The user enters T.Disp, T.Prod, Piezas, Defec. 
                // Actually the OEE formula in simplified systems often just asks for the final OEE or 
                // Availability * Quality * Performance. 

                // Inspecting the screenshot "1767898654632.png" (Image 2/3):
                // Columns are: FECHA, T.DISP, T.PROD, PIEZAS, DEFEC., OEE
                // So OEE is calculated.

                // Let's implement a standard loose OEE if sufficient data, or just allow manual override if needed?
                // Actually, let's just calculate OEE = (Good Pieces) / (Theoretical Max Pieces) ? No theoretical max given.
                // Let's use: Value = Availability * Quality (If Performance is 100% or unknown). 
                // Wait, usually OEE = (Good / Ideal) * (Run / Plan).
                // Without "Cycles" or "Ideal Rate", we can't calculate Performance fully.
                // Maybe the user just enters the resulting OEE?
                // The screenshot shows "OEE" column at the end.

                // Let's implement a calculation placeholder:
                // value = (tProd / tDisp) * ((totalPieces - defectPieces) / totalPieces) * 100 ?? 
                // This assumes standard rate.
                // Let's try to simulate a credible OEE calc or leave it as manual input for now on the OEE column if the formula is ambiguous.
                // BUT, to be helpful: Availability = tProd/tDisp. Quality = (Total-Bad)/Total.
                // Let's just store these components.

                // Value (OEE) will be explicitly calculated here for display.
                // Let's try: Availability * Quality * 1 (Performance assumed 1 if not tracked)
                const safeAvail = Math.min(availability, 1);
                const safeQual = Math.min(quality, 1);

                if (tDisp > 0 && totalPieces > 0) {
                    updatedPoint.value = Number((safeAvail * safeQual * 100).toFixed(2));
                }
            }

            return updatedPoint;
        });

        // Special handling for changing indicator type -> reset values or reformat?
        // Done in the parent usually, but here just data updates.
        onChange('dataPoints', updatedPoints);
    };

    const deleteDataPoint = (id: number) => {
        if (!confirm('¿Eliminar este registro?')) return;
        onChange('dataPoints', dataPoints.filter(p => p.id !== id));
    };

    const sortedData = useMemo(() => {
        return [...dataPoints]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(point => ({
                ...point,
                dateDisplay: point.date.split('-').reverse().join('/'), // dd/mm/yyyy
                value: Number(point.value)
            }));
    }, [dataPoints]);

    const latestValue = sortedData.length > 0 ? sortedData[sortedData.length - 1].value : 0;
    const firstValue = sortedData.length > 0 ? sortedData[0].value : 0;
    const delta = firstValue !== 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;
    const isPositive = improvementDirection === 'maximize' ? delta >= 0 : delta <= 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* CONFIGURATION & CHART PANEL (LEFT) */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h5 className="font-bold text-slate-700 text-sm uppercase">Gráfico de Tendencia</h5>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Visualización del desempeño del indicador</p>
                        </div>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            {showConfig ? <EyeOff size={14} /> : <Settings size={14} />}
                            {showConfig ? 'Ocultar' : 'Configurar'}
                        </button>
                    </div>

                    <div className="p-6 flex-1 flex flex-col min-h-[400px]">

                        {/* CONFIG PANEL */}
                        {showConfig && (
                            <div className="mb-8 p-5 bg-slate-50/50 rounded-xl border border-slate-200/60 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo de Indicador</label>
                                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                        <button
                                            onClick={() => onChange('indicatorType', 'simple')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${indicatorType === 'simple' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            KPI Simple
                                        </button>
                                        <button
                                            onClick={() => onChange('indicatorType', 'oee')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${indicatorType === 'oee' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            OEE
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre del KPI</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                            placeholder="Ej: OEE, Desperdicio..."
                                            value={kpiName}
                                            onChange={(e) => onChange('kpiName', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Fecha Intervención</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-600 transition-all"
                                            value={interventionDate}
                                            onChange={(e) => onChange('interventionDate', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Meta Objetivo</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                            placeholder="00"
                                            value={kpiGoal}
                                            onChange={(e) => onChange('kpiGoal', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Dirección de Mejora</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onChange('improvementDirection', 'minimize')}
                                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${improvementDirection === 'minimize' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                            >
                                                Minimizar 📉
                                            </button>
                                            <button
                                                onClick={() => onChange('improvementDirection', 'maximize')}
                                                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${improvementDirection === 'maximize' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                            >
                                                Maximizar 📈
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo de Dato</label>
                                        <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                            <button
                                                onClick={() => onChange('dataType', 'numeric')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${dataType === 'numeric' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Numérico
                                            </button>
                                            <button
                                                onClick={() => onChange('dataType', 'percentage')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${dataType === 'percentage' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Porcentaje %
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BIG NUMBER & CHART */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-6">
                                <div>
                                    <div className="text-5xl font-black text-slate-700 tracking-tight">
                                        {latestValue}
                                        {dataType === 'percentage' && <span className="text-3xl text-slate-400 ml-1">%</span>}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Valor Actual</div>
                                </div>
                                {dataPoints.length > 1 && (
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs inicio
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 w-full min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(date) => {
                                                const [, m, d] = date.split('-');
                                                return `${d}-${m}`;
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#334155', fontSize: '12px', fontWeight: 600 }}
                                            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                                        />
                                        <ReferenceLine y={Number(kpiGoal)} stroke="#fbbf24" strokeDasharray="3 3" />
                                        {interventionDate && (
                                            <ReferenceLine x={interventionDate} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Intervención', position: 'insideTopLeft', fill: '#3b82f6', fontSize: 10 }} />
                                        )}
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>

                                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                        <TrendingUp size={12} /> {kpiName || 'Indicador'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DATA REGISTRY (RIGHT) */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-h-[800px]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h5 className="font-bold text-slate-700 text-sm uppercase">Registro de Datos</h5>
                        <button
                            onClick={addDataPoint}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm shadow-blue-500/30"
                        >
                            <Plus size={14} /> Agregar
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="p-3 border-b border-slate-100">Fecha</th>
                                    {indicatorType === 'oee' && (
                                        <>
                                            <th className="p-3 border-b border-slate-100 text-center" title="Tiempo Disponible">T.Disp</th>
                                            <th className="p-3 border-b border-slate-100 text-center" title="Tiempo Producción">T.Prod</th>
                                            <th className="p-3 border-b border-slate-100 text-center">Piezas</th>
                                            <th className="p-3 border-b border-slate-100 text-center">Defec.</th>
                                        </>
                                    )}
                                    <th className="p-3 border-b border-slate-100 text-right">Valor</th>
                                    <th className="p-3 border-b border-slate-100 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedData.map((point) => (
                                    <tr key={point.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="p-2">
                                            <input
                                                type="date"
                                                className="w-full bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 p-0"
                                                value={point.date}
                                                onChange={(e) => updateDataPoint(point.id, 'date', e.target.value)}
                                            />
                                        </td>

                                        {indicatorType === 'oee' ? (
                                            <>
                                                <td className="p-1">
                                                    <input type="number" className="w-full text-center bg-slate-100/50 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 text-xs py-1 outline-none transition-all"
                                                        value={point.plannedTime || ''} onChange={(e) => updateDataPoint(point.id, 'plannedTime', e.target.value)} />
                                                </td>
                                                <td className="p-1">
                                                    <input type="number" className="w-full text-center bg-slate-100/50 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 text-xs py-1 outline-none transition-all"
                                                        value={point.runTime || ''} onChange={(e) => updateDataPoint(point.id, 'runTime', e.target.value)} />
                                                </td>
                                                <td className="p-1">
                                                    <input type="number" className="w-full text-center bg-slate-100/50 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 text-xs py-1 outline-none transition-all"
                                                        value={point.totalPieces || ''} onChange={(e) => updateDataPoint(point.id, 'totalPieces', e.target.value)} />
                                                </td>
                                                <td className="p-1">
                                                    <input type="number" className="w-full text-center bg-slate-100/50 rounded border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 text-xs py-1 outline-none transition-all"
                                                        value={point.defectPieces || ''} onChange={(e) => updateDataPoint(point.id, 'defectPieces', e.target.value)} />
                                                </td>
                                                <td className="p-2 text-right">
                                                    <span className="text-sm font-bold text-emerald-600">{point.value}%</span>
                                                </td>
                                            </>
                                        ) : (
                                            <td className="p-2 text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-20 text-right bg-transparent border-none text-sm font-bold text-emerald-600 focus:ring-0 p-0"
                                                    value={point.value}
                                                    onChange={(e) => updateDataPoint(point.id, 'value', e.target.value)}
                                                />
                                            </td>
                                        )}

                                        <td className="p-2 text-right">
                                            <button
                                                onClick={() => deleteDataPoint(point.id)}
                                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {dataPoints.length === 0 && (
                                    <tr>
                                        <td colSpan={indicatorType === 'oee' ? 7 : 3} className="p-8 text-center text-xs text-slate-400 italic">
                                            No hay registros. Comienza agregando un dato.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default A3FollowUp;
