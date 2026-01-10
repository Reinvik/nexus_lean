import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { offlineService } from '../services/offlineService';

const AuthContext = createContext({
    user: null,
    loading: true,
    login: async () => ({ success: false, message: 'Auth not initialized' }),
    logout: async () => { },
    register: async () => ({ success: false, message: 'Auth not initialized' }),
    companies: [],
    companyUsers: [],
    globalFilterCompanyId: null
});


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [companyUsers, setCompanyUsers] = useState([]);

    // Keep user ref synced for event listeners
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Global Filter for Admins
    const [globalFilterCompanyId, setGlobalFilterCompanyId] = useState(null);

    // Auto-select first company if none selected
    useEffect(() => {
        if (companies.length > 0 && !globalFilterCompanyId) {
            console.log("AuthContext: Auto-selecting company...");
            // Prioritize "Nexus Lean" or "Be Lean" if available
            const preferredCompany = companies.find(c =>
                c.name.toLowerCase().includes('nexus') ||
                c.name.toLowerCase().includes('lean')
            );

            if (preferredCompany) {
                console.log("AuthContext: Auto-selected prefered:", preferredCompany.name);
                setGlobalFilterCompanyId(preferredCompany.id);
            } else {
                console.log("AuthContext: Auto-selected first:", companies[0].name);
                setGlobalFilterCompanyId(companies[0].id);
            }
        }
    }, [companies]);

    // Fetch companies on load
    // Fetch companies on load
    const fetchCompanies = async () => {
        try {
            console.log("AuthContext: Fetching companies...");
            const { data, error } = await supabase
                .from('companies')
                .select('*');
            if (error) {
                console.error("AuthContext: Error fetching companies:", error);
                return;
            }
            console.log("AuthContext: Companies loaded:", data?.length, data);
            if (data) {
                setCompanies(data);
                // Cache for offline use
                offlineService.saveCompanies(data);
            }
        } catch (err) {
            console.error("AuthContext: Unexpected error fetching companies:", err);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    // Refresh profile permissions when Global Filter changes
    useEffect(() => {
        if (user && user.isGlobalAdmin) {
            // We pass 'user' as authUser. 
            // Since fetchProfile spreads it, it works, but ideally we should use the raw session user. 
            // But we don't have it easily without getSession. 
            // Using 'user' is safe enough as long as ID and Email are present.
            fetchProfile(user);
        }
    }, [globalFilterCompanyId]);

    const refreshData = async () => {
        console.log("AuthContext: Refreshing data...");
        setLoading(true);
        await fetchCompanies();
        if (user) await fetchProfile(user);
        setLoading(false);
    };

    // Emergency Tool to fix DB profile
    const repairAdminProfile = async () => {
        if (!user) return { success: false, message: 'No usuario logueado' };

        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.name || user.email.split('@')[0],
                role: 'superadmin', // Force global superadmin role
                is_authorized: true,
                company_id: null
            });

            if (error) throw error;

            await refreshData();
            return { success: true, message: 'Perfil de SUPER ADMIN restaurado (acceso total).' };
        } catch (e) {
            console.error("Repair error:", e);
            return { success: false, message: e.message };
        }
    };

    // Fetch users for the current company whenever user changes
    useEffect(() => {
        const fetchCompanyUsers = async () => {
            if (!user) {
                setCompanyUsers([]);
                return;
            }

            try {
                // Capabilities based on pre-calculated flags
                const { isGlobalAdmin, isCompanyAdmin, companyId } = user;

                if (isGlobalAdmin) {
                    // Global Admin: Fetch users from the SELECTED company only
                    if (globalFilterCompanyId && globalFilterCompanyId !== 'all' && globalFilterCompanyId !== 'null') {
                        const { data, error } = await supabase
                            .from('profiles')
                            .select('id, full_name, email, company_id, role, is_authorized')
                            .eq('company_id', globalFilterCompanyId)
                            .order('full_name');

                        if (error) {
                            console.warn("AuthContext: Error fetching global users:", error.message);
                            setCompanyUsers([]);
                        } else if (data) {
                            setCompanyUsers(data);
                        }
                    } else {
                        // No company selected, don't show any users
                        setCompanyUsers([]);
                    }
                } else if (isCompanyAdmin && companyId) {
                    // Company Admin: Fetch ONLY users from their company
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, company_id, role, is_authorized')
                        .eq('company_id', companyId)
                        .order('full_name');

                    if (error) {
                        console.warn("AuthContext: Error fetching company users:", error.message);
                        setCompanyUsers([]);
                    } else if (data) {
                        setCompanyUsers(data);
                    }
                } else {
                    // Regular users might not need to see this list, strictly speaking.
                    setCompanyUsers([]);
                }
            } catch (err) {
                console.error("AuthContext: Unexpected error fetching company users:", err);
                setCompanyUsers([]);
            }
        };
        fetchCompanyUsers();
    }, [user, globalFilterCompanyId]);

    const updateLastLogin = async (userId) => {
        try {
            await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', userId);
        } catch (e) {
            console.error("Error updating last login:", e);
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        let mounted = true;

        // Manual check for recovery hash (Robustness fix)
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
            if (!window.location.pathname.includes('/reset-password')) {
                console.log("AuthContext: Detected recovery hash on wrong page. Redirecting to /reset-password...");
                window.location.href = '/reset-password' + window.location.hash;
                return;
            }
        }

        const checkUser = async () => {
            try {
                console.log("AuthContext: Checking session...");
                const { data: { session }, error } = await supabase.auth.getSession();

                if (mounted) {
                    if (session) {
                        await fetchProfile(session.user);
                    } else {
                        setUser(null);
                    }
                }
            } catch (err) {
                console.error("AuthContext: Unexpected error in checkUser:", err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        checkUser();

        // Safety timeout
        const timer = setTimeout(() => {
            if (mounted && loading) {
                setLoading(false);
            }
        }, 5000);

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("AuthContext: Auth state change:", event);
            if (event === 'SIGNED_IN' && session) {
                // UPDATE LAST LOGIN
                updateLastLogin(session.user.id);

                const currentUser = userRef.current;
                if (!currentUser || currentUser.id !== session.user.id) {
                    // Fetch profile logic
                }
                try {
                    await fetchProfile(session.user);
                } catch (e) {
                    console.error("AuthContext: Error in SIGNED_IN handler:", e);
                }
            } else if (event === 'PASSWORD_RECOVERY') {
                window.location.href = '/reset-password';
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchCompanyByDomainSafe = async (email) => {
        if (!email) return null;
        try {
            const domain = email.split('@')[1];
            if (!domain) return null;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Domain lookup timed out')), 10000));

            const { data } = await Promise.race([
                supabase.from('companies').select('id').ilike('domain', `%${domain}%`).maybeSingle(),
                timeoutPromise
            ]);
            return data ? data.id : null;
        } catch (err) {
            return null;
        }
    };

    const fetchProfile = async (authUser) => {
        // OWNERSHIP & SUPERADMIN OVERRIDE
        const isOwner =
            authUser.email?.toLowerCase() === 'ariel.mellag@gmail.com' ||
            authUser.email?.toLowerCase() === 'equipo@belean.cl' ||
            authUser.email?.toLowerCase().includes('nexuslean'); // Updated check

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 10000));
        let profileData = null;
        let fetchError = null;

        try {
            const result = await Promise.race([
                supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
                timeoutPromise
            ]);
            profileData = result.data;
            fetchError = result.error;
        } catch (err) { fetchError = err; }

        if (!fetchError && profileData) {
            const isGlobalAdmin = isOwner || profileData.role === 'superadmin';
            const isCompanyAdmin = profileData.role === 'superuser' || profileData.role === 'admin';

            // Fetch Allowed Modules for the Company
            let allowedModules = ['5s', 'a3', 'vsm', 'quick_wins', 'auditoria_5s', 'consultor_ia']; // Default all

            const targetCompanyId = isGlobalAdmin
                ? (globalFilterCompanyId && globalFilterCompanyId !== 'all' ? globalFilterCompanyId : null)
                : profileData.company_id;

            if (targetCompanyId) {
                try {
                    const { data: companyData } = await supabase
                        .from('companies')
                        .select('allowed_modules')
                        .eq('id', targetCompanyId)
                        .single();

                    if (companyData && companyData.allowed_modules) {
                        allowedModules = companyData.allowed_modules;
                    }
                } catch (e) {
                    console.warn("Error fetching company modules:", e);
                }
            }

            setUser({
                ...authUser,
                ...profileData,
                role: profileData.role,
                isGlobalAdmin,
                isCompanyAdmin,
                canAccessAdmin: isGlobalAdmin || isCompanyAdmin,
                isAuthorized: isGlobalAdmin ? true : profileData.is_authorized,
                has_ai_access: isGlobalAdmin ? true : !!profileData.has_ai_access,
                companyId: profileData.company_id,
                allowedModules // Attach modules
                // last_login is already in profileData (will be stale until reload, but updated in DB)
            });
            return;
        }

        // Fallback...
        console.warn('AuthContext: Entering fallback mode.');
        let recoveredCompanyId = authUser.user_metadata?.company_id || null;
        if (!recoveredCompanyId && authUser.email) {
            recoveredCompanyId = await fetchCompanyByDomainSafe(authUser.email);
        }

        if (!profileData && fetchError?.message !== 'Request timed out') {
            try {
                await supabase.from('profiles').upsert({
                    id: authUser.id,
                    email: authUser.email,
                    full_name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
                    role: isOwner ? 'superadmin' : 'user',
                    is_authorized: isOwner,
                    company_id: recoveredCompanyId,
                    has_ai_access: isOwner,
                    last_login: new Date().toISOString() // Set initial login
                }, { onConflict: 'id', ignoreDuplicates: true });
                return fetchProfile(authUser);
            } catch (recErr) { console.error(recErr); }
        }

        setUser({
            ...authUser,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
            role: isOwner ? 'superadmin' : 'user',
            isGlobalAdmin: isOwner,
            isCompanyAdmin: false,
            isAuthorized: true,
            companyId: recoveredCompanyId,
            email: authUser.email
        });
    };



    const login = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const register = async (userData) => {
        // userData: { name, email, password, companyId }
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    name: userData.name,
                    company_id: userData.companyId // We can pass this metadata to be used in triggers if needed
                }
            }
        });

        if (error) return { success: false, message: error.message };

        // Manual update of profile company_id if trigger doesn't handle it fully
        // (Our trigger handles name, we might need to update company_id separately or update the trigger)
        // For now, let's assume the user needs to be authorized anyway. 
        // We can do a quick update if the session is established, but usually SignUp implies "check email".
        // Depending on Supabase settings (email confirmation on/off).

        // If email confirmation is OFF, the user is logged in.
        // We can try to update the profile with company_id
        if (data.user) {
            await supabase
                .from('profiles')
                .update({ company_id: userData.companyId })
                .eq('id', data.user.id);
        }

        return { success: true, message: 'Registro exitoso. Por favor verifica tu correo.' };
    };

    const inviteUser = async (email, name, companyId) => {
        // Use Magic Link as Invitation
        // This creates the user if they don't exist (assuming Signups enabled)
        // and logs them in immediately upon clicking the link.
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                data: {
                    name,
                    company_id: companyId
                },
                // Redirect to a page where they might be prompted to set password if needed
                // For now, root is fine, or we could send to /profile
                emailRedirectTo: window.location.origin + '/set-password'
            }
        });

        if (error) return { success: false, message: error.message };

        // We can also optimistically create the profile if we want to ensure it shows up in "Pending" immediately
        // But the Magic Link flow usually handles profile creation on first trigger if configured, 
        // OR we rely on the user clicking the link.
        // To make it visible to Admin immediately as "Invited/Pending":
        // We can try to upsert the profile as "Pending Authorization"
        try {
            await supabase.from('profiles').upsert({
                id: undefined, // We don't have the ID yet until they sign up... actually we CAN'T create profile without ID.
                // So we have to wait for them to click the link.
                // UNLESS we use the Admin API which we can't here.
                // So, we just tell the Admin "Invitation Sent".
            });
        } catch (e) {
            // ignore
        }

        return { success: true, message: 'Invitación enviada correctamente.' };
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Se ha enviado un correo de recuperación.' };
    };

    const updateProfileName = async (newName) => {
        if (!user) return { success: false, message: 'No user logged in' };

        try {
            // 1. Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: newName })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Update auth metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { name: newName }
            });

            if (authError) console.warn("Error updating auth metadata:", authError);

            // 3. Update local state
            setUser(prev => ({ ...prev, full_name: newName, name: newName }));

            return { success: true, message: 'Nombre actualizado correctamente' };
        } catch (error) {
            console.error("Error updating name:", error);
            return { success: false, message: error.message };
        }
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Contraseña actualizada correctamente' };
    };

    // Admin functions
    const adminAuthorizeUser = async (userId) => {
        await supabase
            .from('profiles')
            .update({ is_authorized: true })
            .eq('id', userId);
    };

    const toggleAIAccess = async (userId, hasAccess) => {
        const { error } = await supabase
            .from('profiles')
            .update({ has_ai_access: hasAccess })
            .eq('id', userId);
        return { success: !error, error };
    };

    const updateUserStatus = async (userId, status) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_authorized: status })
            .eq('id', userId);
        return { success: !error, error };
    };

    const addCompany = async (name, domain) => {
        const { error } = await supabase
            .from('companies')
            .insert([{ name, domain }]);

        if (!error) {
            // Refresh companies
            const { data } = await supabase.from('companies').select('*');
            if (data) setCompanies(data);
            return { success: true };
        }

        return { success: false, error };
    };

    const removeCompany = async (id) => {
        await supabase.from('companies').delete().eq('id', id);
        setCompanies(prev => prev.filter(c => c.id !== id));
    };

    // User management for admin would require fetching from "profiles" table
    // We can expose a function to fetch all profiles
    const getAllUsers = async () => {
        if (!user) return [];

        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

        // Enforce Scope:
        // If NOT Global Admin, restrict to own company
        if (!user.isGlobalAdmin) {
            if (user.companyId) {
                query = query.eq('company_id', user.companyId);
            } else {
                // Orphan user shouldn't see anything
                return [];
            }
        }

        const { data, error } = await query;
        if (error) console.error("Error fetching users:", error);
        return data || [];
    };

    const updateUserRole = async (userId, newRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (!error) {
            // Si el usuario actualizado es el mismo que está logueado, actualizamos el estado local
            if (user && user.id === userId) {
                setUser(prev => ({ ...prev, role: newRole }));
            }
        }
        return { success: !error, message: error ? error.message : 'Rol actualizado' };
    };

    const removeUser = async (userId) => {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        return { success: !error, error };
    };

    const updateUserCompany = async (userId, companyId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ company_id: companyId })
            .eq('id', userId);

        if (!error) {
            // Update local state if needed (mainly for the admin view to refresh, handled by fetchUsers there)
            if (user && user.id === userId) {
                setUser(prev => ({ ...prev, companyId }));
            }
        }
        return { success: !error, message: error ? error.message : 'Empresa actualizada' };
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            register,
            resetPassword,
            companies,
            addCompany,
            removeCompany,
            adminAuthorizeUser,
            getAllUsers,
            removeUser,
            updateUserRole,
            updateUserCompany,
            companyUsers,
            globalFilterCompanyId,
            setGlobalFilterCompanyId,
            updateUserStatus,
            toggleAIAccess,
            refreshData,
            repairAdminProfile,
            updatePassword,
            inviteUser,
            updateProfileName
        }}>
            {loading ? (
                <div className="flex items-center justify-center h-screen bg-[#0B1F3F]">
                    <div className="flex flex-col items-center gap-6">
                        <img src="/nexus-logo.svg" alt="Be Lean" className="h-24 w-auto drop-shadow-lg animate-pulse" />
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                            <p className="text-sm font-medium text-slate-300">Iniciando Sistema...</p>
                        </div>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
