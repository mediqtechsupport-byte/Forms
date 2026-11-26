import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchLeaveBalance, fetchProfile } from '../lib/api';
import type { LeaveBalance, Profile } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  leaveBalance: LeaveBalance | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserContext = useCallback(async (uid: string) => {
    try {
      const [prof, bal] = await Promise.all([fetchProfile(uid), fetchLeaveBalance(uid)]);
      setProfile(prof);
      setLeaveBalance(bal);
    } catch (err) {
      console.error('Failed loading user profile:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadUserContext(session.user.id);
    }
  }, [session?.user?.id, loadUserContext]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadUserContext(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        // Defer profile fetch slightly to avoid auth lock re-entrancy
        setTimeout(() => {
          if (mounted) {
            loadUserContext(nextSession.user.id).finally(() => {
              if (mounted) setLoading(false);
            });
          }
        }, 0);
      } else {
        setProfile(null);
        setLeaveBalance(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserContext]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setLeaveBalance(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        leaveBalance,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
