
import { createClient } from '@supabase/supabase-js';

// User provided keys
const SUPABASE_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const SERVICE_KEY = 'sb_secret_72f3p04UbDkG90xa2-L0wQ_5l-f9IJS';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkProfile() {
    const EMAIL = 'ariel.mellag@gmail.com';
    console.log(`Checking profile for ${EMAIL}...`);

    // 1. Get User ID
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === EMAIL);

    if (!user) {
        console.error("User not found in Auth!");
        return;
    }

    console.log(`User ID: ${user.id}`);
    console.log(`User Metadata:`, user.user_metadata);

    // 2. Get Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
    } else {
        console.log("Profile Data in DB:", profile);
    }
}

checkProfile();
