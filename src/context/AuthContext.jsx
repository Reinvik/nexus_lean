import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

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

    // Global Filter for Admins (persisted in session/state)
    const [globalFilterCompanyId, setGlobalFilterCompanyId] = useState('all');

    // Fetch companies on load
    // Fetch companies on load
    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*');
            if (error) {
                console.error("AuthContext: Error fetching companies:", error);
                return;
            }
            if (data) setCompanies(data);
        } catch (err) {
            console.error("AuthContext: Unexpected error fetching companies:", err);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

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
                name: user.user_metadata?.name || user.email.split('@')[0],
                role: 'admin',
                is_authorized: true,
                company_id: null
            });

            if (error) throw error;

            await refreshData();
            return { success: true, message: 'Perfil de administrador restaurado en DB.' };
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
                // If Admin (check by role or specific email override), fetch ALL authorized users
                const isSuperAdmin = user.email === 'ariel.mellag@gmail.com' || user.role === 'admin';

                if (isSuperAdmin) {
                    // Try to fetch users.
                    // We'll wrap in try/catch to be safe.
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, name, email, company_id')
                        .eq('is_authorized', true);

                    if (error) {
                        console.warn("AuthContext: Error fetching company users (Admin View):", error.message);
                        setCompanyUsers([]);
                    } else if (data) {
                        setCompanyUsers(data);
                    }
                } else if (user.companyId) {
                    // Regular user: only see users from same company
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, name, email, company_id')
                        .eq('company_id', user.companyId)
                        .eq('is_authorized', true);

                    if (error) {
                        console.warn("AuthContext: Error fetching company users:", error.message);
                        setCompanyUsers([]);
                    } else if (data) {
                        setCompanyUsers(data);
                    }
                } else {
                    setCompanyUsers([]);
                }
            } catch (err) {
                console.error("AuthContext: Unexpected error fetching company users:", err);
                setCompanyUsers([]);
            }
        };
        fetchCompanyUsers();
    }, [user]);

    // Listen to auth state changes
    useEffect(() => {
        let mounted = true;

        // Check active session
        const checkUser = async () => {
            try {
                console.log("AuthContext: Checking session...");
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log("AuthContext: Session result:", session, error);

                if (error) {
                    console.error("AuthContext: Error getting session:", error);
                }

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

        // Safety timeout to prevent infinite loading screen
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("AuthContext: Forced loading to false due to timeout.");
                setLoading(false);
            }
        }, 3000);

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("AuthContext: Auth state change:", event);
            if (event === 'SIGNED_IN' && session) {
                // Only set loading if we don't have a user yet, or if it's a completely new session
                // This prevents white screen flashes on tab focus or network reconnection
                const currentUser = userRef.current;
                if (!currentUser || currentUser.id !== session.user.id) {
                    setLoading(true);
                }

                try {
                    await fetchProfile(session.user);
                } catch (e) {
                    console.error("AuthContext: Error in SIGNED_IN handler:", e);
                } finally {
                    setLoading(false);
                }
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

            // Short timeout for this fallback lookup (3 seconds)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Domain lookup timed out')), 3000)
            );

            const { data } = await Promise.race([
                supabase
                    .from('companies')
                    .select('id')
                    .ilike('domain', `%${domain}%`)
                    .maybeSingle(),
                timeoutPromise
            ]);

            return data ? data.id : null;
        } catch (err) {
            console.warn("AuthContext: Domain fallback error:", err);
            return null;
        }
    };

    const fetchProfile = async (authUser) => {
        // HARDCODE ADMIN OVERRIDE FOR SPECIFIC EMAIL
        const isSuperAdmin = authUser.email === 'ariel.mellag@gmail.com';

        // Timeout for the main profile fetch
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 8000)
        );

        let profileData = null;
        let fetchError = null;

        try {
            console.log("AuthContext: Fetching profile for", authUser.id);
            const result = await Promise.race([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle(),
                timeoutPromise
            ]);
            profileData = result.data;
            fetchError = result.error;
        } catch (err) {
            fetchError = err;
        }

        // If we have a profile, use it
        if (!fetchError && profileData) {
            console.log('AuthContext: Profile fetched successfully:', profileData);
            setUser({
                ...authUser,
                ...profileData,
                role: isSuperAdmin ? 'admin' : profileData.role,
                isAuthorized: isSuperAdmin ? true : profileData.is_authorized,
                companyId: profileData.company_id
            });
            return;
        }

        // Fallback Logic (Error or Profile Not Found)
        console.warn('AuthContext: Entering fallback mode. Reason:', fetchError ? (fetchError.message || fetchError) : 'Profile not found');

        // Attempt to recover companyId
        let recoveredCompanyId = authUser.user_metadata?.company_id || null;
        if (!recoveredCompanyId && authUser.email) {
            recoveredCompanyId = await fetchCompanyByDomainSafe(authUser.email);
            if (recoveredCompanyId) console.log("AuthContext: Domain fallback successful:", recoveredCompanyId);
        }

        const fallbackUser = {
            ...authUser,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
            role: isSuperAdmin ? 'admin' : 'user',
            isAuthorized: true, // Allow access in fallback mode
            companyId: recoveredCompanyId,
            email: authUser.email
        };

        console.log('AuthContext: Usando usuario fallback:', fallbackUser);
        setUser(fallbackUser);
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
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
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ company_id: userData.companyId })
                .eq('id', data.user.id);
        }

        return { success: true, message: 'Registro exitoso. Por favor verifica tu correo.' };
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Se ha enviado un correo de recuperación.' };
    };

    // Admin functions
    const adminAuthorizeUser = async (userId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_authorized: true })
            .eq('id', userId);
    };

    const addCompany = async (name, domain) => {
        const { error } = await supabase
            .from('companies')
            .insert([{ name, domain }]);
        if (!error) {
            // Refresh companies
            const { data } = await supabase.from('companies').select('*');
            if (data) setCompanies(data);
        }
    };

    const removeCompany = async (id) => {
        await supabase.from('companies').delete().eq('id', id);
        setCompanies(prev => prev.filter(c => c.id !== id));
    };

    // User management for admin would require fetching from "profiles" table
    // We can expose a function to fetch all profiles
    const getAllUsers = async () => {
        // REMOVED JOIN companies(name) due to 406 Not Acceptable error
        const { data } = await supabase.from('profiles').select('*');
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
        await supabase.from('profiles').delete().eq('id', userId);
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
            refreshData,
            repairAdminProfile
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
