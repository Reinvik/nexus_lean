import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Building, ChevronDown, Check, Search, Briefcase } from 'lucide-react';
import type { Company } from '../../types/database.types';
import { cn } from '../../lib/utils';

export default function CompanySwitcher() {
    const { profile, selectedCompanyId, switchCompany } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('companies').select('*').order('name');
            if (!error && data) {
                setCompanies(data);
            }
            setLoading(false);
        };

        if (profile?.role === 'superadmin' || profile?.role === 'platform_admin') {
            fetchCompanies();
        }
    }, [profile]);

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    const filteredCompanies = useMemo(() => {
        return companies.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [companies, searchTerm]);

    // Only show for admins
    if (profile?.role !== 'superadmin' && profile?.role !== 'platform_admin') {
        return null;
    }

    return (
        <div className="relative group">
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    // Reset search when opening
                    if (!isOpen) setSearchTerm('');
                }}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-900/10",
                    isOpen
                        ? "bg-gradient-to-r from-cyan-900/30 to-slate-800/50 border-cyan-500/50 text-cyan-100"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300"
                )}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isOpen ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/30"
                    )}>
                        <Building className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Empresa</span>
                        <span className="text-sm font-semibold truncate max-w-[120px] sm:max-w-[140px]">
                            {selectedCompany ? selectedCompany.name : 'Seleccionar'}
                        </span>
                    </div>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-slate-500 transition-transform duration-300",
                    isOpen && "rotate-180 text-cyan-400"
                )} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-2 w-[calc(100%+1rem)] -ml-2 bg-slate-900 rounded-xl shadow-2xl shadow-black/50 border border-slate-700/50 py-2 z-50 overflow-hidden ring-1 ring-white/5 backdrop-blur-xl">

                        {/* Search Header */}
                        <div className="px-3 pb-2 border-b border-slate-700/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar empresa..."
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent py-1">
                            {loading ? (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center animate-pulse">Cargando empresas...</div>
                            ) : filteredCompanies.length === 0 ? (
                                <div className="px-4 py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
                                    <Briefcase className="h-8 w-8 opacity-20" />
                                    <span className="text-xs">No se encontraron resultados</span>
                                </div>
                            ) : (
                                filteredCompanies.map(company => {
                                    const isSelected = selectedCompanyId === company.id;
                                    return (
                                        <button
                                            key={company.id}
                                            onClick={() => {
                                                switchCompany(company.id);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between group transition-all duration-150 border-l-2 border-transparent",
                                                isSelected
                                                    ? "bg-cyan-950/20 text-cyan-400 border-cyan-500"
                                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600"
                                            )}
                                        >
                                            <span className="truncate pr-2 font-medium">{company.name}</span>
                                            {isSelected && (
                                                <div className="bg-cyan-500/10 p-1 rounded-full">
                                                    <Check className="h-3 w-3 text-cyan-400" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 bg-slate-950/30 border-t border-slate-700/50 text-[10px] text-slate-600 text-center font-medium">
                            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'Empresa disponible' : 'Empresas disponibles'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
