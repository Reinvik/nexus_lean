import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react';

/**
 * Toast/Snackbar notification component for better UX
 */
const Toast = ({ type = 'info', message, onClose, autoClose = true }) => {
    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [autoClose, onClose]);

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
        success: <CheckCircle size={20} className="text-green-600" />,
        error: <AlertCircle size={20} className="text-red-600" />,
        warning: <AlertCircle size={20} className="text-yellow-600" />,
        info: <Wifi size={20} className="text-blue-600" />
    };

    return (
        <div className={`fixed bottom-20 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4 ${styles[type]} border rounded-lg shadow-lg p-4 flex items-start gap-3`}>
            {icons[type]}
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X size={18} />
            </button>
        </div>
    );
};

/**
 * Modal for showing detailed sync results with retry options
 */
const SyncResultModal = ({ results, onClose, onRetry }) => {
    const hasFailures = results.errors && results.errors.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-6 border-b ${hasFailures ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {hasFailures ? (
                                <AlertCircle size={28} className="text-yellow-600" />
                            ) : (
                                <CheckCircle size={28} className="text-green-600" />
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {hasFailures ? 'Sincronización Parcial' : '¡Sincronización Exitosa!'}
                                </h3>
                                <p className="text-sm text-slate-600">
                                    {results.successCount} exitosas · {results.errorCount} fallidas
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-96">
                    {/* Success Summary */}
                    {results.successCount > 0 && (
                        <div className="mb-6">
                            <h4 className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                                <CheckCircle size={18} />
                                Tarjetas Sincronizadas ({results.successCount})
                            </h4>
                            <p className="text-sm text-slate-600">
                                Se subieron correctamente {results.successCount} tarjeta{results.successCount !== 1 ? 's' : ''} al servidor.
                            </p>
                        </div>
                    )}

                    {/* Failures Detail */}
                    {hasFailures && (
                        <div>
                            <h4 className="flex items-center gap-2 text-red-700 font-semibold mb-3">
                                <AlertCircle size={18} />
                                Tarjetas con Error ({results.errorCount})
                            </h4>
                            <div className="space-y-3">
                                {results.errors.map((error, idx) => (
                                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900 mb-1">
                                                    Tarjeta ID: {error.tempId}
                                                </p>
                                                <p className="text-sm text-red-700">
                                                    Error: {error.message}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onRetry(error.tempId)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <RefreshCw size={14} />
                                                Reintentar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors"
                    >
                        Cerrar
                    </button>
                    {hasFailures && (
                        <button
                            onClick={() => onRetry('all')}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <RefreshCw size={18} />
                            Reintentar Todas
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Online/Offline status indicator
 */
const OnlineStatusIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed top-4 right-4 z-40 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
            <WifiOff size={18} />
            <span className="text-sm font-medium">Sin conexión - Modo offline</span>
        </div>
    );
};

export { Toast, SyncResultModal, OnlineStatusIndicator };
