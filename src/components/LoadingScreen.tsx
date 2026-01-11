import React, { useState, useEffect } from 'react';

const LOADING_PHRASES = [
    "Iniciando Sistema Nexus...",
    "Conectando con el Gemba...",
    "Cargando módulos de IA...",
    "Estableciendo protocolos seguros...",
    "Optimizando recursos...",
    "Sincronizando estándares..."
];

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingScreen({ message, fullScreen = true }: LoadingScreenProps) {
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const displayMessage = message || LOADING_PHRASES[phraseIndex];

    const containerClasses = fullScreen
        ? "fixed inset-0 z-[100] flex h-[133.33vh] w-full items-center justify-center bg-[#050B14]"
        : "flex h-full min-h-[400px] w-full items-center justify-center bg-[#050B14] rounded-xl";

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center gap-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-premium-pulse"></div>
                    <img src="/nexus-logo.svg" alt="Nexus Lean" className="h-[120px] w-[120px] relative drop-shadow-2xl animate-premium-pulse" />
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-500"></div>
                        <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-transparent border-b-blue-500 opacity-50" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                    </div>
                    <p className="text-sm font-medium text-cyan-500/80 tracking-widest uppercase animate-premium-pulse">
                        {displayMessage}
                    </p>
                </div>
            </div>
        </div>
    );
}
