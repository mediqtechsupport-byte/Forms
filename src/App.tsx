import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { supabase } from './lib/supabase';
import {
  canAccessRolePortal,
  fetchAllLeaveBalances,
  fetchAllProfiles,
  fetchAnnouncements,
  fetchFormRequests,
} from './lib/api';
import { ROLE_META } from './lib/constants';
import { PortalLayout } from './components/PortalLayout';
import { NewRequestModal } from './components/NewRequestModal';
import { DigitalFormModal } from './components/DigitalFormModal';
import { AuthPage } from './pages/AuthPage';
import { EmployeePortal } from './pages/EmployeePortal';
import { HrAdminPage } from './pages/HrAdminPage';
import { BossAdminPage } from './pages/BossAdminPage';
import { AccountingAdminPage } from './pages/AccountingAdminPage';
import { ProfilePage } from './pages/ProfilePage';
import type {
  Announcement,
  FormRequest,
  LeaveBalance,
  Profile,
  RequestType,
  UserRole,
} from './types/database';

function WorkspaceApp() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [requests, setRequests] = useState<FormRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newFormDefaultType, setNewFormDefaultType] = useState<RequestType>('leave');
  const [selectedRequest, setSelectedRequest] = useState<FormRequest | null>(null);

  const isAdmin = Boolean(profile && ['hr', 'boss', 'accounting'].includes(profile.role));

  const loadAllData = useCallback(async () => {
    if (!user || !profile) return;
    setDataLoading(true);
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
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, profile, isAdmin]);

  useEffect(() => {
    if (user && profile) {
      loadAllData();
    }
  }, [user, profile, loadAllData]);

  // Real-time Postgres Subscriptions so Boss, HR, Accounting & Employees receive updates instantly
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel('mediq-forms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'form_requests' },
        (payload) => {
          loadAllData();
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
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, isAdmin, loadAllData, refreshProfile, toast]);

  const myRequests = useMemo(
    () => (user ? requests.filter((r) => r.employee_id === user.id) : []),
    [requests, user]
  );

  const pendingCounts = useMemo(
    () => ({
      hr: requests.filter(
        (r) =>
          ['leave', 'overtime', 'official_business', 'other'].includes(r.request_type) &&
          r.hr_status === 'pending' &&
          !['rejected', 'cancelled'].includes(r.status)
      ).length,
      boss: requests.filter(
        (r) => r.boss_status === 'pending' && !['rejected', 'cancelled'].includes(r.status)
      ).length,
      accounting: requests.filter(
        (r) =>
          ['reimbursement', 'cash_advance', 'overtime'].includes(r.request_type) &&
          r.accounting_status === 'pending' &&
          !['rejected', 'cancelled'].includes(r.status)
      ).length,
    }),
    [requests]
  );

  const portalContext: UserRole = location.pathname.startsWith('/boss')
    ? 'boss'
    : location.pathname.startsWith('/hr')
      ? 'hr'
      : location.pathname.startsWith('/accounting')
        ? 'accounting'
        : 'employee';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs font-semibold text-slate-500">Loading MediQ Digital Forms...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  const defaultHome = ROLE_META[profile.role].homePath;

  const openNewForm = (type: RequestType = 'leave') => {
    setNewFormDefaultType(type);
    setNewFormOpen(true);
  };

  return (
    <PortalLayout
      onQuickNewForm={() => openNewForm('leave')}
      pendingCounts={pendingCounts}
    >
      {dataLoading && requests.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
        </div>
      ) : (
        <Routes>
          <Route
            path="/employee"
            element={
              <EmployeePortal
                myRequests={myRequests}
                announcements={announcements}
                onOpenNewForm={openNewForm}
                onInspect={setSelectedRequest}
              />
            }
          />
          <Route
            path="/hr"
            element={
              canAccessRolePortal(profile.role, 'hr') ? (
                <HrAdminPage
                  requests={requests}
                  profiles={profiles}
                  leaveBalances={leaveBalances}
                  announcements={announcements}
                  onInspect={setSelectedRequest}
                  onRefreshAll={loadAllData}
                />
              ) : (
                <Navigate to="/employee" replace />
              )
            }
          />
          <Route
            path="/boss"
            element={
              canAccessRolePortal(profile.role, 'boss') ? (
                <BossAdminPage
                  requests={requests}
                  profiles={profiles}
                  onInspect={setSelectedRequest}
                  onRefreshAll={loadAllData}
                />
              ) : (
                <Navigate to="/employee" replace />
              )
            }
          />
          <Route
            path="/accounting"
            element={
              canAccessRolePortal(profile.role, 'accounting') ? (
                <AccountingAdminPage
                  requests={requests}
                  onInspect={setSelectedRequest}
                />
              ) : (
                <Navigate to="/employee" replace />
              )
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to={defaultHome} replace />} />
        </Routes>
      )}

      <NewRequestModal
        open={newFormOpen}
        defaultType={newFormDefaultType}
        onClose={() => setNewFormOpen(false)}
        onCreated={loadAllData}
      />

      <DigitalFormModal
        request={selectedRequest}
        portalContext={portalContext}
        onClose={() => setSelectedRequest(null)}
        onUpdated={loadAllData}
      />
    </PortalLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceApp />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
