interface HeaderWithFilterProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export default function HeaderWithFilter({ title, subtitle, children }: HeaderWithFilterProps) {
    return (
        <div className="mb-8 animate-fade-in-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-slate-600 text-lg font-medium">
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
