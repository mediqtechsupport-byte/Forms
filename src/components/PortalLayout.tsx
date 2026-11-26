import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Calculator,
  UserCircle2,
  LogOut,
  Menu,
  X,
  Plus,
  Radio,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canAccessRolePortal } from '../lib/api';
import { RoleBadge } from './StatusBadges';

interface PortalLayoutProps {
  children: React.ReactNode;
  onQuickNewForm: () => void;
  pendingCounts: {
    hr: number;
    boss: number;
    accounting: number;
  };
}

export function PortalLayout({
  children,
  onQuickNewForm,
  pendingCounts,
}: PortalLayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (!profile) return null;

  const navItems = [
    {
      to: '/employee',
      label: 'Employee Portal',
      sub: 'My digital forms & leave',
      icon: LayoutDashboard,
      visible: true,
      badge: 0,
      accent: 'text-sky-400',
    },
    {
      to: '/hr',
      label: 'HR Admin',
      sub: 'Leave, OT, OB & staff',
      icon: Users,
      visible: canAccessRolePortal(profile.role, 'hr'),
      badge: pendingCounts.hr,
      accent: 'text-violet-400',
    },
    {
      to: '/boss',
      label: 'Boss Executive',
      sub: 'Final sign-off & overview',
      icon: ShieldCheck,
      visible: canAccessRolePortal(profile.role, 'boss'),
      badge: pendingCounts.boss,
      accent: 'text-amber-400',
    },
    {
      to: '/accounting',
      label: 'Accounting Admin',
      sub: 'Reimbursements & payroll',
      icon: Calculator,
      visible: canAccessRolePortal(profile.role, 'accounting'),
      badge: pendingCounts.accounting,
      accent: 'text-emerald-400',
    },
    {
      to: '/profile',
      label: 'Profile & Signature',
      sub: 'Saved e-signature & info',
      icon: UserCircle2,
      visible: true,
      badge: 0,
      accent: 'text-slate-300',
    },
  ].filter((item) => item.visible);

  const activeTitle =
    navItems.find((i) => location.pathname.startsWith(i.to))?.label ?? 'MediQ Digital Forms';

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0a192f] text-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/brand/mediq-logo-white.png"
            alt="MediQ Pharma"
            className="h-8 w-auto object-contain"
          />
          <div className="border-l border-white/15 pl-3">
            <p className="text-[10px] font-bold tracking-widest text-sky-400 uppercase">
              Paperless Portal
            </p>
            <p className="text-xs font-semibold text-white/90">Employee Forms</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Quick File CTA */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onQuickNewForm();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-950/40 transition hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          New Digital Form
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Workspaces
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2.5 transition ${
                  isActive
                    ? 'bg-white/12 text-white shadow-xs ring-1 ring-white/15'
                    : 'text-slate-300 hover:bg-white/6 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} />
                <div>
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </div>
              {item.badge > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Live Sync & User Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          Real-time sync active
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{profile.full_name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {profile.employee_code} · {profile.department}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-68 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-72 shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 sm:text-base">{activeTitle}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                MediQ Pharma Digital Forms · Instant Paperless Approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RoleBadge role={profile.role} />
            <button
              type="button"
              onClick={onQuickNewForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a192f] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">File Digital Form</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
