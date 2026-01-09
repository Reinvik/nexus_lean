import { RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingScreen({ message = "Cargando sistema...", fullScreen = true }: LoadingScreenProps) {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-900">
                <div className="flex flex-col items-center gap-8 p-8 rounded-2xl">
                    <div className="relative">
                        {/* Clean breathing/pulsing effect for loading */}
                        <div className="absolute -inset-8 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                        <h1 className="relative text-6xl font-bold text-white tracking-tight animate-pulse drop-shadow-2xl text-center">
                            Nexus Lean
                        </h1>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-gray-400 text-sm font-medium tracking-[0.2em] uppercase animate-pulse">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-64 w-full items-center justify-center rounded-xl bg-gray-800/30 border border-gray-700/50">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
                    <h1 className="relative text-3xl font-bold text-white tracking-tight animate-pulse opacity-80 text-center">
                        Nexus Lean
                    </h1>
                </div>
                <p className="text-gray-400 text-xs font-medium tracking-[0.2em] uppercase animate-pulse">
                    {message}
                </p>
            </div>
        </div>
    );
}
