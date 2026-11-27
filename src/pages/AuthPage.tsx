import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { UserRole } from '../types/database';

const PORTAL_META: Record<
  UserRole,
  {
    index: string;
    shortLabel: string;
    title: string;
    panelHeadline: string;
    panelNote: string;
    emailPlaceholder: string;
    stagePosition: 0 | 1 | 2;
    icon: typeof LayoutDashboard;
  }
> = {
  employee: {
    index: '01',
    shortLabel: 'Employee',
    title: 'Employee Portal',
    panelHeadline: 'Submit signed forms from anywhere.',
    panelNote:
      'File Leave, Overtime, Official Business, Cash Advance, and Expense Reimbursement slips with receipt uploads and live tracking.',
    emailPlaceholder: 'you@mediqvision.net',
    stagePosition: 0,
    icon: LayoutDashboard,
  },
  hr: {
    index: '02',
    shortLabel: 'HR Admin',
    title: 'HR Admin Portal',
    panelHeadline: 'People operations & Stage 1 review.',
    panelNote:
      'Review Leave, Overtime, Official Business, and HR requests first before forwarding to Executive sign-off. Export printable history anytime.',
    emailPlaceholder: 'hr@mediqvision.net',
    stagePosition: 1,
    icon: Users,
  },
  accounting: {
    index: '03',
    shortLabel: 'Accounting',
    title: 'Accounting Admin',
    panelHeadline: 'Receipts, claims & payroll checks.',
    panelNote:
      'Verify BIR official receipts, audit Reimbursements, Cash Advances, and Overtime payroll first before routing to Executive sign-off.',
    emailPlaceholder: 'accounting@mediqvision.net',
    stagePosition: 1,
    icon: Calculator,
  },
  boss: {
    index: '04',
    shortLabel: 'Boss Executive',
    title: 'Boss Executive',
    panelHeadline: 'Final executive sign-off & archive.',
    panelNote:
      'Sign off on HR- and Accounting-cleared requests. Every Boss approval permanently locks the official slip in History for audit integrity.',
    emailPlaceholder: 'executive@mediqvision.net',
    stagePosition: 2,
    icon: ShieldCheck,
  },
};

export function AuthPage({ portal }: { portal: UserRole }) {
  const navigate = useNavigate();
  const { signInForPortal } = useAuth();
  const { toast } = useToast();

  const cfg = PORTAL_META[portal];
  const Icon = cfg.icon;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoleError(null);

    try {
      await signInForPortal(email.trim(), password, portal);
      toast('Signed in', `Welcome to ${cfg.title}.`);
      navigate(`/${portal}`, { replace: true });
    } catch (err) {
      const rawMsg =
        err instanceof Error ? err.message : 'Please check your email and password and try again.';
      setRoleError(rawMsg);
      toast('Sign in failed', rawMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const workflowStages = [
    { step: '01', label: 'Employee Submission', active: cfg.stagePosition === 0 },
    {
      step: '02',
      label: portal === 'accounting' ? 'Accounting Verification' : 'HR / Accounting Review',
      active: cfg.stagePosition === 1,
    },
    { step: '03', label: 'Boss Sign-Off & Lock', active: cfg.stagePosition === 2 },
  ];

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#060e1c] text-[#f5efe4]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
    >
      {/* Slim Quiet Top Bar — Matches Portal Hub Seamlessly */}
      <header className="w-full border-b border-[#203456] bg-[#0b172b]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-3.5">
            <img
              src="./brand/mediq-logo-white.png"
              alt="MediQ Pharma"
              className="h-7 w-auto shrink-0 object-contain sm:h-8"
            />
            <span className="hidden h-5 w-px bg-[#203456] sm:block" aria-hidden="true" />
            <span className="hidden text-xs font-medium text-[#b7afa2] sm:block">
              Internal Forms &amp; Approval Workspace
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#283f66] bg-[#11213c] px-3.5 py-2 text-xs font-semibold text-[#e5d5b7] transition hover:border-[#d9c7a7]/60 hover:text-[#f5efe4]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Workspaces
          </Link>
        </div>
      </header>

      {/* Centered Framed Two-Column Midnight Navy Login Card */}
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-[#203456] bg-[#11213c] shadow-[0_28px_70px_-24px_rgba(0,0,0,0.8)] lg:grid-cols-12">
          {/* Left Deep Midnight Navy Architectural Rail (Desktop) */}
          <aside
            className="relative hidden flex-col justify-between border-r border-[#203456] p-10 text-[#f5efe4] lg:col-span-5 lg:flex"
            style={{
              background:
                'radial-gradient(120% 110% at 95% 10%, rgba(217,199,167,0.14), transparent 55%), linear-gradient(155deg, #163362 0%, #0f2942 52%, #071329 100%)',
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #f5efe4 1px, transparent 1px), linear-gradient(to bottom, #f5efe4 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-[#d9c7a7] uppercase">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-[#f5efe4]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>
                  {cfg.index} · {cfg.title}
                </span>
              </div>

              <h1 className="mt-6 text-[30px] font-semibold leading-[1.14] tracking-[-0.03em] text-[#f5efe4]">
                {cfg.panelHeadline}
              </h1>

              <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#b7afa2]">
                {cfg.panelNote}
              </p>

              {/* Minimalist Approval Chain Indicator */}
              <div className="mt-9 border-t border-white/12 pt-6">
                <p className="text-[10.5px] font-bold tracking-[0.12em] text-[#948e84] uppercase">
                  MediQ Approval Chain
                </p>
                <ol className="mt-3.5 space-y-2.5">
                  {workflowStages.map((s) => (
                    <li
                      key={s.step}
                      className={`flex items-center gap-3 text-xs ${
                        s.active ? 'font-semibold text-[#f5efe4]' : 'text-[#948e84]'
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-bold ${
                          s.active
                            ? 'bg-[#d9c7a7] text-[#081428]'
                            : 'border border-white/20 text-[#b7afa2]'
                        }`}
                      >
                        {s.step}
                      </span>
                      <span>{s.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="relative z-10 mt-10 border-t border-white/12 pt-4 text-[11px] text-[#948e84]">
              MediQ Pharma · Role-Isolated Digital Forms
            </div>
          </aside>

          {/* Right Midnight Navy Dedicated Portal Sign-In Form */}
          <section className="flex flex-col justify-between bg-[#11213c] p-6 sm:p-10 lg:col-span-7 lg:p-12">
            <div>
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-[#d9c7a7] uppercase">
                  <Icon className="h-3.5 w-3.5 lg:hidden" />
                  Authorized Sign In
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[#f5efe4] sm:text-[28px]">
                  Sign in to {cfg.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[#b7afa2] sm:text-sm">
                  Enter your authorized {cfg.shortLabel} email and password to continue.
                </p>
              </div>

              {roleError && (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-400/30 bg-rose-950/50 px-4 py-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <p className="leading-relaxed">{roleError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-xs font-semibold text-[#b7afa2]"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={cfg.emailPlaceholder}
                    className="h-11 w-full rounded-[14px] border border-[#283f66] bg-[#0b172b] px-3.5 text-sm text-[#f5efe4] placeholder:text-[#6c7b96] outline-none transition focus:border-[#d9c7a7] focus:ring-2 focus:ring-[#d9c7a7]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="mb-1.5 block text-xs font-semibold text-[#b7afa2]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-11 w-full rounded-[14px] border border-[#283f66] bg-[#0b172b] pl-3.5 pr-11 text-sm text-[#f5efe4] placeholder:text-[#6c7b96] outline-none transition focus:border-[#d9c7a7] focus:ring-2 focus:ring-[#d9c7a7]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#948e84] transition hover:bg-[#1a2f52] hover:text-[#f5efe4]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#29508f] to-[#142e5c] px-5 text-sm font-semibold text-[#f7f2e8] shadow-[0_10px_24px_-6px_rgba(0,0,0,0.65)] transition hover:from-[#3460a8] hover:to-[#1b3b73] disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quiet Up-To-Date Invitation Access Note */}
            <div className="mt-8 flex items-start gap-2.5 border-t border-[#203456] pt-5 text-xs text-[#948e84]">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#d9c7a7]" />
              <p className="leading-relaxed">
                {portal === 'boss'
                  ? 'Executive accounts (CEO & COO) sign in separately with their own email and saved E-Signature.'
                  : 'New staff accounts are activated by email invitation. Ask your Boss Executive or HR Admin to invite your email, then click Accept in your inbox.'}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
