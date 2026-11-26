import {
  CalendarDays,
  Clock,
  Receipt,
  Briefcase,
  Banknote,
  FileText,
  CheckCircle2,
  XCircle,
  Hourglass,
  BadgeCheck,
  Minus,
} from 'lucide-react';
import { REQUEST_TYPE_META, STATUS_META, ROLE_META } from '../lib/constants';
import type {
  AccountingStatus,
  BossStatus,
  HrStatus,
  RequestStatus,
  RequestType,
  UserRole,
} from '../types/database';

export function RequestTypeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: RequestType;
  className?: string;
}) {
  switch (type) {
    case 'leave':
      return <CalendarDays className={className} />;
    case 'overtime':
      return <Clock className={className} />;
    case 'reimbursement':
      return <Receipt className={className} />;
    case 'official_business':
      return <Briefcase className={className} />;
    case 'cash_advance':
      return <Banknote className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export function RequestTypeBadge({ type }: { type: RequestType }) {
  const meta = REQUEST_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.colorClass}`}
    >
      <RequestTypeIcon type={type} className="h-3.5 w-3.5" />
      {meta.shortLabel}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
    >
      {meta.shortLabel}
    </span>
  );
}

export function StepPill({
  label,
  state,
}: {
  label: string;
  state: HrStatus | BossStatus | AccountingStatus;
}) {
  if (state === 'not_required') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400">
        <Minus className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (state === 'approved' || state === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
        <CheckCircle2 className="h-3 w-3" />
        {label}: {state === 'paid' ? 'Paid' : 'Approved'}
      </span>
    );
  }
  if (state === 'endorsed' || state === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200/70">
        <BadgeCheck className="h-3 w-3" />
        {label}: {state === 'endorsed' ? 'Endorsed' : 'Verified'}
      </span>
    );
  }
  if (state === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200/70">
        <XCircle className="h-3 w-3" />
        {label}: Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200/70">
      <Hourglass className="h-3 w-3" />
      {label}: Pending
    </span>
  );
}
