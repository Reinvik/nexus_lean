const A3Context = ({ data, onChange }) => {
    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h3>1. Contexto y Meta</h3>
                <p className="text-muted">Define el problema, la situación actual y el objetivo a alcanzar.</p>
            </div>

            <div className="form-group mb-4">
                <label className="fw-bold">Contexto / Antecedentes</label>
                <textarea
                    className="input-field"
                    rows="4"
                    placeholder="Describe por qué este problema es importante..."
                    value={data.context || ''}
                    onChange={(e) => onChange('context', e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="fw-bold">Situación Actual (KPIs)</label>
                    <textarea
                        className="input-field"
                        rows="3"
                        placeholder="Ej: OEE actual del 65%, desperdicio del 5%..."
                        value={data.currentSituation || ''}
                        onChange={(e) => onChange('currentSituation', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="fw-bold">Meta / Objetivo</label>
                    <textarea
                        className="input-field"
                        rows="3"
                        placeholder="Ej: Aumentar OEE al 75% para Q3..."
                        value={data.goal || ''}
                        onChange={(e) => onChange('goal', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default A3Context;
