import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Send,
  Loader2,
  Paperclip,
  AlertCircle,
} from 'lucide-react';
import { createFormRequestWithFiles } from '../lib/api';
import {
  PAYMENT_METHOD_LABELS,
  REQUEST_TYPE_META,
  SUBTYPE_OPTIONS,
  calculateBusinessDays,
  calculateHours,
  formatPHP,
} from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { RequestTypeIcon } from './StatusBadges';
import { SignaturePad } from './SignaturePad';
import type { ExpenseLineItem, PaymentMethod, RequestType } from '../types/database';

interface NewRequestModalProps {
  open: boolean;
  defaultType?: RequestType;
  onClose: () => void;
  onCreated: () => void;
}

const ALL_TYPES: RequestType[] = [
  'leave',
  'overtime',
  'reimbursement',
  'official_business',
  'cash_advance',
  'other',
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export function NewRequestModal({
  open,
  defaultType = 'leave',
  onClose,
  onCreated,
}: NewRequestModalProps) {
  const { profile, leaveBalance, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [requestType, setRequestType] = useState<RequestType>(defaultType);
  const [subtype, setSubtype] = useState(SUBTYPE_OPTIONS[defaultType][0].value);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // Schedule fields
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'AM' | 'PM'>('AM');
  const [startTime, setStartTime] = useState('17:30');
  const [endTime, setEndTime] = useState('20:30');
  const [coverPerson, setCoverPerson] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');

  // OB / Field Work fields
  const [destination, setDestination] = useState('');
  const [clientOrHospital, setClientOrHospital] = useState('');
  const [transportationMode, setTransportationMode] = useState('Company / Personal Vehicle');

  // Financial fields
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [merchantName, setMerchantName] = useState('');
  const [receiptOrNumber, setReceiptOrNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [bankOrGcashDetails, setBankOrGcashDetails] = useState('');
  const [liquidationDate, setLiquidationDate] = useState('');
  const [cashAdvanceAmount, setCashAdvanceAmount] = useState('');
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([
    { description: '', category: 'Travel & Meals', amount: 0, receipt_no: '' },
  ]);

  // Files & Digital E-Signature
  const [files, setFiles] = useState<File[]>([]);
  const [signature, setSignature] = useState(profile?.signature_data || profile?.full_name || '');
  const [signatureMode, setSignatureMode] = useState<'drawn' | 'typed'>(
    profile?.signature_data?.startsWith('data:image') ? 'drawn' : 'typed'
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRequestType(defaultType);
      setSubtype(SUBTYPE_OPTIONS[defaultType][0].value);
      setTitle('');
      setDescription('');
      setPriority('normal');
      setStartDate(todayIso());
      setEndDate(todayIso());
      setHalfDay(false);
      setFiles([]);
      setLineItems([{ description: '', category: 'Travel & Meals', amount: 0, receipt_no: '' }]);
      setCashAdvanceAmount('');
    }
  }, [open, defaultType]);

  const handleTypeSelect = (nextType: RequestType) => {
    setRequestType(nextType);
    setSubtype(SUBTYPE_OPTIONS[nextType][0].value);
  };

  const handleSignatureChange = useCallback((val: string, mode: 'drawn' | 'typed') => {
    setSignature(val);
    setSignatureMode(mode);
  }, []);

  if (!open || !profile) return null;

  const computedDays =
    requestType === 'leave'
      ? halfDay
        ? 0.5
        : calculateBusinessDays(startDate, endDate)
      : requestType === 'official_business'
        ? calculateBusinessDays(startDate, endDate)
        : null;

  const computedHours =
    requestType === 'overtime' ? calculateHours(startTime, endTime) : null;

  const reimbursementTotal = lineItems.reduce(
    (sum, item) => sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0),
    0
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length < selected.length) {
      toast('File too large', 'Each receipt or document must be 10 MB or smaller.', 'error');
    }
    setFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: '', category: 'Travel & Meals', amount: 0, receipt_no: '' },
    ]);
  };

  const updateLineItem = (index: number, field: keyof ExpenseLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature.trim()) {
      toast('Signature required', 'Please sign the digital form before submitting.', 'error');
      return;
    }

    if (requestType === 'reimbursement' && reimbursementTotal <= 0) {
      toast('Enter expense amount', 'Add at least one expense item with an amount greater than ₱0.', 'error');
      return;
    }

    if (requestType === 'cash_advance' && (!cashAdvanceAmount || Number(cashAdvanceAmount) <= 0)) {
      toast('Enter cash advance amount', 'Please enter a valid PHP amount.', 'error');
      return;
    }

    const cleanTitle =
      title.trim() ||
      `${REQUEST_TYPE_META[requestType].shortLabel} — ${
        SUBTYPE_OPTIONS[requestType].find((s) => s.value === subtype)?.label ?? subtype
      }`;

    const cleanLineItems =
      requestType === 'reimbursement'
        ? lineItems.filter((i) => i.description.trim() || Number(i.amount) > 0)
        : undefined;

    setSubmitting(true);
    try {
      const created = await createFormRequestWithFiles(
        {
          employee_id: profile.id,
          request_type: requestType,
          subtype,
          title: cleanTitle,
          description: description.trim(),
          priority,
          start_date:
            ['leave', 'overtime', 'official_business', 'other'].includes(requestType)
              ? startDate
              : null,
          end_date:
            ['leave', 'official_business'].includes(requestType)
              ? halfDay && requestType === 'leave'
                ? startDate
                : endDate
              : null,
          start_time: ['overtime', 'official_business'].includes(requestType) ? startTime : null,
          end_time: ['overtime', 'official_business'].includes(requestType) ? endTime : null,
          total_days: computedDays,
          total_hours: computedHours,
          destination: requestType === 'official_business' ? destination.trim() : null,
          client_or_hospital:
            requestType === 'official_business' ? clientOrHospital.trim() : null,
          amount:
            requestType === 'reimbursement'
              ? Math.round(reimbursementTotal * 100) / 100
              : requestType === 'cash_advance'
                ? Math.round(Number(cashAdvanceAmount) * 100) / 100
                : null,
          expense_date: requestType === 'reimbursement' ? expenseDate : null,
          merchant_name: requestType === 'reimbursement' ? merchantName.trim() : null,
          receipt_or_number: requestType === 'reimbursement' ? receiptOrNumber.trim() : null,
          payment_method:
            requestType === 'reimbursement' || requestType === 'cash_advance'
              ? paymentMethod
              : null,
          metadata: {
            employee_signature: signature,
            employee_signature_type: signatureMode,
            signed_at: new Date().toISOString(),
            ...(requestType === 'leave' && {
              half_day: halfDay,
              half_day_period: halfDay ? halfDayPeriod : undefined,
              cover_person: coverPerson.trim() || undefined,
              contact_during_leave: contactDuringLeave.trim() || undefined,
            }),
            ...(requestType === 'reimbursement' && {
              line_items: cleanLineItems,
              bank_or_gcash_details: bankOrGcashDetails.trim() || undefined,
            }),
            ...(requestType === 'cash_advance' && {
              bank_or_gcash_details: bankOrGcashDetails.trim() || undefined,
              liquidation_date: liquidationDate || undefined,
            }),
            ...(requestType === 'official_business' && {
              transportation_mode: transportationMode,
            }),
          },
        },
        files
      );

      toast(
        `Digital form submitted (${created.reference_no})`,
        `Delivered immediately to ${REQUEST_TYPE_META[requestType].routedTo}.`
      );
      await refreshProfile();
      onCreated();
      onClose();
    } catch (err) {
      toast(
        'Submission failed',
        err instanceof Error ? err.message : 'Could not save your form.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const vlRemaining = leaveBalance
    ? Math.max(0, Number(leaveBalance.vacation_total) - Number(leaveBalance.vacation_used))
    : 15;
  const slRemaining = leaveBalance
    ? Math.max(0, Number(leaveBalance.sick_total) - Number(leaveBalance.sick_used))
    : 15;
  const elRemaining = leaveBalance
    ? Math.max(0, Number(leaveBalance.emergency_total) - Number(leaveBalance.emergency_used))
    : 5;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0a192f] px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-sky-400 uppercase">
              Paperless Digital Submission
            </p>
            <h2 className="text-lg font-bold">File a Digital Employee Form</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close form modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] space-y-5 overflow-y-auto p-6">
          {/* 1. Form Type Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wider text-slate-600 uppercase">
              1. Choose Form Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_TYPES.map((type) => {
                const info = REQUEST_TYPE_META[type];
                const selected = requestType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeSelect(type)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${info.bgSoft}`}
                    >
                      <RequestTypeIcon type={type} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">{info.shortLabel}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{info.routedTo}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Leave Balance Strip when filing Leave */}
          {requestType === 'leave' && (
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-sky-200/80 bg-sky-50/60 p-3 text-center">
              <div>
                <p className="text-[11px] font-semibold text-sky-700">Vacation Leave</p>
                <p className="text-lg font-extrabold text-slate-900">{vlRemaining} days</p>
              </div>
              <div className="border-x border-sky-200">
                <p className="text-[11px] font-semibold text-sky-700">Sick Leave</p>
                <p className="text-lg font-extrabold text-slate-900">{slRemaining} days</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-sky-700">Emergency Leave</p>
                <p className="text-lg font-extrabold text-slate-900">{elRemaining} days</p>
              </div>
            </div>
          )}

          {/* 2. Core Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category / Subtype
              </label>
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              >
                {SUBTYPE_OPTIONS[requestType].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize transition ${
                      priority === p
                        ? p === 'urgent'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p === 'urgent' ? 'Urgent' : 'Normal'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Subject / Short Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                requestType === 'leave'
                  ? 'e.g., Family vacation in Cebu'
                  : requestType === 'overtime'
                    ? 'e.g., Month-end inventory & shipment dispatch'
                    : requestType === 'reimbursement'
                      ? 'e.g., Client lunch & parking — St. Luke’s BGC'
                      : requestType === 'official_business'
                        ? 'e.g., RayOne EMV surgical support — Makati Med'
                        : requestType === 'cash_advance'
                          ? 'e.g., Davao 3-day hospital coverage allowance'
                          : 'e.g., Request for Certificate of Employment'
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            />
          </div>

          {/* LEAVE FIELDS */}
          {requestType === 'leave' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Leave Schedule</span>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={halfDay}
                    onChange={(e) => setHalfDay(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Half-day leave (0.5 day)
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {halfDay ? 'Leave Date' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                {halfDay ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Half-Day Session
                    </label>
                    <select
                      value={halfDayPeriod}
                      onChange={(e) => setHalfDayPeriod(e.target.value as 'AM' | 'PM')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="AM">Morning (AM)</option>
                      <option value="PM">Afternoon (PM)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center rounded-lg border border-sky-200 bg-white px-3 py-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Computed Leave Days
                  </span>
                  <span className="text-base font-extrabold text-sky-700">
                    {computedDays} {computedDays === 1 ? 'working day' : 'working days'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Work Reliever / Cover Person (Optional)
                  </label>
                  <input
                    type="text"
                    value={coverPerson}
                    onChange={(e) => setCoverPerson(e.target.value)}
                    placeholder="Colleague handling urgent items"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Reachable Contact Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={contactDuringLeave}
                    onChange={(e) => setContactDuringLeave(e.target.value)}
                    placeholder="e.g., 0917-xxx-xxxx"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* OVERTIME FIELDS */}
          {requestType === 'overtime' && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">OT Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Time From</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Time To</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2">
                <span className="text-[11px] font-semibold text-slate-500">Total OT Hours</span>
                <span className="text-base font-extrabold text-indigo-700">
                  {computedHours} hrs
                </span>
              </div>
            </div>
          )}

          {/* OFFICIAL BUSINESS / FIELD WORK FIELDS */}
          {requestType === 'official_business' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Destination / City *
                  </label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g., BGC Taguig / Cebu City"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Hospital / Doctor / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientOrHospital}
                    onChange={(e) => setClientOrHospital(e.target.value)}
                    placeholder="e.g., St. Luke's Medical Center — Dr. Santos"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">End Date</label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Time Out</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Expected Return
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Mode of Transportation
                </label>
                <input
                  type="text"
                  value={transportationMode}
                  onChange={(e) => setTransportationMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* REIMBURSEMENT FIELDS */}
          {requestType === 'reimbursement' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Primary Merchant / Store
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g., Grab PH, Shell, Mary Grace"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Primary OR / SI Number
                  </label>
                  <input
                    type="text"
                    value={receiptOrNumber}
                    onChange={(e) => setReceiptOrNumber(e.target.value)}
                    placeholder="e.g., OR-0094821"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Itemized Expense Rows */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Expense Items (PHP)
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-slate-200 hover:bg-sky-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                    >
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                        placeholder="Expense item description"
                        className="col-span-5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={item.receipt_no ?? ''}
                        onChange={(e) => updateLineItem(idx, 'receipt_no', e.target.value)}
                        placeholder="OR #"
                        className="col-span-3 rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.amount || ''}
                        onChange={(e) =>
                          updateLineItem(idx, 'amount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="col-span-3 rounded-md border border-slate-200 px-2.5 py-1.5 text-right text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="col-span-1 flex justify-center text-slate-400 hover:text-rose-600"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2 text-sm font-bold text-slate-900">
                  <span>Total Claim:</span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {formatPHP(reimbursementTotal)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Preferred Payout Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Bank Account / GCash Number
                  </label>
                  <input
                    type="text"
                    value={bankOrGcashDetails}
                    onChange={(e) => setBankOrGcashDetails(e.target.value)}
                    placeholder="e.g., BDO 0012-xxxx-xxxx or GCash 0917-xxx-xxxx"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CASH ADVANCE FIELDS */}
          {requestType === 'cash_advance' && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Requested Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={cashAdvanceAmount}
                  onChange={(e) => setCashAdvanceAmount(e.target.value)}
                  placeholder="5000.00"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Target Liquidation Date
                </label>
                <input
                  type="date"
                  value={liquidationDate}
                  onChange={(e) => setLiquidationDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Release Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Bank / GCash Account Details
                </label>
                <input
                  type="text"
                  value={bankOrGcashDetails}
                  onChange={(e) => setBankOrGcashDetails(e.target.value)}
                  placeholder="Account name & number"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* OTHER REQUEST DATE */}
          {requestType === 'other' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Effective / Needed Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Details / Justification */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Reason / Detailed Notes *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write complete details so HR, Boss, or Accounting can approve without follow-up..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
            />
          </div>

          {/* Receipt / Attachment Upload */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Attach Receipts, Medical Certificate, or Itinerary (JPG, PNG, PDF · Max 10 MB)
              </span>
              {requestType === 'reimbursement' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  Receipt photo recommended
                </span>
              )}
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-center transition hover:border-sky-400 hover:bg-sky-50/40">
              <Upload className="h-5 w-5 text-sky-600" />
              <span className="mt-1 text-xs font-semibold text-slate-700">
                Click to choose files or take a photo of your receipt
              </span>
              <span className="text-[11px] text-slate-400">
                Stored securely in MediQ private cloud storage
              </span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  >
                    <span className="truncate font-medium text-slate-700">
                      {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Employee E-Signature */}
          <SignaturePad
            signerName={profile.full_name}
            initialSignature={profile.signature_data || profile.full_name}
            onChange={handleSignatureChange}
            compact
          />

          {/* Submit Footer */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? 'Submitting Digital Form...' : 'Sign & Submit Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
