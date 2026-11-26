import React, { useState } from 'react';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEPARTMENTS } from '../lib/constants';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import type { UserRole } from '../types/database';

export function CreateAccountCard({ allowBossRole }: { allowBossRole: boolean }) {
  const { refreshAll } = useAppData();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[1]);
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-staff-account', {
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          department,
          position: position.trim() || 'Staff',
          role,
        },
      });

      if (error || data?.error) {
        let serverMsg = data?.error as string | undefined;
        if (!serverMsg && error && 'context' in error && error.context instanceof Response) {
          try {
            const errJson = await error.context.json();
            serverMsg = errJson?.error;
          } catch {
            // ignore JSON parse errors
          }
        }
        throw new Error(serverMsg || error?.message || 'Unable to create account.');
      }

      toast(
        'Account created & active immediately!',
        `${fullName.trim()} (${email.trim()}) can now sign in to the ${role.toUpperCase()} portal with zero email confirmation delay.`
      );
      setFullName('');
      setEmail('');
      setPassword('');
      setPosition('');
      setRole('employee');
      await refreshAll();
    } catch (err) {
      toast(
        'Could not create account',
        err instanceof Error ? err.message : 'Please check the details and try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleCreate}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Create Staff / Admin Account (Instant Activation)
            </h3>
            <p className="text-xs text-slate-500">
              Accounts created here are immediately verified and ready to log in—no confirmation
              email or rate limit.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          No Email Cap
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Juan Dela Cruz"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Work Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@mediqvision.net"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Initial Password *
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g., HR Officer / Accountant"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Portal Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
          >
            <option value="employee">Employee Portal</option>
            <option value="hr">HR Admin Portal</option>
            <option value="accounting">Accounting Admin Portal</option>
            {allowBossRole && <option value="boss">Boss Executive Admin</option>}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a192f] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {submitting ? 'Creating Account...' : 'Create & Activate Account'}
        </button>
      </div>
    </form>
  );
}
