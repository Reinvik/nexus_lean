
import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { Activity } from 'lucide-react';
import type { Audit5S } from '../../types/audit.types';

interface AuditChartsProps {
    audits: Audit5S[];
    year: number;
}

export const AuditCharts: React.FC<AuditChartsProps> = ({ audits, year }) => {

    const filteredAudits = audits.filter(a => {
        if (!a.audit_date) return false;
        return parseInt(a.audit_date.split('-')[0]) === year;
    });

    const getRadarData = (audit: Audit5S | undefined) => {
        if (!audit || !audit.audit_5s_entries) return [];
        const sections = ['S1', 'S2', 'S3', 'S4', 'S5'];
        return sections.map(section => {
            const entries = audit.audit_5s_entries?.filter(e => e.section === section) || [];
            const total = entries.reduce((acc, curr) => acc + Number(curr.score), 0);
            const count = entries.length;
            const value = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;

            return {
                subject: section,
                A: value,
                fullMark: 5
            };
        });
    };

    const getTrendData = () => {
        if (filteredAudits.length === 0) return [];

        const grouped: Record<string, { sum: number; count: number; sortTime: number }> = {};

        filteredAudits.forEach(a => {
            const d = new Date(a.audit_date + 'T12:00:00');
            const key = d.toLocaleString('es-ES', { month: 'short' });

            if (!grouped[key]) grouped[key] = {
                sum: 0,
                count: 0,
                sortTime: d.getTime()
            };

            grouped[key].sum += Number(a.total_score);
            grouped[key].count += 1;
        });

        return Object.keys(grouped)
            .map(key => {
                const item = grouped[key];
                const avgScore = item.count > 0 ? parseFloat((item.sum / item.count).toFixed(2)) : 0;
                return {
                    date: key,
                    score: avgScore,
                    sortTime: item.sortTime
                };
            })
            .sort((a, b) => a.sortTime - b.sortTime);
    };

    const getAreaScores = () => {
        const counts: Record<string, { sum: number; count: number }> = {};
        filteredAudits.forEach(a => {
            if (!counts[a.area]) counts[a.area] = { sum: 0, count: 0 };
            counts[a.area].sum += Number(a.total_score);
            counts[a.area].count += 1;
        });

        return Object.keys(counts).map(area => ({
            name: area,
            score: parseFloat((counts[area].sum / counts[area].count).toFixed(2))
        }));
    };

    const getComplianceByS = () => {
        const sScores: Record<string, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };
        const sCounts: Record<string, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };

        filteredAudits.forEach(a => {
            a.audit_5s_entries?.forEach(e => {
                if (sScores[e.section] !== undefined) {
                    sScores[e.section] += Number(e.score);
                    sCounts[e.section] += 1;
                }
            });
        });

        return Object.keys(sScores).map(key => {
            const totalPoints = sScores[key];
            const count = sCounts[key];
            const avg = count > 0 ? parseFloat((totalPoints / count).toFixed(2)) : 0;
            return {
                name: key,
                value: avg
            };
        });
    };

    if (filteredAudits.length === 0) {
        return (
            <div className="col-span-1 lg:col-span-2 p-12 text-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="text-slate-300" size={32} />
                </div>
                <p className="text-xl font-bold text-slate-600">No hay datos para el año {year}</p>
                <p className="text-slate-500 mt-2">Intente cambiar el filtro de año o agregue una nueva auditoría.</p>
            </div>
        );
    }

    // Custom Tooltip for consistent look
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl">
                    <p className="text-sm font-bold text-slate-700 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 1. Evolution Chart - Main Focus (Top Left, 2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Evolución de Puntaje</h3>
                        <p className="text-sm text-slate-500">Tendencia mensual del cumplimiento 5S</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                            Promedio Anual
                        </span>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getTrendData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                domain={[0, 5]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                                tickCount={6}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 4 }}
                                name="Puntaje Promedio"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Radar Chart - Snapshot (Top Right, 1 col) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Última Auditoría</h3>
                    <p className="text-sm text-slate-500 truncate">{filteredAudits[0]?.title || 'Sin título'} ({filteredAudits[0]?.audit_date})</p>
                </div>
                <div className="flex-1 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(filteredAudits[0])}>
                            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
                            <Radar
                                name="Puntaje"
                                dataKey="A"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                fill="#8b5cf6"
                                fillOpacity={0.4}
                            />
                            <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Global Performance by S (Bottom Left, 2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Desempeño Global por S</h3>
                    <p className="text-sm text-slate-500">Promedio acumulado de todos los estándares</p>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComplianceByS()} layout="vertical" margin={{ left: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 5]} hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#64748b"
                                width={30}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 14, fontWeight: 700, fill: '#475569' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="value"
                                fill="#f97316"
                                radius={[0, 6, 6, 0]}
                                barSize={24}
                                name="Puntaje Promedio"
                            >
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Area Scores (Bottom Right, 1 col) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Puntaje por Área</h3>
                    <p className="text-sm text-slate-500">Comparativa de zonas</p>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getAreaScores()} margin={{ top: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                interval={0}
                            />
                            <YAxis hide domain={[0, 5]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="score"
                                fill="#6366f1"
                                radius={[6, 6, 0, 0]}
                                name="Puntaje"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
