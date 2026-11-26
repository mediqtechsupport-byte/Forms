import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';
import {
  createAnnouncement as apiCreateAnnouncement,
  createFormRequestWithFiles as apiCreateFormRequest,
  deleteAnnouncement as apiDeleteAnnouncement,
  fetchAllLeaveBalances,
  fetchAllProfiles,
  fetchAnnouncements,
  fetchFormRequests,
  fetchRequestActivityLogs,
  fetchRequestAttachments,
  reviewFormRequest as apiReviewFormRequest,
  updateProfile as apiUpdateProfile,
  upsertLeaveBalance as apiUpsertLeaveBalance,
  type CreateFormRequestInput,
  type ReviewAction,
} from '../lib/api';
import type {
  Announcement,
  FormRequest,
  LeaveBalance,
  Profile,
  RequestActivityLog,
  RequestAttachment,
} from '../types/database';

interface DataContextValue {
  logoutAll: () => Promise<void>;
  activeProfile: Profile | null;
  activeLeaveBalance: LeaveBalance | null;
  requests: FormRequest[];
  myRequests: FormRequest[];
  profiles: Profile[];
  leaveBalances: LeaveBalance[];
  announcements: Announcement[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  submitForm: (input: CreateFormRequestInput, files: File[]) => Promise<FormRequest>;
  performReview: (params: {
    requestId: string;
    action: ReviewAction;
    remarks?: string;
    disbursementReference?: string;
  }) => Promise<void>;
  saveProfile: (
    profileId: string,
    updates: Partial<
      Pick<
        Profile,
        'full_name' | 'department' | 'position' | 'phone' | 'role' | 'is_active' | 'employee_code' | 'signature_data'
      >
    >
  ) => Promise<void>;
  saveLeaveBalance: (
    employeeId: string,
    year: number,
    values: {
      vacation_total: number;
      vacation_used: number;
      sick_total: number;
      sick_used: number;
      emergency_total: number;
      emergency_used: number;
    }
  ) => Promise<void>;
  publishAnnouncement: (input: {
    title: string;
    body: string;
    category: Announcement['category'];
    is_pinned: boolean;
  }) => Promise<void>;
  removeAnnouncement: (id: number) => Promise<void>;
  getAttachments: (requestId: string) => Promise<(RequestAttachment & { signedUrl?: string })[]>;
  getActivityLogs: (requestId: string) => Promise<RequestActivityLog[]>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, leaveBalance, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<FormRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = Boolean(profile && ['hr', 'boss', 'accounting'].includes(profile.role));

  const loadLiveData = useCallback(async () => {
    if (!user || !profile) {
      setRequests([]);
      setProfiles([]);
      setLeaveBalances([]);
      setAnnouncements([]);
      return;
    }
    setLoading(true);
    try {
      const [reqs, memos] = await Promise.all([
        fetchFormRequests({ scope: isAdmin ? 'all' : 'mine', userId: user.id }),
        fetchAnnouncements(),
      ]);
      setRequests(reqs);
      setAnnouncements(memos);

      if (isAdmin) {
        const [allProfs, allBals] = await Promise.all([
          fetchAllProfiles(),
          fetchAllLeaveBalances(),
        ]);
        setProfiles(allProfs);
        setLeaveBalances(allBals);
      } else {
        setProfiles([]);
        setLeaveBalances([]);
      }
    } catch (err) {
      console.error('Supabase data load error:', err);
      toast(
        'Sync error',
        err instanceof Error ? err.message : 'Unable to load latest records from Supabase.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [user, profile, isAdmin, toast]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Live Supabase Realtime Postgres Subscriptions
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel('mediq-forms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'form_requests' },
        (payload) => {
          loadLiveData();
          refreshProfile();
          if (payload.eventType === 'INSERT' && isAdmin) {
            const rec = payload.new as { reference_no?: string; title?: string };
            toast(
              `New Digital Form Received (${rec.reference_no ?? 'New'})`,
              rec.title ?? 'An employee just submitted a digital form.',
              'info'
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => loadLiveData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, isAdmin, loadLiveData, refreshProfile, toast]);

  const logoutAll = useCallback(async () => {
    await signOut();
    setRequests([]);
    setProfiles([]);
    setLeaveBalances([]);
    setAnnouncements([]);
    toast('Signed out', 'You have been logged out securely.', 'info');
  }, [signOut, toast]);

  const myRequests = useMemo(() => {
    if (!profile) return [];
    return requests.filter((r) => r.employee_id === profile.id);
  }, [requests, profile]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadLiveData(), refreshProfile()]);
  }, [loadLiveData, refreshProfile]);

  const submitForm = useCallback(
    async (input: CreateFormRequestInput, files: File[]): Promise<FormRequest> => {
      const created = await apiCreateFormRequest(input, files);
      await refreshAll();
      return created;
    },
    [refreshAll]
  );

  const performReview = useCallback(
    async (params: {
      requestId: string;
      action: ReviewAction;
      remarks?: string;
      disbursementReference?: string;
    }) => {
      await apiReviewFormRequest(params);
      await refreshAll();
    },
    [refreshAll]
  );

  const saveProfile = useCallback(
    async (
      profileId: string,
      updates: Partial<
        Pick<
          Profile,
          'full_name' | 'department' | 'position' | 'phone' | 'role' | 'is_active' | 'employee_code' | 'signature_data'
        >
      >
    ) => {
      await apiUpdateProfile(profileId, updates);
      await refreshAll();
    },
    [refreshAll]
  );

  const saveLeaveBalance = useCallback(
    async (
      employeeId: string,
      year: number,
      values: {
        vacation_total: number;
        vacation_used: number;
        sick_total: number;
        sick_used: number;
        emergency_total: number;
        emergency_used: number;
      }
    ) => {
      await apiUpsertLeaveBalance(employeeId, year, values);
      await refreshAll();
    },
    [refreshAll]
  );

  const publishAnnouncement = useCallback(
    async (input: {
      title: string;
      body: string;
      category: Announcement['category'];
      is_pinned: boolean;
    }) => {
      if (!profile) return;
      await apiCreateAnnouncement({ ...input, published_by: profile.id });
      await refreshAll();
    },
    [profile, refreshAll]
  );

  const removeAnnouncement = useCallback(
    async (id: number) => {
      await apiDeleteAnnouncement(id);
      await refreshAll();
    },
    [refreshAll]
  );

  const getAttachments = useCallback(async (requestId: string) => {
    return fetchRequestAttachments(requestId);
  }, []);

  const getActivityLogs = useCallback(async (requestId: string) => {
    return fetchRequestActivityLogs(requestId);
  }, []);

  return (
    <DataContext.Provider
      value={{
        logoutAll,
        activeProfile: profile,
        activeLeaveBalance: leaveBalance,
        requests,
        myRequests,
        profiles,
        leaveBalances,
        announcements,
        loading,
        refreshAll,
        submitForm,
        performReview,
        saveProfile,
        saveLeaveBalance,
        publishAnnouncement,
        removeAnnouncement,
        getAttachments,
        getActivityLogs,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useAppData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used inside DataProvider');
  return ctx;
}
