import React, { useCallback, useEffect, useState } from 'react';
import { Save, Loader2, Shield } from 'lucide-react';
import { useAppData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { DEPARTMENTS, ROLE_META } from '../lib/constants';
import { SignaturePad } from '../components/SignaturePad';
import { RoleBadge } from '../components/StatusBadges';

export function ProfilePage() {
  const { activeProfile: profile, saveProfile } = useAppData();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [department, setDepartment] = useState(profile?.department ?? 'Operations');
  const [position, setPosition] = useState(profile?.position ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [signatureData, setSignatureData] = useState(profile?.signature_data ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setDepartment(profile.department);
      setPosition(profile.position);
      setPhone(profile.phone ?? '');
      setSignatureData(profile.signature_data ?? '');
    }
  }, [profile]);

  const handleSigChange = useCallback((val: string) => {
    setSignatureData(val);
  }, []);

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile(profile.id, {
        full_name: fullName.trim() || profile.full_name,
        department,
        position: position.trim() || profile.position,
        phone: phone.trim() || null,
        signature_data: signatureData || null,
      });
      toast(
        'Profile & e-signature saved',
        'Your default signature will automatically appear on future digital forms and approvals.'
      );
    } catch (err) {
      toast(
        'Could not update profile',
        err instanceof Error ? err.message : 'Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Employee Profile & E-Signature</h2>
            <p className="text-xs text-slate-500">
              Save your digital signature once so both filing and approving forms take one click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">
              {profile.employee_code}
            </span>
            <RoleBadge role={profile.role} />
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Work Email</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mobile / Contact Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917-xxx-xxxx"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Shield className="h-3.5 w-3.5 text-sky-600" />
                Portal Access Level
              </div>
              <p className="mt-1 text-xs text-slate-600">{ROLE_META[profile.role].description}</p>
            </div>
          </div>

          <SignaturePad
            signerName={fullName || profile.full_name}
            initialSignature={profile.signature_data || profile.full_name}
            onChange={handleSigChange}
          />

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a192f] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Profile & Default Signature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
