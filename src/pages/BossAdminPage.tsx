import { useState } from 'react';
import {
  ShieldCheck,
  Clock3,
  CheckCircle2,
  Banknote,
  Users,
  AlertTriangle,
  Eye,
  Loader2,
  ClipboardCheck,
  Files,
  UserCog,
  UserCircle2,
} from 'lucide-react';
import { REQUEST_TYPE_META, formatDate, formatPHP } from '../lib/constants';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { RequestsTable } from '../components/RequestsTable';
import { RequestTypeBadge, RoleBadge } from '../components/StatusBadges';
import { PortalShell, type PortalNavItem } from '../components/PortalShell';
import { CreateAccountCard } from '../components/CreateAccountCard';
import { ProfilePage } from './ProfilePage';
import type { FormRequest, Profile, RequestType, UserRole } from '../types/database';

interface BossAdminPageProps {
  requests: FormRequest[];
  profiles: Profile[];
  onInspect: (req: FormRequest) => void;
}

export function BossAdminPage({
  requests,
  profiles,
  onInspect,
}: BossAdminPageProps) {
  const { performReview, saveProfile } = useAppData();
  const { toast } = useToast();
  const [section, setSection] = useState<'approvals' | 'all' | 'roles' | 'profile'>('approvals');
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const awaitingBoss = requests.filter(
    (r) => r.boss_status === 'pending' && !['rejected', 'cancelled'].includes(r.status)
  );
  const approvedTotal = requests.filter((r) => ['approved', 'paid'].includes(r.status)).length;
  const pendingSpend = awaitingBoss.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const typeCounts: { type: RequestType; count: number }[] = (
    [
      'leave',
      'overtime',
      'reimbursement',
      'official_business',
      'cash_advance',
      'other',
    ] as RequestType[]
  ).map((type) => ({
    type,
    count: requests.filter((r) => r.request_type === type).length,
  }));

  const navItems: PortalNavItem[] = [
    {
      id: 'approvals',
      label: 'Pending Sign-Off',
      sub: '1-click executive approvals',
      icon: ClipboardCheck,
      badge: awaitingBoss.length,
    },
    {
      id: 'all',
      label: 'All Company Forms',
      sub: 'Full audit trail & CSV export',
      icon: Files,
    },
    {
      id: 'roles',
      label: 'Role & Admin Access',
      sub: 'Assign HR, Accounting & Boss',
      icon: UserCog,
    },
    {
      id: 'profile',
      label: 'Executive E-Signature',
      sub: 'Default Boss approval stamp',
      icon: UserCircle2,
    },
  ];

  const handleQuickApprove = async (req: FormRequest) => {
    setQuickApprovingId(req.id);
    try {
      await performReview({
        requestId: req.id,
        action: 'boss_approve',
        remarks: 'Approved by Boss Executive',
      });
      toast(
        'Approved!',
        `${req.reference_no} (${req.employee?.full_name}) is now officially signed off.`
      );
    } catch (err) {
      toast('Approval failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setQuickApprovingId(null);
    }
  };

  const handleRoleUpdate = async (emp: Profile, role: UserRole) => {
    setUpdatingRoleId(emp.id);
    try {
      await saveProfile(emp.id, { role });
      toast('Role updated', `${emp.full_name} is now assigned as ${role.toUpperCase()}.`);
    } catch (err) {
      toast('Role update failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleToggleActive = async (emp: Profile) => {
    setUpdatingRoleId(emp.id);
    try {
      await saveProfile(emp.id, { is_active: !emp.is_active });
      toast(
        'Account status updated',
        `${emp.full_name} is now ${!emp.is_active ? 'Active' : 'Disabled'}.`
      );
    } catch (err) {
      toast('Update failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  return (
    <PortalShell
      portal="boss"
      portalName="Boss Executive Admin"
      portalTagline="Executive Sign-Off"
      navItems={navItems}
      activeNavId={section}
      onSelectNav={(id) => setSection(id as typeof section)}
    >
      {section === 'profile' ? (
        <ProfilePage />
      ) : (
        <div className="space-y-6">
          {/* Executive Header */}
          <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-[#0a192f] via-slate-900 to-amber-950/90 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                  Boss / Executive Sign-Off Portal
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">Executive Digital Approvals</h2>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                  Receive every employee digital form instantly—review, sign off in one click, and
                  manage HR & Accounting admin access.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-400/15 px-3.5 py-2 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                <ShieldCheck className="h-4 w-4" />
                Final Sign-Off Authority
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-semibold uppercase">Needs Sign-Off</span>
                  <Clock3 className="h-4 w-4 text-amber-300" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-amber-300">
                  {awaitingBoss.length}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-semibold uppercase">Approved Forms</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold text-emerald-300">{approvedTotal}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-semibold uppercase">Pending Claims</span>
                  <Banknote className="h-4 w-4 text-sky-300" />
                </div>
                <p className="mt-1.5 truncate text-xl font-extrabold text-sky-300">
                  {formatPHP(pendingSpend)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] font-semibold uppercase">Team Members</span>
                  <Users className="h-4 w-4 text-slate-300" />
                </div>
                <p className="mt-1.5 text-2xl font-extrabold">{profiles.length}</p>
              </div>
            </div>
          </div>

          {/* Executive Request Mix Bar */}
          {section === 'approvals' && requests.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                  Company Digital Forms Mix ({requests.length} Total)
                </span>
                <span className="text-[11px] text-slate-400">
                  Real-time breakdown across all departments
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                {typeCounts
                  .filter((t) => t.count > 0)
                  .map((t) => (
                    <div
                      key={t.type}
                      className={`${REQUEST_TYPE_META[t.type].bgSoft} transition-all`}
                      style={{ width: `${(t.count / requests.length) * 100}%` }}
                      title={`${REQUEST_TYPE_META[t.type].shortLabel}: ${t.count}`}
                    />
                  ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs">
                {typeCounts
                  .filter((t) => t.count > 0)
                  .map((t) => (
                    <div key={t.type} className="inline-flex items-center gap-1.5 text-slate-600">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${REQUEST_TYPE_META[t.type].bgSoft}`}
                      />
                      <span className="font-semibold text-slate-800">
                        {REQUEST_TYPE_META[t.type].shortLabel}
                      </span>
                      <span className="text-slate-400">({t.count})</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pending Sign-Off Cards */}
          {section === 'approvals' && (
            <>
              {awaitingBoss.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-3 text-base font-extrabold text-slate-900">All caught up!</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Zero digital forms are currently waiting for your executive signature.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {awaitingBoss.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-amber-300 hover:shadow-md"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {req.reference_no}
                            </span>
                            <RequestTypeBadge type={req.request_type} />
                          </div>
                          {req.priority === 'urgent' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              URGENT
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-base font-extrabold text-slate-900">
                          {req.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          {req.employee?.full_name} · {req.employee?.department} (
                          {req.employee?.position})
                        </p>
                        {req.description && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {req.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                          {req.amount != null && (
                            <span className="font-extrabold text-emerald-700">
                              {formatPHP(req.amount)}
                            </span>
                          )}
                          {req.total_days != null && (
                            <span className="font-bold text-sky-700">
                              {req.total_days} {Number(req.total_days) === 1 ? 'day' : 'days'} (
                              {formatDate(req.start_date)}
                              {req.end_date && req.end_date !== req.start_date
                                ? ` – ${formatDate(req.end_date)}`
                                : ''}
                              )
                            </span>
                          )}
                          {req.total_hours != null && (
                            <span className="font-bold text-indigo-700">
                              {req.total_hours} hrs OT · {formatDate(req.start_date)}
                            </span>
                          )}
                          {req.hr_status === 'endorsed' && (
                            <span className="rounded bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                              HR Endorsed
                            </span>
                          )}
                          {req.accounting_status === 'verified' && (
                            <span className="rounded bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-700">
                              Receipts Verified
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-slate-400">
                            {REQUEST_TYPE_META[req.request_type].formCode}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5">
                        <button
                          type="button"
                          disabled={quickApprovingId === req.id}
                          onClick={() => handleQuickApprove(req)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {quickApprovingId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          1-Click Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspect(req)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect / Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === 'all' && (
            <RequestsTable
              requests={requests}
              csvFilename="mediq-all-company-forms.csv"
              emptyMessage="No digital forms have been filed yet."
              onInspect={onInspect}
            />
          )}

          {section === 'roles' && (
            <div className="space-y-5">
              <CreateAccountCard allowBossRole />
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Portal Role & Admin Access Control
                </h3>
                <p className="text-xs text-slate-500">
                  Assign who gets access to the HR Admin, Accounting Admin, and Boss Executive
                  portals.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-white text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Name & Email</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Portal Role</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profiles.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-500">{emp.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {emp.employee_code}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <RoleBadge role={emp.role} />
                            <select
                              value={emp.role}
                              disabled={updatingRoleId === emp.id}
                              onChange={(e) => handleRoleUpdate(emp, e.target.value as UserRole)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              <option value="employee">Employee</option>
                              <option value="hr">HR Admin</option>
                              <option value="accounting">Accounting Admin</option>
                              <option value="boss">Boss Executive</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={updatingRoleId === emp.id}
                            onClick={() => handleToggleActive(emp)}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                              emp.is_active
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-rose-50 hover:text-rose-700'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {emp.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}
