interface HeaderWithFilterProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export default function HeaderWithFilter({ title, subtitle, children }: HeaderWithFilterProps) {
    return (
        <div className="mb-8 animate-fade-in-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-slate-600 font-medium mt-1">
                        {subtitle}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-3">
                {children}
            </div>
        </div>
    );
}
