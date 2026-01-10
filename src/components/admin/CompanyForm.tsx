import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Company } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

interface CompanyFormProps {
    company?: Company | null; // If null, create mode
    onClose: () => void;
    onSuccess: () => void;
}

export default function CompanyForm({ company, onClose, onSuccess }: CompanyFormProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');

    // Default modules
    const ALL_MODULES = [
        { id: '5s', label: 'Tarjetas 5S' },
        { id: 'auditoria_5s', label: 'Auditoría 5S' },
        { id: 'a3', label: 'Proyectos A3' },
        { id: 'vsm', label: 'VSM (Value Stream Mapping)' },
        { id: 'quick_wins', label: 'Quick Wins' },
        { id: 'consultor_ia', label: 'Consultor IA' },
    ];

    const [allowedModules, setAllowedModules] = useState<string[]>(['5s', 'auditoria_5s', 'a3', 'vsm', 'quick_wins', 'consultor_ia']);

    useEffect(() => {
        if (company) {
            setName(company.name);
            if (company.allowed_modules && Array.isArray(company.allowed_modules)) {
                setAllowedModules(company.allowed_modules);
            } else {
                // Default fallback for legacy records
                setAllowedModules(['5s', 'auditoria_5s', 'a3', 'vsm', 'quick_wins', 'consultor_ia']);
            }
        } else {
            setName('');
            setAllowedModules(['5s', 'auditoria_5s', 'a3', 'vsm', 'quick_wins', 'consultor_ia']);
        }
    }, [company]);

    const toggleModule = (moduleId: string) => {
        setAllowedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (company) {
                // Update
                const { error } = await supabase
                    .from('companies')
                    .update({
                        name,
                        allowed_modules: allowedModules,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', company.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('companies')
                    .insert({
                        name,
                        allowed_modules: allowedModules // Default set
                    });
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving company:', error);
            alert('Error al guardar empresa: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {company ? 'Editar Empresa' : 'Nueva Empresa'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-900 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Empresa</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 text-slate-900"
                            placeholder="Ej. Acme Corp"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Módulos Habilitados</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ALL_MODULES.map(module => (
                                <label
                                    key={module.id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                        ${allowedModules.includes(module.id)
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={allowedModules.includes(module.id)}
                                        onChange={() => toggleModule(module.id)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className={`text-sm font-medium ${allowedModules.includes(module.id) ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {module.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
