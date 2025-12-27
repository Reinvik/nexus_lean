import { Plus } from 'lucide-react';

const MobileFab = ({ onClick, icon: Icon = Plus, label }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-40 bg-brand-600 text-white p-4 rounded-full shadow-lg shadow-brand-500/40 hover:bg-brand-700 active:scale-95 transition-all md:hidden flex items-center gap-2 group"
        >
            <Icon size={24} />
            {label && (
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-bold">
                    {label}
                </span>
            )}
        </button>
    );
};

export default MobileFab;
