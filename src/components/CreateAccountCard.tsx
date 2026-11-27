import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  fetchStaffInvitations,
  revokeStaffInvite,
  sendStaffInvite,
} from '../lib/api';
import { DEPARTMENTS, ROLE_META, formatDate } from '../lib/constants';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import type { StaffInvitation, UserRole } from '../types/database';

function getPortalBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://mediqtechsupport-byte.github.io/Forms';
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
  return base;
}

function buildAcceptUrl(token: string): string {
  return `${getPortalBaseUrl()}/#/accept-invite?token=${token}`;
}

function buildMailtoHref(inv: {
  email: string;
  full_name: string;
  role: UserRole;
  accept_url: string;
}): string {
  const subject = encodeURIComponent(
    `MediQ Pharma Digital Forms — Accept Your ${ROLE_META[inv.role].label} Invitation`
  );
  const body = encodeURIComponent(
    `Hi ${inv.full_name},\n\nYou have been invited to join the MediQ Pharma Paperless Forms Portal as ${ROLE_META[inv.role].label}.\n\nPlease click the link below to accept your invitation and set your password:\n${inv.accept_url}\n\nThank you,\nMediQ Pharma Admin`
  );
  return `mailto:${inv.email}?subject=${subject}&body=${body}`;
}

export function CreateAccountCard({ allowBossRole }: { allowBossRole: boolean }) {
  const { refreshAll } = useAppData();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[1]);
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [submitting, setSubmitting] = useState(false);

  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<{
    email: string;
    fullName: string;
    role: UserRole;
    acceptUrl: string;
    emailSent: boolean;
    note: string;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const list = await fetchStaffInvitations();
      setInvitations(list);
    } catch (err) {
      console.error('Failed loading invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();

    const channel = supabase
      .channel('mediq-staff-invitations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_invitations' },
        () => {
          void loadInvitations();
          void refreshAll();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInvitations, refreshAll]);

  const presetCoBoss = () => {
    setRole('boss');
    setDepartment('Executive');
    if (!position.trim()) setPosition('CEO / COO');
    nameInputRef.current?.focus();
  };

  const copyLink = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(key);
      toast('Invite link copied!', 'You can paste and send it via Messenger, Viber, or Email.');
      window.setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2200);
    } catch {
      toast('Copy failed', 'Please select and copy the link manually.', 'error');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await sendStaffInvite({
        full_name: fullName.trim(),
        email: email.trim(),
        department,
        position: position.trim() || (role === 'boss' ? 'CEO / COO' : 'Staff'),
        role,
        portal_base_url: getPortalBaseUrl(),
      });

      setLastSent({
        email: res.invitation.email,
        fullName: res.invitation.full_name,
        role: res.invitation.role,
        acceptUrl: res.accept_url,
        emailSent: res.email_sent,
        note: res.email_delivery_note,
      });

      toast(
        res.email_sent ? 'Email invitation sent!' : 'Invitation link ready!',
        res.email_sent
          ? `${res.invitation.email} has been notified and must accept the invite to activate their account.`
          : `Pending invite saved for ${res.invitation.email}. Share the acceptance link directly so they can accept.`
      );

      setFullName('');
      setEmail('');
      setPosition('');
      setRole('employee');
      await loadInvitations();
      await refreshAll();
    } catch (err) {
      toast(
        'Could not send invitation',
        err instanceof Error ? err.message : 'Please check the details and try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (inv: StaffInvitation) => {
    setResendingId(inv.id);
    try {
      const res = await sendStaffInvite({
        full_name: inv.full_name,
        email: inv.email,
        department: inv.department,
        position: inv.position,
        role: inv.role,
        portal_base_url: getPortalBaseUrl(),
      });
      setLastSent({
        email: res.invitation.email,
        fullName: res.invitation.full_name,
        role: res.invitation.role,
        acceptUrl: res.accept_url,
        emailSent: res.email_sent,
        note: res.email_delivery_note,
      });
      toast(
        res.email_sent ? 'Invitation re-sent!' : 'Fresh invite link created!',
        `Updated acceptance link generated for ${inv.email}.`
      );
      await loadInvitations();
    } catch (err) {
      toast('Resend failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (inv: StaffInvitation) => {
    setRevokingId(inv.id);
    try {
      await revokeStaffInvite(inv.id);
      toast('Invitation revoked', `${inv.email} can no longer use that invitation link.`, 'info');
      await loadInvitations();
      await refreshAll();
    } catch (err) {
      toast('Revoke failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const pendingCount = invitations.filter((i) => i.status === 'pending').length;

  const statusBadge = (status: StaffInvitation['status']) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-500">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-[var(--fy-rose-bg)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--fy-rose)]">
            <XCircle className="h-3 w-3" />
            Declined
          </span>
        );
      case 'revoked':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground capitalize">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-[var(--fy-amber-bg)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--fy-amber)]">
            <Clock className="h-3 w-3" />
            Pending Acceptance
          </span>
        );
    }
  };

  const inputCls =
    'w-full rounded-[12px] border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-[var(--fy-text)] focus:ring-2 focus:ring-[var(--fy-soft)]';

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSendInvite}
        className="rounded-[20px] border border-border bg-card p-5 text-foreground"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--fy-soft)] text-[var(--fy-text)]">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Invite Staff or Executive (CEO &amp; COO) by Email (Acceptance Required)
              </h3>
              <p className="text-xs text-muted-foreground">
                Add an employee, admin, or CEO / COO email — they will receive a notification and
                must accept the invitation &amp; set their own password before their account
                activates.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {allowBossRole && (
              <button
                type="button"
                onClick={presetCoBoss}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  role === 'boss'
                    ? 'fy-primary'
                    : 'border border-border bg-muted text-foreground hover:border-[var(--fy-text)]'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                + Invite CEO / COO Executive
              </button>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground">
              <Clock className="h-3 w-3" />
              {pendingCount} Pending
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Full Name *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={role === 'boss' ? 'e.g., Executive Name' : 'e.g., Juan Dela Cruz'}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Employee / Staff Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'boss' ? 'ceo.coo@mediqvision.net' : 'employee@gmail.com'}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputCls}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Position
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={role === 'boss' ? 'e.g., CEO or COO' : 'e.g., Clinical Specialist'}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Portal Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`${inputCls} font-bold`}
            >
              <option value="employee">Employee Portal</option>
              <option value="hr">HR Admin Portal</option>
              <option value="accounting">Accounting Admin Portal</option>
              {allowBossRole && <option value="boss">Boss Executive Admin (CEO / COO)</option>}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {role === 'boss'
              ? 'CEO / COO invite: once accepted, this email gets full Boss Executive sign-off access with its own E-Signature and receives form email alerts.'
              : 'The employee receives a notification & acceptance link valid for 7 days. Account activates only after they accept.'}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="fy-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {submitting
              ? 'Sending Invitation...'
              : role === 'boss'
                ? 'Send Boss Invitation'
                : 'Send Email Invitation'}
          </button>
        </div>

        {/* Immediate Post-Send Confirmation & Copyable Link */}
        {lastSent && (
          <div
            className={`mt-4 rounded-2xl border p-3.5 ${
              lastSent.emailSent
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-amber-500/30 bg-[var(--fy-amber-bg)]'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                  {lastSent.emailSent ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[var(--fy-amber)]" />
                  )}
                  {lastSent.emailSent
                    ? `Email notification sent to ${lastSent.email}`
                    : `Invitation link created (email not delivered) for ${lastSent.email}`}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{lastSent.note}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink(lastSent.acceptUrl, 'last-sent')}
                  className="fy-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold"
                >
                  {copiedId === 'last-sent' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === 'last-sent' ? 'Copied Link!' : 'Copy Acceptance Link'}
                </button>
                <a
                  href={buildMailtoHref({
                    email: lastSent.email,
                    full_name: lastSent.fullName,
                    role: lastSent.role,
                    accept_url: lastSent.acceptUrl,
                  })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-bold text-foreground transition hover:border-[var(--fy-text)]"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Open Email App
                </a>
              </div>
            </div>
            <p className="mt-2 truncate rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
              {lastSent.acceptUrl}
            </p>
          </div>
        )}
      </form>

      {/* Sent Invitations Tracker */}
      {invitations.length > 0 && (
        <div className="overflow-hidden rounded-[20px] border border-border bg-card text-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--fy-text)]" />
              <h4 className="text-xs font-extrabold tracking-wide text-foreground uppercase">
                Sent Invitations &amp; Acceptance Status ({invitations.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => void loadInvitations()}
              disabled={loadingInvites}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-[var(--fy-text)]"
            >
              <RefreshCw className={`h-3 w-3 ${loadingInvites ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/45 text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5">Invited Staff</th>
                  <th className="px-4 py-2.5">Portal Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Invited By</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {invitations.map((inv) => {
                  const link = buildAcceptUrl(inv.invite_token);
                  const canManage = inv.status === 'pending' && (allowBossRole || inv.role !== 'boss');
                  return (
                    <tr key={inv.id} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-foreground">{inv.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {inv.email} · {inv.department}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-[var(--fy-soft)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--fy-text)] uppercase">
                          {ROLE_META[inv.role].shortLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col items-start gap-0.5">
                          {statusBadge(inv.status)}
                          <span className="text-[10px] text-muted-foreground">
                            {inv.status === 'accepted' && inv.accepted_at
                              ? `Accepted ${formatDate(inv.accepted_at)}`
                              : inv.status === 'pending'
                                ? `${inv.email_sent ? 'Email sent' : 'Link ready'} · Exp ${formatDate(
                                    inv.expires_at
                                  )}`
                                : formatDate(inv.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                        {inv.invited_by_name} ({inv.invited_by_role.toUpperCase()})
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canManage ? (
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void copyLink(link, inv.id)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-[var(--fy-text)]"
                            >
                              {copiedId === inv.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {copiedId === inv.id ? 'Copied' : 'Copy Link'}
                            </button>
                            <button
                              type="button"
                              disabled={resendingId === inv.id}
                              onClick={() => void handleResend(inv)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-[var(--fy-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fy-text)] hover:brightness-110 disabled:opacity-50"
                            >
                              {resendingId === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Resend
                            </button>
                            <button
                              type="button"
                              disabled={revokingId === inv.id}
                              onClick={() => void handleRevoke(inv)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-500/30 bg-[var(--fy-rose-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fy-rose)] hover:brightness-110 disabled:opacity-50"
                            >
                              {revokingId === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
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
    </div>
  );
}
