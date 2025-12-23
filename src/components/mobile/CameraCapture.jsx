import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Trash2 } from 'lucide-react';

/**
 * Mobile-first Camera Input Component
 * Uses native file input with capture="environment" for direct camera access on mobile.
 */
const CameraCapture = ({ onCapture, currentImage, label = "Tomar Foto" }) => {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(currentImage);
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            // Read file locally first for immediate preview
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setPreview(result);
                // In a real app, here we would upload to storage and return the URL
                // For this prototype, we pass the local base64/blob URL back
                // In production: await uploadService.upload(file) -> url
                if (onCapture.length > 1) {
                    // If onCapture accepts 2 args (file, previewUrl), pass both
                    onCapture(file, result);
                } else {
                    onCapture(result);
                }

                setLoading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Error creating preview", err);
            setLoading(false);
        }
    };

    const triggerCamera = () => {
        inputRef.current?.click();
    };

    const clearImage = (e) => {
        e.stopPropagation();
        setPreview(null);
        onCapture(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                capture="environment" // Forces rear camera on mobile
                className="hidden"
                ref={inputRef}
                onChange={handleFileChange}
            />

            {!preview ? (
                <div
                    onClick={triggerCamera}
                    className="w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:bg-slate-200 transition-colors gap-2"
                >
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <Camera size={32} className="text-brand-600" />
                    </div>
                    <span className="font-bold text-slate-500 text-sm">{label}</span>
                </div>
            ) : (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200 group">
                    <img
                        src={preview}
                        alt="Captured"
                        className="w-full h-full object-cover"
                    />

                    {loading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                            <RefreshCw className="animate-spin mr-2" /> Procesando...
                        </div>
                    )}

                    <div className="absolute top-2 right-2 flex gap-2">
                        <button
                            onClick={triggerCamera}
                            className="p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button
                            onClick={clearImage}
                            className="p-2 bg-red-500/80 text-white rounded-full backdrop-blur-md hover:bg-red-600"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CameraCapture;
