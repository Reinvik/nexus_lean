import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Company } from '../types/database.types';
import UserList from '../components/admin/UserList';
import UserEditForm from '../components/admin/UserEditForm';

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]); // Needed for dropdown
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<Profile | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users and companies (for context)
            const [usersRes, companiesRes] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('companies').select('*').order('name')
            ]);

            if (usersRes.error) throw usersRes.error;
            if (companiesRes.error) throw companiesRes.error;

            // Create company lookup for sorting
            const companyMap = new Map((companiesRes.data || []).map(c => [c.id, c.name]));

            // Sort users: belean.cl first, then by company name, then by role hierarchy, then by name
            const roleOrder: Record<string, number> = {
                'platform_admin': 0,
                'superadmin': 1,
                'superuser': 2,
                'user': 3
            };

            const sortedUsers = [...(usersRes.data || [])].sort((a, b) => {
                const companyA = companyMap.get(a.company_id) || '';
                const companyB = companyMap.get(b.company_id) || '';

                // belean.cl always first
                const aIsBeLean = companyA.toLowerCase().includes('belean');
                const bIsBeLean = companyB.toLowerCase().includes('belean');
                if (aIsBeLean && !bIsBeLean) return -1;
                if (!aIsBeLean && bIsBeLean) return 1;

                // Then by company name
                if (companyA !== companyB) return companyA.localeCompare(companyB);

                // Then by role
                const roleA = roleOrder[a.role] ?? 99;
                const roleB = roleOrder[b.role] ?? 99;
                if (roleA !== roleB) return roleA - roleB;

                // Finally by name
                return (a.full_name || '').localeCompare(b.full_name || '');
            });

            setUsers(sortedUsers);
            setCompanies(companiesRes.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Administración de Usuarios</h1>
                <p className="text-gray-900 mt-1">Gestiona los roles y asignaciones de los usuarios.</p>
            </div>

            <UserList
                users={users}
                companies={companies}
                loading={loading}
                onEdit={setEditingUser}
            />

            {editingUser && (
                <UserEditForm
                    user={editingUser}
                    companies={companies}
                    onClose={() => setEditingUser(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
