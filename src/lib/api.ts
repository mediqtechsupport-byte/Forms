import { supabase } from './supabase';
import type {
  Announcement,
  FormRequest,
  HistoryExportArchive,
  HistoryExportSnapshotRow,
  LeaveBalance,
  PaymentMethod,
  Profile,
  RequestActivityLog,
  RequestAttachment,
  RequestMetadata,
  RequestType,
  StaffInvitation,
  UserRole,
} from '../types/database';

const REQUEST_SELECT = `
  *,
  employee:profiles!form_requests_employee_id_fkey (
    id, employee_code, email, full_name, department, position, phone, role, hire_date, is_active, signature_data
  ),
  hr_reviewer:profiles!form_requests_hr_reviewed_by_fkey (
    id, full_name, position, signature_data
  ),
  boss_reviewer:profiles!form_requests_boss_reviewed_by_fkey (
    id, full_name, position, signature_data
  ),
  accounting_reviewer:profiles!form_requests_accounting_reviewed_by_fkey (
    id, full_name, position, signature_data
  )
`;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  profileId: string,
  updates: Partial<
    Pick<
      Profile,
      'full_name' | 'department' | 'position' | 'phone' | 'role' | 'is_active' | 'employee_code' | 'signature_data'
    >
  >
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function fetchLeaveBalance(
  employeeId: string,
  year = new Date().getFullYear()
): Promise<LeaveBalance | null> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data as LeaveBalance | null;
}

export async function fetchAllLeaveBalances(
  year = new Date().getFullYear()
): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('year', year);
  if (error) throw error;
  return (data ?? []) as LeaveBalance[];
}

export async function upsertLeaveBalance(
  employeeId: string,
  year: number,
  values: {
    vacation_total: number;
    vacation_used: number;
    sick_total: number;
    sick_used: number;
    emergency_total: number;
    emergency_used: number;
  }
): Promise<LeaveBalance> {
  const { data, error } = await supabase
    .from('leave_balances')
    .upsert({ employee_id: employeeId, year, ...values }, { onConflict: 'employee_id,year' })
    .select('*')
    .single();
  if (error) throw error;
  return data as LeaveBalance;
}

export async function fetchFormRequests(options: {
  scope: 'mine' | 'all';
  userId: string;
}): Promise<FormRequest[]> {
  let query = supabase
    .from('form_requests')
    .select(REQUEST_SELECT)
    .order('created_at', { ascending: false });

  if (options.scope === 'mine') {
    query = query.eq('employee_id', options.userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as FormRequest[];
}

export interface CreateFormRequestInput {
  employee_id: string;
  request_type: RequestType;
  subtype: string;
  title: string;
  description: string;
  priority: 'normal' | 'urgent';
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  total_days?: number | null;
  total_hours?: number | null;
  destination?: string | null;
  client_or_hospital?: string | null;
  amount?: number | null;
  expense_date?: string | null;
  merchant_name?: string | null;
  receipt_or_number?: string | null;
  payment_method?: PaymentMethod | null;
  metadata?: RequestMetadata;
}

function resolveAllowedMimeType(file: File): string {
  const raw = (file.type || '').toLowerCase().trim();
  if (raw === 'image/jpg') return 'image/jpeg';
  if (['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(raw)) {
    return raw;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'pdf') return 'application/pdf';
  return raw || 'image/jpeg';
}

export async function createFormRequestWithFiles(
  input: CreateFormRequestInput,
  files: File[]
): Promise<FormRequest> {
  const { data: created, error } = await supabase
    .from('form_requests')
    .insert({
      reference_no: '',
      employee_id: input.employee_id,
      request_type: input.request_type,
      subtype: input.subtype,
      title: input.title,
      description: input.description,
      priority: input.priority,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      total_days: input.total_days ?? null,
      total_hours: input.total_hours ?? null,
      destination: input.destination || null,
      client_or_hospital: input.client_or_hospital || null,
      amount: input.amount ?? null,
      expense_date: input.expense_date || null,
      merchant_name: input.merchant_name || null,
      receipt_or_number: input.receipt_or_number || null,
      payment_method: input.payment_method || null,
      metadata: input.metadata ?? {},
    })
    .select(REQUEST_SELECT)
    .single();

  if (error) throw error;

  const request = created as unknown as FormRequest;

  // Upload any attached receipts / supporting documents to private bucket
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${input.employee_id}/${request.id}/${Date.now()}-${safeName}`;
    const mimeType = resolveAllowedMimeType(file);

    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType,
      });

    if (uploadError) {
      throw new Error(`Form saved (${request.reference_no}), but attachment "${file.name}" failed: ${uploadError.message}`);
    }

    const { error: metaError } = await supabase.from('request_attachments').insert({
      request_id: request.id,
      uploaded_by: input.employee_id,
      file_name: file.name,
      file_path: storagePath,
      mime_type: mimeType,
      file_size: file.size,
    });

    if (metaError) throw metaError;
  }

  return request;
}

export type ReviewAction =
  | 'cancel'
  | 'hr_endorse'
  | 'hr_approve'
  | 'hr_reject'
  | 'boss_approve'
  | 'boss_reject'
  | 'accounting_verify'
  | 'accounting_pay'
  | 'accounting_reject';

export async function reviewFormRequest(params: {
  requestId: string;
  action: ReviewAction;
  remarks?: string;
  disbursementReference?: string;
}): Promise<FormRequest> {
  const { data, error } = await supabase.rpc('review_form_request', {
    p_request_id: params.requestId,
    p_action: params.action,
    p_remarks: params.remarks?.trim() || null,
    p_disbursement_reference: params.disbursementReference?.trim() || null,
  });

  if (error) throw error;
  return data as unknown as FormRequest;
}

export async function fetchRequestAttachments(
  requestId: string
): Promise<(RequestAttachment & { signedUrl?: string })[]> {
  const { data, error } = await supabase
    .from('request_attachments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as RequestAttachment[];

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from('request-attachments')
        .createSignedUrl(row.file_path, 600);
      return { ...row, signedUrl: signed?.signedUrl };
    })
  );
}

export async function fetchRequestActivityLogs(requestId: string): Promise<RequestActivityLog[]> {
  const { data, error } = await supabase
    .from('request_activity_logs')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RequestActivityLog[];
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(
      `
      *,
      author:profiles!announcements_published_by_fkey (id, full_name, role)
    `
    )
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  category: Announcement['category'];
  is_pinned: boolean;
  published_by: string;
}): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(input)
    .select(
      `
      *,
      author:profiles!announcements_published_by_fkey (id, full_name, role)
    `
    )
    .single();
  if (error) throw error;
  return data as unknown as Announcement;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchHistoryExportArchives(): Promise<HistoryExportArchive[]> {
  const { data, error } = await supabase
    .from('history_export_archives')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as HistoryExportArchive[];
}

export interface SaveHistoryExportArchiveInput {
  exported_by: string;
  exported_by_name: string;
  exported_by_role: 'boss' | 'hr';
  target_employee_id: string | null;
  target_employee_name: string;
  target_employee_code: string | null;
  report_title: string;
  filter_summary: {
    statusFilter?: string;
    typeFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  record_count: number;
  total_leave_days: number;
  total_ot_hours: number;
  total_amount: number;
  snapshot_rows: HistoryExportSnapshotRow[];
  notes?: string | null;
}

export async function saveHistoryExportArchive(
  input: SaveHistoryExportArchiveInput
): Promise<HistoryExportArchive> {
  const { data, error } = await supabase
    .from('history_export_archives')
    .insert({
      archive_code: '',
      exported_by: input.exported_by,
      exported_by_name: input.exported_by_name,
      exported_by_role: input.exported_by_role,
      target_employee_id: input.target_employee_id,
      target_employee_name: input.target_employee_name,
      target_employee_code: input.target_employee_code,
      report_title: input.report_title,
      filter_summary: input.filter_summary,
      record_count: input.record_count,
      total_leave_days: input.total_leave_days,
      total_ot_hours: input.total_ot_hours,
      total_amount: input.total_amount,
      snapshot_rows: input.snapshot_rows,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as HistoryExportArchive;
}

export function canAccessRolePortal(userRole: UserRole, targetPortal: UserRole): boolean {
  return userRole === targetPortal;
}

/* -------------------------------------------------------------------------- */
/*                     Staff Email Invitations & Acceptance                   */
/* -------------------------------------------------------------------------- */

async function extractFnError(data: unknown, error: unknown, fallback: string): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const parsed = await ctx.json();
        if (parsed && typeof parsed.error === 'string') return parsed.error;
      } catch {
        // ignore JSON parse issues
      }
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function fetchStaffInvitations(): Promise<StaffInvitation[]> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as StaffInvitation[];
}

export async function sendStaffInvite(input: {
  full_name: string;
  email: string;
  department: string;
  position: string;
  role: UserRole;
  portal_base_url: string;
}): Promise<{
  invitation: StaffInvitation;
  accept_url: string;
  email_sent: boolean;
  email_delivery_note: string;
}> {
  const { data, error } = await supabase.functions.invoke('send-staff-invite', {
    body: { action: 'send', ...input },
  });
  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(await extractFnError(data, error, 'Unable to send staff invitation.'));
  }
  return data as {
    invitation: StaffInvitation;
    accept_url: string;
    email_sent: boolean;
    email_delivery_note: string;
  };
}

export async function revokeStaffInvite(invitationId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-staff-invite', {
    body: { action: 'revoke', invitation_id: invitationId },
  });
  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(await extractFnError(data, error, 'Unable to revoke invitation.'));
  }
}

export interface InvitePreview {
  email: string;
  full_name: string;
  department: string;
  position: string;
  role: UserRole;
  invited_by_name: string;
  invited_by_role: 'boss' | 'hr';
  status: StaffInvitation['status'];
  expires_at: string;
  created_at: string;
}

export async function lookupStaffInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.functions.invoke('accept-staff-invite', {
    body: { mode: 'lookup', token },
  });
  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(await extractFnError(data, error, 'Invitation not found or expired.'));
  }
  return (data as { invitation: InvitePreview }).invitation;
}

export async function acceptStaffInvite(params: {
  token: string;
  password: string;
  full_name: string;
}): Promise<{ ok: boolean; email: string; role: UserRole; full_name: string }> {
  const { data, error } = await supabase.functions.invoke('accept-staff-invite', {
    body: { mode: 'accept', ...params },
  });
  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(await extractFnError(data, error, 'Unable to accept invitation.'));
  }
  return data as { ok: boolean; email: string; role: UserRole; full_name: string };
}

export async function declineStaffInvite(token: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('accept-staff-invite', {
    body: { mode: 'decline', token },
  });
  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(await extractFnError(data, error, 'Unable to decline invitation.'));
  }
}
