import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Radio, type LucideIcon } from 'lucide-react';
import { useAppData } from '../contexts/DataContext';
import { RoleBadge } from './StatusBadges';
import type { UserRole } from '../types/database';

export interface PortalNavItem {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  badge?: number;
}

interface PortalShellProps {
  portal: UserRole;
  portalName: string;
  portalTagline: string;
  navItems: PortalNavItem[];
  activeNavId: string;
  onSelectNav: (id: string) => void;
  primaryAction?: {
    label: string;
    mobileLabel?: string;
    icon: LucideIcon;
    onClick: () => void;
  };
  children: React.ReactNode;
}

const PORTAL_THEMES: Record<
  UserRole,
  {
    sidebarBg: string;
    taglineColor: string;
    activeNav: string;
    iconActive: string;
    primaryBtn: string;
    mobileActive: string;
  }
> = {
  employee: {
    sidebarBg: 'bg-[#071629]',
    taglineColor: 'text-sky-400',
    activeNav: 'bg-sky-500/18 text-white ring-1 ring-sky-400/30',
    iconActive: 'text-sky-400',
    primaryBtn: 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-950/50',
    mobileActive: 'text-sky-600',
  },
  boss: {
    sidebarBg: 'bg-[#0b1120]',
    taglineColor: 'text-amber-400',
    activeNav: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/35',
    iconActive: 'text-amber-400',
    primaryBtn: 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-950/40',
    mobileActive: 'text-amber-600',
  },
  hr: {
    sidebarBg: 'bg-[#170f2e]',
    taglineColor: 'text-violet-300',
    activeNav: 'bg-violet-500/20 text-white ring-1 ring-violet-400/35',
    iconActive: 'text-violet-300',
    primaryBtn: 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-950/50',
    mobileActive: 'text-violet-600',
  },
  accounting: {
    sidebarBg: 'bg-[#06211c]',
    taglineColor: 'text-emerald-300',
    activeNav: 'bg-emerald-500/20 text-white ring-1 ring-emerald-400/35',
    iconActive: 'text-emerald-300',
    primaryBtn: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-950/50',
    mobileActive: 'text-emerald-600',
  },
};

export function PortalShell({
  portal,
  portalName,
  portalTagline,
  navItems,
  activeNavId,
  onSelectNav,
  primaryAction,
  children,
}: PortalShellProps) {
  const navigate = useNavigate();
  const { activeProfile: profile, logoutAll } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile) return null;

  const theme = PORTAL_THEMES[portal];
  const activeItem = navItems.find((i) => i.id === activeNavId) ?? navItems[0];
  const PrimaryIcon = primaryAction?.icon;

  const handleSignOut = async () => {
    await logoutAll();
    navigate('/', { replace: true });
  };

  const SidebarBody = () => (
    <div className={`flex h-full flex-col text-white ${theme.sidebarBg}`}>
      {/* Brand + Portal Identity */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="./brand/mediq-logo-white.png"
            alt="MediQ Pharma"
            className="h-8 w-auto object-contain"
          />
          <div className="border-l border-white/15 pl-3">
            <p className={`text-[10px] font-bold tracking-widest uppercase ${theme.taglineColor}`}>
              {portalTagline}
            </p>
            <p className="text-xs font-extrabold text-white">{portalName}</p>
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

      {/* Optional Portal Primary Action */}
      {primaryAction && PrimaryIcon && (
        <div className="p-4 pb-2">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              primaryAction.onClick();
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md transition ${theme.primaryBtn}`}
          >
            <PrimaryIcon className="h-4 w-4" />
            {primaryAction.label}
          </button>
        </div>
      )}

      {/* Portal-ONLY Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          {portalName} Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeNavId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectNav(item.id);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                isActive ? theme.activeNav : 'text-slate-300 hover:bg-white/7 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? theme.iconActive : 'text-slate-400'}`}
                />
                <div>
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
              </div>
              {item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Sync & Sign Out */}
      <div className="space-y-2.5 border-t border-white/10 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20">
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          Live Supabase Sync
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{profile.full_name}</p>
            <p className="truncate text-[11px] text-slate-400">
              {profile.employee_code} · {profile.position}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-rose-500/25 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 pb-16 lg:pb-0">
      {/* Desktop Dedicated Portal Sidebar */}
      <aside className="no-print hidden w-68 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarBody />
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
            <SidebarBody />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                {activeItem?.label ?? portalName}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                {portalName} · {activeItem?.sub ?? portalTagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <RoleBadge role={portal} />
            {primaryAction && PrimaryIcon && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a192f] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:px-4"
              >
                <PrimaryIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{primaryAction.label}</span>
                <span className="sm:hidden">{primaryAction.mobileLabel ?? 'Action'}</span>
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile Bottom Nav scoped strictly to THIS portal */}
      <nav className="no-print fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeNavId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-bold ${
                isActive ? theme.mobileActive : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-[70px] truncate">{item.label.split(' ')[0]}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
