import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Calculator,
  LayoutDashboard,
  Lock,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAppData } from '../contexts/DataContext';
import { canAccessRolePortal } from '../lib/api';
import type { UserRole } from '../types/database';

const PORTALS: {
  index: string;
  role: UserRole;
  title: string;
  eyebrow: string;
  summary: string;
  icon: typeof LayoutDashboard;
  featured?: boolean;
}[] = [
  {
    index: '01',
    role: 'employee',
    title: 'Employee Portal',
    eyebrow: 'Staff Self-Service',
    summary:
      'File digital Leave, Overtime, Official Business, Cash Advance, and Expense Reimbursement slips with receipt uploads and e-signatures.',
    icon: LayoutDashboard,
  },
  {
    index: '02',
    role: 'hr',
    title: 'HR Admin',
    eyebrow: 'Stage 1 · People Ops',
    summary:
      'Review and approve HR requests before routing to Boss, manage leave credits, send staff invitations, and export printable history archives.',
    icon: Users,
  },
  {
    index: '03',
    role: 'accounting',
    title: 'Accounting Admin',
    eyebrow: 'Stage 1 · Finance & Payroll',
    summary:
      'Inspect BIR official receipts, verify reimbursement and cash advance claims, audit overtime payroll, and forward cleared slips to Boss.',
    icon: Calculator,
  },
  {
    index: '04',
    role: 'boss',
    title: 'Boss Executive',
    eyebrow: 'Stage 2 · Final Sign-Off',
    summary:
      'Issue final executive digital sign-off that permanently locks records in History, manage CEO / COO & staff invitations, and archive company exports.',
    icon: ShieldCheck,
    featured: true,
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Employee',
  hr: 'HR Admin',
  accounting: 'Accounting',
  boss: 'Boss Executive',
};

export function PortalGatewayPage() {
  const navigate = useNavigate();
  const { activeProfile, logoutAll } = useAppData();

  const openPortal = (role: UserRole) => {
    if (activeProfile) {
      if (canAccessRolePortal(activeProfile.role, role)) {
        navigate(`/${role}`);
      }
      return;
    }
    navigate(`/${role}/login`);
  };

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#060e1c] text-[#f5efe4]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      {/* Midnight Navy Top Bar */}
      <header className="w-full border-b border-[#203456] bg-[#0b172b]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex shrink-0 items-center gap-3.5">
            <img
              src="./brand/mediq-logo-white.png"
              alt="MediQ Pharma"
              className="h-7 w-auto shrink-0 object-contain sm:h-8"
            />
            <span className="hidden h-5 w-px bg-[#203456] sm:block" aria-hidden="true" />
            <span className="hidden text-xs font-medium text-[#b7afa2] sm:block">
              Internal Forms &amp; Approval Workspace
            </span>
          </div>

          {activeProfile ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-[#f5efe4]">{activeProfile.full_name}</p>
                <p className="text-[11px] text-[#948e84]">{ROLE_LABELS[activeProfile.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/${activeProfile.role}`)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-3.5 py-2 text-xs font-semibold text-[#f7f2e8] transition hover:brightness-110"
              >
                Open Workspace
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void logoutAll()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#283f66] bg-[#11213c] px-3 py-2 text-xs font-semibold text-[#b7afa2] transition hover:border-[#d9c7a7]/60 hover:text-[#f5efe4]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-semibold tracking-[0.06em] text-[#948e84] uppercase">
              MediQ Pharma · Philippines
            </span>
          )}
        </div>
      </header>

      {/* Main Dark Midnight Navy Workspace Selector */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-6 sm:px-8 sm:py-8">
        {/* Midnight Navy Architectural Hero Card */}
        <section
          className="relative mb-5 overflow-hidden rounded-[26px] border border-[#283f66] px-6 py-6 text-[#f5efe4] shadow-[0_24px_56px_-24px_rgba(0,0,0,0.75)] sm:px-8 sm:py-7"
          style={{
            background:
              'radial-gradient(95% 130% at 96% 12%, rgba(217,199,167,0.16), transparent 55%), linear-gradient(145deg, #163362 0%, #0f2942 54%, #0b172b 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #f5efe4 1px, transparent 1px), linear-gradient(to bottom, #f5efe4 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#d9c7a7] uppercase">
                Paperless Operations
              </p>
              <h1 className="mt-2 text-2xl font-semibold leading-[1.14] tracking-[-0.03em] text-[#f5efe4] sm:text-[34px] lg:text-[36px]">
                Select your MediQ workspace.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#b7afa2] sm:text-[14.5px]">
                Sign in to your assigned portal below. Every form follows sequential approval and is
                permanently archived once signed by Executive leadership.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-5 border-t border-white/12 pt-4 sm:gap-6 lg:border-t-0 lg:border-l lg:pl-7 lg:pt-0">
              <div>
                <p className="text-lg font-semibold tracking-tight text-[#f5efe4] sm:text-xl">4</p>
                <p className="text-[11px] text-[#b7afa2]">Role Portals</p>
              </div>
              <div className="h-7 w-px bg-white/12" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tracking-tight text-[#f5efe4] sm:text-xl">6</p>
                <p className="text-[11px] text-[#b7afa2]">Digital Forms</p>
              </div>
              <div className="h-7 w-px bg-white/12" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tracking-tight text-[#d9c7a7] sm:text-xl">
                  Locked
                </p>
                <p className="text-[11px] text-[#b7afa2]">Audit History</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2x2 Midnight Navy Portal Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            const isUnlocked = Boolean(
              activeProfile && canAccessRolePortal(activeProfile.role, portal.role)
            );
            const isLockedByOtherSession = Boolean(activeProfile && !isUnlocked);
            const isExecutive = Boolean(portal.featured);

            return (
              <button
                key={portal.role}
                type="button"
                disabled={isLockedByOtherSession}
                onClick={() => openPortal(portal.role)}
                className={`group relative flex flex-col justify-between rounded-[24px] p-5 text-left transition-all duration-200 sm:p-6 ${
                  isLockedByOtherSession
                    ? 'cursor-not-allowed border border-[#203456]/60 bg-[#0b172b]/80 opacity-50'
                    : isExecutive
                      ? 'cursor-pointer border border-[#d9c7a7]/35 bg-[#11213c] text-[#f5efe4] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.7)] hover:-translate-y-0.5 hover:border-[#d9c7a7]/70 hover:bg-[#152849]'
                      : 'cursor-pointer border border-[#203456] bg-[#11213c] text-[#f5efe4] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.65)] hover:-translate-y-0.5 hover:border-[#3c64a3] hover:bg-[#152849]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors ${
                          isExecutive && !isLockedByOtherSession
                            ? 'bg-[#d9c7a7] text-[#081428]'
                            : 'bg-[#1a2f52] text-[#e5d5b7] group-hover:bg-gradient-to-b group-hover:from-[#29508f] group-hover:to-[#142e5c] group-hover:text-[#f7f2e8]'
                        }`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.9} />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.06em] text-[#948e84] uppercase">
                          {portal.index} · {portal.eyebrow}
                        </p>
                        <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[#f5efe4]">
                          {portal.title}
                        </h2>
                      </div>
                    </div>

                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-200 ${
                        isLockedByOtherSession
                          ? 'border border-[#203456] text-[#6c7b96]'
                          : isExecutive
                            ? 'bg-[#d9c7a7] text-[#081428] group-hover:rotate-45'
                            : 'border border-[#283f66] bg-[#0b172b] text-[#e5d5b7] group-hover:rotate-45 group-hover:border-[#29508f] group-hover:bg-[#29508f] group-hover:text-[#f7f2e8]'
                      }`}
                    >
                      {isLockedByOtherSession ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#b7afa2]">{portal.summary}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#203456] pt-3.5 text-xs font-semibold text-[#e5d5b7]">
                  <span>
                    {isUnlocked
                      ? 'Continue to active session'
                      : isLockedByOtherSession
                        ? 'Sign out to switch roles'
                        : `Sign in to ${portal.title}`}
                  </span>
                  <span className="text-[11px] font-medium text-[#948e84]">
                    {isUnlocked
                      ? 'Active'
                      : isLockedByOtherSession
                        ? 'Restricted'
                        : isExecutive
                          ? 'CEO & COO Access'
                          : 'Authorized email'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#203456] px-5 py-4 text-center text-[11.5px] text-[#948e84] sm:px-8">
        MediQ Pharma &amp; Medical Supplies Distribution · Authorized Staff Portal · Role-Isolated
        Access
      </footer>
    </div>
  );
}
