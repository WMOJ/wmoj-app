'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserRole, getUserDashboardPath } from '@/utils/userRole';
import { UserRole, UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userDashboardPath, setUserDashboardPath] = useState<string | null>(null);
  const profileCreationInProgressRef = useRef(false);

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
    }
  }, []);

  const updateUserRoleAndPath = useCallback(async (userId: string) => {
    try {
      const role = await getUserRole(userId);
      const dashboardPath = await getUserDashboardPath(userId);

      setUserRole(role);
      setUserDashboardPath(dashboardPath);

      console.log(`User role determined: ${role}, dashboard path: ${dashboardPath}`);
    } catch (error) {
      console.error('Error updating user role and path:', error);
      setUserRole('regular');
      setUserDashboardPath('/dashboard');
    }
  }, []);

  const createUserProfile = useCallback(async (user: User) => {
    if (profileCreationInProgressRef.current) {
      console.log('Profile creation already in progress, skipping...');
      return;
    }

    profileCreationInProgressRef.current = true;
    try {
      console.log('Starting profile creation/update for:', user.email);
      
      // Update last login if user exists in specialized tables
      const { data: adminUser } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle();
      const { data: managerUser } = await supabase.from('managers').select('id').eq('id', user.id).maybeSingle();

      if (adminUser) {
        await supabase.from('admins').update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', user.id);
      } else if (managerUser) {
        await supabase.from('managers').update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', user.id);
      }

      // Always ensure/update base user profile
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();

      if (!existingUser) {
        await supabase.from('users').insert({
          id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
          email: user.email || '',
          created_at: user.created_at,
          last_login: new Date().toISOString()
        });
      } else {
        await supabase.from('users').update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', user.id);
      }

      await updateUserRoleAndPath(user.id);
      await fetchUserProfile(user.id);
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    } finally {
      profileCreationInProgressRef.current = false;
    }
  }, [updateUserRoleAndPath, fetchUserProfile]);

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

        if (currentUser) {
          await createUserProfile(currentUser);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);

      if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        await createUserProfile(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setUserDashboardPath(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [createUserProfile]);

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
    userRole,
    userDashboardPath,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }), [user, session, profile, loading, userRole, userDashboardPath, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
