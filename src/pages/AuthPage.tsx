import React, { useState } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Clock,
  Receipt,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEPARTMENTS } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';

export function AuthPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[1]);
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConfirmationEmail(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast('Welcome back!', 'Signed in to MediQ Digital Forms.');
      } else {
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
            'Account created — confirm email',
            'Please check your inbox to activate your account.',
            'info'
          );
        } else {
          toast('Account ready!', 'Welcome to the MediQ Paperless Forms Portal.');
        }
      }
    } catch (err) {
      toast(
        mode === 'login' ? 'Sign in failed' : 'Registration failed',
        err instanceof Error ? err.message : 'Please check your credentials and try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Brand Showcase */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0a192f] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <img
            src="/brand/mediq-logo-white.png"
            alt="MediQ Pharma"
            className="h-10 w-auto object-contain"
          />
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30">
            100% Paperless Digital Workflow
          </p>
          <h1 className="mt-4 max-w-lg text-4xl font-extrabold leading-tight tracking-tight">
            No more pen, paper, or waiting for approvals.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Employees submit signed digital Leave, Overtime, Reimbursement, and Official Business
            forms in seconds—delivered instantly in real time to HR, the Boss, and Accounting.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <FileCheck2 className="h-5 w-5 text-sky-400" />
              <p className="mt-2.5 text-sm font-bold">Signed Digital Forms</p>
              <p className="mt-1 text-xs text-slate-400">
                Built-in e-signature & instant printable PDF slip for every request.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              <p className="mt-2.5 text-sm font-bold">Boss Executive Portal</p>
              <p className="mt-1 text-xs text-slate-400">
                One-click final sign-off on all Leave, OT, OB & expense claims.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <Clock className="h-5 w-5 text-violet-400" />
              <p className="mt-2.5 text-sm font-bold">HR Admin & Leave Credits</p>
              <p className="mt-1 text-xs text-slate-400">
                Auto-deducted VL/SL/EL balances and live employee directory.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <Receipt className="h-5 w-5 text-emerald-400" />
              <p className="mt-2.5 text-sm font-bold">Accounting & Receipts</p>
              <p className="mt-1 text-xs text-slate-400">
                Verify receipt photos, track payouts & export payroll CSVs.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} MediQ Pharma · Powered by Supabase Real-Time Security
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              src="/brand/mediq-logo-dark.png"
              alt="MediQ Pharma"
              className="mb-4 h-9 w-auto object-contain lg:hidden"
            />
            <h2 className="text-2xl font-extrabold text-slate-900">
              {mode === 'login' ? 'Sign in to MediQ Forms' : 'Create Employee Account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login'
                ? 'Access your Employee, HR, Boss, or Accounting workspace.'
                : 'Register with your company email. The first account becomes Boss Admin automatically.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
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
                setConfirmationEmail(null);
              }}
              className={`rounded-lg py-2 text-xs font-bold transition ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {confirmationEmail && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">Confirmation email sent to {confirmationEmail}</p>
                  <p className="mt-1 leading-relaxed text-emerald-800">
                    Click the verification link in your email inbox, then sign in here. (Admins can
                    also disable email confirmation in Supabase Auth settings for instant onboarding.)
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Maria Santos"
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
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
                      Job Title / Position
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g., Clinical Specialist"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
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
                placeholder="name@mediqvision.net"
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
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a192f] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Digital Forms Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Roles (<span className="font-semibold text-slate-700">Employee</span>,{' '}
            <span className="font-semibold text-violet-700">HR</span>,{' '}
            <span className="font-semibold text-amber-700">Boss</span>,{' '}
            <span className="font-semibold text-emerald-700">Accounting</span>) are enforced at the
            database level with Supabase Row-Level Security.
          </p>
        </div>
      </div>
    </div>
  );
}
