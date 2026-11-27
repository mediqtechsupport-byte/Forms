import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  acceptStaffInvite,
  declineStaffInvite,
  lookupStaffInvite,
  type InvitePreview,
} from '@/lib/api';
import { ROLE_META, formatDate } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

function extractInviteToken(search: string, fullHref: string): string {
  const params = new URLSearchParams(search);
  const direct = params.get('token') || params.get('invite_token');
  if (direct) return direct.trim();
  const match = fullHref.match(/[?&](?:invite_)?token=([a-f0-9]+)/i);
  return match?.[1]?.trim() ?? '';
}

export function AcceptInvitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signInForPortal, signOut } = useAuth();
  const { toast } = useToast();

  const token = useMemo(
    () => extractInviteToken(location.search, typeof window !== 'undefined' ? window.location.href : ''),
    [location.search]
  );

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [declinedDone, setDeclinedDone] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      setLookupError('Missing invitation token. Please open the full link sent to your email.');
      return;
    }

    setLoading(true);
    setLookupError(null);
    lookupStaffInvite(token)
      .then((inv) => {
        if (!active) return;
        setInvite(inv);
        setFullName(inv.full_name);
      })
      .catch((err) => {
        if (!active) return;
        setLookupError(err instanceof Error ? err.message : 'Invalid or expired invitation link.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;
    setFormError(null);

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter the same password.');
      return;
    }

    setSubmitting('accept');
    try {
      // Clear any half-baked Supabase invite session before activating and signing in cleanly
      await signOut().catch(() => undefined);

      const res = await acceptStaffInvite({
        token,
        password,
        full_name: fullName.trim() || invite.full_name,
      });

      await signInForPortal(res.email, password, res.role);
      toast(
        'Invitation accepted!',
        `Welcome to MediQ Pharma, ${res.full_name}. Your ${ROLE_META[res.role].label} account is now active.`
      );
      navigate(`/${res.role}`, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to activate your account.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitting('decline');
    setFormError(null);
    try {
      await signOut().catch(() => undefined);
      await declineStaffInvite(token);
      setDeclinedDone(true);
      toast('Invitation declined', 'The administrator has been notified.', 'info');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to decline this invitation.');
    } finally {
      setSubmitting(null);
    }
  };

  const inputCls =
    'w-full rounded-[14px] border border-[#283f66] bg-[#0b172b] px-3.5 py-2.5 text-sm text-[#f5efe4] placeholder:text-[#6c7b96] outline-none transition focus:border-[#d9c7a7] focus:ring-2 focus:ring-[#d9c7a7]/20';

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#060e1c] p-4 text-[#f5efe4] sm:p-6"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#203456] bg-[#11213c] shadow-[0_28px_70px_rgba(0,0,0,0.7)]">
        {/* Midnight Navy Brand Header */}
        <div
          className="border-b border-[#203456] px-6 py-6 text-[#f5efe4] sm:px-8"
          style={{
            background:
              'radial-gradient(110% 130% at 92% 8%, rgba(217,199,167,0.16), transparent 55%), linear-gradient(145deg, #163362 0%, #0f2942 55%, #071329 100%)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <img
              src="./brand/mediq-logo-white.png"
              alt="MediQ Pharma"
              className="h-8 w-auto object-contain"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold text-[#e5d5b7]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Official Portal Invitation
            </span>
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.025em] text-[#f5efe4]">
            Accept Your MediQ Portal Invitation
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#b7afa2] sm:text-sm">
            Review your assigned MediQ Digital Forms role and set your private password to activate
            your account.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#d9c7a7]" />
              <p className="text-sm font-semibold text-[#f5efe4]">
                Verifying your invitation link...
              </p>
            </div>
          ) : lookupError || !invite ? (
            <div className="space-y-4 rounded-2xl border border-rose-400/30 bg-rose-950/40 p-5 text-center">
              <AlertCircle className="mx-auto h-9 w-9 text-rose-400" />
              <div>
                <h2 className="text-base font-bold text-rose-200">Invitation Link Unavailable</h2>
                <p className="mt-1 text-xs leading-relaxed text-rose-300">{lookupError}</p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-5 py-2.5 text-xs font-bold text-[#f7f2e8]"
              >
                Go to MediQ Portal Hub
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : declinedDone || invite.status === 'declined' ? (
            <div className="space-y-4 rounded-2xl border border-[#203456] bg-[#0b172b] p-6 text-center">
              <XCircle className="mx-auto h-9 w-9 text-[#948e84]" />
              <div>
                <h2 className="text-base font-bold text-[#f5efe4]">Invitation Declined</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#b7afa2]">
                  You have declined the invitation for <strong>{invite.email}</strong>. No account
                  was activated.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#283f66] bg-[#11213c] px-5 py-2 text-xs font-bold text-[#e5d5b7]"
              >
                Return to Portal Hub
              </Link>
            </div>
          ) : invite.status === 'accepted' ? (
            <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-6 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-emerald-200">
                  Invitation Already Accepted
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-emerald-300">
                  The account for <strong>{invite.email}</strong> is already active. Please sign in
                  using your email and password.
                </p>
              </div>
              <Link
                to={`/${invite.role}/login`}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-5 py-2.5 text-xs font-bold text-[#f7f2e8]"
              >
                Sign In to {ROLE_META[invite.role].label} Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : invite.status !== 'pending' ? (
            <div className="space-y-4 rounded-2xl border border-amber-400/30 bg-amber-950/35 p-6 text-center">
              <Clock className="mx-auto h-9 w-9 text-amber-400" />
              <div>
                <h2 className="text-base font-bold text-amber-200">
                  Invitation {invite.status === 'expired' ? 'Expired' : 'Revoked'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-amber-300">
                  This invitation for <strong>{invite.email}</strong> is no longer active. Please
                  ask your Boss or HR Admin to send a fresh invitation.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-5 py-2.5 text-xs font-bold text-[#f7f2e8]"
              >
                Go to Portal Hub
              </Link>
            </div>
          ) : (
            /* Active Pending Invitation — Employee Acceptance Form */
            <div className="space-y-5">
              {/* Invitation Details Card */}
              <div className="rounded-2xl border border-[#203456] bg-[#0b172b] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#203456] pb-3">
                  <span className="text-[11px] font-bold tracking-[0.06em] text-[#d9c7a7] uppercase">
                    Invited By {invite.invited_by_name} ({invite.invited_by_role.toUpperCase()})
                  </span>
                  <span className="rounded-full bg-[#d9c7a7] px-3 py-0.5 text-[11px] font-bold text-[#081428]">
                    {ROLE_META[invite.role].label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-[#f5efe4]">
                    <Mail className="h-3.5 w-3.5 text-[#d9c7a7]" />
                    <span className="truncate font-semibold">{invite.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#b7afa2]">
                    <Building2 className="h-3.5 w-3.5 text-[#d9c7a7]" />
                    <span className="truncate">
                      {invite.department} · {invite.position}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#b7afa2] sm:col-span-2">
                    <Clock className="h-3.5 w-3.5 text-[#d9c7a7]" />
                    <span>Valid until {formatDate(invite.expires_at)}</span>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAccept} className="space-y-3.5">
                <label className="grid gap-1.5 text-xs font-semibold text-[#b7afa2]">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-[#d9c7a7]" />
                    Confirm Your Full Name *
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold text-[#b7afa2]">
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-[#d9c7a7]" />
                      Create Your Password *
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-[#b7afa2]">
                    <span>Confirm Password *</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={inputCls}
                    />
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => void handleDecline()}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-950/40 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-900/50 disabled:opacity-60"
                  >
                    {submitting === 'decline' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Decline Invitation
                  </button>

                  <button
                    type="submit"
                    disabled={submitting !== null}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-6 py-3 text-xs font-bold text-[#f7f2e8] shadow-[0_10px_24px_rgba(0,0,0,0.5)] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {submitting === 'accept' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {submitting === 'accept'
                      ? 'Activating Account...'
                      : 'Accept Invitation & Activate'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-[#948e84]">
        MediQ Pharma Paperless Digital Forms · Protected by Supabase Auth &amp; Row-Level Security
      </p>
    </div>
  );
}
