import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Calculator,
  ArrowRight,
  FileCheck2,
  Lock,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAppData } from '../contexts/DataContext';
import { canAccessRolePortal } from '../lib/api';
import { RoleBadge } from '../components/StatusBadges';
import type { UserRole } from '../types/database';

export function PortalGatewayPage() {
  const navigate = useNavigate();
  const { activeProfile, logoutAll } = useAppData();

  const openPortal = (role: UserRole) => {
    if (activeProfile) {
      if (canAccessRolePortal(activeProfile.role, role)) {
        navigate(`/${role}`);
      }
      return; // Strictly blocked from opening other portals while signed in
    }
    navigate(`/${role}/login`);
  };

  const portals: {
    role: UserRole;
    path: string;
    title: string;
    subtitle: string;
    audience: string;
    features: string[];
    icon: typeof LayoutDashboard;
    accentBorder: string;
    accentBg: string;
    btnClass: string;
  }[] = [
    {
      role: 'employee',
      path: '/employee',
      title: 'Employee Portal',
      subtitle: 'Paperless Staff Self-Service',
      audience: 'All MediQ Employees & Field Specialists',
      features: [
        'Digital Leave, Overtime, Reimbursement & Official Business forms',
        'Built-in Draw/Type E-Signature & Receipt Photo Upload',
        'Live VL / SL / EL Leave Credits & Printable PDF Form Slips',
      ],
      icon: LayoutDashboard,
      accentBorder: 'hover:border-sky-400',
      accentBg: 'from-sky-500 to-cyan-600',
      btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
    {
      role: 'boss',
      path: '/boss',
      title: 'Boss Executive Admin',
      subtitle: 'Executive Approval Command',
      audience: 'Managing Director / Executive Approver',
      features: [
        '1-Click Final Digital Sign-Off across all company requests',
        'Live Pending Spend & Company Digital Forms Mix analytics',
        'Assign & manage HR Admin, Accounting & Executive roles',
      ],
      icon: ShieldCheck,
      accentBorder: 'hover:border-amber-400',
      accentBg: 'from-amber-500 to-orange-600',
      btnClass: 'bg-[#0a192f] hover:bg-slate-800 text-amber-300',
    },
    {
      role: 'hr',
      path: '/hr',
      title: 'HR Admin Portal',
      subtitle: 'People Operations & Leave Management',
      audience: 'Human Resources & Admin Department',
      features: [
        'Dedicated Queue for Leave, Overtime, Official Business & HR Docs',
        'Employee Directory & Annual Leave Credits Editor',
        'Company Memos & Holiday Advisory Publisher',
      ],
      icon: Users,
      accentBorder: 'hover:border-violet-400',
      accentBg: 'from-violet-600 to-indigo-600',
      btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    },
    {
      role: 'accounting',
      path: '/accounting',
      title: 'Accounting Admin Portal',
      subtitle: 'Reimbursements, Cash Advances & Payroll',
      audience: 'Finance & Accounting Department',
      features: [
        'Verify BIR Official Receipts & itemized PHP expense claims',
        'Mark Disbursed / Paid with Bank, GCash or Check Ref #',
        'Approved Overtime Payroll Queue & CSV Finance Exports',
      ],
      icon: Calculator,
      accentBorder: 'hover:border-emerald-400',
      accentBg: 'from-emerald-600 to-teal-600',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Corporate Hero Header */}
      <div className="relative overflow-hidden bg-[#071326] text-white">
        <div
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <img
                src="./brand/mediq-logo-white.png"
                alt="MediQ Pharma"
                className="h-9 w-auto object-contain"
              />
              <div className="border-l border-white/15 pl-3.5">
                <p className="text-[10px] font-bold tracking-widest text-sky-400 uppercase">
                  MediQ Pharma Philippines
                </p>
                <p className="text-sm font-bold text-white">Paperless Digital Forms Platform</p>
              </div>
            </div>

            {activeProfile ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-white">{activeProfile.full_name}</p>
                  <p className="text-[10px] text-emerald-300">Live Supabase Session</p>
                </div>
                <RoleBadge role={activeProfile.role} />
                <button
                  type="button"
                  onClick={() => logoutAll()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-500/20 hover:text-rose-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-300 ring-1 ring-white/15">
                <Lock className="h-3.5 w-3.5" />
                Role-Protected Login Required
              </span>
            )}
          </div>

          <div className="py-10 sm:py-12">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
              <FileCheck2 className="h-3.5 w-3.5" />
              One Link · 4 Separate Role-Dedicated Portals
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Select Your MediQ Portal to Sign In
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Choose whether you are signing in as an <strong>Employee</strong>,{' '}
              <strong>Boss Executive</strong>, <strong>HR Admin</strong>, or{' '}
              <strong>Accounting Admin</strong>. Each portal has its own secure login and isolated
              workspace.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Separate Portal Selector Cards */}
      <div className="mx-auto -mt-8 max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isUnlocked = Boolean(
              activeProfile && canAccessRolePortal(activeProfile.role, portal.role)
            );
            const isLockedByOtherSession = Boolean(activeProfile && !isUnlocked);
            return (
              <div
                key={portal.role}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition duration-200 ${
                  isLockedByOtherSession
                    ? 'opacity-60 grayscale-[35%]'
                    : `hover:-translate-y-0.5 hover:shadow-xl ${portal.accentBorder}`
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${portal.accentBg}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">{portal.title}</h2>
                        <p className="text-xs font-medium text-slate-500">{portal.subtitle}</p>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Your Active Portal
                      </span>
                    ) : isLockedByOtherSession ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                        <Lock className="h-3 w-3" />
                        Restricted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                        <Lock className="h-3 w-3" />
                        Login Required
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs">
                    <span className="font-semibold text-slate-600">{portal.audience}</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      {portal.path}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {portal.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isUnlocked
                      ? 'Authorized session active'
                      : isLockedByOtherSession
                        ? 'Sign out first to switch accounts'
                        : 'Work email & password required'}
                  </span>
                  <button
                    type="button"
                    disabled={isLockedByOtherSession}
                    onClick={() => openPortal(portal.role)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xs transition ${
                      isLockedByOtherSession
                        ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                        : portal.btnClass
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        Enter {portal.title}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </>
                    ) : isLockedByOtherSession ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Access Locked
                      </>
                    ) : (
                      <>
                        Sign In to {portal.title}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
