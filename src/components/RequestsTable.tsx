import { useMemo, useState } from 'react';
import { Search, Download, Eye, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import {
  REQUEST_TYPE_META,
  exportRequestsToCsv,
  formatDate,
  formatPHP,
  getSubtypeLabel,
} from '../lib/constants';
import { RequestTypeBadge, StatusBadge, StepPill } from './StatusBadges';
import type { FormRequest, RequestStatus, RequestType } from '../types/database';

interface RequestsTableProps {
  requests: FormRequest[];
  showEmployeeColumn?: boolean;
  allowedTypes?: RequestType[];
  emptyMessage?: string;
  csvFilename?: string;
  onInspect: (req: FormRequest) => void;
}

export function RequestsTable({
  requests,
  showEmployeeColumn = true,
  allowedTypes,
  emptyMessage = 'No digital forms match your current filters.',
  csvFilename = 'mediq-digital-forms.csv',
  onInspect,
}: RequestsTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const typeChoices: RequestType[] = allowedTypes ?? [
    'leave',
    'overtime',
    'reimbursement',
    'official_business',
    'cash_advance',
    'other',
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (typeFilter !== 'all' && r.request_type !== typeFilter) return false;
      if (statusFilter === 'open') {
        if (!['pending', 'hr_endorsed', 'accounting_verified'].includes(r.status)) return false;
      } else if (statusFilter !== 'all' && r.status !== (statusFilter as RequestStatus)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        r.reference_no,
        r.title,
        r.description,
        r.employee?.full_name,
        r.employee?.department,
        r.employee?.employee_code,
        r.receipt_or_number,
        r.disbursement_reference,
        r.destination,
        r.client_or_hospital,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search, typeFilter, statusFilter]);

  const handleExport = () => {
    exportRequestsToCsv(
      csvFilename,
      filtered.map((r) => ({
        reference_no: r.reference_no,
        employee_name: r.employee?.full_name ?? '',
        employee_code: r.employee?.employee_code ?? '',
        department: r.employee?.department ?? '',
        request_type: REQUEST_TYPE_META[r.request_type].label,
        subtype: getSubtypeLabel(r.request_type, r.subtype),
        title: r.title,
        status: r.status,
        start_date: r.start_date ?? r.expense_date ?? '',
        end_date: r.end_date ?? '',
        total_days: r.total_days != null ? String(r.total_days) : '',
        total_hours: r.total_hours != null ? String(r.total_hours) : '',
        amount: r.amount != null ? String(r.amount) : '',
        receipt_or_number: r.receipt_or_number ?? '',
        disbursement_reference: r.disbursement_reference ?? '',
        created_at: r.created_at,
      }))
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference #, employee, subject, OR #, hospital..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeChoices.length > 1 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All Form Types</option>
              {typeChoices.map((t) => (
                <option key={t} value={t}>
                  {REQUEST_TYPE_META[t].shortLabel}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Pending / In Review</option>
            <option value="pending">Pending Only</option>
            <option value="hr_endorsed">HR Endorsed</option>
            <option value="accounting_verified">Accounting Verified</option>
            <option value="approved">Approved</option>
            <option value="paid">Disbursed / Paid</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">{emptyMessage}</p>
          <p className="mt-1 text-xs text-slate-400">
            New submissions appear here automatically in real time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Ref # & Form</th>
                {showEmployeeColumn && <th className="px-4 py-3">Employee</th>}
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Dates / Value</th>
                <th className="px-4 py-3">Approvals</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Digital Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => onInspect(req)}
                  className="cursor-pointer transition hover:bg-sky-50/40"
                >
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900">{req.reference_no}</span>
                      {req.priority === 'urgent' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      )}
                    </div>
                    <div className="mt-1.5">
                      <RequestTypeBadge type={req.request_type} />
                    </div>
                  </td>

                  {showEmployeeColumn && (
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-bold text-slate-900">
                        {req.employee?.full_name ?? 'Employee'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {req.employee?.department} · {req.employee?.employee_code}
                      </p>
                    </td>
                  )}

                  <td className="max-w-xs px-4 py-3.5 align-top">
                    <p className="truncate font-semibold text-slate-900">{req.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {getSubtypeLabel(req.request_type, req.subtype)}
                      {req.client_or_hospital ? ` · ${req.client_or_hospital}` : ''}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 align-top">
                    {req.amount != null ? (
                      <div>
                        <p className="font-bold text-emerald-700">{formatPHP(req.amount)}</p>
                        <p className="text-[11px] text-slate-500">
                          {req.expense_date ? formatDate(req.expense_date) : formatDate(req.created_at)}
                        </p>
                      </div>
                    ) : req.total_hours != null ? (
                      <div>
                        <p className="font-bold text-indigo-700">{req.total_hours} hrs</p>
                        <p className="text-[11px] text-slate-500">{formatDate(req.start_date)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-800">
                          {formatDate(req.start_date)}
                          {req.end_date && req.end_date !== req.start_date
                            ? ` → ${formatDate(req.end_date)}`
                            : ''}
                        </p>
                        {req.total_days != null && (
                          <p className="text-[11px] font-semibold text-sky-700">
                            {req.total_days} {Number(req.total_days) === 1 ? 'day' : 'days'}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      <StepPill label="HR" state={req.hr_status} />
                      <StepPill label="Boss" state={req.boss_status} />
                      <StepPill label="Acct" state={req.accounting_status} />
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 align-top">
                    <StatusBadge status={req.status} />
                    <p className="mt-1 text-[10px] text-slate-400">{formatDate(req.created_at)}</p>
                  </td>

                  <td className="px-4 py-3.5 text-right align-top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspect(req);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open Form
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
