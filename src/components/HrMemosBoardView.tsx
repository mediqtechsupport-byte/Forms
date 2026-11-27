import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Megaphone, Pin } from 'lucide-react';
import { formatDate } from '@/lib/constants';
import type { Announcement } from '@/types/database';

const CATEGORY_META: Record<
  Announcement['category'],
  { label: string; pillCls: string }
> = {
  hr_policy: {
    label: 'HR Policy',
    pillCls: 'border-sky-500/30 bg-sky-500/15 text-sky-700 [.fy-dark_&]:text-sky-300',
  },
  payroll: {
    label: 'Payroll',
    pillCls: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 [.fy-dark_&]:text-emerald-300',
  },
  holiday: {
    label: 'Holiday',
    pillCls: 'border-amber-500/30 bg-[var(--fy-amber-bg)] text-[var(--fy-amber)]',
  },
  urgent: {
    label: 'Urgent Advisory',
    pillCls: 'border-rose-500/30 bg-[var(--fy-rose-bg)] text-[var(--fy-rose)]',
  },
  general: {
    label: 'General',
    pillCls: 'border-border bg-[var(--fy-soft)] text-[var(--fy-text)]',
  },
};

export function HrMemosBoardView({
  announcements,
  seenMemoIds,
  onMarkAllRead,
  query = '',
}: {
  announcements: Announcement[];
  seenMemoIds: Set<number>;
  onMarkAllRead: () => void;
  query?: string;
}) {
  const [filter, setFilter] = useState<'all' | 'pinned' | Announcement['category']>('all');

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      if (filter === 'pinned' && !a.is_pinned) return false;
      if (filter !== 'all' && filter !== 'pinned' && a.category !== filter) return false;
      if (!q) return true;
      return `${a.title} ${a.body} ${a.category} ${a.author?.full_name ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [announcements, filter, q]);

  const unreadCount = useMemo(
    () => announcements.filter((a) => !seenMemoIds.has(a.id)).length,
    [announcements, seenMemoIds]
  );

  const pinnedCount = useMemo(
    () => announcements.filter((a) => a.is_pinned).length,
    [announcements]
  );

  const filters: { id: 'all' | 'pinned' | Announcement['category']; label: string; count?: number }[] = [
    { id: 'all', label: 'All Memos', count: announcements.length },
    { id: 'pinned', label: 'Pinned', count: pinnedCount },
    { id: 'hr_policy', label: 'HR Policy' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'holiday', label: 'Holiday' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'general', label: 'General' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="fy-h-memos"
            className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[34px]"
          >
            HR Memos &amp; Advisories
          </h1>
          <p className="mt-1 text-[14.5px] text-muted-foreground">
            Official company memos, HR policies, holiday advisories, and payroll notices synced in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="fy-primary fy-focus inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-xs font-semibold"
            >
              <CheckCheck className="h-4 w-4" />
              Mark {unreadCount} as Read
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground">
              <Bell className="h-3.5 w-3.5 text-[var(--fy-text)]" />
              All caught up
            </span>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'fy-primary'
                  : 'border border-border bg-card text-muted-foreground hover:border-[var(--fy-text)] hover:text-foreground'
              }`}
            >
              <span>{f.label}</span>
              {typeof f.count === 'number' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? 'bg-white/15 text-inherit' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Memos Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border bg-card p-10 text-center shadow-[var(--fy-shadow)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--fy-soft)] text-[var(--fy-text)]">
            <Megaphone className="h-5 w-5" />
          </div>
          <p className="mt-3 text-base font-semibold text-foreground">
            {q ? `No HR memos match "${query.trim()}"` : 'No HR memos posted yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            When HR Admin publishes a new memo or advisory, you&apos;ll see a live notification in the top bell and right here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filtered.map((ann) => {
            const cat = CATEGORY_META[ann.category] ?? CATEGORY_META.general;
            const isUnread = !seenMemoIds.has(ann.id);
            return (
              <article
                key={ann.id}
                className={`rounded-[20px] border bg-card p-5 shadow-[var(--fy-shadow)] transition ${
                  isUnread
                    ? 'border-[var(--fy-text)]/50 ring-1 ring-[var(--fy-soft)]'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${cat.pillCls}`}
                      >
                        {cat.label}
                      </span>
                      {ann.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--fy-soft)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--fy-text)]">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      )}
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fy-rose)] px-2 py-0.5 text-[10px] font-bold text-[#081428] uppercase">
                          New
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2.5 text-[18px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
                      {ann.title}
                    </h2>
                  </div>

                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {formatDate(ann.created_at)}
                  </span>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {ann.body}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    Published by{' '}
                    <strong className="font-semibold text-foreground">
                      {ann.author?.full_name ?? 'HR Admin'}
                    </strong>
                    {ann.author?.role ? ` (${ann.author.role.toUpperCase()})` : ''}
                  </span>
                  <span className="font-mono text-[11px]">Memo #{ann.id}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
