import { Megaphone, Pin, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { REQUEST_TYPE_META, formatDate, formatPHP } from '../lib/constants';
import { RequestTypeIcon } from '../components/StatusBadges';
import { RequestsTable } from '../components/RequestsTable';
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
  const { profile, leaveBalance } = useAuth();

  const pendingCount = myRequests.filter((r) =>
    ['pending', 'hr_endorsed', 'accounting_verified'].includes(r.status)
  ).length;
  const approvedCount = myRequests.filter((r) => ['approved', 'paid'].includes(r.status)).length;
  const reimbursedTotal = myRequests
    .filter((r) => r.request_type === 'reimbursement' && r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const vlTotal = Number(leaveBalance?.vacation_total ?? 15);
  const vlUsed = Number(leaveBalance?.vacation_used ?? 0);
  const slTotal = Number(leaveBalance?.sick_total ?? 15);
  const slUsed = Number(leaveBalance?.sick_used ?? 0);
  const elTotal = Number(leaveBalance?.emergency_total ?? 5);
  const elUsed = Number(leaveBalance?.emergency_used ?? 0);

  return (
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
              Choose a digital form below to file instantly—no pen or paper needed. HR, Boss, and
              Accounting receive it immediately.
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
        {/* Annual Leave Credits */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                My {new Date().getFullYear()} Leave Credits
              </h3>
              <p className="text-xs text-slate-500">
                Automatically updated when your digital leave form is approved.
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
              { label: 'Vacation Leave (VL)', total: vlTotal, used: vlUsed, bar: 'bg-sky-500' },
              { label: 'Sick Leave (SL)', total: slTotal, used: slUsed, bar: 'bg-emerald-500' },
              { label: 'Emergency Leave (EL)', total: elTotal, used: elUsed, bar: 'bg-amber-500' },
            ].map((item) => {
              const rem = Math.max(0, item.total - item.used);
              const pct = item.total > 0 ? Math.min(100, (rem / item.total) * 100) : 0;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                >
                  <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-900">{rem}</span>
                    <span className="text-xs text-slate-500">/ {item.total} days left</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${item.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">Used: {item.used} days</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Announcements */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-extrabold text-slate-900">HR & Admin Memos</h3>
          </div>
          <div className="mt-3 space-y-2.5">
            {announcements.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                No memos posted yet. HR, Boss, or Accounting can publish announcements here.
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

      {/* My Submitted Digital Forms */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">My Submitted Digital Forms</h3>
            <p className="text-xs text-slate-500">
              Click any row to open your official signed form slip or download/print PDF.
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
  );
}
