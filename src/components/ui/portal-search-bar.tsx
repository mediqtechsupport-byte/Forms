import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  FileCheck2,
  FileText,
  MapPin,
  Megaphone,
  Receipt,
  Search,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import {
  REQUEST_TYPE_META,
  STATUS_META,
  formatDate,
  formatPHP,
  getSubtypeLabel,
} from '@/lib/constants';
import type { Announcement, FormRequest, Profile, RequestType } from '@/types/database';

/* -------------------------------------------------------------------------- */
/*                       Deep Multi-Word Search Helpers                       */
/* -------------------------------------------------------------------------- */

function tokenize(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Deeply searches a FormRequest across reference #, title, description, form type,
 * form code, subtype, status, employee info, OR #, merchant, hospital, destination,
 * disbursement ref #, cost center, and any itemized BIR receipt / OB itinerary rows.
 */
export function matchesRequestSearch(r: FormRequest, rawQuery: string): boolean {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return true;

  const meta = REQUEST_TYPE_META[r.request_type];
  const statusMeta = STATUS_META[r.status];

  const metaParts: string[] = [];
  if (r.metadata && typeof r.metadata === 'object') {
    const m = r.metadata as Record<string, unknown>;
    for (const key of [
      'cost_center',
      'payout_method',
      'payout_details',
      'project_or_client',
      'work_location',
      'handover_person',
      'emergency_contact',
      'vehicle_mode',
      'hr_category',
    ]) {
      const val = m[key];
      if (typeof val === 'string' && val) metaParts.push(val);
    }
    if (Array.isArray(m.items)) {
      for (const item of m.items as Record<string, unknown>[]) {
        if (item && typeof item === 'object') {
          for (const k of ['description', 'particulars', 'vendor', 'or_number', 'category', 'notes']) {
            const v = item[k];
            if (typeof v === 'string' && v) metaParts.push(v);
          }
        }
      }
    }
    if (Array.isArray(m.itinerary)) {
      for (const stop of m.itinerary as Record<string, unknown>[]) {
        if (stop && typeof stop === 'object') {
          for (const k of ['destination', 'hospital', 'client', 'purpose']) {
            const v = stop[k];
            if (typeof v === 'string' && v) metaParts.push(v);
          }
        }
      }
    }
  }

  const haystack = [
    r.reference_no,
    r.title,
    r.description,
    r.request_type,
    meta?.label,
    meta?.shortLabel,
    meta?.formCode,
    r.subtype,
    getSubtypeLabel(r.request_type, r.subtype),
    r.status,
    r.status.replace(/_/g, ' '),
    statusMeta?.label,
    r.hr_status,
    r.boss_status,
    r.accounting_status,
    r.priority,
    r.employee?.full_name,
    r.employee?.employee_code,
    r.employee?.department,
    r.employee?.email,
    r.employee?.position,
    r.receipt_or_number,
    r.merchant_name,
    r.disbursement_reference,
    r.destination,
    r.client_or_hospital,
    r.start_date,
    r.end_date,
    r.expense_date,
    r.amount != null ? String(r.amount) : '',
    ...metaParts,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return tokens.every((tok) => haystack.includes(tok));
}

export function matchesProfileSearch(p: Profile, rawQuery: string): boolean {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return true;
  const haystack = [
    p.full_name,
    p.email,
    p.employee_code,
    p.department,
    p.position,
    p.role,
    p.is_active ? 'active' : 'disabled',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

export function matchesAnnouncementSearch(a: Announcement, rawQuery: string): boolean {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return true;
  const haystack = [
    a.title,
    a.body,
    a.category,
    a.category.replace(/_/g, ' '),
    a.author?.full_name,
    a.is_pinned ? 'pinned' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return tokens.every((tok) => haystack.includes(tok));
}

/* -------------------------------------------------------------------------- */
/*                                 Icons & UI                                 */
/* -------------------------------------------------------------------------- */

function FormIcon({ type, className = 'h-4 w-4' }: { type: RequestType; className?: string }) {
  switch (type) {
    case 'leave':
      return <CalendarDays className={className} />;
    case 'overtime':
      return <Clock className={className} />;
    case 'reimbursement':
      return <Receipt className={className} />;
    case 'official_business':
      return <MapPin className={className} />;
    case 'cash_advance':
      return <Wallet className={className} />;
    default:
      return <FileCheck2 className={className} />;
  }
}

function HighlightMatch({ text, q }: { text: string; q: string }) {
  const trimmed = q.trim();
  if (!trimmed) return <>{text}</>;
  const firstToken = trimmed.split(/\s+/)[0];
  if (!firstToken) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(firstToken.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[4px] bg-[var(--fy-soft)] px-0.5 font-semibold text-[var(--fy-text)]">
        {text.slice(idx, idx + firstToken.length)}
      </mark>
      {text.slice(idx + firstToken.length)}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                         PortalSearchBar Component                          */
/* -------------------------------------------------------------------------- */

export interface QuickFormOption {
  type: RequestType;
  label: string;
  code: string;
  routeText: string;
}

export interface PortalSearchBarProps {
  id: string;
  query: string;
  onQueryChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
  requests: FormRequest[];
  showEmployee?: boolean;
  profiles?: Profile[];
  announcements?: Announcement[];
  quickForms?: QuickFormOption[];
  onInspectRequest: (req: FormRequest) => void;
  onSelectProfile?: (profile: Profile) => void;
  onSelectAnnouncement?: (ann: Announcement) => void;
  onOpenNewForm?: (type: RequestType) => void;
  onViewAllMatches?: () => void;
  viewAllLabel?: string;
}

type FlatResult =
  | { kind: 'request'; id: string; data: FormRequest }
  | { kind: 'form'; id: string; data: QuickFormOption }
  | { kind: 'profile'; id: string; data: Profile }
  | { kind: 'announcement'; id: string; data: Announcement };

export function PortalSearchBar({
  id,
  query,
  onQueryChange,
  placeholder,
  ariaLabel,
  requests,
  showEmployee = false,
  profiles = [],
  announcements = [],
  quickForms = [],
  onInspectRequest,
  onSelectProfile,
  onSelectAnnouncement,
  onOpenNewForm,
  onViewAllMatches,
  viewAllLabel = 'View all in table',
}: PortalSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = query.trim();

  const matchedRequests = useMemo(
    () => (q ? requests.filter((r) => matchesRequestSearch(r, q)) : []),
    [requests, q]
  );

  const matchedQuickForms = useMemo(() => {
    if (!q || quickForms.length === 0) return [];
    const tokens = tokenize(q);
    return quickForms.filter((f) => {
      const hay = `${f.label} ${f.code} ${f.routeText} ${f.type}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [quickForms, q]);

  const matchedProfiles = useMemo(
    () => (q && profiles.length > 0 ? profiles.filter((p) => matchesProfileSearch(p, q)) : []),
    [profiles, q]
  );

  const matchedAnnouncements = useMemo(
    () =>
      q && announcements.length > 0
        ? announcements.filter((a) => matchesAnnouncementSearch(a, q))
        : [],
    [announcements, q]
  );

  const totalMatches =
    matchedRequests.length +
    matchedQuickForms.length +
    matchedProfiles.length +
    matchedAnnouncements.length;

  const flatResults = useMemo<FlatResult[]>(() => {
    const list: FlatResult[] = [];
    matchedRequests.slice(0, 6).forEach((r) => list.push({ kind: 'request', id: `req-${r.id}`, data: r }));
    matchedQuickForms
      .slice(0, 4)
      .forEach((f) => list.push({ kind: 'form', id: `frm-${f.type}`, data: f }));
    matchedProfiles
      .slice(0, 4)
      .forEach((p) => list.push({ kind: 'profile', id: `pro-${p.id}`, data: p }));
    matchedAnnouncements
      .slice(0, 3)
      .forEach((a) => list.push({ kind: 'announcement', id: `ann-${a.id}`, data: a }));
    return list;
  }, [matchedRequests, matchedQuickForms, matchedProfiles, matchedAnnouncements]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  // Global Cmd/Ctrl+K or '/' keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
        return;
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT' &&
        !(document.activeElement as HTMLElement | null)?.isContentEditable
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close floating card on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const selectItem = (item: FlatResult) => {
    setOpen(false);
    if (item.kind === 'request') {
      onInspectRequest(item.data);
    } else if (item.kind === 'form' && onOpenNewForm) {
      onOpenNewForm(item.data.type);
    } else if (item.kind === 'profile' && onSelectProfile) {
      onSelectProfile(item.data);
    } else if (item.kind === 'announcement' && onSelectAnnouncement) {
      onSelectAnnouncement(item.data);
    }
  };

  const statusPillClass = (status: FormRequest['status']) => {
    if (status === 'approved' || status === 'paid') {
      return 'bg-[var(--fy-soft)] text-[var(--fy-text)]';
    }
    if (status === 'rejected' || status === 'cancelled') {
      return 'bg-[var(--fy-rose-bg)] text-[var(--fy-rose)]';
    }
    return 'bg-[var(--fy-amber-bg)] text-[var(--fy-amber)]';
  };

  const showDropdown = open && q.length > 0;

  return (
    <form
      ref={wrapperRef}
      role="search"
      className="relative min-w-0 flex-1 sm:max-w-[440px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (flatResults.length > 0) {
          selectItem(flatResults[Math.min(activeIdx, flatResults.length - 1)]);
        } else if (onViewAllMatches && q) {
          setOpen(false);
          onViewAllMatches();
        }
      }}
    >
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>

      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-foreground/80"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (open) {
              setOpen(false);
            } else if (query) {
              onQueryChange('');
            }
          } else if (e.key === 'ArrowDown' && flatResults.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActiveIdx((i) => (i + 1) % flatResults.length);
          } else if (e.key === 'ArrowUp' && flatResults.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActiveIdx((i) => (i - 1 + flatResults.length) % flatResults.length);
          }
        }}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-transparent bg-card pl-11 pr-20 text-[14px] text-foreground outline-none transition-shadow placeholder:text-[var(--fy-faint)] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_var(--muted),0_0_0_5px_var(--fy-600)] sm:h-12 sm:pl-12 sm:pr-24 sm:text-[14.5px] [&::-webkit-search-cancel-button]:hidden"
      />

      {/* Right controls inside search pill */}
      <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {q ? (
          <>
            <span
              className="hidden rounded-full bg-[var(--fy-soft)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--fy-text)] sm:inline-block"
              title={`${totalMatches} matching result${totalMatches === 1 ? '' : 's'}`}
            >
              {totalMatches}
            </span>
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                setOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-foreground hover:text-card"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10.5px] font-semibold text-muted-foreground sm:inline-flex">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Live Floating Search Results Card */}
      {showDropdown ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="fixed left-2 right-2 top-[72px] z-[80] overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_24px_56px_-14px_rgba(7,19,41,0.34)] sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+10px)] sm:w-[min(520px,calc(100vw-32px))]"
        >
          <div className="max-h-[min(68vh,430px)] overflow-y-auto p-2.5">
            {totalMatches === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/70 px-4 py-7 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-card text-muted-foreground shadow-xs">
                  <Search className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-foreground">
                  No matches for &ldquo;{q}&rdquo;
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching by reference #, employee name, department, form type, OR #, or status.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('');
                    setOpen(false);
                  }}
                  className="fy-chip mt-3 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Matching Digital Forms */}
                {matchedRequests.length > 0 ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between px-2.5 pt-1">
                      <span className="text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                        Digital Forms ({matchedRequests.length})
                      </span>
                      {matchedRequests.length > 6 ? (
                        <span className="text-[10.5px] text-muted-foreground">
                          Showing top 6
                        </span>
                      ) : null}
                    </div>
                    <ul className="space-y-1">
                      {matchedRequests.slice(0, 6).map((r) => {
                        const flatIndex = flatResults.findIndex(
                          (x) => x.kind === 'request' && x.data.id === r.id
                        );
                        const isActive = flatIndex === activeIdx;
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIdx(flatIndex)}
                              onClick={() => selectItem({ kind: 'request', id: `req-${r.id}`, data: r })}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                                isActive ? 'bg-muted' : 'hover:bg-muted/70'
                              }`}
                            >
                              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--fy-soft)] text-[var(--fy-text)]">
                                <FormIcon type={r.request_type} className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                  <HighlightMatch text={r.title} q={q} />
                                </span>
                                <span className="block truncate text-[11.5px] text-muted-foreground">
                                  <HighlightMatch text={r.reference_no} q={q} />
                                  {showEmployee && r.employee?.full_name ? (
                                    <>
                                      {' · '}
                                      <HighlightMatch text={r.employee.full_name} q={q} />
                                    </>
                                  ) : null}
                                  {' · '}
                                  {REQUEST_TYPE_META[r.request_type].shortLabel}
                                  {r.amount != null
                                    ? ` · ${formatPHP(r.amount)}`
                                    : r.total_days != null
                                      ? ` · ${r.total_days}d`
                                      : r.total_hours != null
                                        ? ` · ${r.total_hours}h`
                                        : ` · ${formatDate(r.created_at)}`}
                                </span>
                              </span>
                              <span
                                className={`flex-none rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${statusPillClass(
                                  r.status
                                )}`}
                              >
                                {STATUS_META[r.status]?.label ?? r.status}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* 2. Quick-File Digital Form Launchers (Employee) */}
                {matchedQuickForms.length > 0 && onOpenNewForm ? (
                  <div>
                    <div className="mb-1 px-2.5 pt-1 text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                      File a New Digital Form ({matchedQuickForms.length})
                    </div>
                    <ul className="space-y-1">
                      {matchedQuickForms.slice(0, 4).map((f) => {
                        const flatIndex = flatResults.findIndex(
                          (x) => x.kind === 'form' && x.data.type === f.type
                        );
                        const isActive = flatIndex === activeIdx;
                        return (
                          <li key={f.type}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIdx(flatIndex)}
                              onClick={() => selectItem({ kind: 'form', id: `frm-${f.type}`, data: f })}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                                isActive ? 'bg-muted' : 'hover:bg-muted/70'
                              }`}
                            >
                              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-b from-[#163362] to-[#071329] text-[#f5efe4]">
                                <FormIcon type={f.type} className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                  <HighlightMatch text={f.label} q={q} />
                                </span>
                                <span className="block truncate text-[11.5px] text-muted-foreground">
                                  {f.code} · {f.routeText}
                                </span>
                              </span>
                              <span className="inline-flex flex-none items-center gap-1 rounded-full bg-[var(--fy-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fy-text)]">
                                File
                                <ArrowUpRight className="h-3 w-3" />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* 3. Matching Team / Staff Profiles (Boss & HR) */}
                {matchedProfiles.length > 0 && onSelectProfile ? (
                  <div>
                    <div className="mb-1 px-2.5 pt-1 text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                      Staff Accounts ({matchedProfiles.length})
                    </div>
                    <ul className="space-y-1">
                      {matchedProfiles.slice(0, 4).map((p) => {
                        const flatIndex = flatResults.findIndex(
                          (x) => x.kind === 'profile' && x.data.id === p.id
                        );
                        const isActive = flatIndex === activeIdx;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIdx(flatIndex)}
                              onClick={() => selectItem({ kind: 'profile', id: `pro-${p.id}`, data: p })}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                                isActive ? 'bg-muted' : 'hover:bg-muted/70'
                              }`}
                            >
                              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#e6dac6] text-[#0b1933]">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                  <HighlightMatch text={p.full_name} q={q} />
                                </span>
                                <span className="block truncate text-[11.5px] text-muted-foreground">
                                  {p.employee_code} · {p.department} · {p.email}
                                </span>
                              </span>
                              <span className="flex-none rounded-md bg-[var(--fy-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fy-text)] uppercase">
                                {p.role}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* 4. Matching Company Memos (Employee & HR) */}
                {matchedAnnouncements.length > 0 && onSelectAnnouncement ? (
                  <div>
                    <div className="mb-1 px-2.5 pt-1 text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
                      Company Memos ({matchedAnnouncements.length})
                    </div>
                    <ul className="space-y-1">
                      {matchedAnnouncements.slice(0, 3).map((a) => {
                        const flatIndex = flatResults.findIndex(
                          (x) => x.kind === 'announcement' && x.data.id === a.id
                        );
                        const isActive = flatIndex === activeIdx;
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIdx(flatIndex)}
                              onClick={() =>
                                selectItem({ kind: 'announcement', id: `ann-${a.id}`, data: a })
                              }
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                                isActive ? 'bg-muted' : 'hover:bg-muted/70'
                              }`}
                            >
                              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--fy-soft)] text-[var(--fy-text)]">
                                <Megaphone className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                  <HighlightMatch text={a.title} q={q} />
                                </span>
                                <span className="block truncate text-[11.5px] text-muted-foreground">
                                  {a.body}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          {totalMatches > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/75 px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                <b className="font-semibold text-foreground">{totalMatches}</b>{' '}
                {totalMatches === 1 ? 'result' : 'results'} · cards below are filtered
              </span>
              <div className="flex items-center gap-2">
                {onViewAllMatches ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onViewAllMatches();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-b from-[#163362] to-[#071329] px-3 py-1 text-[11px] font-semibold text-[#f5efe4] transition hover:brightness-110"
                  >
                    <FileText className="h-3 w-3" />
                    {viewAllLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('');
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Active Search Filter Banner                          */
/* -------------------------------------------------------------------------- */

export function ActiveSearchBanner({
  query,
  matchCount,
  entityLabel = 'forms',
  onClear,
}: {
  query: string;
  matchCount: number;
  entityLabel?: string;
  onClear: () => void;
}) {
  const q = query.trim();
  if (!q) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs shadow-2xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[var(--fy-soft)] text-[var(--fy-text)]">
          <Search className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-muted-foreground">
          Filtering by <strong className="font-semibold text-foreground">&ldquo;{q}&rdquo;</strong>
          {' · '}
          <strong className="font-semibold text-foreground">{matchCount}</strong> matching{' '}
          {entityLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold text-foreground transition hover:bg-foreground hover:text-card"
      >
        <X className="h-3 w-3" />
        Clear filter
      </button>
    </div>
  );
}
