import { Edit, User } from 'lucide-react';
import type { Profile, Company } from '../../types/database.types';
import LoadingScreen from '../LoadingScreen';

interface UserListProps {
    users: Profile[];
    companies: Company[];
    loading: boolean;
    onEdit: (user: Profile) => void;
}

export default function UserList({ users, companies, loading, onEdit }: UserListProps) {
    if (loading) {
        return <LoadingScreen message="Cargando usuarios..." fullScreen={false} />;
    }

    const getCompanyName = (companyId: string | null) => {
        if (!companyId) return <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded text-xs">Sin Asignar</span>;
        const company = companies.find(c => c.id === companyId);
        return company ? company.name : 'Desconocida';
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'superadmin':
                return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold border border-red-200">Dueño Plataforma</span>;
            case 'superuser':
                return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium border border-purple-200">Admin Empresa</span>;
            case 'platform_admin': /* Legacy fallback */
                return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs line-through">Legacy Admin</span>;
            default:
                return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium border border-green-200">Usuario</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Usuario</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Rol</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Empresa</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((profile) => (
                        <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-900">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{profile.full_name || 'Sin Nombre'}</div>
                                        <div className="text-xs text-gray-900">{profile.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getRoleBadge(profile.role)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {getCompanyName(profile.company_id)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => onEdit(profile)}
                                    className="text-blue-600 hover:text-blue-900 mx-2 p-1 rounded hover:bg-blue-50 transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
