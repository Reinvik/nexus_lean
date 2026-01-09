import { Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HeaderWithFilter = ({ title, subtitle, children }) => {
    const { user, companies, globalFilterCompanyId, setGlobalFilterCompanyId } = useAuth();

    // Only SuperAdmin (platform owner) can see and switch between all companies
    const canSwitchCompanies = user?.isGlobalAdmin;

    return (
        <header className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
                <p className="text-gray-500 font-medium mt-1">{subtitle}</p>
            </div>

            {/* Unified Toolbar Container */}
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1 h-[50px]">

                {/* 1. Action Buttons (Fullscreen) - Passed as children */}
                <div className="flex items-center px-1">
                    {children}
                </div>

                {/* Divider (Only if selector is visible) */}
                {canSwitchCompanies && (
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                )}

                {/* 2. Company Selector */}
                {canSwitchCompanies && (
                    <div className="relative group">
                        <div className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-lg transition-colors hover:bg-slate-50 cursor-pointer min-w-[200px]">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
                                <Building size={16} />
                            </div>
                            <select
                                value={globalFilterCompanyId || ''}
                                onChange={(e) => setGlobalFilterCompanyId(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none w-full p-0 py-1 truncate appearance-none"
                            >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {/* Custom Arrow because we used appearance-none */}
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default HeaderWithFilter;
