import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: LucideIcon;
    variant: 'red' | 'yellow' | 'purple' | 'green';
    type?: 'solid' | 'outline';
    className?: string;
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    variant,
    className
}: StatCardProps) {
    const variants = {
        red: {
            bg: 'from-red-500 to-rose-600',
            icon: 'text-red-100',
            text: 'text-white'
        },
        yellow: {
            bg: 'from-amber-500 to-orange-600',
            icon: 'text-amber-100',
            text: 'text-white'
        },
        purple: {
            bg: 'from-purple-500 to-indigo-600',
            icon: 'text-purple-100',
            text: 'text-white'
        },
        green: {
            bg: 'from-emerald-500 to-teal-600',
            icon: 'text-emerald-100',
            text: 'text-white'
        }
    };

    const style = variants[variant];

    return (
        <div className={`
            relative overflow-hidden rounded-2xl p-6
            bg-gradient-to-br ${style.bg}
            shadow-lg hover:shadow-2xl
            transform transition-all duration-300
            hover:scale-105 hover:-translate-y-1
            animate-fade-in-up
            ${className}
        `}>
            {/* Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-10">
                <Icon size={120} />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${style.text} opacity-90`}>
                        {title}
                    </h3>
                    <div className={`p-2 rounded-lg bg-white/20 ${style.icon}`}>
                        <Icon size={24} />
                    </div>
                </div>

                <div className={`text-4xl font-black ${style.text} mb-2`}>
                    {value}
                </div>

                <p className={`text-sm ${style.text} opacity-80`}>
                    {subtitle}
                </p>
            </div>

            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
        </div>
    );
}
