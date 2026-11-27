import React, { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RequestTypeIcon } from '@/components/StatusBadges';
import { REQUEST_TYPE_META } from '@/lib/constants';
import type { FormRequest, RequestType } from '@/types/database';

interface BentoFormGridProps {
  myRequests: FormRequest[];
  onSelectForm: (type: RequestType) => void;
}

const FORM_ACCENTS: Record<
  RequestType,
  {
    glowRgb: string;
    iconWrap: string;
    borderHover: string;
    tagBg: string;
    routePills: string[];
    featured?: boolean;
  }
> = {
  leave: {
    glowRgb: '14, 165, 233',
    iconWrap: 'bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/25 group-hover:bg-sky-500 group-hover:text-white',
    borderHover: 'hover:border-sky-300/90',
    tagBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    routePills: ['HR', 'Boss'],
  },
  overtime: {
    glowRgb: '99, 102, 241',
    iconWrap:
      'bg-indigo-500/12 text-indigo-600 ring-1 ring-indigo-500/25 group-hover:bg-indigo-500 group-hover:text-white',
    borderHover: 'hover:border-indigo-300/90',
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    routePills: ['HR', 'Boss', 'Accounting'],
  },
  reimbursement: {
    glowRgb: '16, 185, 129',
    iconWrap:
      'bg-emerald-500/12 text-emerald-600 ring-1 ring-emerald-500/25 group-hover:bg-emerald-500 group-hover:text-white',
    borderHover: 'hover:border-emerald-300/90',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    routePills: ['Accounting', 'Boss'],
  },
  official_business: {
    glowRgb: '6, 182, 212',
    iconWrap:
      'bg-cyan-500/12 text-cyan-600 ring-1 ring-cyan-500/25 group-hover:bg-cyan-500 group-hover:text-white',
    borderHover: 'hover:border-cyan-300/90',
    tagBg: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    routePills: ['HR', 'Boss'],
  },
  cash_advance: {
    glowRgb: '245, 158, 11',
    iconWrap:
      'bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/25 group-hover:bg-amber-500 group-hover:text-white',
    borderHover: 'hover:border-amber-300/90',
    tagBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    routePills: ['Accounting', 'Boss'],
  },
  other: {
    glowRgb: '71, 85, 105',
    iconWrap:
      'bg-slate-500/12 text-slate-700 ring-1 ring-slate-500/25 group-hover:bg-slate-800 group-hover:text-white',
    borderHover: 'hover:border-slate-300',
    tagBg: 'bg-slate-100 text-slate-700 border-slate-200',
    routePills: ['HR', 'Boss'],
  },
};

const FORM_ORDER: RequestType[] = [
  'leave',
  'overtime',
  'reimbursement',
  'official_business',
  'cash_advance',
  'other',
];

function BentoFormCard({
  type,
  filedCount,
  onClick,
}: {
  type: RequestType;
  filedCount: number;
  onClick: () => void;
}) {
  const [coords, setCoords] = useState({ x: 50, y: 50, active: false });
  const meta = REQUEST_TYPE_META[type];
  const accent = FORM_ACCENTS[type];

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCoords((prev) => ({ ...prev, active: false }))}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-10px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        accent.borderHover
      )}
    >
      {/* 21st.dev Mouse-Tracking Radial Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: coords.active ? 1 : 0,
          background: `radial-gradient(280px circle at ${coords.x}px ${coords.y}px, rgba(${accent.glowRgb}, 0.11), transparent 70%)`,
        }}
      />

      {/* Kokonut-style Fine Dot Texture on Hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          backgroundImage: 'radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />

      {/* Top Row: Icon + Code Badge + Glide Arrow */}
      <div className="relative z-10 flex w-full items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300',
            accent.iconWrap
          )}
        >
          <RequestTypeIcon type={type} className="size-5" />
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground backdrop-blur-xs"
          >
            {meta.formCode}
          </Badge>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-muted-foreground transition-all duration-300 group-hover:border-foreground/20 group-hover:bg-foreground group-hover:text-background">
            <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>

      {/* Middle Copy */}
      <div className="relative z-10 mt-4">
        <h4 className="text-[15px] font-bold tracking-tight text-foreground transition-colors group-hover:text-slate-950">
          {meta.label}
        </h4>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
      </div>

      {/* Footer Tags + Live Filed Counter (Kokonut Bento Signature) */}
      <div className="relative z-10 mt-5 flex w-full items-center justify-between gap-2 border-t border-border/70 pt-3">
        <div className="flex flex-wrap items-center gap-1">
          {accent.routePills.map((pill) => (
            <span
              key={pill}
              className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground"
            >
              #{pill}
            </span>
          ))}
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all',
            filedCount > 0 ? accent.tagBg : 'border-transparent text-muted-foreground'
          )}
        >
          {filedCount > 0 ? `${filedCount} filed` : 'Open form →'}
        </span>
      </div>
    </button>
  );
}

export function BentoFormGrid({ myRequests, onSelectForm }: BentoFormGridProps) {
  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-sky-700 uppercase">
            <Sparkles className="size-3.5" />
            Digital Forms Workspace
          </div>
          <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-foreground">
            File a New Digital Form
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Select a form to sign digitally & route in real time
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {FORM_ORDER.map((type) => (
          <BentoFormCard
            key={type}
            type={type}
            filedCount={myRequests.filter((r) => r.request_type === type).length}
            onClick={() => onSelectForm(type)}
          />
        ))}
      </div>
    </section>
  );
}
