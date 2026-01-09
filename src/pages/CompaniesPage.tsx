import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Company } from '../types/database.types';
import CompanyList from '../components/admin/CompanyList';
import CompanyForm from '../components/admin/CompanyForm';
import { Plus } from 'lucide-react';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error fetching companies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleDeleteCompany = async (id: string) => {
        try {
            const { error } = await supabase.from('companies').delete().eq('id', id);
            if (error) throw error;
            fetchCompanies();
        } catch (error: any) {
            console.error('Error deleting company:', error);
            alert('Error al eliminar empresa: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Empresas</h1>
                    <p className="text-gray-900 mt-1">Gestiona las empresas registradas en el sistema.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCompany(null);
                        setShowCompanyForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                    <Plus className="h-5 w-5" />
                    Nueva Empresa
                </button>
            </div>

            <CompanyList
                companies={companies}
                loading={loading}
                onEdit={(company) => {
                    setEditingCompany(company);
                    setShowCompanyForm(true);
                }}
                onDelete={handleDeleteCompany}
            />

            {showCompanyForm && (
                <CompanyForm
                    company={editingCompany}
                    onClose={() => setShowCompanyForm(false)}
                    onSuccess={fetchCompanies}
                />
            )}
        </div>
    );
}
