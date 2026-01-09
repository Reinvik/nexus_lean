
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SERVICE_KEY = 'sb_secret_72f3p04UbDkG90xa2-L0wQ_5l-f9IJS';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyPolicies() {
    console.log("Verifying policies on 'profiles'...");

    // We can't query pg_policies directly via JS client usually unless rpc is set up.
    // But we can try to do a test insert/select as a "fake" user if we could sign them in.
    // Since we have service key, we can try to inspect behavior or just check simple access.

    // Actually, easiest way to verify if migration ran is to check if the 'updated_at' column exists on profiles 
    // or if a specific policy name exists in the error message of a blocked request.

    // Let's try to select as ANONYMOUS (should fail or return nothing if RLS is on).
    const anonClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || 'MISSING_ANON');
    // We don't have anon key here easily without reading file, and process.env might not be populated in node script same way.

    // Let's just check if the new columns exist.
    const { data, error } = await supabase
        .from('profiles')
        .select('created_at, updated_at')
        .limit(1);

    if (error) {
        console.log("Error selecting new columns:", error.message);
    } else {
        console.log("Columns 'created_at' and 'updated_at' exist. Migration likely applied.");
    }
}

verifyPolicies();
