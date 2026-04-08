'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole, UserProfile, getUserDashboardPath } from '@/types/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  userRole: UserRole | null;
  userDashboardPath: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userDashboardPath, setUserDashboardPath] = useState<string | null>(null);

  // Dedup guard: drop concurrent ensureUserSetup calls for the same user.
  // Without this, initializeAuth and onAuthStateChange(TOKEN_REFRESHED) both
  // fire on every page load, doubling the DB work.
  const setupInProgressRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const ensureUserSetup = useCallback(async (currentUser: User) => {
    if (setupInProgressRef.current === currentUser.id) return;
    setupInProgressRef.current = currentUser.id;

    const doSetup = async () => {
      const now = new Date().toISOString();

      // Round 1 — 3 queries in parallel: role check + full profile in one shot.
      // Previously this was 8 sequential queries (6 of which were duplicates).
      const [adminResult, managerResult, userResult] = await Promise.all([
        supabase.from('admins').select('id').eq('id', currentUser.id).maybeSingle(),
        supabase.from('managers').select('id').eq('id', currentUser.id).maybeSingle(),
        supabase.from('users').select('*').eq('id', currentUser.id).maybeSingle(),
      ]);

      // Derive role and path immediately from Round 1 — no extra queries needed.
      const role: UserRole = adminResult.data ? 'admin' : managerResult.data ? 'manager' : 'regular';
      setUserRole(role);
      setUserDashboardPath(getUserDashboardPath(role));

      // Profile is already in Round 1 — set it right away instead of waiting
      // for a separate fetchUserProfile call.
      if (userResult.data) {
        setProfile(userResult.data as UserProfile);
        setProfileLoading(false);
      }

      // Round 2 — fire background updates in parallel; don't block the UI.
      const updates: Promise<unknown>[] = [];

      if (adminResult.data) {
        updates.push(
          Promise.resolve(supabase.from('admins').update({ last_login: now, updated_at: now }).eq('id', currentUser.id))
        );
      } else if (managerResult.data) {
        updates.push(
          Promise.resolve(supabase.from('managers').update({ last_login: now, updated_at: now }).eq('id', currentUser.id))
        );
      }

      if (!userResult.data) {
        // New user: insert then fetch profile (fetchUserProfile clears profileLoading)
        updates.push(
          Promise.resolve(supabase.from('users').insert({
            id: currentUser.id,
            username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user',
            email: currentUser.email || '',
            created_at: currentUser.created_at,
            last_login: now,
          })).then(() => fetchUserProfile(currentUser.id))
        );
      } else {
        updates.push(
          Promise.resolve(supabase.from('users').update({ last_login: now, updated_at: now }).eq('id', currentUser.id))
        );
      }

      await Promise.all(updates);
    };

    try {
      // Safety timeout: if DB queries hang, fall through after 8 seconds
      await Promise.race([
        doSetup(),
        new Promise<void>(resolve => setTimeout(resolve, 8000)),
      ]);
    } catch (error) {
      console.error('Error in ensureUserSetup:', error);
    } finally {
      setupInProgressRef.current = null;
      // Guarantee these are always resolved even if we timed out or threw
      setUserRole(prev => prev ?? 'regular');
      setUserDashboardPath(prev => prev ?? '/');
      setProfileLoading(false);
    }
  }, [fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) console.error('getSession error:', error);

        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);

        // Clear loading as soon as the session is known.
        // Profile/role fetching continues in the background;
        // individual guards handle their own brief loading states.
        setLoading(false);

        if (currentUser) {
          await ensureUserSetup(currentUser);
        } else {
          setProfileLoading(false);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
        if (isMounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    initializeAuth();

    // Safety net: if getSession() itself hangs (e.g. stale navigator lock),
    // force loading off after 5 seconds so the app is never permanently stuck.
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);

      if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        if (event === 'SIGNED_IN') {
          setProfileLoading(true);
          setupInProgressRef.current = null; // allow re-run on fresh sign-in
        }
        await ensureUserSetup(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setUserDashboardPath(null);
        setProfileLoading(true);
        setupInProgressRef.current = null;
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [ensureUserSetup]);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    profileLoading,
    userRole,
    userDashboardPath,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }), [user, session, profile, loading, profileLoading, userRole, userDashboardPath, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
