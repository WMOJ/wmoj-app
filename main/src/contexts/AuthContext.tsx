'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole, UserProfile } from '@/types/user';

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

  // Idempotent user setup — safe to call concurrently from multiple paths.
  // Internally races against a timeout so guards are never blocked forever.
  const ensureUserSetup = useCallback(async (currentUser: User) => {
    const doSetup = async () => {
      const now = new Date().toISOString();

      // Round 1: check all three tables in parallel — no sequential waits
      const [{ data: adminUser }, { data: managerUser }, { data: existingUser }] = await Promise.all([
        supabase.from('admins').select('id').eq('id', currentUser.id).maybeSingle(),
        supabase.from('managers').select('id').eq('id', currentUser.id).maybeSingle(),
        supabase.from('users').select('id').eq('id', currentUser.id).maybeSingle(),
      ]);

      // Derive role and path immediately — no further queries needed
      const role: UserRole = adminUser ? 'admin' : managerUser ? 'manager' : 'regular';
      const dashboardPath = role === 'admin' ? '/admin/dashboard' : role === 'manager' ? '/manager/dashboard' : '/';
      setUserRole(role);
      setUserDashboardPath(dashboardPath);

      // Round 2: profile fetch + last_login updates in parallel (fire together)
      const writes: Promise<unknown>[] = [];

      if (adminUser) {
        writes.push(supabase.from('admins').update({ last_login: now, updated_at: now }).eq('id', currentUser.id));
      } else if (managerUser) {
        writes.push(supabase.from('managers').update({ last_login: now, updated_at: now }).eq('id', currentUser.id));
      }

      if (!existingUser) {
        writes.push(supabase.from('users').insert({
          id: currentUser.id,
          username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user',
          email: currentUser.email || '',
          created_at: currentUser.created_at,
          last_login: now,
        }));
      } else {
        writes.push(supabase.from('users').update({ last_login: now, updated_at: now }).eq('id', currentUser.id));
      }

      await Promise.all([fetchUserProfile(currentUser.id), ...writes]);
    };

    try {
      // If DB queries hang, fall through after 8 seconds
      await Promise.race([
        doSetup(),
        new Promise<void>(resolve => setTimeout(resolve, 8000)),
      ]);
    } catch (error) {
      console.error('Error in ensureUserSetup:', error);
    }

    // Always guarantee role/path have values so guards never block forever
    setUserRole(prev => prev ?? 'regular');
    setUserDashboardPath(prev => prev ?? '/');
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
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
        if (isMounted) setLoading(false);
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

      if (currentUser && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setProfileLoading(true);
        await ensureUserSetup(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setUserDashboardPath(null);
        setProfileLoading(true);
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
