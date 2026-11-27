import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import {
  REQUEST_TYPE_META,
  STATUS_META,
  formatDate,
  formatDateTime,
  formatPHP,
  getSubtypeLabel,
} from '@/lib/constants';
import { fetchHistoryExportArchives, saveHistoryExportArchive } from '@/lib/api';
import { useAppData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import type {
  FormRequest,
  HistoryExportArchive,
  HistoryExportSnapshotRow,
  Profile,
  RequestType,
} from '@/types/database';

/* -------------------------------------------------------------------------- */
/*                               Helper Builders                              */
/* -------------------------------------------------------------------------- */

function escapeHtml(val: string | number | null | undefined): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSnapshotRow(r: FormRequest): HistoryExportSnapshotRow {
  return {
    reference_no: r.reference_no,
    created_at: r.created_at,
    employee_name: r.employee?.full_name ?? 'Employee',
    employee_code: r.employee?.employee_code ?? '—',
    department: r.employee?.department ?? '—',
    request_type: r.request_type,
    request_type_label: REQUEST_TYPE_META[r.request_type].label,
    subtype_label: getSubtypeLabel(r.request_type, r.subtype),
    title: r.title,
    description: r.description ?? '',
    status: r.status,
    priority: r.priority,
    start_date: r.start_date ?? r.expense_date ?? null,
    end_date: r.end_date ?? null,
    total_days: r.total_days != null ? Number(r.total_days) : null,
    total_hours: r.total_hours != null ? Number(r.total_hours) : null,
    amount: r.amount != null ? Number(r.amount) : null,
    receipt_or_number: r.receipt_or_number ?? null,
    disbursement_reference: r.disbursement_reference ?? null,
    hr_status: r.hr_status,
    hr_reviewer_name: r.hr_reviewer?.full_name ?? null,
    hr_reviewed_at: r.hr_reviewed_at ?? null,
    hr_remarks: r.hr_remarks ?? null,
    accounting_status: r.accounting_status,
    accounting_reviewer_name: r.accounting_reviewer?.full_name ?? null,
    accounting_reviewed_at: r.accounting_reviewed_at ?? null,
    accounting_remarks: r.accounting_remarks ?? null,
    boss_status: r.boss_status,
    boss_reviewer_name: r.boss_reviewer?.full_name ?? null,
    boss_reviewed_at: r.boss_reviewed_at ?? null,
    boss_remarks: r.boss_remarks ?? null,
  };
}

function downloadSnapshotCsv(filename: string, rows: HistoryExportSnapshotRow[]) {
  const flatRows: Record<string, string>[] = rows.map((r) => ({
    reference_no: r.reference_no,
    date_filed: formatDateTime(r.created_at),
    employee_name: r.employee_name,
    employee_code: r.employee_code,
    department: r.department,
    form_type: r.request_type_label,
    subtype: r.subtype_label,
    title: r.title,
    description: r.description,
    priority: r.priority.toUpperCase(),
    status: STATUS_META[r.status]?.label ?? r.status,
    boss_locked: r.boss_status === 'approved' ? 'YES (LOCKED)' : 'NO',
    start_or_expense_date: r.start_date ?? '',
    end_date: r.end_date ?? '',
    total_days: r.total_days != null ? String(r.total_days) : '',
    total_hours: r.total_hours != null ? String(r.total_hours) : '',
    amount_php: r.amount != null ? String(r.amount) : '',
    receipt_or_number: r.receipt_or_number ?? '',
    disbursement_reference: r.disbursement_reference ?? '',
    hr_status: r.hr_status,
    hr_reviewer: r.hr_reviewer_name ?? '',
    hr_reviewed_at: r.hr_reviewed_at ? formatDateTime(r.hr_reviewed_at) : '',
    hr_remarks: r.hr_remarks ?? '',
    accounting_status: r.accounting_status,
    accounting_reviewer: r.accounting_reviewer_name ?? '',
    accounting_reviewed_at: r.accounting_reviewed_at
      ? formatDateTime(r.accounting_reviewed_at)
      : '',
    accounting_remarks: r.accounting_remarks ?? '',
    boss_status: r.boss_status,
    boss_reviewer: r.boss_reviewer_name ?? '',
    boss_reviewed_at: r.boss_reviewed_at ? formatDateTime(r.boss_reviewed_at) : '',
    boss_remarks: r.boss_remarks ?? '',
  }));

  const headers =
    flatRows.length > 0
      ? Object.keys(flatRows[0])
      : ['reference_no', 'date_filed', 'employee_name', 'form_type', 'title', 'status'];
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(csvEscape).join(','),
    ...flatRows.map((row) => headers.map((h) => csvEscape(row[h] ?? '')).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Prints a clean multi-page Official MediQ Corporate Employee History Report
 * using a hidden iframe (never blocked by popup blockers, zero dashboard chrome).
 */
function printHistoryReport(params: {
  archiveCode: string;
  reportTitle: string;
  targetEmployeeName: string;
  targetEmployeeCode: string | null;
  targetDepartment?: string | null;
  targetPosition?: string | null;
  exportedByName: string;
  exportedByRole: string;
  exportedAt: string;
  notes?: string | null;
  rows: HistoryExportSnapshotRow[];
  totalLeaveDays: number;
  totalOtHours: number;
  totalAmount: number;
}) {
  const logoUrl = new URL('./brand/mediq-logo-official.png', window.location.href).href;
  const lockedCount = params.rows.filter((r) => r.boss_status === 'approved').length;

  const tableRowsHtml =
    params.rows.length === 0
      ? `<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">No employee form requests matched this archive filter.</td></tr>`
      : params.rows
          .map((r) => {
            const metricParts: string[] = [];
            if (r.total_days != null) metricParts.push(`${r.total_days}d`);
            if (r.total_hours != null) metricParts.push(`${r.total_hours}h OT`);
            if (r.amount != null) metricParts.push(formatPHP(r.amount));
            if (r.start_date) {
              metricParts.push(
                r.end_date && r.end_date !== r.start_date
                  ? `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`
                  : formatDate(r.start_date)
              );
            }
            if (r.receipt_or_number) metricParts.push(`OR: ${r.receipt_or_number}`);
            if (r.disbursement_reference) metricParts.push(`Ref: ${r.disbursement_reference}`);

            const approvals: string[] = [];
            if (r.hr_status !== 'not_required') {
              approvals.push(
                `HR: ${r.hr_status}${r.hr_reviewer_name ? ` (${r.hr_reviewer_name})` : ''}`
              );
            }
            if (r.accounting_status !== 'not_required') {
              approvals.push(
                `Acct: ${r.accounting_status}${
                  r.accounting_reviewer_name ? ` (${r.accounting_reviewer_name})` : ''
                }`
              );
            }
            approvals.push(
              `Boss: ${r.boss_status}${r.boss_reviewer_name ? ` (${r.boss_reviewer_name})` : ''}`
            );

            const statusLabel = STATUS_META[r.status]?.label ?? r.status;
            const lockedTag =
              r.boss_status === 'approved'
                ? `<div class="lock-tag">LOCKED · HISTORY</div>`
                : '';

            return `
              <tr>
                <td class="mono nowrap"><strong>${escapeHtml(r.reference_no)}</strong><div class="sub">${escapeHtml(
                  formatDate(r.created_at)
                )}</div></td>
                <td><strong>${escapeHtml(r.employee_name)}</strong><div class="sub">${escapeHtml(
                  r.employee_code
                )} · ${escapeHtml(r.department)}</div></td>
                <td><strong>${escapeHtml(r.request_type_label)}</strong><div class="sub">${escapeHtml(
                  r.subtype_label
                )}</div></td>
                <td><strong>${escapeHtml(r.title)}</strong>${
                  r.description
                    ? `<div class="sub">${escapeHtml(r.description.slice(0, 140))}${
                        r.description.length > 140 ? '…' : ''
                      }</div>`
                    : ''
                }</td>
                <td class="nowrap">${escapeHtml(metricParts.join(' · ') || '—')}</td>
                <td class="approvals">${approvals.map((a) => `<div>${escapeHtml(a)}</div>`).join('')}</td>
                <td class="center nowrap"><span class="pill pill-${escapeHtml(r.status)}">${escapeHtml(
                  statusLabel
                )}</span>${lockedTag}</td>
              </tr>`;
          })
          .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(params.archiveCode)} — ${escapeHtml(params.reportTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #0d1c36;
      background: #ffffff;
      font-size: 10.5px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #0f2344;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { height: 36px; width: auto; object-fit: contain; }
    .brand-meta { border-left: 1.5px solid #dfd5c5; padding-left: 14px; }
    .kicker { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #163362; }
    h1 { margin: 2px 0 2px; font-size: 16px; font-weight: 800; color: #0d1c36; }
    .sub-head { font-size: 10px; color: #5c5951; }
    .archive-box {
      text-align: right;
      border: 1.5px solid #0f2344;
      border-radius: 8px;
      padding: 6px 12px;
      background: #f4efe6;
    }
    .archive-code { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 800; color: #0f2344; }
    .archive-sub { font-size: 9px; color: #5c5951; margin-top: 2px; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .meta-card {
      border: 1px solid #dfd5c5;
      border-radius: 10px;
      padding: 8px 10px;
      background: #fdfbf7;
    }
    .meta-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #646159; }
    .meta-val { font-size: 13px; font-weight: 800; color: #0d1c36; margin-top: 2px; }
    .meta-note { font-size: 9px; color: #646159; }
    .notes-box {
      border: 1px solid #dfd5c5;
      background: #f4efe6;
      border-radius: 8px;
      padding: 7px 10px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    table { width: 100%; border-collapse: collapse; border: 1px solid #dfd5c5; }
    thead { display: table-header-group; }
    th {
      background: #0f2344;
      color: #f5efe4;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 7px 8px;
      border: 1px solid #0f2344;
    }
    td {
      padding: 7px 8px;
      border: 1px solid #e5ddd0;
      vertical-align: top;
      font-size: 9.8px;
    }
    tr { break-inside: avoid; page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #fdfbf7; }
    .mono { font-family: ui-monospace, monospace; }
    .nowrap { white-space: nowrap; }
    .center { text-align: center; }
    .sub { font-size: 8.8px; color: #646159; margin-top: 2px; }
    .approvals div { font-size: 8.8px; color: #334155; }
    .pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 8.5px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #0f172a;
    }
    .pill-approved, .pill-paid { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .pill-rejected { background: #fff1f2; color: #9f1239; border-color: #fecdd3; }
    .pill-pending, .pill-hr_endorsed, .pill-accounting_verified { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .lock-tag {
      margin-top: 3px;
      font-size: 7.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #163362;
    }
    .footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1.5px solid #dfd5c5;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #5c5951;
      break-inside: avoid;
    }
    .sig-line {
      min-width: 220px;
      border-top: 1px solid #0f2344;
      padding-top: 4px;
      text-align: center;
      color: #0d1c36;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${escapeHtml(logoUrl)}" alt="MediQ Pharma" />
      <div class="brand-meta">
        <div class="kicker">MediQ Pharma · Official Employee Request History Archive</div>
        <h1>${escapeHtml(params.reportTitle)}</h1>
        <div class="sub-head">
          Scope: <strong>${escapeHtml(params.targetEmployeeName)}</strong>${
            params.targetEmployeeCode ? ` (${escapeHtml(params.targetEmployeeCode)})` : ''
          }${params.targetDepartment ? ` · ${escapeHtml(params.targetDepartment)}` : ''}
          · Generated ${escapeHtml(formatDateTime(params.exportedAt))}
        </div>
      </div>
    </div>
    <div class="archive-box">
      <div class="archive-code">${escapeHtml(params.archiveCode)}</div>
      <div class="archive-sub">Exported by ${escapeHtml(params.exportedByName)} (${escapeHtml(
        params.exportedByRole.toUpperCase()
      )})</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Total Forms Archived</div>
      <div class="meta-val">${params.rows.length}</div>
      <div class="meta-note">${lockedCount} Boss-approved (locked)</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Total Leave Days</div>
      <div class="meta-val">${params.totalLeaveDays.toFixed(1)} days</div>
      <div class="meta-note">Across included leave slips</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Total Overtime Hours</div>
      <div class="meta-val">${params.totalOtHours.toFixed(1)} hrs</div>
      <div class="meta-note">Across included OT slips</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Total Financial Claims</div>
      <div class="meta-val">${escapeHtml(formatPHP(params.totalAmount))}</div>
      <div class="meta-note">Reimbursements &amp; Cash Advances</div>
    </div>
  </div>

  ${
    params.notes
      ? `<div class="notes-box"><strong>Archive Notes:</strong> ${escapeHtml(params.notes)}</div>`
      : ''
  }

  <table>
    <thead>
      <tr>
        <th>Reference #</th>
        <th>Employee</th>
        <th>Form Type</th>
        <th>Subject &amp; Particulars</th>
        <th>Metrics / Dates / OR #</th>
        <th>Approval Chain</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <strong>MediQ Pharma Paperless Forms &amp; Approval System</strong><br />
      Permanent Database Snapshot: ${escapeHtml(params.archiveCode)} · Verified Live Supabase Record
    </div>
    <div class="sig-line">
      <strong>${escapeHtml(params.exportedByName)}</strong><br />
      <span style="font-size:8.5px;color:#5c5951;">Certified By (${escapeHtml(
        params.exportedByRole.toUpperCase()
      )}) · ${escapeHtml(formatDate(params.exportedAt))}</span>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1500);
    }
  };

  // Wait briefly for the official logo image to load inside the print frame
  const img = doc.querySelector('img');
  if (img && !img.complete) {
    img.onload = triggerPrint;
    img.onerror = triggerPrint;
    window.setTimeout(triggerPrint, 800);
  } else {
    window.setTimeout(triggerPrint, 120);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Modal Component                              */
/* -------------------------------------------------------------------------- */

export interface EmployeeHistoryExportModalProps {
  open: boolean;
  onClose: () => void;
  portalRole: 'boss' | 'hr';
  requests: FormRequest[];
  profiles: Profile[];
  initialEmployeeId?: string | null;
}

export function EmployeeHistoryExportModal({
  open,
  onClose,
  portalRole,
  requests,
  profiles,
  initialEmployeeId = null,
}: EmployeeHistoryExportModalProps) {
  const { activeProfile } = useAppData();
  const { toast } = useToast();

  const [tab, setTab] = useState<'builder' | 'archives'>('builder');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId ?? 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');

  const [archives, setArchives] = useState<HistoryExportArchive[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedEmpId(initialEmployeeId ?? 'all');
      setTab('builder');
      setLastSavedCode(null);
      setCustomTitle('');
      setNotes('');
    }
  }, [open, initialEmployeeId]);

  const loadArchives = useCallback(async () => {
    setLoadingArchives(true);
    try {
      const list = await fetchHistoryExportArchives();
      setArchives(list);
    } catch (err) {
      toast(
        'Could not load saved archives',
        err instanceof Error ? err.message : 'Please try again.',
        'error'
      );
    } finally {
      setLoadingArchives(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      void loadArchives();
    }
  }, [open, loadArchives]);

  const selectedProfile = useMemo(
    () => (selectedEmpId === 'all' ? null : profiles.find((p) => p.id === selectedEmpId) ?? null),
    [selectedEmpId, profiles]
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (selectedEmpId !== 'all' && r.employee_id !== selectedEmpId) return false;
      if (typeFilter !== 'all' && r.request_type !== (typeFilter as RequestType)) return false;
      if (statusFilter === 'boss_approved' && r.boss_status !== 'approved') return false;
      if (
        statusFilter === 'pending' &&
        (r.boss_status === 'approved' || ['rejected', 'cancelled'].includes(r.status))
      )
        return false;
      if (statusFilter === 'closed' && !['rejected', 'cancelled'].includes(r.status)) return false;

      const createdDay = r.created_at.slice(0, 10);
      if (dateFrom && createdDay < dateFrom) return false;
      if (dateTo && createdDay > dateTo) return false;
      return true;
    });
  }, [requests, selectedEmpId, typeFilter, statusFilter, dateFrom, dateTo]);

  const snapshotRows = useMemo(() => filteredRequests.map(toSnapshotRow), [filteredRequests]);

  const summary = useMemo(() => {
    let leaveDays = 0;
    let otHours = 0;
    let amount = 0;
    let locked = 0;
    for (const r of snapshotRows) {
      if (r.request_type === 'leave' && r.total_days != null) leaveDays += Number(r.total_days);
      if (r.request_type === 'overtime' && r.total_hours != null) otHours += Number(r.total_hours);
      if (r.amount != null) amount += Number(r.amount);
      if (r.boss_status === 'approved') locked += 1;
    }
    return { leaveDays, otHours, amount, locked };
  }, [snapshotRows]);

  const computedTitle = useMemo(() => {
    if (customTitle.trim()) return customTitle.trim();
    const who = selectedProfile
      ? `${selectedProfile.full_name} (${selectedProfile.employee_code})`
      : 'All Employees';
    return `Employee Form History — ${who}`;
  }, [customTitle, selectedProfile]);

  // Guard strictly AFTER all hooks
  if (!open) return null;

  const saveSnapshot = async (): Promise<HistoryExportArchive | null> => {
    if (!activeProfile) return null;
    setSaving(true);
    try {
      const saved = await saveHistoryExportArchive({
        exported_by: activeProfile.id,
        exported_by_name: activeProfile.full_name,
        exported_by_role: portalRole,
        target_employee_id: selectedProfile?.id ?? null,
        target_employee_name: selectedProfile?.full_name ?? 'All Employees',
        target_employee_code: selectedProfile?.employee_code ?? null,
        report_title: computedTitle,
        filter_summary: {
          statusFilter,
          typeFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        record_count: snapshotRows.length,
        total_leave_days: Number(summary.leaveDays.toFixed(2)),
        total_ot_hours: Number(summary.otHours.toFixed(2)),
        total_amount: Number(summary.amount.toFixed(2)),
        snapshot_rows: snapshotRows,
        notes: notes.trim() || null,
      });
      setLastSavedCode(saved.archive_code);
      setArchives((prev) => [saved, ...prev]);
      toast(
        `Saved to Database (${saved.archive_code})`,
        `${saved.record_count} employee request ${
          saved.record_count === 1 ? 'record' : 'records'
        } permanently archived in Supabase.`
      );
      return saved;
    } catch (err) {
      toast(
        'Database archive failed',
        err instanceof Error ? err.message : 'Unable to save export snapshot.',
        'error'
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    const saved = await saveSnapshot();
    if (!saved) return;
    printHistoryReport({
      archiveCode: saved.archive_code,
      reportTitle: saved.report_title,
      targetEmployeeName: saved.target_employee_name,
      targetEmployeeCode: saved.target_employee_code,
      targetDepartment: selectedProfile?.department ?? null,
      targetPosition: selectedProfile?.position ?? null,
      exportedByName: saved.exported_by_name,
      exportedByRole: saved.exported_by_role,
      exportedAt: saved.created_at,
      notes: saved.notes,
      rows: saved.snapshot_rows,
      totalLeaveDays: Number(saved.total_leave_days),
      totalOtHours: Number(saved.total_ot_hours),
      totalAmount: Number(saved.total_amount),
    });
  };

  const handlePrintPreviewOnly = () => {
    printHistoryReport({
      archiveCode: lastSavedCode || 'PREVIEW-COPY',
      reportTitle: computedTitle,
      targetEmployeeName: selectedProfile?.full_name ?? 'All Employees',
      targetEmployeeCode: selectedProfile?.employee_code ?? null,
      targetDepartment: selectedProfile?.department ?? null,
      targetPosition: selectedProfile?.position ?? null,
      exportedByName: activeProfile?.full_name ?? (portalRole === 'boss' ? 'Boss Executive' : 'HR Admin'),
      exportedByRole: portalRole,
      exportedAt: new Date().toISOString(),
      notes: notes.trim() || null,
      rows: snapshotRows,
      totalLeaveDays: summary.leaveDays,
      totalOtHours: summary.otHours,
      totalAmount: summary.amount,
    });
  };

  const handleDownloadCsv = async (alsoSaveToDb: boolean) => {
    let code = lastSavedCode;
    if (alsoSaveToDb) {
      const saved = await saveSnapshot();
      if (!saved) return;
      code = saved.archive_code;
    }
    const slug = (selectedProfile?.employee_code || 'all-employees').toLowerCase();
    const prefix = code ? code.toLowerCase() : 'mediq-history';
    downloadSnapshotCsv(`${prefix}-${slug}.csv`, snapshotRows);
  };

  const inputCls =
    'w-full rounded-[14px] border border-[#dfd5c5] bg-white px-3.5 py-2.5 text-sm text-[#0d1c36] placeholder:text-[#8a8478] outline-none transition focus:border-[#163362] focus:ring-2 focus:ring-[#163362]/15';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#071329]/65 p-0 pt-6 backdrop-blur-sm sm:items-center sm:p-5"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[26px] border border-[#dfd5c5] bg-[#f4efe6] shadow-[0_28px_70px_rgba(7,19,41,0.38)] sm:rounded-[28px]">
        {/* Dark Navy Swirl Modal Header */}
        <div
          className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[#f5efe4] sm:px-6 sm:py-5"
          style={{
            background:
              'radial-gradient(120% 130% at 96% 8%, rgba(230,216,191,0.18), transparent 52%), linear-gradient(145deg, #163362 0%, #0f2344 55%, #071329 100%)',
          }}
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f5efe4]/14 text-[#e6d8bf]">
              <Archive className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold tracking-[0.12em] text-[#dfd0b6] uppercase">
                {portalRole === 'boss' ? 'Boss Executive Archive' : 'HR Admin Archive'} · Print &amp;
                Database Backup
              </p>
              <h2 className="truncate text-lg font-bold tracking-[-0.02em] text-[#fdfbf7] sm:text-xl">
                Export Employee Request History
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switcher Tabs */}
            <div className="inline-flex rounded-full bg-white/10 p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('builder')}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 font-semibold transition ${
                  tab === 'builder'
                    ? 'bg-[#f5efe4] text-[#0b1933]'
                    : 'text-[#e6d8bf] hover:text-white'
                }`}
              >
                Export &amp; Print
              </button>
              <button
                type="button"
                onClick={() => setTab('archives')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold transition ${
                  tab === 'archives'
                    ? 'bg-[#f5efe4] text-[#0b1933]'
                    : 'text-[#e6d8bf] hover:text-white'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Saved in DB ({archives.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close export modal"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/10 text-[#f5efe4] transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === 'builder' ? (
            <div className="space-y-4">
              {/* Filter Builder Card */}
              <div className="rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7] p-4 sm:p-5">
                <div className="mb-3.5 flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#163362] text-[11px] font-bold text-[#f5efe4]">
                    01
                  </span>
                  <h3 className="text-sm font-bold text-[#0d1c36]">
                    Select Employee &amp; History Scope
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951] sm:col-span-2">
                    Employee *
                    <select
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="all">
                        All Employees (Company-Wide · {requests.length} total)
                      </option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.employee_code}) — {p.department}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951]">
                    Approval Status
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={inputCls}
                    >
                      <option value="all">All History</option>
                      <option value="boss_approved">Boss Approved · Locked Only</option>
                      <option value="pending">Pending / In Review</option>
                      <option value="closed">Rejected / Cancelled</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951]">
                    Form Type
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={inputCls}
                    >
                      <option value="all">All Form Types</option>
                      <option value="leave">Leave Application</option>
                      <option value="overtime">Overtime Authorization</option>
                      <option value="reimbursement">Expense Reimbursement</option>
                      <option value="official_business">Official Business</option>
                      <option value="cash_advance">Cash Advance</option>
                      <option value="other">Other HR / Admin</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951]">
                    From Date (Optional)
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951]">
                    To Date (Optional)
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#5c5951] sm:col-span-2">
                    Archive Report Title
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={computedTitle}
                      className={inputCls}
                    />
                  </label>
                </div>

                <label className="mt-3 grid gap-1.5 text-xs font-semibold text-[#5c5951]">
                  Audit / Archive Notes (Optional — saved to Supabase &amp; printed on PDF)
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Monthly HR filing archive, payroll audit, or employee 201 file copy..."
                    className={inputCls}
                  />
                </label>
              </div>

              {/* Dark Navy Summary Strip */}
              <div className="grid grid-cols-2 gap-2.5 rounded-[20px] bg-gradient-to-br from-[#163362] via-[#0f2344] to-[#071329] p-4 text-[#f5efe4] sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#dfd0b6] uppercase">
                    Records Matched
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{snapshotRows.length}</p>
                  <p className="text-[11px] text-[#e6d8bf]">{summary.locked} Boss-locked</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#dfd0b6] uppercase">
                    Leave Days
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {summary.leaveDays.toFixed(1)}
                  </p>
                  <p className="text-[11px] text-[#e6d8bf]">Total days in scope</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#dfd0b6] uppercase">
                    Overtime Hours
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {summary.otHours.toFixed(1)}h
                  </p>
                  <p className="text-[11px] text-[#e6d8bf]">Total OT hours</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.08em] text-[#dfd0b6] uppercase">
                    Claims Total
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatPHP(summary.amount)}
                  </p>
                  <p className="text-[11px] text-[#e6d8bf]">Reimbursement &amp; CA</p>
                </div>
              </div>

              {lastSavedCode && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    Saved permanently in Supabase Database as{' '}
                    <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 font-mono font-bold">
                      {lastSavedCode}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('archives')}
                    className="cursor-pointer font-bold underline"
                  >
                    View Saved Archives →
                  </button>
                </div>
              )}

              {/* Live History Preview Table */}
              <div className="overflow-hidden rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfd5c5] bg-[#f4efe6]/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#163362]" />
                    <span className="text-xs font-bold text-[#0d1c36]">
                      Export Preview ({snapshotRows.length}{' '}
                      {snapshotRows.length === 1 ? 'request' : 'requests'})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#646159]">
                    Includes full HR, Accounting &amp; Boss sign-off details
                  </span>
                </div>

                <div className="max-h-[260px] overflow-auto">
                  {snapshotRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#646159]">
                      No requests match the selected employee and filter criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[#f4efe6] text-[10.5px] font-bold tracking-wider text-[#5c5951] uppercase">
                        <tr>
                          <th className="px-3.5 py-2.5">Ref #</th>
                          <th className="px-3.5 py-2.5">Employee</th>
                          <th className="px-3.5 py-2.5">Form &amp; Subject</th>
                          <th className="px-3.5 py-2.5">Details</th>
                          <th className="px-3.5 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ebe3d6]">
                        {snapshotRows.map((row) => (
                          <tr key={row.reference_no} className="hover:bg-[#f4efe6]/50">
                            <td className="whitespace-nowrap px-3.5 py-2.5 font-mono font-bold text-[#0f2344]">
                              {row.reference_no}
                              <div className="font-sans text-[10.5px] font-normal text-[#7a7469]">
                                {formatDate(row.created_at)}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="font-semibold text-[#0d1c36]">
                                {row.employee_name}
                              </div>
                              <div className="text-[10.5px] text-[#7a7469]">
                                {row.employee_code} · {row.department}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="font-semibold text-[#0d1c36]">{row.title}</div>
                              <div className="text-[10.5px] text-[#7a7469]">
                                {row.request_type_label} · {row.subtype_label}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-[#5c5951]">
                              {row.amount != null
                                ? formatPHP(row.amount)
                                : row.total_days != null
                                  ? `${row.total_days}d`
                                  : row.total_hours != null
                                    ? `${row.total_hours}h OT`
                                    : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#dfd5c5] bg-white px-2.5 py-0.5 text-[10.5px] font-semibold text-[#0f2344]">
                                {row.boss_status === 'approved' && <Lock className="h-2.5 w-2.5" />}
                                {STATUS_META[row.status]?.label ?? row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Saved Database Archives Tab */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#0d1c36]">
                    Permanent Database Export Archives
                  </h3>
                  <p className="text-xs text-[#646159]">
                    Every saved export is stored immutably in Supabase (
                    <span className="font-mono">history_export_archives</span>) — re-print PDF or
                    re-download CSV anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadArchives()}
                  disabled={loadingArchives}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfd5c5] bg-[#fdfbf7] px-3.5 py-1.5 text-xs font-semibold text-[#0f2344] transition hover:border-[#163362]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingArchives ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingArchives ? (
                <div className="flex items-center justify-center gap-2 rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7] p-10 text-xs text-[#646159]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#163362]" />
                  Loading saved database archives...
                </div>
              ) : archives.length === 0 ? (
                <div className="rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7] p-10 text-center">
                  <Database className="mx-auto h-8 w-8 text-[#8a8478]" />
                  <p className="mt-2.5 text-sm font-semibold text-[#0d1c36]">
                    No database archives saved yet
                  </p>
                  <p className="mt-1 text-xs text-[#646159]">
                    Use the &ldquo;Export &amp; Print&rdquo; tab to save an employee&apos;s request
                    history directly into Supabase.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {archives.map((arc) => (
                    <div
                      key={arc.id}
                      className="flex flex-col justify-between gap-3 rounded-[20px] border border-[#dfd5c5] bg-[#fdfbf7] p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#163362] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#f5efe4]">
                            {arc.archive_code}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ede6d8] px-2 py-0.5 text-[10.5px] font-semibold text-[#0f2344]">
                            <Lock className="h-2.5 w-2.5" />
                            Immutable DB Snapshot
                          </span>
                          <span className="text-[11px] text-[#7a7469]">
                            {formatDateTime(arc.created_at)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-bold text-[#0d1c36]">
                          {arc.report_title}
                        </p>
                        <p className="text-xs text-[#5c5951]">
                          <UserRound className="mr-1 inline h-3.5 w-3.5 text-[#163362]" />
                          {arc.target_employee_name}
                          {arc.target_employee_code ? ` (${arc.target_employee_code})` : ''} ·{' '}
                          <strong>{arc.record_count}</strong>{' '}
                          {arc.record_count === 1 ? 'form' : 'forms'} ·{' '}
                          {Number(arc.total_leave_days).toFixed(1)}d LV ·{' '}
                          {Number(arc.total_ot_hours).toFixed(1)}h OT ·{' '}
                          {formatPHP(Number(arc.total_amount))}
                        </p>
                        <p className="text-[11px] text-[#7a7469]">
                          Archived by {arc.exported_by_name} ({arc.exported_by_role.toUpperCase()})
                          {arc.notes ? ` · Note: "${arc.notes}"` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-none">
                        <button
                          type="button"
                          onClick={() =>
                            printHistoryReport({
                              archiveCode: arc.archive_code,
                              reportTitle: arc.report_title,
                              targetEmployeeName: arc.target_employee_name,
                              targetEmployeeCode: arc.target_employee_code,
                              exportedByName: arc.exported_by_name,
                              exportedByRole: arc.exported_by_role,
                              exportedAt: arc.created_at,
                              notes: arc.notes,
                              rows: arc.snapshot_rows ?? [],
                              totalLeaveDays: Number(arc.total_leave_days),
                              totalOtHours: Number(arc.total_ot_hours),
                              totalAmount: Number(arc.total_amount),
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-3.5 py-2 text-xs font-semibold text-[#f7f2e8] transition hover:brightness-110"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print PDF
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadSnapshotCsv(
                              `${arc.archive_code.toLowerCase()}.csv`,
                              arc.snapshot_rows ?? []
                            )
                          }
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfd5c5] bg-white px-3.5 py-2 text-xs font-semibold text-[#0f2344] transition hover:border-[#163362]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Bar */}
        {tab === 'builder' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#dfd5c5] bg-[#fdfbf7] px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={handlePrintPreviewOnly}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfd5c5] bg-[#f4efe6] px-3.5 py-2 text-xs font-semibold text-[#5c5951] transition hover:border-[#163362] hover:text-[#0d1c36] disabled:opacity-60"
            >
              <FileText className="h-3.5 w-3.5" />
              Print Preview Only
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDownloadCsv(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfd5c5] bg-white px-4 py-2 text-xs font-semibold text-[#0f2344] transition hover:border-[#163362] disabled:opacity-60"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Save DB + CSV
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSnapshot()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#163362]/30 bg-[#ede6d8] px-4 py-2 text-xs font-bold text-[#0f2344] transition hover:bg-[#e2d7c3] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                Save to Database
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAndPrint()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-5 py-2 text-xs font-bold text-[#f7f2e8] shadow-[0_6px_16px_rgba(7,19,41,0.22)] transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                Save to DB &amp; Print PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
