import { useMemo, useState, type ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useAppData } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { canAccessRolePortal } from './lib/api';
import { NewRequestModal } from './components/NewRequestModal';
import { DigitalFormModal } from './components/DigitalFormModal';
import { AuthPage } from './pages/AuthPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { PortalGatewayPage } from './pages/PortalGatewayPage';
import { EmployeePortal } from './pages/EmployeePortal';
import { HrAdminPage } from './pages/HrAdminPage';
import { BossAdminPage } from './pages/BossAdminPage';
import { AccountingAdminPage } from './pages/AccountingAdminPage';
import type { FormRequest, RequestType, UserRole } from './types/database';

function WorkspaceApp() {
  const { user, loading: authLoading } = useAuth();
  const {
    activeProfile: profile,
    requests,
    myRequests,
    profiles,
    leaveBalances,
    announcements,
  } = useAppData();
  const location = useLocation();

  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newFormDefaultType, setNewFormDefaultType] = useState<RequestType>('leave');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const selectedRequest: FormRequest | null = useMemo(
    () => (selectedRequestId ? requests.find((r) => r.id === selectedRequestId) ?? null : null),
    [selectedRequestId, requests]
  );

  const portalContext: UserRole = location.pathname.startsWith('/boss')
    ? 'boss'
    : location.pathname.startsWith('/hr')
      ? 'hr'
      : location.pathname.startsWith('/accounting')
        ? 'accounting'
        : 'employee';

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs font-semibold text-slate-500">Loading MediQ Digital Forms...</p>
        </div>
      </div>
    );
  }

  // If the user landed from a Supabase email invite link whose redirect landed at Site URL,
  // send them straight to the branded Acceptance page so they explicitly accept & set their password.
  const pendingInviteToken =
    user?.user_metadata?.invite_pending === true &&
    typeof user?.user_metadata?.invite_token === 'string'
      ? user.user_metadata.invite_token
      : null;

  if (pendingInviteToken && location.pathname !== '/accept-invite') {
    return <Navigate to={`/accept-invite?token=${pendingInviteToken}`} replace />;
  }

  const activeAuthenticatedProfile = profile && profile.is_active ? profile : null;

  const openNewForm = (type: RequestType = 'leave') => {
    setNewFormDefaultType(type);
    setNewFormOpen(true);
  };

  const hasAccess = (target: UserRole) =>
    Boolean(activeAuthenticatedProfile && canAccessRolePortal(activeAuthenticatedProfile.role, target));

  // If logged in as a specific role, lock them strictly to their own portal — visiting another portal's route or login redirects straight back to their authorized portal
  const renderLoginRoute = (target: UserRole) => {
    if (activeAuthenticatedProfile) {
      return <Navigate to={`/${activeAuthenticatedProfile.role}`} replace />;
    }
    return <AuthPage portal={target} />;
  };

  const renderProtectedPortal = (target: UserRole, element: ReactElement) => {
    if (!activeAuthenticatedProfile) {
      return <Navigate to={`/${target}/login`} replace />;
    }
    if (!hasAccess(target)) {
      return <Navigate to={`/${activeAuthenticatedProfile.role}`} replace />;
    }
    return element;
  };

  return (
    <>
      <Routes>
        {/* Main Entry Link: Choose Which Portal to Open */}
        <Route path="/" element={<PortalGatewayPage />} />

        {/* Branded Employee / Staff Invitation Acceptance Page */}
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        {/* Dedicated Branded Login Page for Each Separate Portal */}
        <Route path="/employee/login" element={renderLoginRoute('employee')} />
        <Route path="/boss/login" element={renderLoginRoute('boss')} />
        <Route path="/hr/login" element={renderLoginRoute('hr')} />
        <Route path="/accounting/login" element={renderLoginRoute('accounting')} />

        {/* Strictly Isolated Role-Locked Portals */}
        <Route
          path="/employee/*"
          element={renderProtectedPortal(
            'employee',
            <EmployeePortal
              myRequests={myRequests}
              announcements={announcements}
              onOpenNewForm={openNewForm}
              onInspect={(req) => setSelectedRequestId(req.id)}
            />
          )}
        />
        <Route
          path="/boss/*"
          element={renderProtectedPortal(
            'boss',
            <BossAdminPage
              requests={requests}
              profiles={profiles}
              onInspect={(req) => setSelectedRequestId(req.id)}
            />
          )}
        />
        <Route
          path="/hr/*"
          element={renderProtectedPortal(
            'hr',
            <HrAdminPage
              requests={requests}
              profiles={profiles}
              leaveBalances={leaveBalances}
              announcements={announcements}
              onInspect={(req) => setSelectedRequestId(req.id)}
            />
          )}
        />
        <Route
          path="/accounting/*"
          element={renderProtectedPortal(
            'accounting',
            <AccountingAdminPage
              requests={requests}
              onInspect={(req) => setSelectedRequestId(req.id)}
            />
          )}
        />

        <Route
          path="*"
          element={
            <Navigate
              to={activeAuthenticatedProfile ? `/${activeAuthenticatedProfile.role}` : '/'}
              replace
            />
          }
        />
      </Routes>

      {activeAuthenticatedProfile && (
        <>
          <NewRequestModal
            open={newFormOpen}
            formType={newFormDefaultType}
            onClose={() => setNewFormOpen(false)}
          />
          <DigitalFormModal
            request={selectedRequest}
            portalContext={portalContext}
            onClose={() => setSelectedRequestId(null)}
          />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <WorkspaceApp />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
