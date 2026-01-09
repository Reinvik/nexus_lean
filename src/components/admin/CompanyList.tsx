import { Edit, Trash2, Building } from 'lucide-react';
import type { Company } from '../../types/database.types';
import LoadingScreen from '../LoadingScreen';

interface CompanyListProps {
    companies: Company[];
    loading: boolean;
    onEdit: (company: Company) => void;
    onDelete: (id: string) => void;
}

export default function CompanyList({ companies, loading, onEdit, onDelete }: CompanyListProps) {
    if (loading) {
        return <LoadingScreen message="Cargando empresas..." fullScreen={false} />;
    }

    if (companies.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="mx-auto h-12 w-12 text-gray-900 mb-4">
                    <Building className="h-full w-full" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No hay empresas registradas</h3>
                <p className="mt-1 text-gray-900">Comienza creando una nueva empresa.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Nombre</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Creada</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                        <Building className="h-5 w-5" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                                        <div className="text-xs text-gray-900">ID: {company.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(company.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => onEdit(company)}
                                    className="text-blue-600 hover:text-blue-900 mx-2 p-1 rounded hover:bg-blue-50 transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de eliminar esta empresa?')) {
                                            onDelete(company.id);
                                        }
                                    }}
                                    className="text-red-600 hover:text-red-900 mx-2 p-1 rounded hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
