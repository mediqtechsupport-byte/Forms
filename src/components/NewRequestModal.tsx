import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Send,
  Loader2,
  Paperclip,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Camera,
  FileText,
  Receipt,
} from 'lucide-react';
import {
  CA_BUDGET_CATEGORIES,
  COE_PURPOSES,
  DOLE_OT_RATES,
  EXPENSE_COST_CENTERS,
  EXPENSE_LINE_CATEGORIES,
  OB_TRANSPORT_MODES,
  PAYMENT_METHOD_LABELS,
  REQUEST_TYPE_META,
  SUBTYPE_OPTIONS,
  addDaysIso,
  calculateBusinessDays,
  calculateHours,
  formatPHP,
  getDefaultPayrollCutoff,
  getPayrollCutoffOptions,
} from '../lib/constants';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { RequestTypeIcon } from './StatusBadges';
import { SignaturePad } from './SignaturePad';
import type {
  CashAdvanceBudgetItem,
  ExpenseLineItem,
  ObItineraryStop,
  PaymentMethod,
  RequestType,
} from '../types/database';

interface NewRequestModalProps {
  open: boolean;
  formType: RequestType;
  onClose: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function nextWorkingDayIso(dateIso: string): string {
  if (!dateIso) return '';
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/* Shared Dark Navy Blue & Warm Beige Fernly form classes */
const SECTION_CARD =
  'space-y-4 rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7] p-4 shadow-[0_1px_2px_rgba(13,28,54,0.04),0_8px_20px_-14px_rgba(13,28,54,0.1)] sm:p-5';
const SECTION_EYEBROW =
  'text-[11px] font-bold tracking-[0.08em] text-[#5c6370] uppercase';
const LABEL_CLS = 'mb-1.5 block text-xs font-semibold text-[#3f4959]';
const INPUT_CLS =
  'w-full rounded-xl border-[1.5px] border-[#dfd5c5] bg-[#f4efe6]/70 px-3.5 py-2.5 text-sm text-[#0d1c36] placeholder:text-[#88837b] transition focus:border-[#163362] focus:bg-[#fdfbf7] focus:ring-2 focus:ring-[#163362]/15 focus:outline-none';
const COMPACT_INPUT =
  'w-full rounded-lg border-[1.5px] border-[#dfd5c5] bg-[#f4efe6]/60 px-2.5 py-2 text-xs text-[#0d1c36] placeholder:text-[#88837b] transition focus:border-[#163362] focus:bg-[#fdfbf7] focus:outline-none';
const ADD_CHIP_BTN =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[#163362] bg-[#fdfbf7] px-3.5 py-1.5 text-xs font-semibold text-[#10264a] transition hover:bg-[#ede6d8]';

export function NewRequestModal({ open, formType, onClose }: NewRequestModalProps) {
  const { activeProfile: profile, submitForm } = useAppData();
  const { toast } = useToast();

  const requestType = formType;
  const [subtype, setSubtype] = useState(SUBTYPE_OPTIONS[formType][0].value);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  // 1. Leave fields
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [leaveDays, setLeaveDays] = useState('1');
  const [leavePayType, setLeavePayType] = useState<'with_pay' | 'without_pay'>('with_pay');
  const [returnToWorkDate, setReturnToWorkDate] = useState(nextWorkingDayIso(todayIso()));
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'AM' | 'PM'>('AM');
  const [coverPerson, setCoverPerson] = useState('');
  const [contactDuringLeave, setContactDuringLeave] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // 2. Overtime fields (PH DOLE)
  const [otFilingMode, setOtFilingMode] = useState<'pre_approval' | 'post_rendered'>('pre_approval');
  const [startTime, setStartTime] = useState('17:30');
  const [endTime, setEndTime] = useState('20:30');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [payrollCutoff, setPayrollCutoff] = useState(getDefaultPayrollCutoff());
  const [deliverableRef, setDeliverableRef] = useState('');

  // 3. Reimbursement fields (PH BIR)
  const [costCenter, setCostCenter] = useState<string>(EXPENSE_COST_CENTERS[0]);
  const [chargeToAccount, setChargeToAccount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [bankOrGcashDetails, setBankOrGcashDetails] = useState('');
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([
    {
      expense_date: todayIso(),
      description: '',
      vendor: '',
      category: EXPENSE_LINE_CATEGORIES[0],
      amount: 0,
      receipt_no: '',
      is_vat: true,
    },
  ]);

  // 4. Official Business / Field Work fields
  const [destination, setDestination] = useState('');
  const [dtrCredit, setDtrCredit] = useState<'full_day_ob' | 'partial_day_office'>('full_day_ob');
  const [transportationMode, setTransportationMode] = useState<string>(OB_TRANSPORT_MODES[0]);
  const [vehiclePlateNo, setVehiclePlateNo] = useState('');
  const [estimatedFieldBudget, setEstimatedFieldBudget] = useState('');
  const [obItinerary, setObItinerary] = useState<ObItineraryStop[]>([
    { time: '09:00', hospital_or_client: '', contact_person: '', purpose: '' },
  ]);

  // 5. Cash Advance fields
  const [dateNeeded, setDateNeeded] = useState(todayIso());
  const [liquidationDate, setLiquidationDate] = useState(addDaysIso(todayIso(), 7));
  const [tripLocation, setTripLocation] = useState('');
  const [caBudgetItems, setCaBudgetItems] = useState<CashAdvanceBudgetItem[]>([
    { category: CA_BUDGET_CATEGORIES[0], description: '', amount: 0 },
  ]);
  const [liquidationAccepted, setLiquidationAccepted] = useState(false);

  // 6. Dynamic Other HR / Admin fields
  const [undertimeDeparture, setUndertimeDeparture] = useState('15:00');
  const [undertimeRegularEnd, setUndertimeRegularEnd] = useState('17:30');
  const [scheduleWorkMode, setScheduleWorkMode] = useState<'shift_change' | 'wfh' | 'hybrid'>('wfh');
  const [currentSchedule, setCurrentSchedule] = useState('8:30 AM – 5:30 PM (Office)');
  const [requestedSchedule, setRequestedSchedule] = useState('');
  const [coePurpose, setCoePurpose] = useState<string>(COE_PURPOSES[0]);
  const [coeWithComp, setCoeWithComp] = useState(false);
  const [coeAddressedTo, setCoeAddressedTo] = useState('');
  const [coeFormat, setCoeFormat] = useState<'digital_pdf' | 'printed_copy'>('digital_pdf');
  const [payrollDocType, setPayrollDocType] = useState('Monthly Payslips');
  const [payrollCoverage, setPayrollCoverage] = useState('');
  const [supplyCategory, setSupplyCategory] = useState('Laptop / IT Support');
  const [supplyQuantity, setSupplyQuantity] = useState('1 unit');

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [signature, setSignature] = useState(profile?.signature_data || profile?.full_name || '');
  const [signatureMode, setSignatureMode] = useState<'drawn' | 'typed'>(
    profile?.signature_data?.startsWith('data:image') ? 'drawn' : 'typed'
  );
  const [submitting, setSubmitting] = useState(false);

  const payrollCutoffOptions = useMemo(() => getPayrollCutoffOptions(), []);

  const filePreviews = useMemo(
    () =>
      files.map((file) => ({
        file,
        isImage: file.type.startsWith('image/'),
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [filePreviews]);

  useEffect(() => {
    if (open) {
      const today = todayIso();
      setSubtype(SUBTYPE_OPTIONS[formType][0].value);
      setTitle('');
      setDescription('');
      setPriority('normal');

      setStartDate(today);
      setEndDate(today);
      setLeaveDays('1');
      setLeavePayType('with_pay');
      setReturnToWorkDate(nextWorkingDayIso(today));
      setHalfDay(false);
      setHalfDayPeriod('AM');
      setCoverPerson('');
      setContactDuringLeave('');
      setHandoverNotes('');

      setOtFilingMode('pre_approval');
      setStartTime(formType === 'overtime' ? '17:30' : '09:00');
      setEndTime(formType === 'overtime' ? '20:30' : '17:00');
      setBreakMinutes('0');
      setPayrollCutoff(getDefaultPayrollCutoff());
      setDeliverableRef('');

      setCostCenter(EXPENSE_COST_CENTERS[0]);
      setChargeToAccount('');
      setPaymentMethod('bank_transfer');
      setBankOrGcashDetails('');
      setLineItems([
        {
          expense_date: today,
          description: '',
          vendor: '',
          category: EXPENSE_LINE_CATEGORIES[0],
          amount: 0,
          receipt_no: '',
          is_vat: true,
        },
      ]);

      setDestination('');
      setDtrCredit('full_day_ob');
      setTransportationMode(OB_TRANSPORT_MODES[0]);
      setVehiclePlateNo('');
      setEstimatedFieldBudget('');
      setObItinerary([{ time: '09:00', hospital_or_client: '', contact_person: '', purpose: '' }]);

      setDateNeeded(today);
      setLiquidationDate(addDaysIso(today, 7));
      setTripLocation('');
      setCaBudgetItems([{ category: CA_BUDGET_CATEGORIES[0], description: '', amount: 0 }]);
      setLiquidationAccepted(false);

      setUndertimeDeparture('15:00');
      setUndertimeRegularEnd('17:30');
      setScheduleWorkMode('wfh');
      setCurrentSchedule('8:30 AM – 5:30 PM (Office)');
      setRequestedSchedule('');
      setCoePurpose(COE_PURPOSES[0]);
      setCoeWithComp(false);
      setCoeAddressedTo('');
      setCoeFormat('digital_pdf');
      setPayrollDocType('Monthly Payslips');
      setPayrollCoverage('');
      setSupplyCategory('Laptop / IT Support');
      setSupplyQuantity('1 unit');

      setFiles([]);
      setDragActive(false);
    }
  }, [open, formType]);

  const handleSignatureChange = useCallback((val: string, mode: 'drawn' | 'typed') => {
    setSignature(val);
    setSignatureMode(mode);
  }, []);

  // All React hooks strictly above this guard
  if (!open || !profile) return null;

  const parsedLeaveDays = parseFloat(leaveDays);
  const computedDays =
    requestType === 'leave'
      ? Number.isFinite(parsedLeaveDays) && parsedLeaveDays > 0
        ? parsedLeaveDays
        : null
      : requestType === 'official_business'
        ? calculateBusinessDays(startDate, endDate)
        : null;

  const grossOtHours = requestType === 'overtime' ? calculateHours(startTime, endTime) : 0;
  const breakHrs = (Number(breakMinutes) || 0) / 60;
  const netOtHours =
    requestType === 'overtime'
      ? Math.max(0, Math.round((grossOtHours - breakHrs) * 100) / 100)
      : null;

  const undertimeHours =
    requestType === 'other' && subtype === 'undertime'
      ? calculateHours(undertimeDeparture, undertimeRegularEnd)
      : null;

  const vatTotal = lineItems.reduce(
    (sum, item) => sum + (item.is_vat ? Number(item.amount) || 0 : 0),
    0
  );
  const nonVatTotal = lineItems.reduce(
    (sum, item) => sum + (!item.is_vat ? Number(item.amount) || 0 : 0),
    0
  );
  const reimbursementTotal = Math.round((vatTotal + nonVatTotal) * 100) / 100;

  const cashAdvanceTotal =
    Math.round(caBudgetItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) * 100) / 100;

  const requiresReceipt = requestType === 'reimbursement';
  const requiresMedCert =
    requestType === 'leave' && subtype === 'sick' && (computedDays ?? 0) >= 2;
  const attachmentRequired = requiresReceipt || requiresMedCert;

  const addValidatedFiles = (incoming: File[]) => {
    const allowedMime = (f: File) =>
      f.type.startsWith('image/') ||
      f.type === 'application/pdf' ||
      /\.(jpe?g|png|webp|heic|pdf)$/i.test(f.name);

    const validType = incoming.filter(allowedMime);
    if (validType.length < incoming.length) {
      toast(
        'Unsupported file type',
        'Only receipt images (JPG, PNG, WEBP, HEIC) or PDF files are accepted.',
        'error'
      );
    }

    const validSize = validType.filter((f) => f.size <= 10 * 1024 * 1024);
    if (validSize.length < validType.length) {
      toast('File too large', 'Each receipt or document must be 10 MB or smaller.', 'error');
    }

    if (validSize.length > 0) {
      setFiles((prev) => [...prev, ...validSize]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addValidatedFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addValidatedFiles(Array.from(e.dataTransfer.files ?? []));
  };

  // Reimbursement line helpers
  const addLineItem = () =>
    setLineItems((prev) => [
      ...prev,
      {
        expense_date: todayIso(),
        description: '',
        vendor: '',
        category: EXPENSE_LINE_CATEGORIES[0],
        amount: 0,
        receipt_no: '',
        is_vat: true,
      },
    ]);

  const updateLineItem = (
    index: number,
    field: keyof ExpenseLineItem,
    value: string | number | boolean
  ) =>
    setLineItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );

  const removeLineItem = (index: number) =>
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  // OB multi-stop helpers
  const addObStop = () =>
    setObItinerary((prev) => [
      ...prev,
      { time: '14:00', hospital_or_client: '', contact_person: '', purpose: '' },
    ]);

  const updateObStop = (index: number, field: keyof ObItineraryStop, value: string) =>
    setObItinerary((prev) =>
      prev.map((stop, idx) => (idx === index ? { ...stop, [field]: value } : stop))
    );

  const removeObStop = (index: number) =>
    setObItinerary((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  // Cash Advance budget helpers
  const addCaItem = () =>
    setCaBudgetItems((prev) => [
      ...prev,
      { category: CA_BUDGET_CATEGORIES[1], description: '', amount: 0 },
    ]);

  const updateCaItem = (
    index: number,
    field: keyof CashAdvanceBudgetItem,
    value: string | number
  ) =>
    setCaBudgetItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );

  const removeCaItem = (index: number) =>
    setCaBudgetItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature.trim()) {
      toast('Signature required', 'Please sign the digital form before submitting.', 'error');
      return;
    }

    if (requestType === 'leave' && (!computedDays || computedDays <= 0)) {
      toast('Enter leave days', 'Please enter how many days of leave you are filing.', 'error');
      return;
    }

    if (requiresMedCert && files.length === 0) {
      toast(
        'Medical Certificate required',
        'Please attach a photo or PDF of your Medical Certificate for Sick Leave of 2 or more days.',
        'error'
      );
      return;
    }

    if (requestType === 'overtime' && (!netOtHours || netOtHours <= 0)) {
      toast(
        'Invalid OT hours',
        'Net payable overtime hours must be greater than 0 after break deduction.',
        'error'
      );
      return;
    }

    if (requestType === 'reimbursement') {
      if (reimbursementTotal <= 0) {
        toast(
          'Enter expense amount',
          'Add at least one expense row with an amount greater than ₱0.',
          'error'
        );
        return;
      }
      if (files.length === 0) {
        toast(
          'Official Receipt required',
          'Please upload at least 1 photo or PDF of your BIR Sales Invoice / Official Receipt.',
          'error'
        );
        return;
      }
    }

    if (requestType === 'official_business') {
      const validStops = obItinerary.filter((s) => s.hospital_or_client.trim());
      if (validStops.length === 0) {
        toast(
          'Add at least 1 stop',
          'Please enter the Hospital, Clinic, or Client you are visiting.',
          'error'
        );
        return;
      }
    }

    if (requestType === 'cash_advance') {
      if (cashAdvanceTotal <= 0) {
        toast(
          'Enter cash advance budget',
          'Add at least one budget line item with an amount greater than ₱0.',
          'error'
        );
        return;
      }
      if (!liquidationDate) {
        toast(
          'Liquidation date required',
          'Please set your target liquidation date for Accounting tracking.',
          'error'
        );
        return;
      }
      if (!liquidationAccepted) {
        toast(
          'Liquidation undertaking required',
          'Please check the liquidation agreement box before submitting a Cash Advance.',
          'error'
        );
        return;
      }
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

    const cleanObStops =
      requestType === 'official_business'
        ? obItinerary.filter((s) => s.hospital_or_client.trim())
        : undefined;

    const cleanCaItems =
      requestType === 'cash_advance'
        ? caBudgetItems.filter((i) => i.description.trim() || Number(i.amount) > 0)
        : undefined;

    const firstReceipt = cleanLineItems?.[0];
    const allOrNumbers = cleanLineItems
      ?.map((i) => i.receipt_no?.trim())
      .filter(Boolean)
      .join(', ');
    const allVendors = Array.from(
      new Set(cleanLineItems?.map((i) => i.vendor?.trim()).filter(Boolean))
    ).join(', ');
    const obHospitals = cleanObStops?.map((s) => s.hospital_or_client.trim()).join(' · ');

    setSubmitting(true);
    try {
      const created = await submitForm(
        {
          employee_id: profile.id,
          request_type: requestType,
          subtype,
          title: cleanTitle,
          description: description.trim() || cleanTitle,
          priority,
          start_date:
            requestType === 'leave' ||
            requestType === 'overtime' ||
            requestType === 'official_business' ||
            requestType === 'other'
              ? startDate
              : requestType === 'cash_advance'
                ? dateNeeded
                : null,
          end_date:
            requestType === 'leave'
              ? halfDay
                ? startDate
                : endDate
              : requestType === 'official_business' ||
                  (requestType === 'other' && subtype === 'schedule_change')
                ? endDate
                : null,
          start_time:
            requestType === 'overtime' || requestType === 'official_business'
              ? startTime
              : requestType === 'other' && subtype === 'undertime'
                ? undertimeDeparture
                : null,
          end_time:
            requestType === 'overtime' || requestType === 'official_business'
              ? endTime
              : requestType === 'other' && subtype === 'undertime'
                ? undertimeRegularEnd
                : null,
          total_days: computedDays,
          total_hours:
            requestType === 'overtime'
              ? netOtHours
              : requestType === 'other' && subtype === 'undertime'
                ? undertimeHours
                : null,
          destination:
            requestType === 'official_business'
              ? destination.trim()
              : requestType === 'cash_advance'
                ? tripLocation.trim()
                : null,
          client_or_hospital:
            requestType === 'official_business'
              ? obHospitals || null
              : requestType === 'reimbursement'
                ? chargeToAccount.trim() || costCenter
                : null,
          amount:
            requestType === 'reimbursement'
              ? reimbursementTotal
              : requestType === 'cash_advance'
                ? cashAdvanceTotal
                : null,
          expense_date:
            requestType === 'reimbursement'
              ? firstReceipt?.expense_date || todayIso()
              : null,
          merchant_name:
            requestType === 'reimbursement' ? allVendors || firstReceipt?.vendor || null : null,
          receipt_or_number: requestType === 'reimbursement' ? allOrNumbers || null : null,
          payment_method:
            requestType === 'reimbursement' || requestType === 'cash_advance'
              ? paymentMethod
              : null,
          metadata: {
            employee_signature: signature,
            employee_signature_mode: signatureMode,

            ...(requestType === 'leave' && {
              leave_pay_type: leavePayType,
              half_day: halfDay,
              half_day_period: halfDay ? halfDayPeriod : undefined,
              return_to_work_date: returnToWorkDate || undefined,
              cover_person: coverPerson.trim() || undefined,
              contact_during_leave: contactDuringLeave.trim() || undefined,
              handover_notes: handoverNotes.trim() || undefined,
            }),

            ...(requestType === 'overtime' && {
              ot_filing_mode: otFilingMode,
              dole_rate_label: DOLE_OT_RATES[subtype]?.multiplier,
              break_minutes: Number(breakMinutes) || 0,
              payroll_cutoff: payrollCutoff,
              deliverable_reference: deliverableRef.trim() || undefined,
            }),

            ...(requestType === 'reimbursement' && {
              cost_center: costCenter,
              charge_to_account: chargeToAccount.trim() || undefined,
              line_items: cleanLineItems,
              vat_total: Math.round(vatTotal * 100) / 100,
              non_vat_total: Math.round(nonVatTotal * 100) / 100,
              bank_or_gcash_details: bankOrGcashDetails.trim() || undefined,
            }),

            ...(requestType === 'official_business' && {
              ob_itinerary: cleanObStops,
              dtr_attendance_credit: dtrCredit,
              transportation_mode: transportationMode,
              vehicle_plate_no: vehiclePlateNo.trim() || undefined,
              estimated_field_budget:
                Number(estimatedFieldBudget) > 0 ? Number(estimatedFieldBudget) : undefined,
            }),

            ...(requestType === 'cash_advance' && {
              date_needed: dateNeeded || undefined,
              liquidation_date: liquidationDate || undefined,
              trip_or_event_location: tripLocation.trim() || undefined,
              budget_items: cleanCaItems,
              bank_or_gcash_details: bankOrGcashDetails.trim() || undefined,
              liquidation_undertaking_accepted: liquidationAccepted,
            }),

            ...(requestType === 'other' && {
              ...(subtype === 'undertime' && {
                undertime_departure_time: undertimeDeparture,
                undertime_regular_end: undertimeRegularEnd,
                undertime_hours: undertimeHours ?? undefined,
              }),
              ...(subtype === 'schedule_change' && {
                schedule_work_mode: scheduleWorkMode,
                current_schedule: currentSchedule.trim() || undefined,
                requested_schedule: requestedSchedule.trim() || undefined,
              }),
              ...(subtype === 'coe' && {
                coe_purpose: coePurpose,
                coe_with_compensation: coeWithComp,
                coe_addressed_to: coeAddressedTo.trim() || undefined,
                coe_format: coeFormat,
              }),
              ...(subtype === 'payslip_copy' && {
                payroll_doc_type: payrollDocType,
                payroll_coverage_period: payrollCoverage.trim() || undefined,
              }),
              ...(subtype === 'supply_it' && {
                supply_category: supplyCategory,
                supply_quantity: supplyQuantity.trim() || undefined,
              }),
            }),
          },
        },
        files
      );

      toast(
        `Digital form submitted (${created.reference_no})`,
        `Delivered immediately to ${REQUEST_TYPE_META[requestType].routedTo}.`
      );
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

  const formMeta = REQUEST_TYPE_META[requestType];
  const needsVehiclePlate =
    transportationMode.includes('Company Vehicle') ||
    transportationMode.includes('Personal Vehicle');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#071329]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      style={{
        fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[26px] border border-[#dfd5c5] bg-[#f4efe6] shadow-[0_32px_80px_-16px_rgba(7,19,41,0.55)] sm:max-h-[90dvh] sm:rounded-[28px]">
        {/* Executive Dark Navy & Champagne Swirl Header */}
        <div
          className="relative shrink-0 overflow-hidden px-5 py-5 text-[#f7f2e8] sm:px-6"
          style={{
            background: 'linear-gradient(135deg, #163362 0%, #071329 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(85% 90% at 100% 100%, rgba(229, 213, 183, 0.22), transparent 62%)',
            }}
          />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f5efe4]/14 text-[#f5efe4] ring-1 ring-[#e6d8bf]/30">
                <RequestTypeIcon type={requestType} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.1em] text-[#e6d8bf] uppercase">
                  {formMeta.formCode} · Routed to {formMeta.routedTo}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-[#fdfbf7] sm:text-xl">
                  {formMeta.label} Form
                </h2>
                <p className="mt-0.5 truncate text-xs text-[#dfd0b6]/85">
                  {profile.full_name} · {profile.employee_code} · {profile.department}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-[#f5efe4] transition hover:bg-white/20"
              aria-label="Close form modal"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Beige Body with Elevated Ivory Cards */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Section 01: Classification & Subject */}
            <div className={SECTION_CARD}>
              <div className="flex items-center justify-between gap-2">
                <span className={SECTION_EYEBROW}>01 · Classification &amp; Subject</span>
                <span className="rounded-full bg-[#ede6d8] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#10264a]">
                  {formMeta.formCode}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>
                    {requestType === 'leave'
                      ? 'Leave Type'
                      : requestType === 'overtime'
                        ? 'Overtime Type (PH DOLE)'
                        : requestType === 'reimbursement'
                          ? 'Primary Expense Category'
                          : requestType === 'official_business'
                            ? 'Field Work / OB Type'
                            : requestType === 'cash_advance'
                              ? 'Cash Advance Type'
                              : 'HR / Admin Request Type'}
                  </label>
                  <select
                    value={subtype}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubtype(val);
                      if (requestType === 'leave' && val === 'unpaid') {
                        setLeavePayType('without_pay');
                      }
                    }}
                    className={INPUT_CLS}
                  >
                    {SUBTYPE_OPTIONS[requestType].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLS}>Priority Level</label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-full border border-[#dfd5c5] bg-[#f4efe6] p-1">
                    {(['normal', 'urgent'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`h-9 cursor-pointer rounded-full text-xs font-semibold capitalize transition ${
                          priority === p
                            ? p === 'urgent'
                              ? 'bg-[#b53636] text-[#fdfbf7] shadow-xs'
                              : 'bg-gradient-to-b from-[#163362] to-[#071329] text-[#f7f2e8] shadow-xs'
                            : 'text-[#5c6370] hover:text-[#0d1c36]'
                        }`}
                      >
                        {p === 'urgent' ? 'Urgent' : 'Normal'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Subject / Short Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    requestType === 'leave'
                      ? 'e.g., Family vacation in Cebu / Annual medical checkup'
                      : requestType === 'overtime'
                        ? 'e.g., UK Rayner IOL shipment receiving & cold-chain encoding'
                        : requestType === 'reimbursement'
                          ? 'e.g., St. Luke’s BGC surgical support — fuel, parking & doctor lunch'
                          : requestType === 'official_business'
                            ? 'e.g., RayOne EMV clinical support — Makati Med & Asian Hospital'
                            : requestType === 'cash_advance'
                              ? 'e.g., Cebu 3-day hospital coverage & hotel allowance'
                              : 'e.g., COE with compensation for Japan visa / Undertime permit'
                  }
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* ================= 1. LEAVE APPLICATION ================= */}
            {requestType === 'leave' && (
              <div className={SECTION_CARD}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={SECTION_EYEBROW}>02 · Leave Schedule &amp; Handover</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-full border border-[#dfd5c5] bg-[#f4efe6] p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setLeavePayType('with_pay')}
                        className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition ${
                          leavePayType === 'with_pay'
                            ? 'bg-[#163362] text-[#f7f2e8]'
                            : 'text-[#5c6370] hover:text-[#0d1c36]'
                        }`}
                      >
                        With Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeavePayType('without_pay')}
                        className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition ${
                          leavePayType === 'without_pay'
                            ? 'bg-[#071329] text-[#f7f2e8]'
                            : 'text-[#5c6370] hover:text-[#0d1c36]'
                        }`}
                      >
                        Without Pay
                      </button>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#0d1c36]">
                      <input
                        type="checkbox"
                        checked={halfDay}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setHalfDay(next);
                          setLeaveDays(
                            next ? '0.5' : String(calculateBusinessDays(startDate, endDate))
                          );
                        }}
                        className="h-4 w-4 rounded border-[#dfd5c5] accent-[#163362]"
                      />
                      Half-day (0.5)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={LABEL_CLS}>{halfDay ? 'Leave Date' : 'Start Date'}</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        setStartDate(nextStart);
                        const nextEnd = nextStart > endDate ? nextStart : endDate;
                        if (nextStart > endDate) setEndDate(nextStart);
                        setReturnToWorkDate(nextWorkingDayIso(halfDay ? nextStart : nextEnd));
                        if (!halfDay) {
                          setLeaveDays(String(calculateBusinessDays(nextStart, nextEnd)));
                        }
                      }}
                      className={INPUT_CLS}
                    />
                  </div>
                  {halfDay ? (
                    <div>
                      <label className={LABEL_CLS}>Half-Day Session</label>
                      <select
                        value={halfDayPeriod}
                        onChange={(e) => setHalfDayPeriod(e.target.value as 'AM' | 'PM')}
                        className={INPUT_CLS}
                      >
                        <option value="AM">Morning (AM)</option>
                        <option value="PM">Afternoon (PM)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className={LABEL_CLS}>End Date</label>
                      <input
                        type="date"
                        required
                        min={startDate}
                        value={endDate}
                        onChange={(e) => {
                          const nextEnd = e.target.value;
                          setEndDate(nextEnd);
                          setReturnToWorkDate(nextWorkingDayIso(nextEnd));
                          setLeaveDays(String(calculateBusinessDays(startDate, nextEnd)));
                        }}
                        className={INPUT_CLS}
                      />
                    </div>
                  )}
                  <div>
                    <label className={LABEL_CLS}>Number of Days *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                      placeholder="e.g., 1, 2, 0.5"
                      className={`${INPUT_CLS} border-[#163362]/45 bg-[#ede6d8]/60 font-bold text-[#0f2344]`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Return to Work</label>
                    <input
                      type="date"
                      value={returnToWorkDate}
                      onChange={(e) => setReturnToWorkDate(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>Work Reliever / Cover Person</label>
                    <input
                      type="text"
                      value={coverPerson}
                      onChange={(e) => setCoverPerson(e.target.value)}
                      placeholder="Colleague handling urgent hospital / office items"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Reachable Contact Number</label>
                    <input
                      type="text"
                      value={contactDuringLeave}
                      onChange={(e) => setContactDuringLeave(e.target.value)}
                      placeholder="e.g., 0917-xxx-xxxx (Viber / Call)"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>
                    Surgical Cases / Work Handover Checklist (Optional)
                  </label>
                  <input
                    type="text"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="e.g., Endorsed Dec 10 St. Luke's OR kit & pending deliveries to Kevin"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            )}

            {/* ================= 2. OVERTIME AUTHORIZATION (PH DOLE) ================= */}
            {requestType === 'overtime' && (
              <div className={SECTION_CARD}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={SECTION_EYEBROW}>02 · Overtime &amp; PH DOLE Payroll</span>
                  <div className="inline-flex rounded-full border border-[#dfd5c5] bg-[#f4efe6] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setOtFilingMode('pre_approval')}
                      className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition ${
                        otFilingMode === 'pre_approval'
                          ? 'bg-[#163362] text-[#f7f2e8]'
                          : 'text-[#5c6370]'
                      }`}
                    >
                      Pre-Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtFilingMode('post_rendered')}
                      className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition ${
                        otFilingMode === 'post_rendered'
                          ? 'bg-[#071329] text-[#f7f2e8]'
                          : 'text-[#5c6370]'
                      }`}
                    >
                      Rendered (Post-OT)
                    </button>
                  </div>
                </div>

                {DOLE_OT_RATES[subtype] && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dfd5c5] bg-[#ede6d8]/75 px-3.5 py-2.5 text-xs">
                    <span className="font-bold text-[#10264a]">
                      PH DOLE Rate: {DOLE_OT_RATES[subtype].multiplier}
                    </span>
                    <span className="text-[#4a5568]">{DOLE_OT_RATES[subtype].note}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={LABEL_CLS}>OT Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Time From</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Time To</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Meal Break</label>
                    <select
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                      className={INPUT_CLS}
                    >
                      <option value="0">0 mins</option>
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                      <option value="60">60 mins</option>
                      <option value="90">90 mins</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-col justify-center rounded-xl bg-gradient-to-br from-[#163362] to-[#071329] px-3.5 py-2 text-[#f7f2e8] sm:col-span-1">
                    <span className="text-[10px] font-semibold tracking-wider text-[#e6d8bf] uppercase">
                      Net Payable OT
                    </span>
                    <span className="mt-0.5 text-lg font-bold tabular-nums">
                      {netOtHours} hrs
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>Target Payroll Cutoff</label>
                    <select
                      value={payrollCutoff}
                      onChange={(e) => setPayrollCutoff(e.target.value)}
                      className={INPUT_CLS}
                    >
                      {payrollCutoffOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Deliverable / Reference # (Optional)</label>
                    <input
                      type="text"
                      value={deliverableRef}
                      onChange={(e) => setDeliverableRef(e.target.value)}
                      placeholder="e.g., AWB-88412 / Dr. Reyes OR Case / Month-end Audit"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= 3. EXPENSE REIMBURSEMENT (PH BIR) ================= */}
            {requestType === 'reimbursement' && (
              <div className={SECTION_CARD}>
                <span className={SECTION_EYEBROW}>02 · Expense Details &amp; BIR Receipts</span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>Cost Center / Charge-To *</label>
                    <select
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className={INPUT_CLS}
                    >
                      {EXPENSE_COST_CENTERS.map((cc) => (
                        <option key={cc} value={cc}>
                          {cc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>
                      Hospital / Client / Project Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={chargeToAccount}
                      onChange={(e) => setChargeToAccount(e.target.value)}
                      placeholder="e.g., St. Luke's BGC — Dr. Alcantara"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                {/* BIR Itemized Expense Builder */}
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wide text-[#0d1c36] uppercase">
                      BIR Itemized Receipts &amp; Sales Invoices (PHP)
                    </span>
                    <button type="button" onClick={addLineItem} className={ADD_CHIP_BTN}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Receipt Row
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="space-y-2.5 rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/45 p-3"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <input
                            type="date"
                            value={item.expense_date ?? todayIso()}
                            onChange={(e) => updateLineItem(idx, 'expense_date', e.target.value)}
                            className={`${COMPACT_INPUT} sm:col-span-3`}
                            title="Receipt Date"
                          />
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                            placeholder="Particulars / Expense description *"
                            className={`${COMPACT_INPUT} sm:col-span-5`}
                          />
                          <select
                            value={item.category}
                            onChange={(e) => updateLineItem(idx, 'category', e.target.value)}
                            className={`${COMPACT_INPUT} sm:col-span-4`}
                          >
                            {EXPENSE_LINE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-12">
                          <input
                            type="text"
                            value={item.vendor ?? ''}
                            onChange={(e) => updateLineItem(idx, 'vendor', e.target.value)}
                            placeholder="Vendor / Store (e.g., Shell, Grab)"
                            className={`${COMPACT_INPUT} col-span-2 sm:col-span-4`}
                          />
                          <input
                            type="text"
                            value={item.receipt_no ?? ''}
                            onChange={(e) => updateLineItem(idx, 'receipt_no', e.target.value)}
                            placeholder="BIR SI / OR #"
                            className={`${COMPACT_INPUT} font-mono sm:col-span-3`}
                          />
                          <label className="inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[#dfd5c5] bg-[#fdfbf7] px-2 text-[11px] font-semibold text-[#0d1c36] sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={Boolean(item.is_vat)}
                              onChange={(e) => updateLineItem(idx, 'is_vat', e.target.checked)}
                              className="h-3.5 w-3.5 rounded accent-[#163362]"
                            />
                            VAT
                          </label>
                          <div className="col-span-2 flex items-center gap-1.5 sm:col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={item.amount || ''}
                              onChange={(e) =>
                                updateLineItem(idx, 'amount', parseFloat(e.target.value) || 0)
                              }
                              placeholder="₱0.00"
                              className={`${COMPACT_INPUT} border-[#163362]/45 bg-[#fdfbf7] text-right font-bold text-[#0f2344]`}
                            />
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#757982] transition hover:bg-[#fbeaea] hover:text-[#b53636]"
                              title="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Executive Dark Navy & Champagne Live Total Strip */}
                  <div
                    className="mt-3 grid grid-cols-3 gap-2 rounded-2xl p-3.5 text-center text-[#f7f2e8] shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #163362 0%, #071329 100%)',
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-[#dfd0b6] uppercase">
                        VATable
                      </p>
                      <p className="mt-0.5 text-xs font-bold sm:text-sm">{formatPHP(vatTotal)}</p>
                    </div>
                    <div className="border-x border-white/15">
                      <p className="text-[10px] font-semibold tracking-wider text-[#dfd0b6] uppercase">
                        Non-VAT
                      </p>
                      <p className="mt-0.5 text-xs font-bold sm:text-sm">
                        {formatPHP(nonVatTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-[#e6d8bf] uppercase">
                        Grand Total
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-[#fdfbf7] sm:text-base">
                        {formatPHP(reimbursementTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dedicated Official Receipt File Uploader */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleFileDrop}
                  className={`rounded-2xl border-2 border-dashed p-4 transition ${
                    dragActive
                      ? 'border-[#163362] bg-[#ede6d8]'
                      : files.length === 0
                        ? 'border-[#c8bba4] bg-[#f4efe6]/75'
                        : 'border-[#163362]/50 bg-[#ede6d8]/55'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#163362] to-[#071329] text-[#f5efe4]">
                        <Receipt className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#0d1c36]">
                          Upload Official Receipt / BIR Sales Invoice *
                        </p>
                        <p className="text-[11px] text-[#5c6370]">
                          Drag &amp; drop files, browse, or take a photo (JPG, PNG, PDF · Max 10 MB)
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        files.length > 0
                          ? 'bg-[#163362] text-[#f5efe4]'
                          : 'bg-[#fbeaea] text-[#b53636]'
                      }`}
                    >
                      {files.length > 0 ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {files.length} Receipt{files.length === 1 ? '' : 's'} Ready
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5" />
                          Receipt Required
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-4 text-xs font-semibold text-[#f7f2e8] shadow-xs transition hover:from-[#214580] hover:to-[#0d2040]">
                      <Upload className="h-3.5 w-3.5" />
                      Choose Receipt File(s)
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[#163362] bg-[#fdfbf7] px-4 text-xs font-semibold text-[#0d1c36] transition hover:bg-[#ede6d8]">
                      <Camera className="h-3.5 w-3.5 text-[#163362]" />
                      Take Photo (Mobile)
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-[#757982]">
                      Encrypted in private MediQ storage
                    </span>
                  </div>

                  {filePreviews.length > 0 && (
                    <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {filePreviews.map(({ file, isImage, url }, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center gap-2.5 rounded-xl border border-[#dfd5c5] bg-[#fdfbf7] p-2 shadow-2xs"
                        >
                          {isImage && url ? (
                            <img
                              src={url}
                              alt={file.name}
                              className="h-12 w-12 shrink-0 rounded-lg border border-[#dfd5c5] object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#dfd5c5] bg-[#f4efe6] text-[#163362]">
                              <FileText className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[#0d1c36]">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-[#5c6370]">
                              {isImage ? 'Receipt Photo' : 'PDF Invoice'} ·{' '}
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#757982] hover:bg-[#fbeaea] hover:text-[#b53636]"
                            title="Remove receipt"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>Preferred Payout Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className={INPUT_CLS}
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Bank Account / GCash Number *</label>
                    <input
                      type="text"
                      required
                      value={bankOrGcashDetails}
                      onChange={(e) => setBankOrGcashDetails(e.target.value)}
                      placeholder="e.g., BPI 3049-xxxx-xx or GCash 0917-xxx-xxxx"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= 4. OFFICIAL BUSINESS / FIELD WORK ================= */}
            {requestType === 'official_business' && (
              <div className={SECTION_CARD}>
                <span className={SECTION_EYEBROW}>02 · Field Itinerary &amp; Logistics</span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>City / Territory / Region *</label>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g., BGC Taguig / Cebu City / Davao"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>HR Attendance / DTR Credit</label>
                    <select
                      value={dtrCredit}
                      onChange={(e) =>
                        setDtrCredit(e.target.value as 'full_day_ob' | 'partial_day_office')
                      }
                      className={INPUT_CLS}
                    >
                      <option value="full_day_ob">Full Workday OB (No Office Biometric Needed)</option>
                      <option value="partial_day_office">
                        Partial Day OB (Will Punch In/Out at Office)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className={LABEL_CLS}>Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate) setEndDate(e.target.value);
                      }}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>End Date</label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Time Out</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Expected Return</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#0d1c36] uppercase">
                      <MapPin className="h-3.5 w-3.5 text-[#163362]" />
                      Hospital / Doctor / Client Itinerary
                    </span>
                    <button type="button" onClick={addObStop} className={ADD_CHIP_BTN}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Stop
                    </button>
                  </div>
                  <div className="space-y-2">
                    {obItinerary.map((stop, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/45 p-2.5 sm:grid-cols-12"
                      >
                        <input
                          type="time"
                          value={stop.time}
                          onChange={(e) => updateObStop(idx, 'time', e.target.value)}
                          className={`${COMPACT_INPUT} sm:col-span-2`}
                        />
                        <input
                          type="text"
                          required
                          value={stop.hospital_or_client}
                          onChange={(e) => updateObStop(idx, 'hospital_or_client', e.target.value)}
                          placeholder="Hospital / Clinic / Account *"
                          className={`${COMPACT_INPUT} sm:col-span-4`}
                        />
                        <input
                          type="text"
                          value={stop.contact_person}
                          onChange={(e) => updateObStop(idx, 'contact_person', e.target.value)}
                          placeholder="Doctor / Contact Person"
                          className={`${COMPACT_INPUT} sm:col-span-3`}
                        />
                        <div className="flex items-center gap-1.5 sm:col-span-3">
                          <input
                            type="text"
                            value={stop.purpose}
                            onChange={(e) => updateObStop(idx, 'purpose', e.target.value)}
                            placeholder="Purpose / Case"
                            className={COMPACT_INPUT}
                          />
                          <button
                            type="button"
                            onClick={() => removeObStop(idx)}
                            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#757982] hover:bg-[#fbeaea] hover:text-[#b53636]"
                            title="Remove stop"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={LABEL_CLS}>Mode of Transportation</label>
                    <select
                      value={transportationMode}
                      onChange={(e) => setTransportationMode(e.target.value)}
                      className={INPUT_CLS}
                    >
                      {OB_TRANSPORT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {needsVehiclePlate && (
                    <div>
                      <label className={LABEL_CLS}>Vehicle Plate #</label>
                      <input
                        type="text"
                        value={vehiclePlateNo}
                        onChange={(e) => setVehiclePlateNo(e.target.value)}
                        placeholder="e.g., NGA 4821"
                        className={`${INPUT_CLS} font-mono uppercase`}
                      />
                    </div>
                  )}
                  <div>
                    <label className={LABEL_CLS}>Est. Field Budget (PHP, Optional)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={estimatedFieldBudget}
                      onChange={(e) => setEstimatedFieldBudget(e.target.value)}
                      placeholder="0.00"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= 5. CASH ADVANCE & BUDGET ================= */}
            {requestType === 'cash_advance' && (
              <div className={SECTION_CARD}>
                <span className={SECTION_EYEBROW}>02 · Cash Advance Budget &amp; Liquidation</span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={LABEL_CLS}>Trip / Event Location *</label>
                    <input
                      type="text"
                      required
                      value={tripLocation}
                      onChange={(e) => setTripLocation(e.target.value)}
                      placeholder="e.g., Cebu / Davao / SMX Convention"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Date Funds Needed *</label>
                    <input
                      type="date"
                      required
                      value={dateNeeded}
                      onChange={(e) => {
                        setDateNeeded(e.target.value);
                        setLiquidationDate(addDaysIso(e.target.value, 7));
                      }}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Target Liquidation Date *</label>
                    <input
                      type="date"
                      required
                      min={dateNeeded}
                      value={liquidationDate}
                      onChange={(e) => setLiquidationDate(e.target.value)}
                      className={`${INPUT_CLS} border-[#163362]/45 font-semibold`}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wide text-[#0d1c36] uppercase">
                      Itemized Cash Advance Budget (PHP)
                    </span>
                    <button type="button" onClick={addCaItem} className={ADD_CHIP_BTN}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Budget Line
                    </button>
                  </div>
                  <div className="space-y-2">
                    {caBudgetItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-[#dfd5c5] bg-[#f4efe6]/45 p-2.5 sm:grid-cols-12"
                      >
                        <select
                          value={item.category}
                          onChange={(e) => updateCaItem(idx, 'category', e.target.value)}
                          className={`${COMPACT_INPUT} sm:col-span-4`}
                        >
                          {CA_BUDGET_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => updateCaItem(idx, 'description', e.target.value)}
                          placeholder="Details (e.g., 2 nights hotel)"
                          className={`${COMPACT_INPUT} sm:col-span-4`}
                        />
                        <div className="flex items-center gap-1.5 sm:col-span-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.amount || ''}
                            onChange={(e) =>
                              updateCaItem(idx, 'amount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="₱0.00"
                            className={`${COMPACT_INPUT} border-[#163362]/45 bg-[#fdfbf7] text-right font-bold text-[#0f2344]`}
                          />
                          <button
                            type="button"
                            onClick={() => removeCaItem(idx)}
                            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#757982] hover:bg-[#fbeaea] hover:text-[#b53636]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-[#f7f2e8]"
                    style={{
                      background: 'linear-gradient(135deg, #163362 0%, #071329 100%)',
                    }}
                  >
                    <span className="text-xs font-semibold tracking-wider text-[#e6d8bf] uppercase">
                      Total Cash Advance Requested
                    </span>
                    <span className="text-lg font-extrabold tabular-nums">
                      {formatPHP(cashAdvanceTotal)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLS}>Release Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className={INPUT_CLS}
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Bank / GCash Account Details *</label>
                    <input
                      type="text"
                      required
                      value={bankOrGcashDetails}
                      onChange={(e) => setBankOrGcashDetails(e.target.value)}
                      placeholder="Account name & number"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-[#dfd5c5] bg-[#ede6d8]/75 p-3.5 text-xs text-[#0d1c36]">
                  <input
                    type="checkbox"
                    checked={liquidationAccepted}
                    onChange={(e) => setLiquidationAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#163362]"
                  />
                  <span>
                    <strong>Employee Liquidation Undertaking:</strong> I agree to liquidate this
                    cash advance with BIR Official Receipts within <strong>5 working days</strong>{' '}
                    after the activity, or authorize payroll deduction per MediQ Pharma finance
                    policy.
                  </span>
                </label>
              </div>
            )}

            {/* ================= 6. DYNAMIC OTHER HR / ADMIN REQUESTS ================= */}
            {requestType === 'other' && (
              <div className={SECTION_CARD}>
                <span className={SECTION_EYEBROW}>02 · Request Specifications</span>

                {subtype === 'undertime' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <label className={LABEL_CLS}>Undertime Date *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Time Leaving *</label>
                      <input
                        type="time"
                        required
                        value={undertimeDeparture}
                        onChange={(e) => setUndertimeDeparture(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Regular Shift End</label>
                      <input
                        type="time"
                        value={undertimeRegularEnd}
                        onChange={(e) => setUndertimeRegularEnd(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div className="flex flex-col justify-center rounded-xl bg-gradient-to-br from-[#163362] to-[#071329] px-3.5 py-2 text-[#f7f2e8]">
                      <span className="text-[10px] font-semibold tracking-wider text-[#e6d8bf] uppercase">
                        Undertime Hours
                      </span>
                      <span className="mt-0.5 text-lg font-bold tabular-nums">
                        {undertimeHours} hrs
                      </span>
                    </div>
                  </div>
                )}

                {subtype === 'schedule_change' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className={LABEL_CLS}>Adjustment Mode</label>
                        <select
                          value={scheduleWorkMode}
                          onChange={(e) =>
                            setScheduleWorkMode(e.target.value as 'shift_change' | 'wfh' | 'hybrid')
                          }
                          className={INPUT_CLS}
                        >
                          <option value="wfh">Work From Home (WFH)</option>
                          <option value="shift_change">Office Shift Change</option>
                          <option value="hybrid">Hybrid / Flexible Arrangement</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Effective From *</label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (e.target.value > endDate) setEndDate(e.target.value);
                          }}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Effective Until *</label>
                        <input
                          type="date"
                          required
                          min={startDate}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL_CLS}>Current Schedule</label>
                        <input
                          type="text"
                          value={currentSchedule}
                          onChange={(e) => setCurrentSchedule(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Requested Schedule *</label>
                        <input
                          type="text"
                          required
                          value={requestedSchedule}
                          onChange={(e) => setRequestedSchedule(e.target.value)}
                          placeholder="e.g., 7:30 AM – 4:30 PM or WFH on Friday"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {subtype === 'coe' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>COE Purpose *</label>
                      <select
                        value={coePurpose}
                        onChange={(e) => setCoePurpose(e.target.value)}
                        className={INPUT_CLS}
                      >
                        {COE_PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>
                        Addressed To (Embassy / Bank / Institution)
                      </label>
                      <input
                        type="text"
                        value={coeAddressedTo}
                        onChange={(e) => setCoeAddressedTo(e.target.value)}
                        placeholder="e.g., Embassy of Japan / BPI / To Whom It May Concern"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Delivery Format</label>
                      <select
                        value={coeFormat}
                        onChange={(e) =>
                          setCoeFormat(e.target.value as 'digital_pdf' | 'printed_copy')
                        }
                        className={INPUT_CLS}
                      >
                        <option value="digital_pdf">Signed Digital PDF (Email)</option>
                        <option value="printed_copy">Printed Hard Copy (Wet Signature)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-[#dfd5c5] bg-[#f4efe6]/70 px-3.5 py-2.5 text-xs font-semibold text-[#0d1c36]">
                        <input
                          type="checkbox"
                          checked={coeWithComp}
                          onChange={(e) => setCoeWithComp(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#163362]"
                        />
                        Include Annual / Monthly Compensation
                      </label>
                    </div>
                  </div>
                )}

                {subtype === 'payslip_copy' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLS}>Document Type *</label>
                      <select
                        value={payrollDocType}
                        onChange={(e) => setPayrollDocType(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="Monthly Payslips">Official Monthly Payslips</option>
                        <option value="BIR Form 2316">BIR Form 2316 (ITR)</option>
                        <option value="Government Contributions Summary">
                          SSS / PhilHealth / Pag-IBIG Summary
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Coverage Period / Tax Year *</label>
                      <input
                        type="text"
                        required
                        value={payrollCoverage}
                        onChange={(e) => setPayrollCoverage(e.target.value)}
                        placeholder="e.g., Aug–Oct 2026 or Full Year 2025"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                )}

                {subtype === 'supply_it' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={LABEL_CLS}>Item Category</label>
                      <select
                        value={supplyCategory}
                        onChange={(e) => setSupplyCategory(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="Laptop / IT Support">Laptop / IT Support</option>
                        <option value="Clinical Demo Kit / Brochure">
                          Clinical Demo Kit / Brochures
                        </option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Company ID / Uniform">Company ID / Uniform</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Quantity / Spec</label>
                      <input
                        type="text"
                        value={supplyQuantity}
                        onChange={(e) => setSupplyQuantity(e.target.value)}
                        placeholder="e.g., 2 boxes / 1 laptop charger"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Date Needed</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                )}

                {subtype === 'general_request' && (
                  <div>
                    <label className={LABEL_CLS}>Effective / Needed Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={`${INPUT_CLS} max-w-xs`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section 03: Reason / Detailed Notes & Supporting Attachments */}
            <div className={SECTION_CARD}>
              <span className={SECTION_EYEBROW}>
                03 · Justification{requestType !== 'reimbursement' ? ', Attachments' : ''} &amp;
                E-Signature
              </span>

              <div>
                <label className={LABEL_CLS}>Reason / Detailed Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write complete details so HR, Boss, or Accounting can approve without follow-up..."
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>

              {/* Supporting Attachment Upload for Non-Reimbursement Forms */}
              {requestType !== 'reimbursement' && (
                <div>
                  {requiresMedCert && (
                    <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-[#e8c6c6] bg-[#fbeaea] px-3.5 py-3 text-xs text-[#7c1d1d]">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b53636]" />
                      <div>
                        <p className="font-bold">Medical Certificate Required (2+ Day Sick Leave)</p>
                        <p className="mt-0.5">
                          Upload a clear photo or PDF of your doctor&apos;s medical certificate to
                          submit this Sick Leave application.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleFileDrop}
                    className={`rounded-2xl border-2 border-dashed p-4 transition ${
                      dragActive
                        ? 'border-[#163362] bg-[#ede6d8]'
                        : attachmentRequired && files.length === 0
                          ? 'border-[#d49a9a] bg-[#fbeaea]/50'
                          : 'border-[#c8bba4] bg-[#f4efe6]/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d1c36]">
                        <Paperclip className="h-3.5 w-3.5 text-[#163362]" />
                        {requiresMedCert
                          ? 'Upload Medical Certificate * (JPG, PNG, PDF · Max 10 MB)'
                          : 'Attach Supporting Documents (Optional · JPG, PNG, PDF · Max 10 MB)'}
                      </span>
                      {attachmentRequired && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            files.length > 0
                              ? 'bg-[#163362] text-[#f5efe4]'
                              : 'bg-[#fbeaea] text-[#b53636]'
                          }`}
                        >
                          {files.length > 0 ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              {files.length} attached
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              Required
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-3.5 text-xs font-semibold text-[#f7f2e8]">
                        <Upload className="h-3.5 w-3.5" />
                        Browse Files
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[#163362] bg-[#fdfbf7] px-3.5 text-xs font-semibold text-[#0d1c36] hover:bg-[#ede6d8]">
                        <Camera className="h-3.5 w-3.5 text-[#163362]" />
                        Take Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {filePreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {filePreviews.map(({ file, isImage, url }, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center gap-2.5 rounded-xl border border-[#dfd5c5] bg-[#fdfbf7] p-2"
                          >
                            {isImage && url ? (
                              <img
                                src={url}
                                alt={file.name}
                                className="h-11 w-11 shrink-0 rounded-lg border border-[#dfd5c5] object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#dfd5c5] bg-[#f4efe6] text-[#163362]">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-[#0d1c36]">
                                {file.name}
                              </p>
                              <p className="text-[11px] text-[#5c6370]">
                                {(file.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#757982] hover:bg-[#fbeaea] hover:text-[#b53636]"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Employee Digital E-Signature */}
              <SignaturePad
                signerName={profile.full_name}
                initialSignature={profile.signature_data || profile.full_name}
                onChange={handleSignatureChange}
                compact
              />
            </div>
          </div>

          {/* Sticky Dark Navy & Beige Submit Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#dfd5c5] bg-[#ede6d8]/75 px-5 py-3.5 sm:px-6">
            <span className="hidden text-xs font-medium text-[#5c6370] sm:inline">
              Encrypted live sync · Routed to {formMeta.routedTo}
            </span>
            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 cursor-pointer rounded-full border-[1.5px] border-[#163362] bg-[#fdfbf7] px-5 text-xs font-semibold text-[#0d1c36] transition hover:bg-[#ede6d8] sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-6 text-xs font-semibold text-[#f7f2e8] shadow-sm transition hover:from-[#214580] hover:to-[#0d2040] disabled:opacity-60 sm:flex-none"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {submitting
                  ? `Submitting ${formMeta.shortLabel}...`
                  : `Sign & Submit ${formMeta.shortLabel} Form`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
