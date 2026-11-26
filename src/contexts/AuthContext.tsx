import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { canAccessRolePortal, fetchLeaveBalance, fetchProfile } from '../lib/api';
import type { LeaveBalance, Profile, UserRole } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  leaveBalance: LeaveBalance | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInForPortal: (email: string, password: string, targetPortal: UserRole) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevents onAuthStateChange from exposing a session while signInForPortal is verifying role match
  const portalAuthInFlightRef = useRef(false);

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
      // While signInForPortal is checking the user's role against the target portal, do not leak session/profile into state
      if (portalAuthInFlightRef.current) return;

      setSession(nextSession);
      if (nextSession?.user?.id) {
        setTimeout(() => {
          if (mounted && !portalAuthInFlightRef.current) {
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

  const signInForPortal = useCallback(
    async (email: string, password: string, targetPortal: UserRole): Promise<Profile> => {
      portalAuthInFlightRef.current = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (!data.user || !data.session) {
          throw new Error('Unable to establish authenticated session.');
        }

        const [prof, bal] = await Promise.all([
          fetchProfile(data.user.id),
          fetchLeaveBalance(data.user.id),
        ]);

        if (!prof || !prof.is_active) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLeaveBalance(null);
          throw new Error('Your account is inactive or missing a profile. Please contact HR Admin.');
        }

        if (!canAccessRolePortal(prof.role, targetPortal)) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLeaveBalance(null);
          const roleLabels: Record<UserRole, string> = {
            employee: 'Employee Portal',
            hr: 'HR Admin Portal',
            boss: 'Boss Executive Admin',
            accounting: 'Accounting Admin Portal',
          };
          throw new Error(
            `Access denied: This email (${prof.email}) belongs to the ${roleLabels[prof.role]} and cannot log in to the ${roleLabels[targetPortal]}.`
          );
        }

        setSession(data.session);
        setProfile(prof);
        setLeaveBalance(bal);
        return prof;
      } finally {
        portalAuthInFlightRef.current = false;
      }
    },
    []
  );

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
        signInForPortal,
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
