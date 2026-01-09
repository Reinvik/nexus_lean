import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    full_name: string | null;
    company_id: string | null;
    role: 'user' | 'superuser' | 'superadmin' | 'platform_admin';
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    selectedCompanyId: string | null;
    sessionError: boolean;
    switchCompany: (companyId: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithMagicLink: (email: string) => Promise<void>;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signUpWithPassword: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
    recoverSession: () => Promise<boolean>;
    forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    selectedCompanyId: null,
    sessionError: false,
    switchCompany: async () => { },
    signInWithGoogle: async () => { },
    signInWithMagicLink: async () => { },
    signInWithPassword: async () => { },
    signUpWithPassword: async () => { },
    signOut: async () => { },
    recoverSession: async () => false,
    forceLogout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionError, setSessionError] = useState(false);

    // REF to always have access to CURRENT profile (avoids stale closure problem!)
    const profileRef = useRef<Profile | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    // Track mounted state for async operations
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        // Local mounted check for this effect
        let effectMounted = true;
        let initRunning = false;

        const initializeAuth = async () => {
            if (initRunning) return;
            initRunning = true;

            // SAFETY WATCHDOG: Force loading=false after 5s no matter what
            const safetyTimeout = setTimeout(() => {
                if (effectMounted) {
                    console.warn("[AuthContext] 🚨 Safety watchdog triggered: Forcing loading=false");
                    setLoading(false);
                }
            }, 5000);

            console.log("[AuthContext] ⚡ Init starting...");
            try {
                // 1. Get Initial Session
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("[AuthContext] getSession error:", error);
                }

                if (effectMounted && initialSession) {
                    await handleSession('getSession', initialSession);
                }
            } catch (err) {
                console.error("[AuthContext] Init error:", err);
            } finally {
                initRunning = false;
                clearTimeout(safetyTimeout); // Clear watchdog if we finished normally
                if (effectMounted) setLoading(false);
            }
        };

        const handleSession = async (source: string, incomingSession: Session | null) => {
            if (!effectMounted) return;

            try {
                if (incomingSession) {
                    console.log(`[AuthContext] ✅ Session from ${source}:`, incomingSession.user.id);
                    setSession(incomingSession);
                    setUser(incomingSession.user);

                    // Use REF to check current profile (not stale closure!)
                    const currentProfile = profileRef.current;

                    // SKIP re-fetch if we already have a valid profile for this user
                    // This prevents losing the role during duplicate SIGNED_IN events
                    if (currentProfile && currentProfile.id === incomingSession.user.id && currentProfile.role) {
                        console.log(`[AuthContext] 🛡️ Skipping profile fetch - already have valid profile for user:`, currentProfile.role);
                        return;
                    }

                    // FAST PATH: Try to fetch profile with a timeout (6s) and ONE retry
                    // If it fails or times out, keep existing profile if available
                    let fetchedProfile: Profile | null = null;

                    try {
                        const fetchWithRetry = async (retries = 1, timeoutMs = 6000): Promise<Profile | null> => {
                            const fetchOnce = async () => {
                                // Use Promise.race for timeout (abortSignal not available in this supabase version)
                                const fetchPromise = supabase
                                    .from('profiles')
                                    .select('id, full_name, company_id, role')
                                    .eq('id', incomingSession.user.id)
                                    .maybeSingle();

                                const timeoutPromise = new Promise<null>((_, reject) => {
                                    setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
                                });

                                return Promise.race([fetchPromise, timeoutPromise.then(() => fetchPromise)]);
                            };

                            try {
                                const { data, error } = await fetchOnce();
                                if (error) throw error;
                                return data as Profile | null;
                            } catch (err: any) {
                                if (retries > 0) {
                                    console.warn(`[AuthContext] ⚠️ Profile fetch failed/timed out. Retrying in 1s... (${retries} retries left)`);
                                    await new Promise(r => setTimeout(r, 1000));
                                    return fetchWithRetry(retries - 1, timeoutMs); // Retry
                                }
                                throw err;
                            }
                        };

                        console.log(`[AuthContext] 🔍 Fetching profile...`);
                        fetchedProfile = await fetchWithRetry();

                    } catch (e: any) {
                        if (e.message === 'TIMEOUT') {
                            console.warn('[AuthContext] ⏱️ Profile fetch timed out (after retry).');
                        } else {
                            console.error('[AuthContext] Unexpected fetch error', e);
                        }
                    }

                    // Apply profile - NEVER fall back to 'user' role if we have existing profile!
                    if (effectMounted) {
                        if (fetchedProfile && fetchedProfile.role) {
                            console.log(`[AuthContext] ⚡ Profile ready:`, fetchedProfile.role);
                            setProfile(fetchedProfile);
                            setSelectedCompanyId(prev => {
                                if (fetchedProfile?.role === 'superadmin' && prev) return prev;
                                return fetchedProfile?.company_id ?? null;
                            });
                            // SUCCESS: Clear any previous error flags
                            setSessionError(false);
                        } else if (currentProfile && currentProfile.id === incomingSession.user.id) {
                            // KEEP existing profile - don't overwrite with 'user' role!
                            console.log(`[AuthContext] 🛡️ Keeping existing profile (fetch failed). Role:`, currentProfile.role);
                        } else {
                            // Only use defaults if we have NOTHING (first login / no profile exists)
                            console.warn(`[AuthContext] ⚠️ No existing profile - may need to create one in database.`);
                            // Set sessionError so the user can see there's a problem
                            setSessionError(true);
                        }
                    }

                } else if (source === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setSelectedCompanyId(null);
                    // Redirect to login when session is lost
                    if (window.location.pathname !== '/login') {
                        console.log('[AuthContext] 🚪 Session lost, redirecting to login...');
                        window.location.href = '/login';
                    }
                }
            } finally {
                console.log(`[AuthContext] 🏁 handleSession done. Loading=false.`);
                if (effectMounted) setLoading(false);
            }
        };

        // Initialize immediately
        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!effectMounted) return;
            console.log(`[AuthContext] 📡 Event: ${event}`);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (currentSession) await handleSession(`Event:${event}`, currentSession);
            } else if (event === 'SIGNED_OUT') {
                await handleSession('SIGNED_OUT', null);
            }
        });

        // HEARTBEAT: Keep session alive, validate AND FIX role every 4 minutes
        const heartbeatInterval = setInterval(async () => {
            const currentProfile = profileRef.current;
            if (!effectMounted || !session) return;
            try {
                console.log('[AuthContext] 💓 Heartbeat: Validating session...');
                // Use the lightweight RPC function we created to ping DB and check role
                const { data: dbRole, error } = await supabase.rpc('get_current_user_role');

                if (error) {
                    console.warn('[AuthContext] 💓 Heartbeat failed:', error.message);
                    if (effectMounted) setSessionError(true);
                } else if (!dbRole) {
                    console.warn('[AuthContext] 💓 Heartbeat: No role returned - session issue detected');
                    if (effectMounted) setSessionError(true);
                } else {
                    console.log('[AuthContext] 💓 Heartbeat success. DB Role:', dbRole, 'Current Role:', currentProfile?.role);

                    // AUTO-FIX: If DB role differs from current profile, update it!
                    if (currentProfile && dbRole !== currentProfile.role) {
                        console.warn(`[AuthContext] 💓 ROLE MISMATCH DETECTED! Fixing: ${currentProfile.role} → ${dbRole}`);
                        setProfile(prev => prev ? { ...prev, role: dbRole as Profile['role'] } : prev);
                    }

                    // Clear any previous error if heartbeat succeeded
                    if (effectMounted) setSessionError(false);
                }
            } catch (e) {
                console.error('[AuthContext] 💓 Heartbeat error', e);
                if (effectMounted) setSessionError(true);
            }
        }, 4 * 60 * 1000); // 4 minutes

        return () => {
            effectMounted = false;
            subscription.unsubscribe();
            clearInterval(heartbeatInterval);
        };
    }, []); // Remove session dependency to prevent loop

    const signInWithGoogle = async () => {
        // Don't set loading here - onAuthStateChange will handle it
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) {
            console.error('Google sign-in error:', error.message);
        }
    };

    const signInWithMagicLink = async (email: string) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) throw error;
        setLoading(false);
    };

    const signInWithPassword = async (email: string, password: string) => {
        // Don't set loading here - onAuthStateChange will handle it
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            throw error;
        }
    };

    const signUpWithPassword = async (email: string, password: string, fullName: string) => {
        // Don't set loading here - onAuthStateChange will handle it
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });
        if (error) {
            throw error;
        }
    };

    const signOut = async () => {
        // Don't set loading here - onAuthStateChange will handle it
        await supabase.auth.signOut();
    };

    const switchCompany = async (companyId: string) => {
        if (profile?.role === 'superadmin' || companyId === profile?.company_id) {
            setSelectedCompanyId(companyId);
        }
    };

    // Attempt to recover the session by re-fetching the profile
    const recoverSession = async (): Promise<boolean> => {
        console.log('[AuthContext] 🔄 Attempting session recovery...');

        if (!user) {
            console.warn('[AuthContext] ❌ Cannot recover - no user');
            return false;
        }

        try {
            // First, try to refresh the auth token
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
                console.error('[AuthContext] ❌ Token refresh failed:', refreshError.message);
                return false;
            }

            if (refreshData.session) {
                setSession(refreshData.session);
                setUser(refreshData.session.user);
            }

            // Now try to fetch the profile again
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, company_id, role')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.error('[AuthContext] ❌ Profile fetch failed:', profileError.message);
                return false;
            }

            if (profileData && profileData.role) {
                console.log('[AuthContext] ✅ Recovery successful! Role:', profileData.role);
                setProfile(profileData as Profile);
                setSelectedCompanyId(profileData.company_id);
                setSessionError(false);
                return true;
            } else {
                console.warn('[AuthContext] ⚠️ Profile recovered but no role');
                return false;
            }
        } catch (err) {
            console.error('[AuthContext] ❌ Recovery error:', err);
            return false;
        }
    };

    // Force logout - clears ALL storage and forces HARD REFRESH (like Ctrl+Shift+R)
    const forceLogout = async () => {
        console.log('[AuthContext] 🚪 Force logout initiated (HARD CLEAN)...');

        try {
            // 1. Clear ALL storage immediately
            window.localStorage.clear();
            window.sessionStorage.clear();

            // 2. Clear ALL cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // 3. Clear Cache Storage (Service Workers, etc.)
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('[AuthContext] 🗑️ Cache storage cleared');
                } catch (e) {
                    console.warn('[AuthContext] Cache clear failed:', e);
                }
            }

            // 4. Clear state immediately
            if (mounted) {
                setSession(null);
                setUser(null);
                setProfile(null);
                setSelectedCompanyId(null);
                setSessionError(false);
            }

            // 5. Sign out from Supabase (best effort with SHORT timeout)
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 500));
            await Promise.race([signOutPromise, timeoutPromise]).catch(err => console.warn('SignOut warning:', err));

            // 6. HARD REFRESH - equivalent to Ctrl+Shift+R
            // This forces the browser to reload from server, clearing memory cache
            console.log('[AuthContext] 🔄 Performing HARD REFRESH...');
            window.location.href = '/login';
            // Small delay then force a true reload (bypasses cache)
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            console.error('[AuthContext] Force logout error:', error);
            // Emergency fallback - still do hard refresh
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.href = '/login';
            setTimeout(() => window.location.reload(), 100);
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            loading,
            selectedCompanyId,
            sessionError,
            switchCompany,
            signInWithGoogle,
            signInWithMagicLink,
            signInWithPassword,
            signUpWithPassword,
            signOut,
            recoverSession,
            forceLogout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
