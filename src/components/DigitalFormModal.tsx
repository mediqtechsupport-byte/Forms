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
  Check,
  Lock,
} from 'lucide-react';
import type { ReviewAction } from '../lib/api';
import {
  PAYMENT_METHOD_LABELS,
  REQUEST_TYPE_META,
  formatDate,
  formatDateTime,
  formatPHP,
  getBossWaitReason,
  getSubtypeLabel,
  isReadyForBoss,
} from '../lib/constants';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { RequestTypeBadge, StatusBadge } from './StatusBadges';
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
}

export function DigitalFormModal({
  request,
  portalContext,
  onClose,
}: DigitalFormModalProps) {
  const { activeProfile: profile, getAttachments, getActivityLogs, performReview } = useAppData();
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
    Promise.all([getAttachments(request.id), getActivityLogs(request.id)])
      .then(([att, act]) => {
        setAttachments(att);
        setLogs(act);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingDetails(false));
  }, [request, getAttachments, getActivityLogs]);

  if (!request) return null;

  const meta = REQUEST_TYPE_META[request.request_type];
  const isOwner = profile?.id === request.employee_id;
  const isBossLocked = request.boss_status === 'approved';
  const readyForBoss = isReadyForBoss(request);
  const bossWaitReason = getBossWaitReason(request);
  const isOpen =
    !isBossLocked && ['pending', 'hr_endorsed', 'accounting_verified'].includes(request.status);

  // Strict sequential routing: HR clears HR forms first, Accounting clears Money forms first, ONLY THEN Boss signs off
  const canHrAct =
    !isBossLocked &&
    portalContext === 'hr' &&
    profile?.role === 'hr' &&
    ['leave', 'overtime', 'official_business', 'other'].includes(request.request_type) &&
    request.hr_status === 'pending' &&
    !['cancelled', 'rejected'].includes(request.status);

  const canAccountingAct =
    !isBossLocked &&
    portalContext === 'accounting' &&
    profile?.role === 'accounting' &&
    ['reimbursement', 'cash_advance', 'overtime'].includes(request.request_type) &&
    request.accounting_status === 'pending' &&
    !['cancelled', 'rejected'].includes(request.status);

  const canBossAct =
    !isBossLocked &&
    portalContext === 'boss' &&
    profile?.role === 'boss' &&
    readyForBoss;

  const isBossWaitingOnStage1 =
    !isBossLocked &&
    portalContext === 'boss' &&
    profile?.role === 'boss' &&
    request.boss_status === 'pending' &&
    !['cancelled', 'rejected'].includes(request.status) &&
    !readyForBoss;

  const handleAction = async (action: ReviewAction) => {
    if (isBossLocked) {
      toast(
        'Locked in History',
        'This form has already been approved by the Boss and cannot be edited by anyone.',
        'error'
      );
      return;
    }
    if (
      (action === 'hr_reject' || action === 'boss_reject' || action === 'accounting_reject') &&
      !remarks.trim()
    ) {
      toast('Remarks required', 'Please provide a brief reason when rejecting a form.', 'error');
      return;
    }

    setSubmitting(action);
    try {
      await performReview({
        requestId: request.id,
        action,
        remarks,
        disbursementReference: disbursementRef,
      });
      toast(
        action === 'boss_approve'
          ? 'Approved & Locked in History'
          : action === 'hr_endorse'
            ? 'Approved by HR & Sent to Boss'
            : action === 'accounting_verify' || action === 'accounting_pay'
              ? 'Approved by Accounting & Sent to Boss'
              : 'Digital form updated',
        action === 'boss_approve'
          ? `${request.reference_no} is now permanently archived in History and read-only for everyone.`
          : action === 'hr_endorse'
            ? `${request.reference_no} has been forwarded to the Boss Executive for final sign-off.`
            : action === 'accounting_verify' || action === 'accounting_pay'
              ? `${request.reference_no} has been verified and forwarded to the Boss Executive for final sign-off.`
              : `${request.reference_no} status and digital signature stamp have been recorded.`
      );
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

  // Sequential Visual Workflow Pipeline Steps: Submitted -> HR / Accounting First -> Boss Final Sign-Off
  const pipelineSteps = [
    {
      label: 'Submitted',
      state: 'done' as const,
      sub: formatDate(request.created_at),
    },
    ...(request.hr_status !== 'not_required'
      ? [
          {
            label: 'HR Approval',
            state:
              request.hr_status === 'approved' || request.hr_status === 'endorsed'
                ? ('done' as const)
                : request.hr_status === 'rejected'
                  ? ('rejected' as const)
                  : ('pending' as const),
            sub:
              request.hr_status === 'pending'
                ? 'Step 1 · Awaiting HR'
                : request.hr_status === 'endorsed'
                  ? 'Approved · Sent to Boss'
                  : request.hr_status,
          },
        ]
      : []),
    ...(request.accounting_status !== 'not_required'
      ? [
          {
            label: 'Accounting Approval',
            state:
              request.accounting_status === 'paid' || request.accounting_status === 'verified'
                ? ('done' as const)
                : request.accounting_status === 'rejected'
                  ? ('rejected' as const)
                  : ('pending' as const),
            sub:
              request.accounting_status === 'pending'
                ? 'Step 1 · Awaiting Finance'
                : request.accounting_status === 'verified' || request.accounting_status === 'paid'
                  ? 'Approved · Sent to Boss'
                  : request.accounting_status,
          },
        ]
      : []),
    {
      label: 'Boss Final Sign-Off',
      state:
        request.boss_status === 'approved'
          ? ('done' as const)
          : request.boss_status === 'rejected'
            ? ('rejected' as const)
            : ('pending' as const),
      sub:
        request.boss_status === 'approved'
          ? 'Locked in History'
          : request.boss_status === 'pending'
            ? readyForBoss
              ? 'Ready for Boss'
              : bossWaitReason ?? 'Waiting Step 1'
            : request.boss_status,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#071329]/65 p-0 pt-6 backdrop-blur-sm sm:items-start sm:p-6"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      <div className="print-slip-container relative my-auto w-full max-w-4xl overflow-hidden rounded-t-[26px] border border-[#dfd5c5] bg-white shadow-[0_28px_70px_rgba(7,19,41,0.34)] sm:rounded-[28px]">
        {/* Top Modal Utility Bar (Hidden on Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd5c5] bg-[#f4efe6] px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#dfd5c5] bg-[#fdfbf7] px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#0f2344]">
              {request.reference_no}
            </span>
            <RequestTypeBadge type={request.request_type} />
            <StatusBadge status={request.status} />
            {isBossLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-2.5 py-0.5 text-[11px] font-bold text-[#f7f2e8]">
                <Lock className="h-3 w-3" />
                Locked · History
              </span>
            )}
            {request.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-3.5 py-1.5 text-xs font-semibold text-[#f7f2e8] shadow-[0_4px_12px_rgba(7,19,41,0.22)] transition hover:brightness-110"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfd5c5] bg-[#fdfbf7] text-[#5c5951] transition hover:border-[#163362] hover:text-[#0d1c36]"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Official Paperless Digital Document Slip */}
        <div className="p-5 sm:p-8">
          {/* Corporate Letterhead */}
          <div className="flex flex-col justify-between gap-4 border-b-2 border-[#0f2344] pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <img
                src="./brand/mediq-logo-official.png"
                alt="MediQ Pharma"
                className="h-10 w-auto object-contain"
              />
              <div className="border-l border-[#dfd5c5] pl-3.5">
                <p className="text-[11px] font-bold tracking-widest text-[#163362] uppercase">
                  Official Paperless Digital Form
                </p>
                <h2 className="text-lg font-extrabold text-[#0d1c36] sm:text-xl">{meta.label}</h2>
                <p className="text-xs text-[#646159]">
                  Form Code: <span className="font-mono font-semibold text-[#0f2344]">{meta.formCode}</span> ·
                  Filed {formatDateTime(request.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <div
                className={`rounded-xl border-2 px-3 py-1 text-center font-mono text-xs font-extrabold tracking-widest uppercase ${stampColor}`}
              >
                {request.status.replace('_', ' ')}
              </div>
              <p className="mt-1.5 font-mono text-xs font-semibold text-[#0f2344]">
                REF: {request.reference_no}
              </p>
            </div>
          </div>

          {/* Visual Approval Progress Pipeline */}
          <div className="no-print mt-5 rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/70 px-4 py-3.5">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between sm:gap-2">
              {pipelineSteps.map((step, index) => (
                <div key={step.label} className="flex flex-1 items-center">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.state === 'done'
                          ? 'bg-gradient-to-b from-[#163362] to-[#071329] text-[#f7f2e8] shadow-xs'
                          : step.state === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : 'border border-[#d5c6ac] bg-[#fdfbf7] text-[#8a6823]'
                      }`}
                    >
                      {step.state === 'done' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : step.state === 'rejected' ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0d1c36]">{step.label}</p>
                      <p className="text-[10px] font-medium text-[#646159] capitalize">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                  {index < pipelineSteps.length - 1 && (
                    <div
                      className={`mx-3 hidden h-0.5 flex-1 rounded-full sm:block ${
                        step.state === 'done' ? 'bg-[#163362]' : 'bg-[#dfd5c5]'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Employee Summary */}
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-xs text-slate-500">Priority: {request.priority.toUpperCase()}</p>
            </div>
          </div>

          {/* Subject & Structured Details */}
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Subject / Purpose
              </p>
              <h3 className="mt-0.5 text-base font-bold text-slate-900">{request.title}</h3>
              {request.description && (
                <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-700">
                  {request.description}
                </p>
              )}
            </div>

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
              {request.metadata?.leave_pay_type && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Pay Type</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.leave_pay_type === 'with_pay'
                      ? 'With Pay'
                      : 'Without Pay (LWOP)'}
                  </p>
                </div>
              )}
              {request.metadata?.return_to_work_date && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Return to Work
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatDate(request.metadata.return_to_work_date)}
                  </p>
                </div>
              )}
              {request.metadata?.ot_filing_mode && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">OT Filing</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.ot_filing_mode === 'pre_approval'
                      ? 'Pre-Approval'
                      : 'Rendered (Post-OT)'}
                  </p>
                </div>
              )}
              {request.metadata?.break_minutes != null && Number(request.metadata.break_minutes) > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Break Deducted
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.break_minutes} mins
                    {request.metadata.gross_hours ? ` (Gross ${request.metadata.gross_hours}h)` : ''}
                  </p>
                </div>
              )}
              {request.metadata?.dole_rate_label && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-indigo-700 uppercase">
                    PH DOLE Rate Classification
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-indigo-900">
                    {request.metadata.dole_rate_label}
                  </p>
                </div>
              )}
              {request.metadata?.payroll_cutoff && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Payroll Cutoff
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.payroll_cutoff}
                  </p>
                </div>
              )}
              {request.metadata?.deliverable_ref && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Deliverable / Reference #
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.deliverable_ref}
                  </p>
                </div>
              )}
              {request.metadata?.cost_center && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Cost Center / Charge-To
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.cost_center}
                  </p>
                </div>
              )}
              {request.metadata?.dtr_attendance_credit && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-cyan-700 uppercase">
                    HR DTR Attendance Credit
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.dtr_attendance_credit === 'full_day_ob'
                      ? 'Full Workday OB (No Biometric Punch Needed)'
                      : 'Partial Day OB (Office Punch Required)'}
                  </p>
                </div>
              )}
              {request.metadata?.transportation_mode && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Transportation
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {request.metadata.transportation_mode}
                    {request.metadata.vehicle_plate_no
                      ? ` · Plate: ${request.metadata.vehicle_plate_no}`
                      : ''}
                  </p>
                </div>
              )}
              {request.metadata?.handover_notes && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Surgical Cases / Work Handover Checklist
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">
                    {request.metadata.handover_notes}
                  </p>
                </div>
              )}
              {request.metadata?.coe_purpose && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      COE Purpose
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {request.metadata.coe_purpose}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Include Salary
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {request.metadata.coe_with_compensation ? 'Yes (With Compensation)' : 'No (Basic COE)'}
                    </p>
                  </div>
                  {request.metadata.coe_addressed_to && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Addressed To
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {request.metadata.coe_addressed_to}
                      </p>
                    </div>
                  )}
                  {request.metadata.coe_format && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Delivery Format
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {request.metadata.coe_format === 'digital_pdf'
                          ? 'Signed Digital PDF'
                          : 'Printed Hard Copy'}
                      </p>
                    </div>
                  )}
                </>
              )}
              {request.metadata?.schedule_work_mode && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">Work Mode</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 uppercase">
                      {request.metadata.schedule_work_mode.replace('_', ' ')}
                    </p>
                  </div>
                  {request.metadata.current_schedule && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Current Shift
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {request.metadata.current_schedule}
                      </p>
                    </div>
                  )}
                  {request.metadata.requested_schedule && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-sky-700 uppercase">
                        Requested Shift
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {request.metadata.requested_schedule}
                      </p>
                    </div>
                  )}
                </>
              )}
              {request.metadata?.payroll_doc_type && (
                <>
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      Requested HR/Payroll Document
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {request.metadata.payroll_doc_type}
                    </p>
                  </div>
                  {request.metadata.payroll_coverage_period && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Coverage / Tax Year
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {request.metadata.payroll_coverage_period}
                      </p>
                    </div>
                  )}
                </>
              )}
              {request.metadata?.supply_category && (
                <>
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      IT / Supply Category
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {request.metadata.supply_category}
                    </p>
                  </div>
                  {request.metadata.supply_quantity && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Quantity / Spec
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {request.metadata.supply_quantity}
                      </p>
                    </div>
                  )}
                </>
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

            {/* BIR Itemized Expense Breakdown Table */}
            {Array.isArray(request.metadata?.line_items) &&
              request.metadata.line_items.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                    <span>BIR Itemized Expense Breakdown</span>
                    {request.metadata.vat_total != null && (
                      <span className="font-semibold text-slate-500 normal-case">
                        VATable: {formatPHP(request.metadata.vat_total)} · Non-VAT:{' '}
                        {formatPHP(request.metadata.non_vat_total ?? 0)}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="border-y border-slate-200 bg-white text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Particulars / Vendor</th>
                          <th className="px-3 py-2 font-semibold">Category</th>
                          <th className="px-3 py-2 font-semibold">BIR SI / OR #</th>
                          <th className="px-3 py-2 font-semibold">Tax</th>
                          <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {request.metadata.line_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                              {item.expense_date ? formatDate(item.expense_date) : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-800">{item.description}</p>
                              {item.vendor && (
                                <p className="text-[11px] text-slate-500">{item.vendor}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600">{item.category}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">
                              {item.receipt_no || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {item.is_vat != null ? (
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    item.is_vat
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.is_vat ? 'VAT' : 'Non-VAT'}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">
                              {formatPHP(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                        <tr>
                          <td colSpan={5} className="px-3 py-2.5 text-right text-xs uppercase">
                            Total Claimed Amount
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-emerald-700">
                            {formatPHP(request.amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

            {/* Multi-Stop Official Business Itinerary Table */}
            {Array.isArray(request.metadata?.ob_itinerary) &&
              request.metadata.ob_itinerary.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-cyan-50/80 px-4 py-2 text-xs font-bold tracking-wider text-cyan-900 uppercase">
                    Hospital / Client Field Itinerary ({request.metadata.ob_itinerary.length}{' '}
                    {request.metadata.ob_itinerary.length === 1 ? 'Stop' : 'Stops'})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="border-y border-slate-200 bg-white text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Time</th>
                          <th className="px-3 py-2 font-semibold">Hospital / Clinic / Account</th>
                          <th className="px-3 py-2 font-semibold">Doctor / Contact</th>
                          <th className="px-3 py-2 font-semibold">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {request.metadata.ob_itinerary.map((stop, idx) => (
                          <tr key={idx}>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold text-cyan-800">
                              {stop.time || '—'}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-800">
                              {stop.hospital_or_client}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {stop.contact_person || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{stop.purpose || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Itemized Cash Advance Budget Table */}
            {Array.isArray(request.metadata?.budget_items) &&
              request.metadata.budget_items.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/80 px-4 py-2 text-xs font-bold tracking-wider text-amber-900 uppercase">
                    <span>Itemized Cash Advance Budget</span>
                    {request.metadata.liquidation_undertaking_accepted && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 normal-case">
                        Liquidation Undertaking Signed
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-y border-slate-200 bg-white text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Category</th>
                        <th className="px-4 py-2 font-semibold">Details</th>
                        <th className="px-4 py-2 text-right font-semibold">Estimated PHP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {request.metadata.budget_items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-semibold text-slate-800">
                            {item.category}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{item.description}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-900">
                            {formatPHP(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-right text-xs uppercase">
                          Total Cash Advance Requested
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-700">
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
                        className="flex items-center gap-3 rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/50 p-2.5"
                      >
                        {isImage && att.signedUrl ? (
                          <a
                            href={att.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#dfd5c5] bg-white"
                          >
                            <img
                              src={att.signedUrl}
                              alt={att.file_name}
                              className="h-full w-full object-contain p-1"
                            />
                          </a>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#dfd5c5] bg-white text-[#163362]">
                            <FileText className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#0d1c36]">
                            {att.file_name}
                          </p>
                          <p className="text-[11px] text-[#646159]">
                            {(att.file_size / 1024).toFixed(1)} KB
                          </p>
                          {att.signedUrl && (
                            <a
                              href={att.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="no-print mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#163362] hover:underline"
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
                    <p className="text-[11px] text-slate-500">
                      {formatDateTime(request.created_at)}
                    </p>
                  </div>
                </div>

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

          {/* Permanently Locked in History Banner (Once Approved by Boss) */}
          {isBossLocked ? (
            <div className="no-print mt-6 flex items-start gap-3.5 rounded-[20px] border border-[#163362]/25 bg-gradient-to-br from-[#163362] via-[#0f2344] to-[#071329] p-4 text-[#f5efe4] shadow-[0_12px_28px_rgba(7,19,41,0.2)] sm:p-5">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5efe4]/15 text-[#e6d8bf]">
                <Lock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.06em] text-[#e6d8bf] uppercase">
                  Permanently Locked in History · Boss Approved
                </p>
                <p className="mt-1 text-sm font-semibold text-[#fdfbf7]">
                  Signed off by {request.boss_reviewer?.full_name || 'Boss Executive'}
                  {request.boss_reviewed_at ? ` on ${formatDateTime(request.boss_reviewed_at)}` : ''}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#dfd0b6]">
                  This official record is archived as read-only in History. No one — including
                  Employee, HR, Accounting, or Boss — can edit, re-open, reject, cancel, or delete
                  this form. You may still inspect details and Print / Save PDF.
                </p>
              </div>
            </div>
          ) : isBossWaitingOnStage1 ? (
            <div className="no-print mt-6 flex items-start gap-3.5 rounded-[20px] border border-[#dfd5c5] bg-[#f4efe6] p-4 sm:p-5">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#163362]/10 text-[#163362]">
                <Clock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.06em] text-[#0f2344] uppercase">
                  Stage 1 Review In Progress · {bossWaitReason}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5c5951]">
                  Per MediQ sequential approval policy, HR forms go to <strong>HR Admin first</strong>{' '}
                  and money forms go to <strong>Accounting Admin first</strong>. Once they approve
                  this slip, it will automatically move into your <strong>Pending Sign-Off</strong>{' '}
                  queue for final Boss approval.
                </p>
              </div>
            </div>
          ) : (canHrAct || canBossAct || canAccountingAct || (isOwner && isOpen)) && (
            <div className="no-print mt-6 rounded-[20px] border border-[#dfd5c5] bg-[#f4efe6]/85 p-4 sm:p-5">
              <p className="text-[11px] font-bold tracking-[0.06em] text-[#0f2344] uppercase">
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
                    <label className="mb-1.5 block text-xs font-semibold text-[#5c5951]">
                      Remarks / Notes (required when rejecting)
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add approval note, payroll cutoff, or reason..."
                      className="w-full rounded-[14px] border border-[#dfd5c5] bg-white px-3.5 py-2.5 text-sm text-[#0d1c36] placeholder:text-[#8a8478] transition focus:border-[#163362] focus:ring-2 focus:ring-[#163362]/15 focus:outline-none"
                    />
                  </div>
                  {canAccountingAct && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[#5c5951]">
                        Disbursement / Check / Bank Ref # (for Paid)
                      </label>
                      <input
                        type="text"
                        value={disbursementRef}
                        onChange={(e) => setDisbursementRef(e.target.value)}
                        placeholder="e.g., BPI-20261126-8841 or CHK-00412"
                        className="w-full rounded-[14px] border border-[#dfd5c5] bg-white px-3.5 py-2.5 font-mono text-sm text-[#0d1c36] placeholder:text-[#8a8478] transition focus:border-[#163362] focus:ring-2 focus:ring-[#163362]/15 focus:outline-none"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-5 py-2.5 text-xs font-bold text-[#f7f2e8] shadow-[0_6px_16px_rgba(7,19,41,0.22)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      {submitting === 'boss_approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Final Boss Approve (Lock in History)
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('boss_reject')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-5 py-2.5 text-xs font-bold text-[#f7f2e8] shadow-[0_6px_16px_rgba(7,19,41,0.22)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      {submitting === 'hr_endorse' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Approve &amp; Send to Boss
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('hr_reject')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
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
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-5 py-2.5 text-xs font-bold text-[#f7f2e8] shadow-[0_6px_16px_rgba(7,19,41,0.22)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      {submitting === 'accounting_verify' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Approve &amp; Send to Boss
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('accounting_pay')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd5c5] bg-[#fdfbf7] px-4 py-2.5 text-xs font-bold text-[#0f2344] transition hover:border-[#163362] hover:bg-white disabled:opacity-60"
                    >
                      {submitting === 'accounting_pay' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Banknote className="h-4 w-4" />
                      )}
                      Mark Paid &amp; Send to Boss
                    </button>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => handleAction('accounting_reject')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel My Request
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Immutable Audit History */}
          <div className="no-print mt-6 border-t border-[#dfd5c5] pt-5">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] text-[#0f2344] uppercase">
              <History className="h-3.5 w-3.5" />
              Approval & Activity Audit Trail
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-[#8a8478]">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-2.5 border-l-2 border-[#dfd5c5] pl-4">
                {logs.map((log) => (
                  <li key={log.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#163362]" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#0d1c36]">{log.actor_name}</span>
                      <span className="rounded-full bg-[#ede6d8] px-2 py-0.5 text-[10px] font-bold text-[#0f2344] uppercase">
                        {log.actor_role}
                      </span>
                      <span className="font-semibold text-[#163362] capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#8a8478]">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    {log.remarks && <p className="mt-0.5 text-[#5c5951]">{log.remarks}</p>}
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
