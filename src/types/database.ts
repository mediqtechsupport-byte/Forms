export type UserRole = 'employee' | 'hr' | 'boss' | 'accounting';

export type RequestType =
  | 'leave'
  | 'overtime'
  | 'reimbursement'
  | 'official_business'
  | 'cash_advance'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'hr_endorsed'
  | 'accounting_verified'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type HrStatus = 'not_required' | 'pending' | 'endorsed' | 'approved' | 'rejected';
export type BossStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type AccountingStatus = 'not_required' | 'pending' | 'verified' | 'paid' | 'rejected';
export type PaymentMethod = 'bank_transfer' | 'gcash' | 'check' | 'cash' | 'payroll';

export interface Profile {
  id: string;
  employee_code: string | null;
  email: string;
  full_name: string;
  department: string;
  position: string;
  phone: string | null;
  role: UserRole;
  hire_date: string;
  is_active: boolean;
  signature_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: string;
  year: number;
  vacation_total: number;
  vacation_used: number;
  sick_total: number;
  sick_used: number;
  emergency_total: number;
  emergency_used: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseLineItem {
  description: string;
  category: string;
  amount: number;
  receipt_no?: string;
}

export interface RequestMetadata {
  employee_signature?: string;
  employee_signature_type?: 'drawn' | 'typed';
  signed_at?: string;
  cover_person?: string;
  contact_during_leave?: string;
  half_day?: boolean;
  half_day_period?: 'AM' | 'PM';
  line_items?: ExpenseLineItem[];
  bank_or_gcash_details?: string;
  liquidation_date?: string;
  transportation_mode?: string;
  expected_outcome?: string;
  [key: string]: unknown;
}

export interface FormRequest {
  id: string;
  reference_no: string;
  employee_id: string;
  request_type: RequestType;
  subtype: string | null;
  title: string;
  description: string;
  status: RequestStatus;
  priority: 'normal' | 'urgent';
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  total_days: number | null;
  total_hours: number | null;
  credits_deducted: boolean;
  destination: string | null;
  client_or_hospital: string | null;
  amount: number | null;
  currency: string;
  expense_date: string | null;
  merchant_name: string | null;
  receipt_or_number: string | null;
  payment_method: PaymentMethod | null;
  metadata: RequestMetadata;
  hr_status: HrStatus;
  hr_reviewed_by: string | null;
  hr_reviewed_at: string | null;
  hr_remarks: string | null;
  boss_status: BossStatus;
  boss_reviewed_by: string | null;
  boss_reviewed_at: string | null;
  boss_remarks: string | null;
  accounting_status: AccountingStatus;
  accounting_reviewed_by: string | null;
  accounting_reviewed_at: string | null;
  accounting_remarks: string | null;
  disbursement_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: Profile;
  hr_reviewer?: Pick<Profile, 'id' | 'full_name' | 'position' | 'signature_data'> | null;
  boss_reviewer?: Pick<Profile, 'id' | 'full_name' | 'position' | 'signature_data'> | null;
  accounting_reviewer?: Pick<Profile, 'id' | 'full_name' | 'position' | 'signature_data'> | null;
}

export interface RequestAttachment {
  id: string;
  request_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface RequestActivityLog {
  id: number;
  request_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: string;
  remarks: string | null;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  category: 'general' | 'hr_policy' | 'payroll' | 'holiday' | 'urgent';
  is_pinned: boolean;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
}
