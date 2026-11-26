import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Calculator,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { canAccessRolePortal, fetchProfile } from '../lib/api';
import { DEPARTMENTS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { UserRole } from '../types/database';

const PORTAL_LOGIN_CONFIG: Record<
  UserRole,
  {
    title: string;
    subtitle: string;
    badge: string;
    emailPlaceholder: string;
    allowSignup: boolean;
    heroBg: string;
    accentPill: string;
    buttonBg: string;
    highlights: string[];
    icon: typeof LayoutDashboard;
  }
> = {
  employee: {
    title: 'Employee Portal Sign In',
    subtitle: 'File digital Leave, Overtime, Reimbursement, and Official Business forms.',
    badge: 'Staff Self-Service',
    emailPlaceholder: 'name@mediqvision.net',
    allowSignup: true,
    heroBg: 'from-[#071629] via-[#0c2d52] to-[#0a192f]',
    accentPill: 'bg-sky-500/20 text-sky-300 ring-sky-400/30',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    highlights: [
      'Sign & submit Leave, OT, Reimbursement & OB forms digitally',
      'Upload Official Receipt photos directly from your phone or PC',
      'Check live Vacation, Sick & Emergency Leave balances anytime',
    ],
    icon: LayoutDashboard,
  },
  boss: {
    title: 'Boss Executive Admin Sign In',
    subtitle: 'Authorized login for final executive digital sign-off & company role access.',
    badge: 'Executive Restricted Access',
    emailPlaceholder: 'boss@mediqvision.net',
    allowSignup: true,
    heroBg: 'from-[#0b1120] via-slate-900 to-amber-950/90',
    accentPill: 'bg-amber-400/20 text-amber-300 ring-amber-400/30',
    buttonBg: 'bg-[#0a192f] hover:bg-slate-800 text-amber-300',
    highlights: [
      '1-Click Executive Sign-Off on every Leave, OT, OB & expense claim',
      'Live company spend exposure & digital forms analytics',
      'Assign or revoke HR Admin, Accounting & Executive permissions',
    ],
    icon: ShieldCheck,
  },
  hr: {
    title: 'HR Admin Portal Sign In',
    subtitle: 'Authorized login for Human Resources leave, overtime & employee administration.',
    badge: 'HR Department Only',
    emailPlaceholder: 'hr@mediqvision.net',
    allowSignup: false,
    heroBg: 'from-[#170f2e] via-violet-950 to-[#0a192f]',
    accentPill: 'bg-violet-400/20 text-violet-300 ring-violet-400/30',
    buttonBg: 'bg-violet-600 hover:bg-violet-700 text-white',
    highlights: [
      'Review, endorse, approve or reject Leave, OT, OB & HR requests',
      'Manage Employee Directory & adjust annual VL / SL / EL credits',
      'Publish pinned HR memos & holiday advisories to all staff',
    ],
    icon: Users,
  },
  accounting: {
    title: 'Accounting Admin Sign In',
    subtitle: 'Authorized login for Finance receipt verification, payouts & overtime payroll.',
    badge: 'Finance & Accounting Only',
    emailPlaceholder: 'accounting@mediqvision.net',
    allowSignup: false,
    heroBg: 'from-[#06211c] via-emerald-950 to-[#0a192f]',
    accentPill: 'bg-emerald-400/20 text-emerald-300 ring-emerald-400/30',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    highlights: [
      'Inspect uploaded BIR Official Receipts & itemized expense breakdowns',
      'Record Bank, Check or GCash disbursement reference numbers',
      'Verify approved Overtime hours & export ready-for-payroll CSVs',
    ],
    icon: Calculator,
  },
};

export function AuthPage({ portal }: { portal: UserRole }) {
  const navigate = useNavigate();
  const { signInForPortal } = useAuth();
  const { toast } = useToast();

  const cfg = PORTAL_LOGIN_CONFIG[portal];
  const Icon = cfg.icon;

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(
    portal === 'boss' ? 'Executive' : DEPARTMENTS[1]
  );
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoleError(null);
    setConfirmationEmail(null);

    try {
      if (mode === 'login') {
        await signInForPortal(email.trim(), password, portal);
        toast('Signed in successfully', `Welcome to ${cfg.title.replace(' Sign In', '')}.`);
        navigate(`/${portal}`, { replace: true });
      } else {
        if (portal === 'boss') {
          // One-time Boss bootstrap Edge Function (only succeeds when DB has 0 profiles; bypasses 2/hr confirmation email cap)
          const { data: fnData, error: fnError } = await supabase.functions.invoke(
            'bootstrap-boss',
            {
              body: {
                full_name: fullName.trim(),
                email: email.trim(),
                password,
                department,
                position: position.trim() || 'Managing Director',
              },
            }
          );

          if (fnError || fnData?.error) {
            let serverMsg = fnData?.error as string | undefined;
            if (!serverMsg && fnError && 'context' in fnError && fnError.context instanceof Response) {
              try {
                const errJson = await fnError.context.json();
                serverMsg = errJson?.error;
              } catch {
                // ignore JSON parse errors
              }
            }
            throw new Error(
              serverMsg ||
                fnError?.message ||
                'Boss setup failed. If a Boss account already exists, please sign in instead.'
            );
          }

          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginErr) throw loginErr;

          toast(
            'Boss Executive account created!',
            'You are signed in and ready to create HR, Accounting & Employee accounts.'
          );
          navigate('/boss', { replace: true });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              department,
              position: position.trim() || 'Staff',
            },
          },
        });
        if (error) throw error;

        if (!data.session) {
          setConfirmationEmail(email.trim());
          toast(
            'Account created — verify email',
            'Please click the verification link sent to your email inbox, then sign in.',
            'info'
          );
          return;
        }

        const prof = data.user ? await fetchProfile(data.user.id) : null;
        if (prof && !canAccessRolePortal(prof.role, portal)) {
          toast(
            'Account registered as Employee',
            'Redirecting you to the Employee Portal. Ask the Boss Admin to upgrade your role if needed.',
            'info'
          );
          navigate(`/${prof.role}`, { replace: true });
          return;
        }

        toast('Account ready!', `Welcome to ${cfg.title.replace(' Sign In', '')}.`);
        navigate(`/${portal}`, { replace: true });
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Please check your credentials and try again.';
      if (rawMsg.startsWith('Access denied:')) {
        setRoleError(rawMsg);
      }
      const friendlyMsg = rawMsg.toLowerCase().includes('rate limit')
        ? 'Supabase default email limit (2/hr) reached. Ask Boss/HR Admin to create your account instantly inside Role & Admin Access, or turn off "Confirm email" in Supabase Auth Providers.'
        : rawMsg;
      toast(
        mode === 'login' ? 'Sign in failed' : 'Registration failed',
        friendlyMsg,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Portal-Branded Panel */}
      <div
        className={`relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br p-12 text-white lg:flex ${cfg.heroBg}`}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <img
              src="./brand/mediq-logo-white.png"
              alt="MediQ Pharma"
              className="h-9 w-auto object-contain"
            />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Portals
            </Link>
          </div>

          <div className="mt-14">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${cfg.accentPill}`}
            >
              <Lock className="h-3.5 w-3.5" />
              {cfg.badge}
            </span>

            <div className="mt-5 flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {cfg.title.replace(' Sign In', '')}
              </h1>
            </div>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">{cfg.subtitle}</p>

            <ul className="mt-8 space-y-3">
              {cfg.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-relaxed text-slate-200 backdrop-blur-xs"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          MediQ Pharma Digital Forms · Live Supabase Auth & Row-Level Security
        </p>
      </div>

      {/* Right Live Auth Card */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Choose Another Portal
          </Link>

          <div className="mb-6">
            <img
              src="./brand/mediq-logo-dark.png"
              alt="MediQ Pharma"
              className="mb-4 h-8 w-auto object-contain lg:hidden"
            />
            <h2 className="text-2xl font-extrabold text-slate-900">{cfg.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{cfg.subtitle}</p>
          </div>

          {cfg.allowSignup && (
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setRoleError(null);
                  setConfirmationEmail(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setRoleError(null);
                  setConfirmationEmail(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {portal === 'boss' ? 'First-Time Boss Setup' : 'Register Employee'}
              </button>
            </div>
          )}

          {roleError && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p className="leading-relaxed">{roleError}</p>
              </div>
            </div>
          )}

          {confirmationEmail && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">Verification email sent to {confirmationEmail}</p>
                  <p className="mt-0.5 text-emerald-800">
                    Click the confirmation link in your inbox, then sign in here.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && cfg.allowSignup && (
              <>
                {portal === 'boss' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    The <strong>very first account</strong> registered on this Supabase database is
                    automatically assigned the <strong>Boss Executive</strong> role. All later
                    accounts start as Employee until upgraded by the Boss.
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Position
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder={portal === 'boss' ? 'Managing Director' : 'Staff / Specialist'}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Work Email *
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={cfg.emailPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition disabled:opacity-60 ${cfg.buttonBg}`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {!cfg.allowSignup && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Need HR or Accounting access?</p>
              <p className="mt-1 leading-relaxed text-slate-500">
                Register an account via the{' '}
                <Link to="/employee/login" className="font-semibold text-sky-700 hover:underline">
                  Employee Portal
                </Link>
                , then have the Boss Executive Admin assign your <strong>HR</strong> or{' '}
                <strong>Accounting</strong> role inside Role & Admin Access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
