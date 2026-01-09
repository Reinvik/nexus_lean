import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, X, Upload } from 'lucide-react';

const ImageUpload = ({ onUpload, currentImage, bucketName = 'images', placeholderText = "Subir Imagen", onFileSelect = null }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(currentImage);

    const uploadImage = async (event) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen para subir.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            if (onFileSelect) {
                // Return file directly for manual handling (offline mode or parent controlled)
                // Generate a local preview url
                const objectUrl = URL.createObjectURL(file);
                setPreview(objectUrl);
                onFileSelect(file, objectUrl);
                return;
            }

            let { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            setPreview(publicUrl);
            onUpload(publicUrl);

        } catch (error) {
            alert('Error subiendo imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        setPreview(null);
        if (onFileSelect) {
            onFileSelect(null, null);
        } else if (onUpload) {
            onUpload(null);
        }
    };

    return (
        <div className="relative group w-full h-full min-h-[150px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden">
            {uploading ? (
                <div className="flex flex-col items-center text-blue-500">
                    <Loader className="animate-spin mb-2" size={24} />
                    <span className="text-xs font-medium">Subiendo...</span>
                </div>
            ) : preview ? (
                <>
                    <img
                        src={preview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            onClick={handleRemove}
                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transform hover:scale-110 transition-transform"
                            title="Eliminar imagen"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center p-4">
                    <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3 group-hover:scale-110 transition-transform">
                        <Upload size={24} className="text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{placeholderText}</p>
                    <p className="text-xs text-gray-400 mt-1">Click para seleccionar</p>
                </div>
            )}

            <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                accept="image/*"
                onChange={uploadImage}
                disabled={uploading}
            />
        </div>
    );
};

export default ImageUpload;
