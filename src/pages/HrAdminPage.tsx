import React, { useMemo, useState } from 'react';
import {
  Users,
  CalendarClock,
  CheckCircle2,
  Clock,
  Megaphone,
  Trash2,
  Save,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  createAnnouncement,
  deleteAnnouncement,
  updateProfile,
  upsertLeaveBalance,
} from '../lib/api';
import { DEPARTMENTS, formatDate } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { RequestsTable } from '../components/RequestsTable';
import { RoleBadge } from '../components/StatusBadges';
import type {
  Announcement,
  FormRequest,
  LeaveBalance,
  Profile,
  UserRole,
} from '../types/database';

interface HrAdminPageProps {
  requests: FormRequest[];
  profiles: Profile[];
  leaveBalances: LeaveBalance[];
  announcements: Announcement[];
  onInspect: (req: FormRequest) => void;
  onRefreshAll: () => Promise<void>;
}

const HR_TYPES = ['leave', 'overtime', 'official_business', 'other'] as const;

export function HrAdminPage({
  requests,
  profiles,
  leaveBalances,
  announcements,
  onInspect,
  onRefreshAll,
}: HrAdminPageProps) {
  const { profile: currentUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'queue' | 'employees' | 'memos'>('queue');
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balDraft, setBalDraft] = useState({
    vacation_total: 15,
    vacation_used: 0,
    sick_total: 15,
    sick_used: 0,
    emergency_total: 5,
    emergency_used: 0,
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Announcement form state
  const [memoTitle, setMemoTitle] = useState('');
  const [memoBody, setMemoBody] = useState('');
  const [memoCategory, setMemoCategory] = useState<Announcement['category']>('hr_policy');
  const [memoPinned, setMemoPinned] = useState(false);
  const [postingMemo, setPostingMemo] = useState(false);

  const hrRequests = useMemo(
    () => requests.filter((r) => (HR_TYPES as readonly string[]).includes(r.request_type)),
    [requests]
  );

  const pendingHr = hrRequests.filter(
    (r) => r.hr_status === 'pending' && !['rejected', 'cancelled'].includes(r.status)
  ).length;
  const approvedLeaves = hrRequests.filter(
    (r) => r.request_type === 'leave' && r.status === 'approved'
  ).length;
  const approvedOtHours = hrRequests
    .filter((r) => r.request_type === 'overtime' && ['approved', 'paid'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.total_hours ?? 0), 0);

  const balanceMap = useMemo(() => {
    const map = new Map<string, LeaveBalance>();
    leaveBalances.forEach((b) => map.set(b.employee_id, b));
    return map;
  }, [leaveBalances]);

  const startEditBalance = (empId: string) => {
    const existing = balanceMap.get(empId);
    setBalDraft({
      vacation_total: Number(existing?.vacation_total ?? 15),
      vacation_used: Number(existing?.vacation_used ?? 0),
      sick_total: Number(existing?.sick_total ?? 15),
      sick_used: Number(existing?.sick_used ?? 0),
      emergency_total: Number(existing?.emergency_total ?? 5),
      emergency_used: Number(existing?.emergency_used ?? 0),
    });
    setEditingBalanceId(empId);
  };

  const handleSaveBalance = async (empId: string) => {
    setSavingId(empId);
    try {
      await upsertLeaveBalance(empId, new Date().getFullYear(), balDraft);
      toast('Leave credits updated', 'The employee balance has been saved.');
      setEditingBalanceId(null);
      await onRefreshAll();
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Unable to save.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleEmployeeMetaUpdate = async (
    emp: Profile,
    patch: Partial<Pick<Profile, 'department' | 'role' | 'is_active'>>
  ) => {
    setSavingId(emp.id);
    try {
      await updateProfile(emp.id, patch);
      toast('Employee record updated', `${emp.full_name} has been updated.`);
      await onRefreshAll();
    } catch (err) {
      toast('Update blocked', err instanceof Error ? err.message : 'Insufficient permissions.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handlePostMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPostingMemo(true);
    try {
      await createAnnouncement({
        title: memoTitle.trim(),
        body: memoBody.trim(),
        category: memoCategory,
        is_pinned: memoPinned,
        published_by: currentUser.id,
      });
      setMemoTitle('');
      setMemoBody('');
      setMemoPinned(false);
      toast('Announcement published', 'Visible immediately on all employee dashboards.');
      await onRefreshAll();
    } catch (err) {
      toast('Publish failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setPostingMemo(false);
    }
  };

  const handleDeleteMemo = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast('Announcement removed');
      await onRefreshAll();
    } catch (err) {
      toast('Delete failed', err instanceof Error ? err.message : 'Try again.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* HR Header Banner */}
      <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-950 via-indigo-950 to-[#0a192f] p-6 text-white shadow-sm">
        <p className="text-[11px] font-bold tracking-widest text-violet-300 uppercase">
          HR Admin Control Center
        </p>
        <h2 className="mt-1 text-2xl font-extrabold">Human Resources & People Operations</h2>
        <p className="mt-1 text-xs text-violet-200/90 sm:text-sm">
          Review incoming Leave, Overtime, Official Business, and HR requests in real time, manage
          employee leave credits, and post company memos.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-violet-200">
              <span className="text-[11px] font-semibold uppercase">Pending HR</span>
              <CalendarClock className="h-4 w-4 text-amber-300" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold text-amber-300">{pendingHr}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-violet-200">
              <span className="text-[11px] font-semibold uppercase">Active Staff</span>
              <Users className="h-4 w-4 text-sky-300" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold">{profiles.filter((p) => p.is_active).length}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-violet-200">
              <span className="text-[11px] font-semibold uppercase">Approved Leaves</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold text-emerald-300">{approvedLeaves}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between text-violet-200">
              <span className="text-[11px] font-semibold uppercase">Approved OT Hrs</span>
              <Clock className="h-4 w-4 text-indigo-300" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold">{approvedOtHours.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'queue' as const, label: `HR Digital Forms Queue (${hrRequests.length})` },
          { id: 'employees' as const, label: `Employees & Leave Credits (${profiles.length})` },
          { id: 'memos' as const, label: `Company Memos (${announcements.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === t.id
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <RequestsTable
          requests={hrRequests}
          allowedTypes={['leave', 'overtime', 'official_business', 'other']}
          csvFilename="mediq-hr-requests.csv"
          emptyMessage="No HR digital forms submitted yet."
          onInspect={onInspect}
        />
      )}

      {tab === 'employees' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">VL (Left / Total)</th>
                  <th className="px-4 py-3">SL (Left / Total)</th>
                  <th className="px-4 py-3">EL (Left / Total)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((emp) => {
                  const bal = balanceMap.get(emp.id);
                  const isEditing = editingBalanceId === emp.id;
                  const vlRem = Number(bal?.vacation_total ?? 15) - Number(bal?.vacation_used ?? 0);
                  const slRem = Number(bal?.sick_total ?? 15) - Number(bal?.sick_used ?? 0);
                  const elRem = Number(bal?.emergency_total ?? 5) - Number(bal?.emergency_used ?? 0);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{emp.full_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {emp.employee_code} · {emp.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={emp.department}
                          disabled={savingId === emp.id}
                          onChange={(e) =>
                            handleEmployeeMetaUpdate(emp, { department: e.target.value })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {emp.role === 'boss' && currentUser?.role !== 'boss' ? (
                          <RoleBadge role={emp.role} />
                        ) : (
                          <select
                            value={emp.role}
                            disabled={savingId === emp.id}
                            onChange={(e) =>
                              handleEmployeeMetaUpdate(emp, { role: e.target.value as UserRole })
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                          >
                            <option value="employee">Employee</option>
                            <option value="hr">HR Admin</option>
                            <option value="accounting">Accounting</option>
                            {currentUser?.role === 'boss' && <option value="boss">Boss Admin</option>}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.vacation_used}
                              onChange={(e) =>
                                setBalDraft({ ...balDraft, vacation_used: Number(e.target.value) })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="VL Used"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.vacation_total}
                              onChange={(e) =>
                                setBalDraft({ ...balDraft, vacation_total: Number(e.target.value) })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="VL Total"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-sky-700">
                            {vlRem} / {Number(bal?.vacation_total ?? 15)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.sick_used}
                              onChange={(e) =>
                                setBalDraft({ ...balDraft, sick_used: Number(e.target.value) })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="SL Used"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.sick_total}
                              onChange={(e) =>
                                setBalDraft({ ...balDraft, sick_total: Number(e.target.value) })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="SL Total"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-emerald-700">
                            {slRem} / {Number(bal?.sick_total ?? 15)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.emergency_used}
                              onChange={(e) =>
                                setBalDraft({ ...balDraft, emergency_used: Number(e.target.value) })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="EL Used"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              step="0.5"
                              value={balDraft.emergency_total}
                              onChange={(e) =>
                                setBalDraft({
                                  ...balDraft,
                                  emergency_total: Number(e.target.value),
                                })
                              }
                              className="w-12 rounded border border-slate-300 px-1.5 py-1 text-xs"
                              title="EL Total"
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-amber-700">
                            {elRem} / {Number(bal?.emergency_total ?? 5)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveBalance(emp.id)}
                              disabled={savingId === emp.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBalanceId(null)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditBalance(emp.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                          >
                            Edit Credits
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'memos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <form
            onSubmit={handlePostMemo}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Publish Company Memo</h3>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Title *</label>
              <input
                type="text"
                required
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="e.g., Holiday Schedule / Payroll Cut-Off Reminder"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={memoCategory}
                onChange={(e) => setMemoCategory(e.target.value as Announcement['category'])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="hr_policy">HR Policy</option>
                <option value="holiday">Holiday Notice</option>
                <option value="payroll">Payroll & Cutoff</option>
                <option value="urgent">Urgent Advisory</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Message *</label>
              <textarea
                rows={4}
                required
                value={memoBody}
                onChange={(e) => setMemoBody(e.target.value)}
                placeholder="Details for all MediQ employees..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={memoPinned}
                onChange={(e) => setMemoPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-violet-600"
              />
              Pin announcement to top
            </label>
            <button
              type="submit"
              disabled={postingMemo}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {postingMemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Post Announcement
            </button>
          </form>

          <div className="space-y-3 lg:col-span-3">
            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                No announcements published yet.
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ann.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                        {ann.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                      {ann.body}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      By {ann.author?.full_name ?? 'Admin'} · {formatDate(ann.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMemo(ann.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
