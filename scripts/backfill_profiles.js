
import { createClient } from '@supabase/supabase-js';

// User provided keys
const SUPABASE_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co'; // From .env.local
const SERVICE_KEY = 'sb_secret_72f3p04UbDkG90xa2-L0wQ_5l-f9IJS'; // User provided secret

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function backfillProfiles() {
    console.log("Starting backfill...");

    // 1. List Users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("Error listing users:", usersError);
        return;
    }

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`Checking profile for user: ${user.id} (${user.email})`);

        // 2. Check/Insert Profile
        // We try to select first in case we want to preserve existing data
        // But since we are admin, we can just upsert safely with 'ignoreDuplicates' behavior 
        // or just checking if it exists.

        // Let's use upsert with onConflict do nothing if possible, or check existence.
        // 'upsert' overwrites. We want to 'insert if missing'.

        const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

        if (!existing) {
            console.log(`Creating missing profile for ${user.email}...`);
            const { error: insertError } = await supabase.from('profiles').insert({
                id: user.id,
                role: user.user_metadata?.role || 'user',
                company_id: null,
                // Add other defaults if needed
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
            });

            if (insertError) {
                console.error(`Failed to insert profile for ${user.id}:`, insertError);
            } else {
                console.log("Success.");
            }
        } else {
            console.log("Profile already exists.");
        }
    }

    console.log("Backfill complete.");
}

backfillProfiles();
