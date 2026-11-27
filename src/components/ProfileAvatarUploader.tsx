import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { removeProfileAvatar, uploadProfileAvatar } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MQ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProfileAvatarUploader({
  profileId,
  fullName,
  subtitle,
  heading = 'Profile & Digital E-Signature',
  avatarUrl,
  onUploaded,
}: {
  profileId: string;
  fullName: string;
  subtitle: string;
  heading?: string;
  avatarUrl: string | null | undefined;
  onUploaded: (newUrl: string | null) => Promise<void> | void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null);
  const [imgError, setImgError] = useState(false);

  // Sync external avatarUrl changes when not mid-upload
  React.useEffect(() => {
    setPreviewUrl(avatarUrl ?? null);
    setImgError(false);
  }, [avatarUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy('upload');
    try {
      const updated = await uploadProfileAvatar(profileId, file);
      setPreviewUrl(updated.avatar_url);
      setImgError(false);
      await onUploaded(updated.avatar_url);
      toast('Profile photo updated', 'Your new photo is now live across your MediQ workspace.');
    } catch (err) {
      toast(
        'Upload failed',
        err instanceof Error ? err.message : 'Unable to upload profile photo.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    try {
      await removeProfileAvatar(profileId);
      setPreviewUrl(null);
      setImgError(false);
      await onUploaded(null);
      toast('Profile photo removed', 'Reverted back to your initials badge.', 'info');
    } catch (err) {
      toast(
        'Remove failed',
        err instanceof Error ? err.message : 'Unable to remove profile photo.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const showPhoto = Boolean(previewUrl && !imgError);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile photo"
        />

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          title={showPhoto ? 'Click to change profile photo' : 'Click to upload profile photo'}
          className="group relative h-[68px] w-[68px] shrink-0 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#163362] focus:ring-offset-2 disabled:cursor-wait"
        >
          <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[#e6dac6] text-lg font-bold text-[#0f2344] shadow-xs transition group-hover:border-[#d9c7a7]">
            {showPhoto ? (
              <img
                src={previewUrl!}
                alt={fullName}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(fullName)
            )}
          </span>

          {/* Hover / Busy Overlay */}
          <span
            className={`absolute inset-0 grid place-items-center rounded-full bg-[#060e1c]/65 text-[#f5efe4] transition-opacity ${
              busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </span>

          {/* Always-visible Camera Pill on Bottom-Right Rim */}
          {!busy && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--card)] bg-[#29508f] text-[#f5efe4] shadow-sm transition group-hover:scale-105 group-hover:bg-[#3460a8]"
            >
              <Camera className="h-3 w-3" />
            </span>
          )}
        </button>

        <div className="min-w-0">
          <div className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">{heading}</div>
          <div className="text-[13px] text-muted-foreground">{subtitle}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-muted px-3 py-1 text-[11.5px] font-semibold text-foreground transition hover:border-[var(--fy-text)] hover:bg-[var(--fy-soft)] disabled:opacity-60"
            >
              {busy === 'upload' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {busy === 'upload'
                ? 'Uploading...'
                : showPhoto
                  ? 'Change Photo'
                  : 'Upload Photo'}
            </button>

            {showPhoto && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleRemove()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground transition hover:bg-[var(--fy-rose-bg)] hover:text-[var(--fy-rose)] disabled:opacity-60"
              >
                {busy === 'remove' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
