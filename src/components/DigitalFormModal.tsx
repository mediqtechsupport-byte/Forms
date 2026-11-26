import { useEffect, useState } from 'react';
import {
  X,
  Printer,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Banknote,
  Clock,
  Paperclip,
  History,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  fetchRequestActivityLogs,
  fetchRequestAttachments,
  reviewFormRequest,
  type ReviewAction,
} from '../lib/api';
import {
  PAYMENT_METHOD_LABELS,
  REQUEST_TYPE_META,
  formatDate,
  formatDateTime,
  formatPHP,
  getSubtypeLabel,
} from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { RequestTypeBadge, StatusBadge, StepPill } from './StatusBadges';
import { SignatureDisplay } from './SignaturePad';
import type {
  FormRequest,
  RequestActivityLog,
  RequestAttachment,
  UserRole,
} from '../types/database';

interface DigitalFormModalProps {
  request: FormRequest | null;
  portalContext: UserRole;
  onClose: () => void;
  onUpdated: () => void;
}

export function DigitalFormModal({
  request,
  portalContext,
  onClose,
  onUpdated,
}: DigitalFormModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<(RequestAttachment & { signedUrl?: string })[]>(
    []
  );
  const [logs, setLogs] = useState<RequestActivityLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [submitting, setSubmitting] = useState<ReviewAction | null>(null);

  useEffect(() => {
    if (!request) return;
    setRemarks('');
    setDisbursementRef(request.disbursement_reference ?? '');
    setLoadingDetails(true);
    Promise.all([
      fetchRequestAttachments(request.id),
      fetchRequestActivityLogs(request.id),
    ])
      .then(([att, act]) => {
        setAttachments(att);
        setLogs(act);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoadingDetails(false));
  }, [request]);

  if (!request) return null;

  const meta = REQUEST_TYPE_META[request.request_type];
  const isOwner = profile?.id === request.employee_id;
  const isOpen = ['pending', 'hr_endorsed', 'accounting_verified'].includes(request.status);

  const canHrAct =
    (portalContext === 'hr' || (portalContext === 'boss' && profile?.role === 'boss')) &&
    ['hr', 'boss'].includes(profile?.role ?? '') &&
    ['leave', 'overtime', 'official_business', 'other'].includes(request.request_type) &&
    request.status !== 'cancelled';

  const canBossAct =
    portalContext === 'boss' &&
    profile?.role === 'boss' &&
    request.status !== 'cancelled';

  const canAccountingAct =
    (portalContext === 'accounting' || (portalContext === 'boss' && profile?.role === 'boss')) &&
    ['accounting', 'boss'].includes(profile?.role ?? '') &&
    ['reimbursement', 'cash_advance', 'overtime'].includes(request.request_type) &&
    request.status !== 'cancelled';

  const handleAction = async (action: ReviewAction) => {
    if (
      (action === 'hr_reject' || action === 'boss_reject' || action === 'accounting_reject') &&
      !remarks.trim()
    ) {
      toast('Remarks required', 'Please provide a brief reason when rejecting a form.', 'error');
      return;
    }

    setSubmitting(action);
    try {
      await reviewFormRequest({
        requestId: request.id,
        action,
        remarks,
        disbursementReference: disbursementRef,
      });
      toast('Digital form updated', `${request.reference_no} status has been recorded in real time.`);
      onUpdated();
      onClose();
    } catch (err) {
      toast(
        'Action failed',
        err instanceof Error ? err.message : 'Unable to update this request.',
        'error'
      );
    } finally {
      setSubmitting(null);
    }
  };

  const stampColor =
    request.status === 'approved' || request.status === 'paid'
      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/80'
      : request.status === 'rejected'
        ? 'border-rose-600 text-rose-700 bg-rose-50/80'
        : request.status === 'cancelled'
          ? 'border-slate-400 text-slate-500 bg-slate-50'
          : 'border-amber-500 text-amber-800 bg-amber-50/80';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
      <div className="print-slip-container relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Utility Bar (Hidden on Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold tracking-wider text-slate-600">
              {request.reference_no}
            </span>
            <RequestTypeBadge type={request.request_type} />
            <StatusBadge status={request.status} />
            {request.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Official Paperless Digital Document Slip */}
        <div className="p-6 sm:p-8">
          {/* Corporate Letterhead */}
          <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <img
                src="/brand/mediq-logo-dark.png"
                alt="MediQ Pharma"
                className="h-10 w-auto object-contain"
              />
              <div className="border-l border-slate-300 pl-3.5">
                <p className="text-[11px] font-bold tracking-widest text-sky-700 uppercase">
                  Official Paperless Digital Form
                </p>
                <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                  {meta.label}
                </h2>
                <p className="text-xs text-slate-500">
                  Form Code: <span className="font-mono font-semibold">{meta.formCode}</span> ·
                  Filed {formatDateTime(request.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <div
                className={`rounded-lg border-2 px-3 py-1 text-center font-mono text-xs font-extrabold tracking-widest uppercase ${stampColor}`}
              >
                {request.status.replace('_', ' ')}
              </div>
              <p className="mt-1.5 font-mono text-xs font-semibold text-slate-700">
                REF: {request.reference_no}
              </p>
            </div>
          </div>

          {/* Employee & Workflow Routing Summary */}
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Employee Name
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {request.employee?.full_name ?? 'Employee'}
              </p>
              <p className="text-xs text-slate-500">{request.employee?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Employee ID
              </p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                {request.employee?.employee_code ?? '—'}
              </p>
              <p className="text-xs text-slate-500">{request.employee?.position}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Department
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {request.employee?.department ?? '—'}
              </p>
              <p className="text-xs text-slate-500">Routed: {meta.routedTo}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Category / Subtype
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {getSubtypeLabel(request.request_type, request.subtype)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <StepPill label="HR" state={request.hr_status} />
                <StepPill label="Boss" state={request.boss_status} />
                <StepPill label="Acct" state={request.accounting_status} />
              </div>
            </div>
          </div>

          {/* Form Subject & Description */}
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Subject / Purpose
              </p>
              <h3 className="mt-0.5 text-base font-bold text-slate-900">{request.title}</h3>
              {request.description && (
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm leading-relaxed text-slate-700">
                  {request.description}
                </p>
              )}
            </div>

            {/* Structured Form Fields Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-4">
              {request.start_date && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Start Date</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(request.start_date)}
                  </p>
                </div>
              )}
              {request.end_date && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">End Date</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(request.end_date)}
                  </p>
                </div>
              )}
              {request.total_days != null && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Days</p>
                  <p className="mt-0.5 text-sm font-bold text-sky-700">
                    {request.total_days} {Number(request.total_days) === 1 ? 'day' : 'days'}
                    {request.metadata?.half_day ? ` (${request.metadata.half_day_period})` : ''}
                  </p>
                </div>
              )}
              {request.start_time && request.end_time && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Time Window</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.start_time.slice(0, 5)} – {request.end_time.slice(0, 5)}
                  </p>
                </div>
              )}
              {request.total_hours != null && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Hours</p>
                  <p className="mt-0.5 text-sm font-bold text-indigo-700">
                    {request.total_hours} hrs
                  </p>
                </div>
              )}
              {request.destination && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Destination / Location
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.destination}
                  </p>
                </div>
              )}
              {request.client_or_hospital && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Client / Hospital / Account
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.client_or_hospital}
                  </p>
                </div>
              )}
              {request.amount != null && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Amount</p>
                  <p className="mt-0.5 text-base font-extrabold text-emerald-700">
                    {formatPHP(request.amount)}
                  </p>
                </div>
              )}
              {request.expense_date && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Expense Date</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(request.expense_date)}
                  </p>
                </div>
              )}
              {request.merchant_name && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Vendor / Merchant
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.merchant_name}
                  </p>
                </div>
              )}
              {request.receipt_or_number && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Official Receipt / SI #
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                    {request.receipt_or_number}
                  </p>
                </div>
              )}
              {request.payment_method && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Preferred Payout
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {PAYMENT_METHOD_LABELS[request.payment_method] ?? request.payment_method}
                  </p>
                </div>
              )}
              {request.metadata?.bank_or_gcash_details && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Bank / GCash Payout Details
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.bank_or_gcash_details}
                  </p>
                </div>
              )}
              {request.metadata?.cover_person && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Work Handover / Reliever
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.cover_person}
                  </p>
                </div>
              )}
              {request.metadata?.contact_during_leave && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Emergency Contact While Away
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.contact_during_leave}
                  </p>
                </div>
              )}
              {request.metadata?.liquidation_date && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Target Liquidation Date
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(request.metadata.liquidation_date)}
                  </p>
                </div>
              )}
              {request.disbursement_reference && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase">
                    Disbursement / Payment Ref #
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-emerald-800">
                    {request.disbursement_reference}
                    {request.paid_at ? ` (${formatDate(request.paid_at)})` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Itemized Expense Breakdown Table (if Reimbursement / Cash Advance has items) */}
            {Array.isArray(request.metadata?.line_items) &&
              request.metadata.line_items.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Itemized Expense Breakdown
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="border-y border-slate-200 bg-white text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Item / Particulars</th>
                        <th className="px-4 py-2 font-semibold">Category</th>
                        <th className="px-4 py-2 font-semibold">OR / Ref #</th>
                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {request.metadata.line_items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-medium text-slate-800">
                            {item.description}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{item.category}</td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-600">
                            {item.receipt_no || '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900">
                            {formatPHP(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase">
                          Total Claimed Amount
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">
                          {formatPHP(request.amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

            {/* Supporting Receipts & Attachments */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-600 uppercase">
                <Paperclip className="h-3.5 w-3.5" />
                Receipts & Supporting Attachments ({attachments.length})
              </div>
              {loadingDetails ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading secure attachments...
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-xs text-slate-400">No files attached to this form.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {attachments.map((att) => {
                    const isImage = att.mime_type.startsWith('image/');
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                      >
                        {isImage && att.signedUrl ? (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                          >
                            <img
                              src={att.signedUrl}
                              alt={att.file_name}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-600">
                            <FileText className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {att.file_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(att.file_size / 1024).toFixed(1)} KB
                          </p>
                          {att.signedUrl && (
                            <a
                              href={att.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="no-print mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
                            >
                              View / Download
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Official Digital Signatures & Approval Blocks */}
            <div className="pt-2">
              <p className="mb-2.5 text-xs font-bold tracking-wider text-slate-600 uppercase">
                Official Digital Sign-Offs
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Employee Signature */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Requested By
                  </p>
                  <div className="my-3 flex min-h-12 items-center justify-center border-b border-slate-200 pb-2">
                    <SignatureDisplay
                      signature={
                        request.metadata?.employee_signature || request.employee?.signature_data
                      }
                      fallbackName={request.employee?.full_name}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {request.employee?.full_name}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDateTime(request.created_at)}</p>
                  </div>
                </div>

                {/* 2. HR Block */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-bold tracking-wider text-violet-700 uppercase">
                    HR Review
                  </p>
                  <div className="my-3 flex min-h-12 items-center justify-center border-b border-slate-200 pb-2">
                    {request.hr_status === 'not_required' ? (
                      <span className="text-xs text-slate-400">Not Required</span>
                    ) : request.hr_reviewed_by ? (
                      <SignatureDisplay
                        signature={request.hr_reviewer?.signature_data}
                        fallbackName={request.hr_reviewer?.full_name}
                      />
                    ) : (
                      <span className="text-xs text-amber-600 italic">Pending HR</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {request.hr_reviewer?.full_name ??
                        (request.hr_status === 'not_required' ? '—' : 'Awaiting HR')}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {request.hr_status.replace('_', ' ')}
                      {request.hr_reviewed_at ? ` · ${formatDate(request.hr_reviewed_at)}` : ''}
                    </p>
                    {request.hr_remarks && (
                      <p className="mt-1 rounded bg-violet-50 px-2 py-1 text-[11px] text-violet-900">
                        “{request.hr_remarks}”
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Boss Block */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                    Boss Executive Sign-Off
                  </p>
                  <div className="my-3 flex min-h-12 items-center justify-center border-b border-slate-200 pb-2">
                    {request.boss_reviewed_by ? (
                      <SignatureDisplay
                        signature={request.boss_reviewer?.signature_data}
                        fallbackName={request.boss_reviewer?.full_name}
                      />
                    ) : (
                      <span className="text-xs text-amber-600 italic">Pending Boss</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {request.boss_reviewer?.full_name ?? 'Awaiting Boss'}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {request.boss_status.replace('_', ' ')}
                      {request.boss_reviewed_at ? ` · ${formatDate(request.boss_reviewed_at)}` : ''}
                    </p>
                    {request.boss_remarks && (
                      <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                        “{request.boss_remarks}”
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Accounting Block */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                    Accounting / Finance
                  </p>
                  <div className="my-3 flex min-h-12 items-center justify-center border-b border-slate-200 pb-2">
                    {request.accounting_status === 'not_required' ? (
                      <span className="text-xs text-slate-400">Not Required</span>
                    ) : request.accounting_reviewed_by ? (
                      <SignatureDisplay
                        signature={request.accounting_reviewer?.signature_data}
                        fallbackName={request.accounting_reviewer?.full_name}
                      />
                    ) : (
                      <span className="text-xs text-amber-600 italic">Pending Accounting</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {request.accounting_reviewer?.full_name ??
                        (request.accounting_status === 'not_required' ? '—' : 'Awaiting Finance')}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {request.accounting_status.replace('_', ' ')}
                      {request.accounting_reviewed_at
                        ? ` · ${formatDate(request.accounting_reviewed_at)}`
                        : ''}
                    </p>
                    {request.accounting_remarks && (
                      <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900">
                        “{request.accounting_remarks}”
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Role Action Panel (Hidden on Print) */}
          {(canHrAct || canBossAct || canAccountingAct || (isOwner && isOpen)) && (
            <div className="no-print mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                {portalContext === 'boss'
                  ? 'Boss Executive Action'
                  : portalContext === 'hr'
                    ? 'HR Admin Action'
                    : portalContext === 'accounting'
                      ? 'Accounting / Disbursement Action'
                      : 'Requester Action'}
              </p>

              {(canHrAct || canBossAct || canAccountingAct) && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={canAccountingAct ? '' : 'sm:col-span-2'}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Remarks / Notes (required when rejecting)
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add approval note, payroll cutoff, or reason..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                    />
                  </div>
                  {canAccountingAct && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Disbursement / Check / Bank Ref # (for Paid)
                      </label>
                      <input
                        type="text"
                        value={disbursementRef}
                        onChange={(e) => setDisbursementRef(e.target.value)}
                        placeholder="e.g., BPI-20261126-8841 or CHK-00412"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {canBossAct && (
                  <>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('boss_approve')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {submitting === 'boss_approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve (Executive Sign-Off)
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('boss_reject')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      {submitting === 'boss_reject' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject Request
                    </button>
                  </>
                )}

                {portalContext === 'hr' && canHrAct && (
                  <>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('hr_endorse')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-violet-700 disabled:opacity-60"
                    >
                      {submitting === 'hr_endorse' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Endorse to Boss
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('hr_approve')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {submitting === 'hr_approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve (HR)
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('hr_reject')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}

                {portalContext === 'accounting' && canAccountingAct && (
                  <>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('accounting_verify')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-cyan-700 disabled:opacity-60"
                    >
                      {submitting === 'accounting_verify' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Verify Receipts
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('accounting_pay')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {submitting === 'accounting_pay' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Banknote className="h-4 w-4" />
                      )}
                      Mark Disbursed / Paid
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('accounting_reject')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Claim
                    </button>
                  </>
                )}

                {portalContext === 'employee' && isOwner && isOpen && (
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => handleAction('cancel')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel My Request
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Immutable Audit History */}
          <div className="no-print mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-600 uppercase">
              <History className="h-3.5 w-3.5" />
              Approval & Activity Audit Trail
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-2.5 border-l-2 border-slate-200 pl-4">
                {logs.map((log) => (
                  <li key={log.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900">{log.actor_name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                        {log.actor_role}
                      </span>
                      <span className="font-semibold text-sky-700 capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    {log.remarks && (
                      <p className="mt-0.5 text-slate-600">{log.remarks}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
