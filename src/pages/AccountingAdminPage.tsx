import { useMemo, useState } from 'react';
import {
  Receipt,
  Banknote,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  UserCircle2,
} from 'lucide-react';
import { formatPHP } from '../lib/constants';
import { RequestsTable } from '../components/RequestsTable';
import { PortalShell, type PortalNavItem } from '../components/PortalShell';
import { ProfilePage } from './ProfilePage';
import type { FormRequest } from '../types/database';

interface AccountingAdminPageProps {
  requests: FormRequest[];
  onInspect: (req: FormRequest) => void;
}

export function AccountingAdminPage({ requests, onInspect }: AccountingAdminPageProps) {
  const [section, setSection] = useState<'claims' | 'overtime' | 'disbursed' | 'profile'>('claims');

  const financialRequests = useMemo(
    () => requests.filter((r) => ['reimbursement', 'cash_advance'].includes(r.request_type)),
    [requests]
  );

  const overtimeRequests = useMemo(
    () => requests.filter((r) => r.request_type === 'overtime'),
    [requests]
  );

  const disbursedRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          ['reimbursement', 'cash_advance', 'overtime'].includes(r.request_type) &&
          r.status === 'paid'
      ),
    [requests]
  );

  const pendingVerifyCount = financialRequests.filter(
    (r) => r.accounting_status === 'pending' && !['rejected', 'cancelled'].includes(r.status)
  ).length;

  const pendingOtPayroll = overtimeRequests.filter(
    (r) => r.accounting_status === 'pending' && !['rejected', 'cancelled'].includes(r.status)
  ).length;

  const readyToDisbursePhp = financialRequests
    .filter((r) => ['approved', 'accounting_verified'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const totalDisbursedPhp = financialRequests
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const approvedOtHours = overtimeRequests
    .filter((r) => ['approved', 'paid'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.total_hours ?? 0), 0);

  const navItems: PortalNavItem[] = [
    {
      id: 'claims',
      label: 'Reimbursements & CA',
      sub: 'Receipts & payout release',
      icon: Receipt,
      badge: pendingVerifyCount,
    },
    {
      id: 'overtime',
      label: 'Overtime Payroll',
      sub: 'Approved OT hours queue',
      icon: Clock,
      badge: pendingOtPayroll,
    },
    {
      id: 'disbursed',
      label: 'Disbursed Ledger',
      sub: 'Paid records & OR refs',
      icon: FileSpreadsheet,
    },
    {
      id: 'profile',
      label: 'Finance Signature',
      sub: 'Accounting approval stamp',
      icon: UserCircle2,
    },
  ];

  return (
    <PortalShell
      portal="accounting"
      portalName="Accounting Admin"
      portalTagline="Finance & Payroll"
      navItems={navItems}
      activeNavId={section}
      onSelectNav={(id) => setSection(id as typeof section)}
    >
      {section === 'profile' ? (
        <ProfilePage />
      ) : (
        <div className="space-y-6">
          {/* Finance Header */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-950 via-teal-950 to-[#0a192f] p-6 text-white shadow-sm">
            <p className="text-[11px] font-bold tracking-widest text-emerald-300 uppercase">
              Accounting & Finance Admin Portal
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">
              Reimbursements, Cash Advances & OT Payroll
            </h2>
            <p className="mt-1 text-xs text-emerald-100/80 sm:text-sm">
              Inspect uploaded Official Receipts, verify claim amounts, record disbursement
              reference numbers, and export approved overtime payroll sheets.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-[11px] font-semibold uppercase">To Verify</span>
                  <Receipt className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-amber-300">
                  {pendingVerifyCount}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-[11px] font-semibold uppercase">Ready to Release</span>
                  <Banknote className="h-4 w-4 text-sky-300" />
                </div>
                <p className="mt-1.5 truncate text-xl font-extrabold text-sky-300">
                  {formatPHP(readyToDisbursePhp)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-[11px] font-semibold uppercase">Total Disbursed</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-1.5 truncate text-xl font-extrabold text-emerald-300">
                  {formatPHP(totalDisbursedPhp)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-[11px] font-semibold uppercase">Payroll OT Hours</span>
                  <Clock className="h-4 w-4 text-indigo-300" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold">{approvedOtHours.toFixed(1)} hrs</p>
              </div>
            </div>
          </div>

          {/* Financial Disbursement Pipeline Strip */}
          {section === 'claims' && financialRequests.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                  Disbursement Cashflow Pipeline (PHP)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Total Tracked: {formatPHP(readyToDisbursePhp + totalDisbursedPhp)}
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${
                      readyToDisbursePhp + totalDisbursedPhp > 0
                        ? (totalDisbursedPhp / (readyToDisbursePhp + totalDisbursedPhp)) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-sky-500 transition-all"
                  style={{
                    width: `${
                      readyToDisbursePhp + totalDisbursedPhp > 0
                        ? (readyToDisbursePhp / (readyToDisbursePhp + totalDisbursedPhp)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Disbursed / Paid:{' '}
                  <strong className="text-slate-900">{formatPHP(totalDisbursedPhp)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Ready to Release:{' '}
                  <strong className="text-slate-900">{formatPHP(readyToDisbursePhp)}</strong>
                </span>
              </div>
            </div>
          )}

          {section === 'claims' && (
            <RequestsTable
              requests={financialRequests}
              allowedTypes={['reimbursement', 'cash_advance']}
              csvFilename="mediq-reimbursements-cash-advances.csv"
              emptyMessage="No reimbursement or cash advance forms submitted yet."
              onInspect={onInspect}
            />
          )}

          {section === 'overtime' && (
            <RequestsTable
              requests={overtimeRequests}
              allowedTypes={['overtime']}
              csvFilename="mediq-overtime-payroll.csv"
              emptyMessage="No overtime forms submitted yet."
              onInspect={onInspect}
            />
          )}

          {section === 'disbursed' && (
            <RequestsTable
              requests={disbursedRequests}
              allowedTypes={['reimbursement', 'cash_advance', 'overtime']}
              csvFilename="mediq-disbursement-ledger.csv"
              emptyMessage="No disbursed or paid records yet."
              onInspect={onInspect}
            />
          )}
        </div>
      )}
    </PortalShell>
  );
}
