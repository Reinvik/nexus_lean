import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { RefreshCw } from 'lucide-react';

export default function OfflineSyncManager() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for pending items periodically
        const interval = setInterval(checkPending, 10000);
        checkPending(); // Initial check

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const checkPending = async () => {
        const count = await db.offline_cards.where('status').equals('pending_sync').count();
        setPendingCount(count);

        // If online and pending items exist, trigger sync
        if (navigator.onLine && count > 0 && !syncing) {
            // performSync(); // DISABLED: Manual review requested
            console.log("Offline items detected but auto-sync is disabled.");
            // @ts-ignore
            if (false) performSync(); // Suppress unused error
        }
    };

    const performSync = async () => {
        if (syncing) return;
        setSyncing(true);
        console.log("Starting sync...");

        try {
            // 1. Get user session (we need to be logged in to sync)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log("OfflineSync: Cannot sync - No active Supabase session.");
                setSyncing(false);
                return;
            }

            console.log("OfflineSync: User ID:", session.user.id);
            // 2. Fetch pending cards
            const pendingCards = await db.offline_cards.where('status').equals('pending_sync').toArray();

            for (const localCard of pendingCards) {
                if (!localCard.id) continue;

                // 3. Process Images
                const images = await db.offline_images.where('card_local_id').equals(localCard.id).toArray();
                const uploadedUrls: string[] = [];

                for (const img of images) {
                    const fileExt = img.blob.type.split('/')[1] || 'jpg';
                    const fileName = `offline - ${Date.now()} -${Math.random()}.${fileExt} `;

                    const { error: uploadError } = await supabase.storage
                        .from('five-s-images')
                        .upload(fileName, img.blob);

                    if (uploadError) {
                        console.error("Sync Image Upload Error:", uploadError);
                        continue;
                    }

                    const { data } = supabase.storage.from('five-s-images').getPublicUrl(fileName);
                    uploadedUrls.push(data.publicUrl);
                }

                // 4. Insert into Supabase
                const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();

                // CRITICAL FIX: Do not proceed if we don't have a valid company_id. 
                // Using session.user.id as fallback will fail FK constraints.
                if (!profile?.company_id) {
                    console.error(`Sync Skipped for Card ${localCard.id}: No company_id found for user.`);
                    continue;
                }

                const { error: insertError } = await supabase.from('five_s_cards').insert({
                    area: localCard.area,
                    description: localCard.description,
                    findings: localCard.findings,
                    priority: localCard.priority,
                    category: localCard.category,
                    status: 'Abierto',
                    company_id: profile.company_id,
                    created_by: session.user.id,
                    image_urls: uploadedUrls,
                    image_url: uploadedUrls[0] || null
                });

                if (!insertError) {
                    // 5. Delete local record on success
                    await db.offline_cards.delete(localCard.id);
                    await db.offline_images.where('card_local_id').equals(localCard.id).delete();
                    console.log(`Synced card ${localCard.id} `);
                } else {
                    console.error("Sync Insert Error:", insertError);
                }
            }

            // Re-check count
            checkPending();

        } catch (error) {
            console.error("Sync Error:", error);
        } finally {
            setSyncing(false);
        }
    };

    if (pendingCount === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-blue-100 p-3 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
            <div className="bg-blue-100 p-2 rounded-full relative">
                <RefreshCw className={`h - 5 w - 5 text - blue - 600 ${syncing ? 'animate-spin' : ''} `} />
                {!isOnline && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900">
                    {syncing ? 'Sincronizando...' : `${pendingCount} pendientes`}
                </p>
                <p className="text-xs text-gray-900">
                    {isOnline ? 'Subiendo a la nube' : 'Esperando conexión'}
                </p>
            </div>
        </div>
    );
}
