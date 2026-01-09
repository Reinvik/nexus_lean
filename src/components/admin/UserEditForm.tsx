import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Profile, Company } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

interface UserEditFormProps {
    user: Profile;
    companies: Company[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function UserEditForm({ user, companies, onClose, onSuccess }: UserEditFormProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<'user' | 'superuser' | 'superadmin'>('user');
    const [companyId, setCompanyId] = useState<string>('');

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setCompanyId(user.company_id || '');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updates: any = {
                role,
                updated_at: new Date().toISOString()
            };

            // Only update company_id if selected (or allow clearing it if empty string)
            // For now, let's treat empty string as null
            updates.company_id = companyId === '' ? null : companyId;

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert('Error al actualizar usuario: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">Editar Usuario</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-900 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="text-sm text-blue-800 font-medium">{user.full_name || 'Sin Nombre'}</p>
                    <p className="text-xs text-blue-600">{user.email}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="user">Usuario (Básico)</option>
                            <option value="superuser">Administrador de Empresa (Líder)</option>
                            <option value="superadmin">Dueño de Plataforma (Global)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Empresa Asignada</label>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Sin Empresa --</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-900 mt-1">Los Superadmins pueden ver todas las empresas, pero necesitan una asignada para crear registros.</p>
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
                            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
