import React from 'react';

const StatCard = ({ title, value, subtitle, icon, variant = 'blue', type = 'solid' }) => {

    // --- Solid Colors Variants (High Impact) ---
    const solidVariants = {
        blue: 'bg-blue-500 text-white shadow-blue-500/20',
        green: 'bg-emerald-500 text-white shadow-emerald-500/20',
        orange: 'bg-amber-500 text-white shadow-amber-500/20',
        red: 'bg-red-500 text-white shadow-red-500/20',
        indigo: 'bg-indigo-500 text-white shadow-indigo-500/20',
        purple: 'bg-purple-500 text-white shadow-purple-500/20',
        yellow: 'bg-yellow-500 text-white shadow-yellow-500/20',
    };

    // --- Outlined/Light Variants (Subtle) ---
    const lightVariants = {
        blue: 'bg-white border-blue-100 text-slate-800',
        green: 'bg-white border-emerald-100 text-slate-800',
        orange: 'bg-white border-amber-100 text-slate-800',
        red: 'bg-white border-red-100 text-slate-800',
        indigo: 'bg-white border-indigo-100 text-slate-800',
        purple: 'bg-white border-purple-100 text-slate-800',
        yellow: 'bg-white border-yellow-100 text-slate-800',
    };

    const iconColors = {
        blue: 'text-blue-500 bg-blue-50',
        green: 'text-emerald-500 bg-emerald-50',
        orange: 'text-amber-500 bg-amber-50',
        red: 'text-red-500 bg-red-50',
        indigo: 'text-indigo-500 bg-indigo-50',
        purple: 'text-purple-500 bg-purple-50',
        yellow: 'text-yellow-500 bg-yellow-50',
    };

    if (type === 'solid') {
        const baseClass = solidVariants[variant] || solidVariants.blue;
        return (
            <div className={`relative overflow-hidden rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${baseClass}`}>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <p className="text-sm font-medium opacity-90 tracking-wide uppercase mb-1">{title}</p>
                        <h3 className="text-4xl font-bold tracking-tight mb-2">{value}</h3>
                    </div>
                    {subtitle && (
                        <p className="text-sm font-medium opacity-80 bg-white/10 w-fit px-2 py-1 rounded backdrop-blur-sm">
                            {subtitle}
                        </p>
                    )}
                </div>
                {/* Decorative Background Icon */}
                <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12 scale-150">
                    {icon && React.cloneElement(icon, { size: 100 })}
                </div>
                {/* Decorative Gradient Circles */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
            </div>
        );
    }

    // Default 'light' or 'outlined' style
    const baseClass = lightVariants[variant] || lightVariants.blue;
    const iconClass = iconColors[variant] || iconColors.blue;

    return (
        <div className={`rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md ${baseClass}`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{value}</span>
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${iconClass}`}>
                    {icon && React.cloneElement(icon, { size: 24 })}
                </div>
            </div>
            {subtitle && (
                <div className="text-sm text-slate-500 font-medium">
                    {subtitle}
                </div>
            )}
        </div>
    );
};

export default StatCard;
