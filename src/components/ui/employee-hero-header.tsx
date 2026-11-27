import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  PenTool,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPHP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

interface EmployeeHeroHeaderProps {
  profile: Profile | null;
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  totalLeaveTaken: number;
  reimbursedTotal: number;
  onGoToForms: () => void;
  onGoToLeave: () => void;
  onGoToProfile: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string | null): string {
  if (!name) return 'MQ';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function EmployeeHeroHeader({
  profile,
  totalRequests,
  pendingCount,
  approvedCount,
  totalLeaveTaken,
  reimbursedTotal,
  onGoToForms,
  onGoToLeave,
  onGoToProfile,
}: EmployeeHeroHeaderProps) {
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Team Member';
  const hasSignature = Boolean(profile?.signature_data);
  const currentYear = new Date().getFullYear();
  const approvalRate =
    totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : null;

  const todayDisplay = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const stats = [
    {
      id: 'in-review',
      label: 'In Review',
      value: String(pendingCount),
      unit: null,
      sub: 'Awaiting HR, Boss, or Acct.',
      pill: pendingCount > 0 ? 'Active' : 'All clear',
      pillClass:
        pendingCount > 0
          ? 'bg-amber-50 text-amber-700 border-amber-200/80'
          : 'bg-slate-100 text-slate-600 border-slate-200/80',
      icon: Clock3,
      iconWrap: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/70',
      onClick: onGoToForms,
    },
    {
      id: 'approved',
      label: 'Approved Forms',
      value: String(approvedCount),
      unit: null,
      sub:
        totalRequests > 0
          ? `Out of ${totalRequests} submitted`
          : 'Digitally signed & cleared',
      pill: approvalRate !== null ? `${approvalRate}% cleared` : 'Ready',
      pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      icon: CheckCircle2,
      iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70',
      onClick: onGoToForms,
    },
    {
      id: 'leave-taken',
      label: 'Approved Leave',
      value: String(totalLeaveTaken),
      unit: totalLeaveTaken === 1 ? 'day' : 'days',
      sub: `Recorded in ${currentYear}`,
      pill: `${currentYear} YTD`,
      pillClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
      icon: CalendarDays,
      iconWrap: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200/70',
      onClick: onGoToLeave,
    },
    {
      id: 'paid-out',
      label: 'Paid Out',
      value: reimbursedTotal > 0 ? formatPHP(reimbursedTotal) : '₱0',
      unit: null,
      sub: 'Accounting reimbursements',
      pill: reimbursedTotal > 0 ? 'Disbursed' : 'No payouts',
      pillClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
      icon: Wallet,
      iconWrap: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/70',
      onClick: onGoToForms,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      {/* Subtle 21st.dev Brand Hairline Accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500" />

      {/* Top Identity & Quick Controls Band */}
      <div className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        {/* Soft Airy Light-Mode Radial Wash + Corner Micro-Dots */}
        <div
          className="pointer-events-none absolute -top-24 right-0 h-64 w-96 opacity-75"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.10), rgba(99, 102, 241, 0.04) 45%, transparent 72%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-72 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(rgba(15, 23, 42, 0.09) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Left: Avatar + Greeting + Clean Metadata */}
          <div className="flex items-start gap-4 sm:items-center">
            <div className="relative shrink-0">
              <Avatar className="size-12 border border-sky-200/80 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-2xs">
                <AvatarFallback className="bg-gradient-to-br from-sky-500/15 to-cyan-500/15 text-sm font-bold text-sky-800">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span
                title="Live Supabase Sync Active"
                className="absolute right-0 bottom-0 flex size-3.5 items-center justify-center rounded-full bg-card ring-2 ring-card"
              >
                <span className="size-2 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                  <span className="size-1.5 rounded-full bg-sky-500" />
                  Paperless Self-Service
                </span>
                <span aria-hidden="true" className="text-border">
                  ·
                </span>
                <span>{todayDisplay}</span>
              </div>

              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {getGreeting()}, {firstName}
              </h2>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {profile?.employee_code && (
                  <Badge
                    variant="outline"
                    className="rounded-md bg-muted/60 px-2 py-0 font-mono text-[11px] font-semibold text-foreground"
                  >
                    {profile.employee_code}
                  </Badge>
                )}
                {profile?.department && (
                  <span className="font-medium text-foreground/80">
                    {profile.department}
                  </span>
                )}
                {profile?.position && (
                  <>
                    <span aria-hidden="true" className="text-border">
                      •
                    </span>
                    <span className="uppercase">{profile.position}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Functional Status + Quick Navigation Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onGoToProfile}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer',
                hasSignature
                  ? 'border-emerald-200/90 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
                  : 'border-amber-200/90 bg-amber-50/80 text-amber-800 hover:bg-amber-100/80'
              )}
            >
              <PenTool className="size-3.5" />
              {hasSignature ? 'E-Signature Ready' : 'Setup E-Signature'}
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGoToForms}
              className="h-9 gap-1.5 rounded-lg px-3.5 text-xs font-semibold cursor-pointer"
            >
              <FileText className="size-3.5 text-muted-foreground" />
              My Submissions
              <Badge
                variant="secondary"
                className="ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums"
              >
                {totalRequests}
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Unified 4-Column Hairline KPI Stat Strip */}
      <div className="grid grid-cols-2 gap-px border-t border-border bg-border/75 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.id}
              type="button"
              onClick={stat.onClick}
              className="group relative flex flex-col justify-between bg-card px-4 py-4 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5 cursor-pointer"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </span>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                    stat.iconWrap
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-[26px]">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    stat.pillClass
                  )}
                >
                  {stat.pill}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                <span className="truncate">{stat.sub}</span>
                <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
