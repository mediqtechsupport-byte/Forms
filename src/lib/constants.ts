import type { FormRequest, RequestStatus, RequestType, UserRole } from '../types/database';

export const DEPARTMENTS = [
  'Executive',
  'Sales & Territory',
  'Clinical Applications',
  'Marketing',
  'Regulatory & Quality Assurance',
  'Logistics & Supply Chain',
  'Human Resources & Admin',
  'Finance & Accounting',
  'IT & Technical Support',
  'Operations',
] as const;

export const ROLE_META: Record<
  UserRole,
  { label: string; shortLabel: string; badgeClass: string; description: string; homePath: string }
> = {
  employee: {
    label: 'Employee',
    shortLabel: 'Employee',
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    description: 'Submit paperless digital forms, upload receipts, and track real-time approvals.',
    homePath: '/employee',
  },
  hr: {
    label: 'HR Admin',
    shortLabel: 'HR Admin',
    badgeClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    description: 'Manage Leave, Overtime, Official Business, Employee Directory & Leave Credits.',
    homePath: '/hr',
  },
  boss: {
    label: 'Boss / Executive',
    shortLabel: 'Boss Admin',
    badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    description: 'Executive sign-off across all company digital forms, spending & staff roles.',
    homePath: '/boss',
  },
  accounting: {
    label: 'Accounting Admin',
    shortLabel: 'Accounting',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    description: 'Verify receipts, release reimbursements & cash advances, and export OT payroll.',
    homePath: '/accounting',
  },
};

export const REQUEST_TYPE_META: Record<
  RequestType,
  {
    label: string;
    shortLabel: string;
    formCode: string;
    colorClass: string;
    bgSoft: string;
    description: string;
    routedTo: string;
  }
> = {
  leave: {
    label: 'Leave Application',
    shortLabel: 'Leave',
    formCode: 'MQ-HR-01',
    colorClass: 'text-sky-700 bg-sky-50 ring-1 ring-sky-200/80',
    bgSoft: 'bg-sky-500',
    description: 'Vacation, Sick, Emergency, Maternity/Paternity, or Unpaid Leave',
    routedTo: 'HR First → Boss',
  },
  overtime: {
    label: 'Overtime Authorization',
    shortLabel: 'Overtime',
    formCode: 'MQ-HR-02',
    colorClass: 'text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200/80',
    bgSoft: 'bg-indigo-500',
    description: 'Regular weekday, rest day, or holiday overtime hours',
    routedTo: 'HR & Accounting First → Boss',
  },
  reimbursement: {
    label: 'Expense Reimbursement',
    shortLabel: 'Reimbursement',
    formCode: 'MQ-FIN-01',
    colorClass: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/80',
    bgSoft: 'bg-emerald-500',
    description: 'Travel, client meals, fuel/parking, supplies, or clinical expenses',
    routedTo: 'Accounting First → Boss',
  },
  official_business: {
    label: 'Official Business / Field Work',
    shortLabel: 'Official Business',
    formCode: 'MQ-OPS-01',
    colorClass: 'text-cyan-700 bg-cyan-50 ring-1 ring-cyan-200/80',
    bgSoft: 'bg-cyan-500',
    description: 'Hospital visits, client meetings, surgical support, conferences',
    routedTo: 'HR First → Boss',
  },
  cash_advance: {
    label: 'Cash Advance',
    shortLabel: 'Cash Advance',
    formCode: 'MQ-FIN-02',
    colorClass: 'text-amber-800 bg-amber-50 ring-1 ring-amber-200/80',
    bgSoft: 'bg-amber-500',
    description: 'Field travel allowance, event funds, or petty cash advance',
    routedTo: 'Accounting First → Boss',
  },
  other: {
    label: 'Other HR / Admin Request',
    shortLabel: 'Other Request',
    formCode: 'MQ-ADM-01',
    colorClass: 'text-slate-700 bg-slate-100 ring-1 ring-slate-200',
    bgSoft: 'bg-slate-600',
    description: 'COE, schedule change, undertime, or general admin memo',
    routedTo: 'HR First → Boss',
  },
};

/**
 * Returns true ONLY when initial Stage-1 approval is complete
 * (HR for HR forms, Accounting for money forms, or both for Overtime)
 * so the request is ready for final Boss Executive sign-off.
 */
export function isReadyForBoss(r: FormRequest): boolean {
  if (r.boss_status !== 'pending') return false;
  if (['rejected', 'cancelled'].includes(r.status)) return false;
  if (r.hr_status !== 'not_required' && !['endorsed', 'approved'].includes(r.hr_status)) {
    return false;
  }
  if (
    r.accounting_status !== 'not_required' &&
    !['verified', 'paid'].includes(r.accounting_status)
  ) {
    return false;
  }
  return true;
}

/**
 * Human-readable Stage-1 waiting message when a request hasn't reached Boss yet.
 */
export function getBossWaitReason(r: FormRequest): string | null {
  if (r.boss_status !== 'pending' || ['rejected', 'cancelled'].includes(r.status)) return null;
  const needHr = r.hr_status === 'pending';
  const needAcct = r.accounting_status === 'pending';
  if (needHr && needAcct) return 'Awaiting HR & Accounting approval first';
  if (needHr) return 'Awaiting HR approval first';
  if (needAcct) return 'Awaiting Accounting approval first';
  return null;
}

export const STATUS_META: Record<
  RequestStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: 'Pending Review',
    badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    dotClass: 'bg-amber-500',
  },
  hr_endorsed: {
    label: 'HR Endorsed',
    badgeClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    dotClass: 'bg-violet-500',
  },
  accounting_verified: {
    label: 'Accounting Verified',
    badgeClass: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
    dotClass: 'bg-cyan-500',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  paid: {
    label: 'Disbursed / Paid',
    badgeClass: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200',
    dotClass: 'bg-teal-600',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    dotClass: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export const SUBTYPE_OPTIONS: Record<RequestType, { value: string; label: string }[]> = {
  leave: [
    { value: 'vacation', label: 'Vacation Leave (VL)' },
    { value: 'sick', label: 'Sick Leave (SL)' },
    { value: 'emergency', label: 'Emergency Leave (EL)' },
    { value: 'maternity_paternity', label: 'Maternity / Paternity Leave' },
    { value: 'bereavement', label: 'Bereavement Leave' },
    { value: 'unpaid', label: 'Leave Without Pay (LWOP)' },
  ],
  overtime: [
    { value: 'regular_ot', label: 'Regular Workday Overtime' },
    { value: 'rest_day_ot', label: 'Rest Day / Weekend Overtime' },
    { value: 'special_holiday_ot', label: 'Special Non-Working Holiday OT' },
    { value: 'regular_holiday_ot', label: 'Regular Holiday OT' },
  ],
  reimbursement: [
    { value: 'travel_transport', label: 'Travel, Grab & Commute' },
    { value: 'fuel_parking_toll', label: 'Fuel, Parking & Toll Fees' },
    { value: 'meals_client', label: 'Client / Doctor Representation & Meals' },
    { value: 'hotel_lodging', label: 'Hotel & Provincial Accommodation' },
    { value: 'medical_clinical', label: 'Clinical / Surgical Support Supplies' },
    { value: 'office_supplies', label: 'Office Supplies & Printing' },
    { value: 'communication', label: 'Mobile Load & Internet' },
    { value: 'other_expense', label: 'Other Approved Business Expense' },
  ],
  official_business: [
    { value: 'hospital_support', label: 'Hospital / Operating Room Support' },
    { value: 'client_visit', label: 'Doctor / Clinic Sales Visit' },
    { value: 'conference_training', label: 'Medical Conference / Training' },
    { value: 'regulatory_errand', label: 'FDA / Government / Bank Errand' },
    { value: 'provincial_field', label: 'Provincial Field Work (Luzon / Visayas / Mindanao)' },
  ],
  cash_advance: [
    { value: 'travel_advance', label: 'Provincial Travel Allowance' },
    { value: 'event_advance', label: 'Event / Booth / Seminar Advance' },
    { value: 'petty_cash', label: 'Operational Petty Cash' },
  ],
  other: [
    { value: 'undertime', label: 'Undertime Permit' },
    { value: 'schedule_change', label: 'Work Schedule / WFH Adjustment' },
    { value: 'coe', label: 'Certificate of Employment (COE)' },
    { value: 'payslip_copy', label: 'Official Payslip / BIR 2316 Copy' },
    { value: 'supply_it', label: 'IT / Equipment / Office Supply Request' },
    { value: 'general_request', label: 'General HR / Admin Request' },
  ],
};

export const DOLE_OT_RATES: Record<string, { multiplier: string; note: string }> = {
  regular_ot: { multiplier: '1.25x', note: 'Ordinary workday overtime (+25%)' },
  rest_day_ot: { multiplier: '1.30x / 1.69x', note: 'Rest day (1.30x first 8h; 1.69x OT)' },
  special_holiday_ot: { multiplier: '1.30x / 1.69x', note: 'Special non-working day (+30%)' },
  regular_holiday_ot: { multiplier: '2.00x / 2.60x', note: 'Regular holiday (200% / 260% OT)' },
};

export const EXPENSE_COST_CENTERS = [
  'Hospital Case / OR Support',
  'Doctor Call & Sales Representation',
  'Provincial Field Work (Luzon / Visayas / Mindanao)',
  'Conference, Booth & Marketing Events',
  'Warehouse, Cold-Chain & Logistics',
  'Regulatory / FDA & Government',
  'Office Operations & Admin',
] as const;

export const EXPENSE_LINE_CATEGORIES = [
  'Meals & Client Representation',
  'Fuel, Toll & Parking',
  'Grab, Taxi & Commute',
  'Flights & Hotel Accommodation',
  'Clinical / Surgical Support Supplies',
  'Office Supplies & Printing',
  'Mobile Load & Internet',
  'Other Business Expense',
] as const;

export const CA_BUDGET_CATEGORIES = [
  'Hotel & Accommodation',
  'Airfare & Provincial Transport',
  'Per Diem & Meals',
  'Doctor / Client Representation',
  'Event / Booth / Clinical Supplies',
  'Fuel, Toll & Local Transfers',
  'Miscellaneous / Contingency',
] as const;

export const OB_TRANSPORT_MODES = [
  'Company Vehicle',
  'Personal Vehicle (Fuel Reimbursable)',
  'Grab / Taxi / Ride-Hailing',
  'Provincial Flight + Airport Transfer',
  'Public Transport / Bus / Ferry',
] as const;

export const COE_PURPOSES = [
  'Visa / Travel Application',
  'Bank Loan / Financing',
  'Credit Card Application',
  'Condo / Housing Lease',
  'Government / Embassy Requirement',
  'Personal Record',
] as const;

export function getPayrollCutoffOptions(): string[] {
  const now = new Date();
  const months = [-1, 0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const label = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return [`${label} (1–15)`, `${label} (16–${lastDay})`];
  });
  return months.flat();
}

export function getDefaultPayrollCutoff(): string {
  const now = new Date();
  const label = now.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() <= 15 ? `${label} (1–15)` : `${label} (16–${lastDay})`;
}

export function addDaysIso(dateIso: string, days: number): string {
  if (!dateIso) return '';
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash / E-Wallet',
  check: 'Company Check',
  cash: 'Petty Cash',
  payroll: 'Include in Payroll',
};

export function formatPHP(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parsed = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getSubtypeLabel(type: RequestType, subtype: string | null): string {
  if (!subtype) return 'General';
  const found = SUBTYPE_OPTIONS[type]?.find((item) => item.value === subtype);
  return found ? found.label : subtype.replace(/_/g, ' ');
}

export function calculateBusinessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count || 1;
}

export function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  let diffMin = eh * 60 + em - (sh * 60 + sm);
  if (diffMin < 0) diffMin += 24 * 60; // overnight OT
  return Math.round((diffMin / 60) * 100) / 100;
}

export function exportRequestsToCsv(
  filename: string,
  rows: {
    reference_no: string;
    employee_name: string;
    employee_code: string;
    department: string;
    request_type: string;
    subtype: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
    total_days: string;
    total_hours: string;
    amount: string;
    receipt_or_number: string;
    disbursement_reference: string;
    created_at: string;
  }[]
) {
  const headers = [
    'Reference No',
    'Employee',
    'Employee ID',
    'Department',
    'Form Type',
    'Category',
    'Title',
    'Status',
    'Start Date',
    'End Date',
    'Days',
    'Hours',
    'Amount (PHP)',
    'Receipt/OR #',
    'Disbursement Ref',
    'Submitted At',
  ];
  const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.reference_no,
        r.employee_name,
        r.employee_code,
        r.department,
        r.request_type,
        r.subtype,
        r.title,
        r.status,
        r.start_date,
        r.end_date,
        r.total_days,
        r.total_hours,
        r.amount,
        r.receipt_or_number,
        r.disbursement_reference,
        r.created_at,
      ]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
