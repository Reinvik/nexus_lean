import { Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HeaderWithFilter = ({ title, subtitle, children }) => {
    const { user, companies, globalFilterCompanyId, setGlobalFilterCompanyId } = useAuth();

    // Check if user is SuperAdmin (only they can see global filter)
    const isAdmin = user && (user.role === 'superadmin' || user.email === 'ariel.mellag@gmail.com');

    return (
        <header className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
                <p className="text-gray-500 font-medium mt-1">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
                {/* Custom Children (e.g. Action Buttons) */}
                {children}

                {/* Admin Company Selector */}
                {isAdmin && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 ml-auto md:ml-0">
                        <Building size={18} className="text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700 hidden sm:inline">Empresa:</span>
                        <select
                            value={globalFilterCompanyId}
                            onChange={(e) => setGlobalFilterCompanyId(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-gray-900 focus:ring-0 cursor-pointer outline-none"
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">Todas las Empresas</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderWithFilter;
