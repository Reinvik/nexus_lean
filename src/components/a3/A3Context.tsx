interface A3ContextProps {
    data: {
        context?: string;
        currentSituation?: string;
        goal?: string;
    };
    onChange: (field: string, value: string) => void;
}

const A3Context = ({ data, onChange }: A3ContextProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">1. Contexto y Meta</h3>
                <p className="text-sm text-slate-500 mt-1">Define el problema, la situación actual y el objetivo a alcanzar.</p>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Contexto / Antecedentes</label>
                    <textarea
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 leading-relaxed resize-none"
                        rows={4}
                        placeholder="Describe por qué este problema es importante..."
                        value={data.context || ''}
                        onChange={(e) => onChange('context', e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Situación Actual (KPIs)</label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 leading-relaxed resize-none"
                            rows={3}
                            placeholder="Ej: OEE actual del 65%, desperdicio del 5%..."
                            value={data.currentSituation || ''}
                            onChange={(e) => onChange('currentSituation', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Meta / Objetivo</label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 leading-relaxed resize-none"
                            rows={3}
                            placeholder="Ej: Aumentar OEE al 75% para Q3..."
                            value={data.goal || ''}
                            onChange={(e) => onChange('goal', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default A3Context;
