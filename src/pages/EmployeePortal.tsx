import { useState } from 'react';
import {
  Megaphone,
  Pin,
  ArrowUpRight,
  LayoutDashboard,
  FileText,
  CalendarDays,
  UserCircle2,
  Plus,
} from 'lucide-react';
import { useAppData } from '../contexts/DataContext';
import { REQUEST_TYPE_META, formatDate, formatPHP } from '../lib/constants';
import { RequestTypeIcon } from '../components/StatusBadges';
import { RequestsTable } from '../components/RequestsTable';
import { PortalShell, type PortalNavItem } from '../components/PortalShell';
import { ProfilePage } from './ProfilePage';
import type { Announcement, FormRequest, RequestType } from '../types/database';

interface EmployeePortalProps {
  myRequests: FormRequest[];
  announcements: Announcement[];
  onOpenNewForm: (type: RequestType) => void;
  onInspect: (req: FormRequest) => void;
}

const QUICK_FORMS: RequestType[] = [
  'leave',
  'overtime',
  'reimbursement',
  'official_business',
  'cash_advance',
  'other',
];

export function EmployeePortal({
  myRequests,
  announcements,
  onOpenNewForm,
  onInspect,
}: EmployeePortalProps) {
  const { activeProfile: profile } = useAppData();
  const [section, setSection] = useState<'overview' | 'forms' | 'leave' | 'profile'>('overview');

  const pendingCount = myRequests.filter((r) =>
    ['pending', 'hr_endorsed', 'accounting_verified'].includes(r.status)
  ).length;
  const approvedCount = myRequests.filter((r) => ['approved', 'paid'].includes(r.status)).length;
  const reimbursedTotal = myRequests
    .filter((r) => r.request_type === 'reimbursement' && r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const leaveRequests = myRequests.filter((r) => r.request_type === 'leave');
  const sumApprovedLeave = (subtype: string) =>
    leaveRequests
      .filter((r) => r.subtype === subtype && r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.total_days ?? 0), 0);

  const vlTaken = sumApprovedLeave('vacation');
  const slTaken = sumApprovedLeave('sick');
  const elTaken = sumApprovedLeave('emergency');
  const totalLeaveTaken = leaveRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.total_days ?? 0), 0);

  const navItems: PortalNavItem[] = [
    {
      id: 'overview',
      label: 'Employee Home',
      sub: 'File digital forms & memos',
      icon: LayoutDashboard,
    },
    {
      id: 'forms',
      label: 'My Submitted Forms',
      sub: 'Track live status & PDF slips',
      icon: FileText,
      badge: pendingCount,
    },
    {
      id: 'leave',
      label: 'My Leave History',
      sub: 'Filed & approved leave days',
      icon: CalendarDays,
    },
    {
      id: 'profile',
      label: 'Profile & E-Signature',
      sub: 'Saved digital signature',
      icon: UserCircle2,
    },
  ];

  const LeaveCreditsCards = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            My {new Date().getFullYear()} Approved Leave Summary
          </h3>
          <p className="text-xs text-slate-500">
            Tracks the exact leave days you filed and had approved ({totalLeaveTaken}{' '}
            {totalLeaveTaken === 1 ? 'day' : 'days'} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenNewForm('leave')}
          className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
        >
          Request Leave
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Vacation Leave (VL)', taken: vlTaken, accent: 'text-sky-700' },
          { label: 'Sick Leave (SL)', taken: slTaken, accent: 'text-emerald-700' },
          { label: 'Emergency Leave (EL)', taken: elTaken, accent: 'text-amber-700' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
          >
            <p className="text-xs font-semibold text-slate-600">{item.label}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold ${item.accent}`}>{item.taken}</span>
              <span className="text-xs text-slate-500">
                {item.taken === 1 ? 'day taken' : 'days taken'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <PortalShell
      portal="employee"
      portalName="Employee Portal"
      portalTagline="Staff Self-Service"
      navItems={navItems}
      activeNavId={section}
      onSelectNav={(id) => setSection(id as typeof section)}
      primaryAction={{
        label: 'File Leave Form',
        mobileLabel: 'Leave',
        icon: Plus,
        onClick: () => onOpenNewForm('leave'),
      }}
    >
      {section === 'overview' && (
        <div className="space-y-6">
          {/* Greeting Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a192f] via-[#0f294a] to-[#0c4a6e] p-6 text-white shadow-md">
            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
                  Paperless Employee Self-Service
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                  Hello, {profile?.full_name?.split(' ')[0]}
                </h2>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                  Choose a digital form below to file instantly—no pen or paper needed. HR, Boss,
                  and Accounting receive it immediately.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-center sm:min-w-[290px]">
                <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-xs">
                  <p className="text-lg font-extrabold text-amber-300">{pendingCount}</p>
                  <p className="text-[10px] font-semibold text-slate-200 uppercase">In Review</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-xs">
                  <p className="text-lg font-extrabold text-emerald-300">{approvedCount}</p>
                  <p className="text-[10px] font-semibold text-slate-200 uppercase">Approved</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-xs">
                  <p className="truncate text-sm font-extrabold text-sky-300">
                    {reimbursedTotal > 0 ? formatPHP(reimbursedTotal) : '₱0'}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-200 uppercase">Paid Out</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Digital Form Cards */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">File a New Digital Form</h3>
              <span className="text-xs text-slate-500">Click any form to sign & submit</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_FORMS.map((type) => {
                const meta = REQUEST_TYPE_META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onOpenNewForm(type)}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${meta.bgSoft}`}
                      >
                        <RequestTypeIcon type={type} className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700">
                          {meta.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {meta.description}
                        </p>
                        <p className="mt-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {meta.formCode} · Routed to {meta.routedTo}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-sky-600" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leave Credits + Company Announcements */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LeaveCreditsCards />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900">HR & Admin Memos</h3>
              </div>
              <div className="mt-3 space-y-2.5">
                {announcements.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                    No memos posted yet.
                  </p>
                ) : (
                  announcements.slice(0, 4).map((ann) => (
                    <div
                      key={ann.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                        {ann.is_pinned && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{ann.body}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {ann.author?.full_name ?? 'Admin'} · {formatDate(ann.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Submissions */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">My Submitted Digital Forms</h3>
                <p className="text-xs text-slate-500">
                  Click any row to open your official signed form slip or Print / Save PDF.
                </p>
              </div>
            </div>
            <RequestsTable
              requests={myRequests}
              showEmployeeColumn={false}
              csvFilename="my-mediq-forms.csv"
              emptyMessage="You haven't submitted any digital forms yet. Pick a form above to start!"
              onInspect={onInspect}
            />
          </div>
        </div>
      )}

      {section === 'forms' && (
        <RequestsTable
          requests={myRequests}
          showEmployeeColumn={false}
          csvFilename="my-mediq-forms.csv"
          emptyMessage="You haven't submitted any digital forms yet."
          onInspect={onInspect}
        />
      )}

      {section === 'leave' && (
        <div className="space-y-6">
          <LeaveCreditsCards />
          <RequestsTable
            requests={leaveRequests}
            showEmployeeColumn={false}
            allowedTypes={['leave']}
            csvFilename="my-leave-requests.csv"
            emptyMessage="No leave applications filed yet."
            onInspect={onInspect}
          />
        </div>
      )}

      {section === 'profile' && <ProfilePage />}
    </PortalShell>
  );
}
