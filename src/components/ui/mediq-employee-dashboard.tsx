import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useAnimate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "motion/react";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Moon,
  Palette,
  PenTool,
  Pin,
  Plus,
  Receipt,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
  SquareCheckBig,
  Sun,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import {
  DEPARTMENTS,
  REQUEST_TYPE_META,
  STATUS_META,
  formatDate,
  formatPHP,
} from "@/lib/constants";
import { SignaturePad } from "@/components/SignaturePad";
import { RequestTypeIcon } from "@/components/StatusBadges";
import { EmployeeFormsDatatable } from "@/components/ui/employee-forms-datatable";
import {
  ActiveSearchBanner,
  PortalSearchBar,
  matchesAnnouncementSearch,
  matchesRequestSearch,
} from "@/components/ui/portal-search-bar";
import type {
  Announcement,
  FormRequest,
  Profile,
  RequestType,
} from "@/types/database";

/* ------------------------------------------------------------------ types */

type View = "dashboard" | "forms" | "calendar" | "leave" | "settings";
type Theme = "light" | "dark";
type FormFilter = "all" | "pending" | "approved" | "closed";
type SetTab = "profile" | "memos" | "look";
type CalKind = "leave" | "overtime" | "official_business" | "finance" | "other";

interface CalEvent {
  id: string;
  dateKey: string;
  title: string;
  subtitle: string;
  kind: CalKind;
  request: FormRequest;
}

interface NoticeItem {
  id: string;
  who: string;
  tint: string;
  verb: string;
  what: string;
  tail: string;
  ago: string;
  unread: boolean;
  onOpen: () => void;
}

export interface MediqEmployeeDashboardProps {
  myRequests: FormRequest[];
  announcements: Announcement[];
  onOpenNewForm: (type: RequestType) => void;
  onInspect: (req: FormRequest) => void;
}

/* ---------------------------------------------------------------- constants */

const E_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_P4: [number, number, number, number] = [0.16, 1, 0.3, 1];
const E_IN: [number, number, number, number] = [0.4, 0, 1, 1];
const E_INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

const FORM_LAUNCHER: {
  type: RequestType;
  pico: "flow" | "api" | "dash" | "speed" | "qa" | "new";
  shortCode: string;
  routeText: string;
}[] = [
  { type: "leave", pico: "flow", shortCode: "LV", routeText: "HR First → Boss" },
  { type: "overtime", pico: "api", shortCode: "OT", routeText: "HR & Acct. First → Boss" },
  { type: "reimbursement", pico: "dash", shortCode: "RB", routeText: "Accounting First → Boss" },
  { type: "official_business", pico: "speed", shortCode: "OB", routeText: "HR First → Boss" },
  { type: "cash_advance", pico: "qa", shortCode: "CA", routeText: "Accounting First → Boss" },
  { type: "other", pico: "new", shortCode: "HR", routeText: "HR First → Boss" },
];

const CAL_KINDS: Record<CalKind, string> = {
  leave: "Leave",
  overtime: "Overtime",
  official_business: "Official Business",
  finance: "Reimbursement / CA",
  other: "HR / Admin",
};

const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "#163362", label: "Dark Navy", hex: "#163362" },
  { id: "#0f2942", label: "Midnight Navy", hex: "#0f2942" },
  { id: "#1f4fa8", label: "MediQ Royal", hex: "#1f4fa8" },
  { id: "#1d7347", label: "Forest", hex: "#1d7347" },
];

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "menu",
    label: "Menu",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "forms", label: "My Forms", icon: SquareCheckBig },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "leave", label: "Leave Summary", icon: CalendarCheck2 },
    ],
  },
  {
    id: "general",
    label: "General",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const SET_TABS: { id: SetTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile & E-Sig", icon: UserRound },
  { id: "memos", label: "HR Memos", icon: Bell },
  { id: "look", label: "Appearance", icon: Palette },
];

/* ---------------------------------------------------------------- helpers */

const noon = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

const dayOffset = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const parseIso = (k: string) => new Date(`${k.slice(0, 10)}T12:00:00`);

const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const fmtDow = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const fmtDowShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const fmtDayLong = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const fmtMon = new Intl.DateTimeFormat("en-US", { month: "short" });

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "MQ";

function mapReqToCalKind(type: RequestType): CalKind {
  if (type === "leave") return "leave";
  if (type === "overtime") return "overtime";
  if (type === "official_business") return "official_business";
  if (type === "reimbursement" || type === "cash_advance") return "finance";
  return "other";
}

function buildCalendarEvents(requests: FormRequest[]): CalEvent[] {
  const out: CalEvent[] = [];
  for (const r of requests) {
    if (r.status === "cancelled") continue;
    const startKey = (r.start_date || r.created_at).slice(0, 10);
    const endKey = (r.end_date || startKey).slice(0, 10);
    const startDate = parseIso(startKey);
    const endDate = parseIso(endKey);
    const kind = mapReqToCalKind(r.request_type);
    const subtitle = `${r.reference_no} · ${STATUS_META[r.status]?.label ?? r.status}`;

    if (
      (r.request_type === "leave" || r.request_type === "official_business") &&
      endDate >= startDate
    ) {
      const span = Math.min(
        14,
        Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
      );
      for (let i = 0; i <= span; i++) {
        const key = iso(dayOffset(startDate, i));
        out.push({
          id: `${r.id}-${key}`,
          dateKey: key,
          title: r.title,
          subtitle,
          kind,
          request: r,
        });
      }
    } else {
      out.push({
        id: `${r.id}-${startKey}`,
        dateKey: startKey,
        title: r.title,
        subtitle,
        kind,
        request: r,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ styles */

const STYLE = `
.fy-root{
  --fy-950:color-mix(in srgb,var(--fy-a) 44%,#040b18);--fy-800:color-mix(in srgb,var(--fy-a) 78%,#071326);
  --fy-700:var(--fy-a);--fy-600:color-mix(in oklab,var(--fy-a) 82%,#6b8cc2);
  --fy-400:color-mix(in oklab,var(--fy-a) 55%,#c8b99e);--fy-100:#ede6d8;
  --background:#e8e0d2;--muted:#f4efe6;--card:#fdfbf7;--card-foreground:#0d1c36;--foreground:#0d1c36;
  --popover:#fdfbf7;--popover-foreground:#0d1c36;--secondary:#ece4d6;--secondary-foreground:#0d1c36;
  --accent:#ede6d8;--accent-foreground:#0d1c36;--primary:var(--fy-800);--primary-foreground:#f7f3eb;
  --muted-foreground:#5c6370;--border:#dfd5c5;--input:#d4c8b4;--ring:var(--fy-600);
  --fy-faint:#757982;--fy-hatch:#b0a38f;--fy-text:var(--fy-800);--fy-mark:var(--fy-700);--fy-strong:var(--fy-950);
  --fy-line:var(--fy-800);--fy-soft:var(--fy-100);--fy-mark-bg:#e2d4bc;
  --fy-amber:#9e6208;--fy-amber-bg:#faf0dc;--fy-rose:#b53636;--fy-rose-bg:#fbeaea;
  --fy-shadow:0 1px 2px rgb(13 28 54/.05),0 10px 26px -14px rgb(13 28 54/.12);
  --fy-pop:0 0 0 1px var(--border),0 24px 60px -20px rgb(13 28 54/.32);
  --fy-deep:color-mix(in srgb,var(--fy-950) 76%,#030812);--fy-swirl:rgb(228 213 187/.18);
  font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:15px;line-height:1.45;color:var(--foreground);background:var(--background);
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;color-scheme:light;
}
.fy-root.fy-dark{
  --background:#060e1c;--muted:#0b172b;--card:#11213c;--card-foreground:#f5efe4;--foreground:#f5efe4;
  --popover:#11213c;--popover-foreground:#f5efe4;--secondary:#182b4b;--secondary-foreground:#f5efe4;
  --accent:#1a2f52;--accent-foreground:#f5efe4;
  --primary:#d9c7a7;--primary-foreground:#081428;
  --muted-foreground:#b7afa2;--border:#203456;--input:#283f66;--fy-faint:#948e84;--fy-hatch:#6c7b96;
  --fy-text:#e5d5b7;--fy-mark:#e5d5b7;--fy-strong:#d4c09c;
  --fy-line:rgb(229 213 183/.45);--fy-soft:rgb(229 213 183/.12);
  --fy-mark-bg:rgb(229 213 183/.24);
  --fy-amber:#f0bc68;--fy-amber-bg:rgb(240 188 104/.13);--fy-rose:#f39191;--fy-rose-bg:rgb(243 145 145/.13);
  --fy-shadow:0 1px 2px rgb(0 0 0/.35),0 14px 30px -16px rgb(0 0 0/.7);
  --fy-pop:0 0 0 1px var(--border),0 24px 60px -20px rgb(0 0 0/.82);color-scheme:dark;
}
.fy-root *,.fy-root *::before,.fy-root *::after{box-sizing:border-box}
.fy-focus:focus-visible{outline:none;box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--fy-600)}
.fy-focus-in:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--fy-600)}
.fy-scroll{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--fy-hatch) 55%,transparent) transparent}
.fy-noscroll{scrollbar-width:none}.fy-noscroll::-webkit-scrollbar{display:none}
.fy-primary{color:#f7f2e8;background:linear-gradient(180deg,var(--fy-700),var(--fy-950))}
.fy-primary:hover{background:linear-gradient(180deg,var(--fy-600),var(--fy-800))}
.fy-dark .fy-primary{color:#f7f2e8;background:linear-gradient(180deg,#29508f,#142e5c)}
.fy-dark .fy-primary:hover{background:linear-gradient(180deg,#3460a8,#1b3b73)}
.fy-ghost{color:var(--foreground);background:var(--card);box-shadow:inset 0 0 0 1.5px var(--fy-line)}
.fy-ghost:hover{background:var(--fy-soft)}
.fy-chip{box-shadow:inset 0 0 0 1.5px var(--fy-line)}.fy-chip:hover{background:var(--fy-soft)}
.fy-hero{color:#f7f2e8;background:linear-gradient(135deg,var(--fy-700) 0%,var(--fy-950) 100%);box-shadow:0 14px 30px -16px color-mix(in srgb,var(--fy-950) 75%,transparent)}
.fy-hero::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(90% 80% at 100% 100%,rgb(229 213 183/.24),transparent 60%)}
.fy-swirl{position:relative;isolation:isolate;overflow:hidden;color:#f6f0e5;background:var(--fy-deep)}
.fy-swirl::before{content:"";position:absolute;inset:-40%;z-index:-1;background:
  repeating-radial-gradient(circle at 78% 70%,transparent 0 14px,var(--fy-swirl) 15px 16px),
  radial-gradient(70% 60% at 85% 85%,var(--fy-700),transparent 70%),
  radial-gradient(60% 50% at 10% 0%,var(--fy-950),transparent 70%)}
.fy-hatch{background:repeating-linear-gradient(-45deg,var(--fy-hatch) 0 2.4px,transparent 2.4px 8px);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--fy-hatch) 40%,transparent)}
.fy-sw-hatch{background:repeating-linear-gradient(-45deg,var(--fy-hatch) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fy-hatch) 45%,transparent)}
.fy-stem::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:10px;transform:translateX(-50%);background:var(--fy-hatch)}
.fy-grid{display:grid;gap:12px;grid-template-columns:minmax(0,1fr);
  grid-template-areas:"s1" "s2" "s3" "s4" "an" "re" "pr" "tm" "pg" "tr"}
.fy-side{display:contents}
@media (min-width:480px){.fy-grid{grid-template-columns:repeat(2,minmax(0,1fr));
  grid-template-areas:"s1 s2" "s3 s4" "an an" "re re" "pr pr" "tm tm" "pg pg" "tr tr"}}
@media (min-width:768px){.fy-grid{gap:16px;grid-template-areas:"s1 s2" "s3 s4" "an an" "re pr" "tm tm" "pg tr"}}
@media (min-width:1280px){
  .fy-grid{grid-template-columns:repeat(12,minmax(0,1fr));grid-template-areas:
    "s1 s1 s1 s2 s2 s2 s3 s3 s3 s4 s4 s4" "an an an an an an re re re sd sd sd" "tm tm tm tm tm pg pg pg pg sd sd sd"}
  .fy-side{display:flex;flex-direction:column;gap:16px;grid-area:sd;min-width:0}
  .fy-side>.fy-grow{flex:1}
}
.fy-cal{display:grid;gap:12px;grid-template-columns:minmax(0,1fr);grid-template-areas:"month" "agenda" "next"}
@media (min-width:768px){.fy-cal{gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"month month" "agenda next"}}
@media (min-width:1280px){.fy-cal{grid-template-columns:minmax(0,2fr) minmax(280px,1fr);grid-template-rows:auto 1fr;grid-template-areas:"month agenda" "month next";flex:1}}
.fy-pico{position:relative;flex:none;width:30px;height:30px;border-radius:9px}
.fy-pico-api{border-radius:6px;background:repeating-linear-gradient(-60deg,transparent 0 4px,#1e3a6e 4px 7px,transparent 7px 9px)}
.fy-pico-flow{border-radius:50%;background:conic-gradient(#163362 0 33%,#0a1933 0 66%,#c8b392 0)}
.fy-pico-dash{background:linear-gradient(#c49a5c,#c49a5c) 50% 0/6px 12px no-repeat,linear-gradient(#244882,#244882) 50% 100%/6px 12px no-repeat,linear-gradient(#0f2344,#0f2344) 0 50%/12px 6px no-repeat,linear-gradient(#9b7f56,#9b7f56) 100% 50%/12px 6px no-repeat}
.fy-pico-speed{border-radius:50%;background:conic-gradient(from 200deg,#244882 0 50%,#b89c72 0 75%,transparent 0)}
.fy-pico-qa{background:radial-gradient(circle at 50% 30%,#163362 0 6px,transparent 6.5px),radial-gradient(circle at 28% 70%,#b89865 0 6px,transparent 6.5px),radial-gradient(circle at 72% 70%,#0b1d3d 0 6px,transparent 6.5px)}
.fy-pico-new{border-radius:50%;background:radial-gradient(circle,var(--fy-700) 0 5px,transparent 5.5px),var(--fy-soft)}
.fy-k-leave{--c:var(--fy-700)}.fy-k-overtime{--c:#2c528c}.fy-k-official_business{--c:#0e5a70}.fy-k-finance{--c:#9e6208}.fy-k-other{--c:#63488a}
.fy-dark .fy-k-leave{--c:#e5d5b7}.fy-dark .fy-k-overtime{--c:#93b8f2}.fy-dark .fy-k-official_business{--c:#7dd3e8}.fy-dark .fy-k-finance{--c:#f0bc68}.fy-dark .fy-k-other{--c:#c8b0eb}
.fy-evt{color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.fy-agenda{box-shadow:inset 4px 0 0 var(--c)}
.fy-root mark{background:var(--fy-mark-bg);color:inherit;border-radius:3px}
.fy-set{display:grid;gap:12px;grid-template-columns:minmax(0,1fr);align-items:start}
@media (min-width:768px){.fy-set{gap:16px;grid-template-columns:220px minmax(0,1fr)}}
@media (min-width:1280px){.fy-set{grid-template-columns:260px minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.fy-root *,.fy-root *::before,.fy-root *::after{transition-duration:.01ms!important;animation:none!important}}
`;

/* ---------------------------------------------------------------- variants */

const viewV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  exit: { opacity: 0, y: 12, transition: { duration: 0.2, ease: E_IN } },
};

const cardV: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.72, ease: E_OUT } },
};

const fileV: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: E_OUT } },
};

const rowV: Variants = {
  hidden: { opacity: 0, x: 14 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.48, ease: E_OUT, delay: 0.35 + i * 0.04 },
  }),
};

/* ------------------------------------------------------------------ atoms */

function BrandMark({ dark }: { dark: boolean }) {
  return (
    <span
      className={`grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-[12px] p-1.5 shadow-[inset_0_0_0_1px_var(--border)] ${
        dark ? "bg-white/10" : "bg-card"
      }`}
    >
      <img
        src={dark ? "./brand/mediq-logo-white.png" : "./brand/mediq-logo-official.png"}
        alt="MediQ"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

function AvatarCircle({
  name,
  tint = "#e6dac6",
  size = 44,
}: {
  name: string;
  tint?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center rounded-full font-semibold tracking-[0.02em] text-[rgb(19_26_21/0.82)]"
      style={{
        width: size,
        height: size,
        background: tint,
        fontSize: Math.round(size * 0.32),
      }}
    >
      {initials(name)}
    </span>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Magnetic({
  children,
  className = "",
  onClick,
  label,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 26, mass: 0.6 });
  const y = useSpring(my, { stiffness: 260, damping: 26, mass: 0.6 });
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left - r.width / 2) * 0.25);
        my.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className={`fy-focus inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[14.5px] font-medium transition-[background-color,box-shadow,color] duration-200 ${className}`}
    >
      {children}
    </motion.button>
  );
}

function RiseTitle({ text, id }: { text: string; id: string }) {
  const words = text.split(" ");
  let n = 0;
  return (
    <h1
      id={id}
      aria-label={text}
      className="text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[34px] xl:text-[38px]"
    >
      {words.map((w, wi) => (
        <span key={wi}>
          {wi > 0 ? " " : null}
          <span
            aria-hidden="true"
            className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-top"
          >
            {[...w].map((c, ci) => {
              const i = n++;
              return (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.78, ease: E_P4, delay: 0.04 + i * 0.022 }}
                >
                  {c}
                </motion.span>
              );
            })}
          </span>
        </span>
      ))}
    </h1>
  );
}

function ViewHead({
  title,
  sub,
  id,
  children,
}: {
  title: string;
  sub: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1 sm:mb-6 sm:px-0">
      <div>
        <RiseTitle text={title} id={id} />
        <motion.p variants={fileV} className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
          {sub}
        </motion.p>
      </div>
      {children ? (
        <motion.div
          variants={fileV}
          className="flex w-full flex-wrap gap-3 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

function useCountUp(
  to: number,
  { duration = 1.2, delay = 0.3 }: { duration?: number; delay?: number } = {}
) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  const cur = useRef(reduce ? to : 0);
  const first = useRef(true);
  useEffect(() => {
    if (reduce) {
      cur.current = to;
      setV(to);
      return;
    }
    const c = animate(cur.current, to, {
      duration,
      delay: first.current ? delay : 0,
      ease: E_OUT,
      onUpdate: (x) => {
        cur.current = x;
        setV(x);
      },
    });
    first.current = false;
    return () => c.stop();
  }, [to, reduce, duration, delay]);
  return v;
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const v = useCountUp(value);
  return (
    <>
      {Math.round(v)}
      {suffix}
    </>
  );
}

function FyCard({
  children,
  className = "",
  area,
  label,
  lift,
  as = "section",
}: {
  children: ReactNode;
  className?: string;
  area?: string;
  label?: string;
  lift?: boolean;
  as?: "section" | "article";
}) {
  const Comp = as === "article" ? motion.article : motion.section;
  return (
    <Comp
      variants={cardV}
      aria-label={label}
      whileHover={lift ? { y: -4, transition: { duration: 0.4, ease: E_OUT } } : undefined}
      style={area ? { gridArea: area } : undefined}
      className={`relative min-w-0 rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5 ${className}`}
    >
      {children}
    </Comp>
  );
}

function CardTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[18px] font-medium tracking-[-0.02em]">
      {children}
    </h2>
  );
}

function Chip({
  children,
  onClick,
  icon: Icon,
}: {
  children: ReactNode;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fy-chip fy-focus inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors"
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
      {children}
    </button>
  );
}

function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  id,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  id: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="fy-noscroll relative inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-card p-[5px] shadow-[var(--fy-shadow)]"
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`fy-focus-in relative h-10 flex-none cursor-pointer whitespace-nowrap rounded-full px-[18px] text-sm font-medium transition-colors duration-200 ${
              on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {on ? (
              <motion.span
                layoutId={`${id}-pill`}
                className="fy-primary absolute inset-0 rounded-full"
                transition={{ type: "spring", bounce: 0, duration: 0.45 }}
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- dashboard widgets */

function StatCard({
  title,
  value,
  note,
  badge,
  hero,
  area,
  onOpen,
}: {
  title: string;
  value: number;
  note: string;
  badge?: string;
  hero?: boolean;
  area: string;
  onOpen: () => void;
}) {
  return (
    <motion.article
      variants={cardV}
      whileHover={{ y: -4, transition: { duration: 0.4, ease: E_OUT } }}
      style={{ gridArea: area }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${title}: ${value}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`fy-focus group relative flex min-h-[150px] min-w-0 cursor-pointer flex-col rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5 xl:min-h-[164px] ${
        hero ? "fy-hero" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <h2 className="text-[14.5px] font-medium tracking-[-0.015em] sm:text-[16.5px]">
          {title}
        </h2>
        <span
          aria-hidden="true"
          className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-full transition-[transform,background-color,color] duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] group-hover:rotate-45 sm:h-[38px] sm:w-[38px] ${
            hero
              ? "bg-[#f1f8f3] text-[var(--fy-950)] group-hover:bg-[var(--fy-400)]"
              : "shadow-[inset_0_0_0_1.5px_currentColor] group-hover:bg-foreground group-hover:text-card"
          }`}
        >
          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      <p className="mb-2 mt-auto pt-3 text-[40px] font-semibold leading-none tracking-[-0.04em] sm:text-[48px]">
        <CountUp value={value} />
      </p>
      <p
        className={`flex items-center gap-2 text-[11.5px] sm:text-[13px] ${
          hero ? "text-[#e6d8bf]" : "text-muted-foreground"
        }`}
      >
        {badge ? (
          <span className="inline-flex items-center rounded-[5px] px-1.5 text-[10.5px] leading-4 shadow-[inset_0_0_0_1px_currentColor]">
            {badge}
          </span>
        ) : null}
        <span className="truncate">{note}</span>
      </p>
    </motion.article>
  );
}

function FormActivityBarsCard({
  myRequests,
  onOpenNewForm,
}: {
  myRequests: FormRequest[];
  onOpenNewForm: (t: RequestType) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  const bars = useMemo(() => {
    const counts = FORM_LAUNCHER.map((f) => ({
      ...f,
      label: REQUEST_TYPE_META[f.type].shortLabel,
      full: REQUEST_TYPE_META[f.type].label,
      count: myRequests.filter((r) => r.request_type === f.type).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return counts.map((c, idx) => {
      const pct = c.count === 0 ? 48 : Math.max(58, Math.round((c.count / max) * 96));
      const kind: "plan" | "mid" | "light" | "dark" =
        c.count === 0
          ? "plan"
          : c.count === max
            ? "dark"
            : idx % 2 === 0
              ? "mid"
              : "light";
      return { ...c, pct, kind };
    });
  }, [myRequests]);

  const defaultSel = useMemo(() => {
    const firstNonZero = bars.findIndex((b) => b.count > 0);
    return firstNonZero >= 0 ? firstNonZero : 0;
  }, [bars]);

  const [sel, setSel] = useState(defaultSel);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSel((prev) => (prev < bars.length ? prev : 0));
  }, [bars.length]);

  useLayoutEffect(() => {
    const place = () => {
      const c = cardRef.current;
      const b = barRefs.current[sel];
      const t = tipRef.current;
      if (!c || !b || !t) return;
      const cr = c.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      setPos({
        x: br.left + br.width / 2 - cr.left - t.offsetWidth / 2,
        y: br.top - cr.top - t.offsetHeight - 12,
      });
    };
    place();
    const c = cardRef.current;
    if (!c) return;
    const ro = new ResizeObserver(place);
    ro.observe(c);
    return () => ro.disconnect();
  }, [sel, ready, bars]);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 750);
    return () => window.clearTimeout(t);
  }, []);

  const activeBar = bars[sel] ?? bars[0];

  return (
    <motion.section
      ref={(el: HTMLElement | null) => {
        cardRef.current = el;
      }}
      variants={cardV}
      style={{ gridArea: "an" }}
      aria-labelledby={`${id}-h`}
      className="relative flex min-w-0 flex-col rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <CardTitle id={`${id}-h`}>Forms by Category</CardTitle>
        <Chip icon={Plus} onClick={() => onOpenNewForm(activeBar.type)}>
          File {activeBar.shortCode}
        </Chip>
      </div>
      <p className="sr-only">
        Count of digital forms filed per category. Hatched bars have no submissions yet.
      </p>
      <ol className="mt-9 grid min-h-[168px] flex-1 grid-cols-6 gap-2 sm:gap-3 xl:min-h-[155px]">
        {bars.map((bar, i) => (
          <li key={bar.type} className="grid min-w-0 grid-rows-[1fr_auto] gap-2.5">
            <button
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              type="button"
              aria-label={`${bar.full}, ${bar.count} filed`}
              aria-pressed={sel === i}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => {
                setSel(i);
                onOpenNewForm(bar.type);
              }}
              style={{ height: `${bar.pct}%` }}
              className="fy-focus relative mx-auto min-h-10 w-full max-w-[48px] cursor-pointer self-end overflow-hidden rounded-full [-webkit-tap-highlight-color:transparent]"
            >
              <motion.span
                initial={{ y: "101%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: E_P4, delay: 0.4 + i * 0.06 }}
                className={`absolute inset-0 rounded-[inherit] transition-[filter] hover:brightness-110 ${
                  bar.kind === "plan"
                    ? "fy-hatch"
                    : bar.kind === "mid"
                      ? "bg-[var(--fy-700)]"
                      : bar.kind === "light"
                        ? "bg-[var(--fy-400)]"
                        : "bg-[var(--fy-strong)]"
                }`}
              />
            </button>
            <span
              aria-hidden="true"
              className={`text-center text-xs sm:text-sm ${
                sel === i ? "font-semibold text-foreground" : "text-[var(--fy-faint)]"
              }`}
            >
              {bar.shortCode}
            </span>
          </li>
        ))}
      </ol>
      <motion.div
        ref={tipRef}
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          x: pos.x,
          y: pos.y,
          opacity: ready ? 1 : 0,
          scale: ready ? 1 : 0.8,
        }}
        transition={{
          x: { duration: 0.4, ease: E_OUT },
          y: { duration: 0.4, ease: E_OUT },
          opacity: { duration: 0.28 },
          scale: { type: "spring", bounce: 0, duration: 0.4 },
        }}
        className="fy-stem pointer-events-none absolute left-0 top-0 z-[2] whitespace-nowrap rounded-[7px] bg-card px-2.5 py-[3px] text-[11px] font-semibold shadow-[0_0_0_1px_var(--border),0_6px_16px_-8px_rgb(19_26_21/0.35)]"
      >
        {activeBar.label} · {activeBar.count} filed
      </motion.div>
    </motion.section>
  );
}

function ApprovalGauge({
  total,
  approved,
  pending,
  other,
}: {
  total: number;
  approved: number;
  pending: number;
  other: number;
}) {
  const raw = useId();
  const pid = `fy-hatch-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  const pct = useCountUp(total ? Math.round((approved / total) * 100) : 0, {
    duration: 1.2,
    delay: 0.4,
  });

  const entries = [
    { k: "approved", len: share(approved), stroke: "var(--fy-700)" },
    { k: "pending", len: share(pending), stroke: "var(--fy-strong)" },
    { k: "other", len: share(other), stroke: `url(#${pid})` },
  ];

  let at = 0;
  const segs = entries.map((e) => {
    const s = { ...e, off: -at };
    at += e.len;
    return s;
  });

  const D = "M32 120a98 98 0 0 1 196 0";
  return (
    <div className="relative mx-auto mt-3 grid w-full max-w-[290px] flex-1 place-items-end">
      <svg viewBox="0 0 260 142" className="h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <pattern id={pid} patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" style={{ fill: "var(--card)" }} />
            <path
              d="M-2 2l4-4M0 8l8-8M6 10l4-4"
              style={{ stroke: "var(--fy-hatch)", strokeWidth: 2 }}
            />
          </pattern>
        </defs>
        <path
          d={D}
          pathLength={100}
          fill="none"
          strokeWidth={44}
          strokeLinecap="round"
          style={{ stroke: "var(--muted)" }}
        />
        {[...segs].reverse().map((s, i) => (
          <motion.path
            key={s.k}
            d={D}
            pathLength={100}
            fill="none"
            strokeWidth={44}
            strokeLinecap="round"
            style={{ stroke: s.stroke }}
            initial={{ strokeDasharray: "0 100", strokeDashoffset: 0, opacity: 0 }}
            animate={{
              strokeDasharray: `${s.len} 100`,
              strokeDashoffset: s.off,
              opacity: s.len < 0.5 ? 0 : 1,
            }}
            transition={{ duration: 1.2, ease: E_INOUT, delay: 0.35 + (2 - i) * 0.08 }}
          />
        ))}
      </svg>
      <p className="absolute inset-x-0 bottom-0 grid justify-items-center">
        <span className="text-[42px] font-semibold leading-none tracking-[-0.05em] xl:text-[46px]">
          {Math.round(pct)}%
        </span>
        <span className="mt-1 text-[13px] text-muted-foreground">Forms Approved</span>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- calendar view */

function EmployeeCalendarView({
  q,
  requests,
  today,
  weekStart,
  onInspect,
  onOpenNewForm,
}: {
  q: string;
  requests: FormRequest[];
  today: Date;
  weekStart: 0 | 1;
  onInspect: (req: FormRequest) => void;
  onOpenNewForm: (type: RequestType) => void;
}) {
  const todayIso = iso(today);
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12)
  );
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState(todayIso);
  const [focusSel, setFocusSel] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const allEvents = useMemo(() => buildCalendarEvents(requests), [requests]);

  const byDay = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of allEvents) {
      if (q && !matchesRequestSearch(e.request, q)) continue;
      (m[e.dateKey] ??= []).push(e);
    }
    return m;
  }, [allEvents, q]);

  const lead = (month.getDay() - weekStart + 7) % 7;
  const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const total = Math.ceil((lead + dim) / 7) * 7;
  const cells = Array.from(
    { length: total },
    (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - lead + i, 12)
  );
  const mKey = `${month.getFullYear()}-${month.getMonth()}`;

  const goto = (k: string) => {
    const d = parseIso(k);
    const m = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    if (m.getTime() !== month.getTime()) {
      setDir(m > month ? 1 : -1);
      setMonth(m);
    }
    setSel(k);
  };

  const step = (n: number) => {
    setDir(n);
    const m = new Date(month.getFullYear(), month.getMonth() + n, 1, 12);
    setMonth(m);
    const s = parseIso(sel);
    const day = Math.min(s.getDate(), new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate());
    setSel(iso(new Date(m.getFullYear(), m.getMonth(), day, 12)));
  };

  useEffect(() => {
    if (!focusSel) return;
    const t = window.setTimeout(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${sel}"]`)?.focus();
      setFocusSel(false);
    }, 30);
    return () => window.clearTimeout(t);
  }, [focusSel, sel, mKey]);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const n = moves[e.key];
    if (n === undefined) return;
    e.preventDefault();
    goto(iso(dayOffset(parseIso(sel), n)));
    setFocusSel(true);
  };

  const selDate = parseIso(sel);
  const agenda = byDay[sel] ?? [];

  const upcoming = useMemo(() => {
    const seen = new Set<string>();
    return allEvents
      .filter((e) => {
        if (e.dateKey < todayIso) return false;
        if (q && !matchesRequestSearch(e.request, q)) return false;
        if (seen.has(e.request.id)) return false;
        seen.add(e.request.id);
        return true;
      })
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(0, 6);
  }, [allEvents, todayIso, q]);

  const dow = Array.from({ length: 7 }, (_, i) =>
    fmtDowShort.format(new Date(2026, 0, 4 + weekStart + i))
  );

  return (
    <>
      <ViewHead
        title="Calendar"
        sub="Your filed leaves, overtime, official business trips, and financial requests."
        id="fy-h-calendar"
      >
        <Magnetic className="fy-ghost" onClick={() => goto(todayIso)}>
          <CalendarDays className="h-5 w-5" />
          Today
        </Magnetic>
        <Magnetic className="fy-primary" onClick={() => onOpenNewForm("leave")}>
          <Plus className="h-5 w-5" />
          File Leave
        </Magnetic>
      </ViewHead>
      <div className="fy-cal">
        <FyCard area="month" className="flex flex-col" label="Month">
          <div className="flex items-center justify-between gap-3">
            <h2 aria-live="polite" className="text-[22px] font-semibold tracking-[-0.03em]">
              {fmtMonth.format(month)}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => step(-1)}
                className="fy-focus grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-muted transition-colors hover:bg-[var(--fy-soft)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => step(1)}
                className="fy-focus grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-muted transition-colors hover:bg-[var(--fy-soft)]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div aria-hidden="true" className="mb-2 mt-4 grid grid-cols-7 gap-1 md:gap-1.5">
            {dow.map((d) => (
              <span
                key={d}
                className="text-center text-xs font-semibold uppercase tracking-[0.06em] text-[var(--fy-faint)]"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-hidden rounded-[14px]">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={mKey}
                ref={gridRef}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: `${d * 6}%`, opacity: 0 }),
                  center: { x: "0%", opacity: 1, transition: { duration: 0.4, ease: E_OUT } },
                  out: (d: number) => ({
                    x: `${-d * 6}%`,
                    opacity: 0,
                    transition: { duration: 0.18, ease: E_IN },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="out"
                onKeyDown={onKey}
                className="grid h-full auto-rows-[52px] grid-cols-7 gap-1 md:auto-rows-[minmax(82px,1fr)] md:gap-1.5"
              >
                {cells.map((d) => {
                  const k = iso(d);
                  const evts = byDay[k] ?? [];
                  const out = d.getMonth() !== month.getMonth();
                  const isToday = k === todayIso;
                  const on = k === sel;
                  return (
                    <button
                      key={k}
                      type="button"
                      data-date={k}
                      aria-pressed={on}
                      tabIndex={on ? 0 : -1}
                      aria-label={`${fmtFull.format(d)}${isToday ? ", today" : ""}, ${
                        evts.length
                          ? `${evts.length} form${evts.length > 1 ? "s" : ""}`
                          : "no forms"
                      }`}
                      onClick={() => goto(k)}
                      className={`fy-focus relative flex min-w-0 cursor-pointer flex-col items-center gap-[3px] rounded-[12px] p-1 text-left transition-[background-color,box-shadow] duration-200 md:items-start md:gap-1.5 md:rounded-[14px] md:p-2 ${
                        on
                          ? "bg-card shadow-[inset_0_0_0_2px_var(--fy-600)]"
                          : out
                            ? "bg-transparent hover:bg-[var(--fy-soft)]"
                            : "bg-muted hover:bg-[var(--fy-soft)]"
                      }`}
                    >
                      <motion.span
                        key={on ? "on" : "off"}
                        aria-hidden="true"
                        initial={on ? { scale: 0.7 } : false}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                        className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold md:h-[30px] md:w-[30px] md:text-sm ${
                          isToday
                            ? "bg-[var(--fy-700)] text-[#f2f8f4]"
                            : out
                              ? "text-[var(--fy-faint)] opacity-60"
                              : ""
                        }`}
                      >
                        {d.getDate()}
                      </motion.span>
                      <span aria-hidden="true" className="flex flex-wrap gap-1 md:hidden">
                        {evts.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={`h-[7px] w-[7px] rounded-full bg-[var(--c)] fy-k-${e.kind}`}
                          />
                        ))}
                      </span>
                      <span aria-hidden="true" className="hidden w-full min-w-0 flex-col gap-1 md:flex">
                        {evts.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className={`fy-evt block max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold fy-k-${e.kind}`}
                          >
                            {e.title}
                          </span>
                        ))}
                        {evts.length > 2 ? (
                          <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">
                            +{evts.length - 2} more
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-muted-foreground">
            {(Object.keys(CAL_KINDS) as CalKind[]).map((k) => (
              <li key={k} className="inline-flex items-center gap-[7px]">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full bg-[var(--c)] fy-k-${k}`} />
                {CAL_KINDS[k]}
              </li>
            ))}
          </ul>
        </FyCard>

        <motion.section
          variants={cardV}
          style={{ gridArea: "agenda" }}
          aria-labelledby="fy-agenda-h"
          className="min-w-0 rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={sel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={{ duration: 0.35, ease: E_OUT }}
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--fy-text)]">
                {fmtDow.format(selDate)}
                {sel === todayIso ? " · Today" : ""}
              </p>
              <h2 id="fy-agenda-h" className="mt-0.5 text-[26px] font-semibold tracking-[-0.035em]">
                {fmtDayLong.format(selDate)}
              </h2>
              {agenda.length ? (
                <ol className="mt-4 grid gap-2.5">
                  {agenda.map((e, i) => (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: E_OUT, delay: 0.05 + i * 0.04 }}
                    >
                      <button
                        type="button"
                        onClick={() => onInspect(e.request)}
                        className={`fy-agenda fy-focus flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-muted p-3 text-left transition-colors hover:bg-[var(--fy-soft)] fy-k-${e.kind}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14.5px] font-semibold leading-[1.3]">
                            {e.title}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-[var(--c)]">
                            {REQUEST_TYPE_META[e.request.request_type].shortLabel} · {e.subtitle}
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 flex-none text-muted-foreground" />
                      </button>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-[13.5px] text-[var(--fy-faint)]">
                  No forms scheduled on this date.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <motion.section
          variants={cardV}
          style={{ gridArea: "next" }}
          aria-labelledby="fy-next-h"
          className="min-w-0 rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
        >
          <CardTitle id="fy-next-h">Upcoming Forms</CardTitle>
          <ol className="mt-3 grid gap-1">
            {upcoming.map((e) => {
              const d = parseIso(e.dateKey);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      goto(e.dateKey);
                      onInspect(e.request);
                    }}
                    className={`fy-focus flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted ${
                      e.dateKey === sel ? "bg-muted" : ""
                    }`}
                  >
                    <span className="grid h-[46px] w-[46px] flex-none place-items-center content-center rounded-xl bg-[var(--fy-soft)] leading-none text-[var(--fy-text)]">
                      <b className="text-[17px]">{d.getDate()}</b>
                      <small className="text-[10.5px] font-semibold uppercase">
                        {fmtMon.format(d)}
                      </small>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        <Highlight text={e.title} q={q} />
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {upcoming.length === 0 ? (
              <li className="p-2 text-[13.5px] text-[var(--fy-faint)]">
                No upcoming dated submissions yet.
              </li>
            ) : null}
          </ol>
        </motion.section>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- settings */

interface RadioOpt<T extends string> {
  id: T;
  label: string;
  hex?: string;
  icon?: LucideIcon;
}

function Radios<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: RadioOpt<T>[];
  value: string;
  onChange: (v: T) => void;
}) {
  const gid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o.id.toLowerCase() === value.toLowerCase());
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const n = steps[e.key];
    const j =
      n !== undefined
        ? (i + n + options.length) % options.length
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? options.length - 1
            : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(options[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div>
      <p id={gid} className="text-[13.5px] font-semibold text-muted-foreground">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={gid} className="mt-3 flex flex-wrap gap-2.5">
        {options.map((o, i) => {
          const on = i === idx;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (idx < 0 && i === 0) ? 0 : -1}
              onClick={() => onChange(o.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`fy-focus inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full ${
                o.hex || o.icon ? "pl-2 pr-4" : "px-5"
              } text-[14.5px] font-medium transition-[background-color,box-shadow,color] duration-300 ${
                on
                  ? "bg-[var(--fy-soft)] text-foreground shadow-[inset_0_0_0_2px_var(--fy-600)]"
                  : "bg-muted text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)] hover:text-foreground"
              }`}
            >
              {o.hex ? (
                <span
                  className="relative grid h-7 w-7 flex-none place-items-center rounded-full text-white"
                  style={{ background: o.hex }}
                >
                  <AnimatePresence initial={false}>
                    {on ? (
                      <motion.span
                        key="c"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.3, ease: E_OUT }}
                        className="grid"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              ) : Icon ? (
                <span
                  className={`grid h-7 w-7 flex-none place-items-center rounded-full transition-colors duration-300 ${
                    on ? "fy-primary" : "bg-card"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
              ) : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeSettingsView({
  profile,
  announcements,
  theme,
  onTheme,
  accent,
  onAccent,
  weekStart,
  onWeekStart,
  onToast,
}: {
  profile: Profile | null;
  announcements: Announcement[];
  theme: Theme;
  onTheme: (t: Theme) => void;
  accent: string;
  onAccent: (hex: string) => void;
  weekStart: 0 | 1;
  onWeekStart: (w: 0 | 1) => void;
  onToast: (msg: string) => void;
}) {
  const { saveProfile } = useAppData();
  const { toast } = useToast();
  const [tab, setTab] = useState<SetTab>("profile");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "Operations");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [signatureData, setSignatureData] = useState(profile?.signature_data ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setDepartment(profile.department);
      setPosition(profile.position);
      setPhone(profile.phone ?? "");
      setSignatureData(profile.signature_data ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(t);
  }, [saved]);

  const handleSigChange = useCallback((val: string) => {
    setSignatureData(val);
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await saveProfile(profile.id, {
        full_name: fullName.trim() || profile.full_name,
        department,
        position: position.trim() || profile.position,
        phone: phone.trim() || null,
        signature_data: signatureData || null,
      });
      setSaved(true);
      onToast("Profile & e-signature saved");
    } catch (err) {
      toast(
        "Could not update profile",
        err instanceof Error ? err.message : "Please try again.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = SET_TABS.findIndex((t) => t.id === tab);
    const steps: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    const n = steps[e.key];
    const j =
      n !== undefined
        ? (i + n + SET_TABS.length) % SET_TABS.length
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? SET_TABS.length - 1
            : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(SET_TABS[j].id);
    tabRefs.current[j]?.focus();
  };

  const inputCls =
    "h-12 w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)]";
  const labelCls = "grid min-w-0 gap-1.5 text-[13.5px] font-medium text-muted-foreground";

  return (
    <>
      <ViewHead
        title="Settings"
        sub="Manage your MediQ profile, saved digital e-signature, HR memos, and workspace theme."
        id="fy-h-settings"
      />
      <div className="fy-set">
        <FyCard className="!p-2 sm:!p-2.5 md:self-start" label="Settings sections">
          <div
            role="tablist"
            aria-label="Settings sections"
            onKeyDown={onTabKey}
            className="grid grid-cols-3 gap-1 md:flex md:flex-col"
          >
            {SET_TABS.map((t, i) => {
              const on = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${t.id}`}
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`fy-focus-in relative flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-2 text-[13.5px] font-medium transition-colors duration-300 sm:px-4 sm:text-[14.5px] md:flex-none md:justify-start ${
                    on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {on ? (
                    <motion.span
                      layoutId="fy-set-pill"
                      className="fy-primary absolute inset-0 rounded-full"
                      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                    />
                  ) : null}
                  <Icon
                    className="relative hidden h-[18px] w-[18px] flex-none sm:block"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                  <span className="relative truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </FyCard>

        <FyCard className="min-h-[420px] overflow-hidden lg:min-h-0" label="Settings panel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: E_OUT } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.16, ease: E_IN } }}
            >
              {tab === "profile" ? (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <AvatarCircle name={fullName || profile?.full_name || "Employee"} tint="#e6dac6" size={60} />
                    <div className="min-w-0">
                      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                        Profile & Digital E-Signature
                      </h2>
                      <p className="mt-0.5 text-[14px] text-muted-foreground">
                        {profile?.employee_code} · {profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelCls}>
                      Full Name
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </label>
                    <label className={labelCls}>
                      Department
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={inputCls}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelCls}>
                      Position / Title
                      <input
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className={labelCls}>
                      Mobile / Contact No.
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-border bg-white p-4 text-slate-900">
                    <p className="mb-3 text-xs font-semibold text-slate-600">
                      Saved Digital E-Signature (auto-fills on all future forms)
                    </p>
                    <SignaturePad
                      signerName={fullName || profile?.full_name || "Employee"}
                      initialSignature={signatureData || null}
                      onChange={handleSigChange}
                    />
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="fy-primary fy-focus inline-flex h-11 min-w-[160px] cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-medium disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : saved ? "Saved!" : "Save Profile & E-Sig"}
                    </button>
                  </div>
                </form>
              ) : tab === "memos" ? (
                <div>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                    HR & Admin Memos
                  </h2>
                  <p className="mt-0.5 text-[14px] text-muted-foreground">
                    Live company advisories published by HR, Boss Executive, and Accounting.
                  </p>
                  {announcements.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted p-8 text-center">
                      <Megaphone className="mx-auto h-7 w-7 text-muted-foreground" />
                      <p className="mt-2 text-sm font-semibold">No memos posted yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Company announcements appear here automatically via live Supabase sync.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-5 grid gap-3">
                      {announcements.map((ann) => (
                        <li
                          key={ann.id}
                          className="rounded-2xl border border-border bg-muted p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[15px] font-semibold">{ann.title}</span>
                            {ann.is_pinned ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fy-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--fy-text)]">
                                <Pin className="h-3 w-3" /> Pinned
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-sm text-muted-foreground">{ann.body}</p>
                          <p className="mt-2 text-xs text-[var(--fy-faint)]">
                            {ann.author?.full_name ?? "MediQ Admin"} ·{" "}
                            {formatDate(ann.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="grid gap-7">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Appearance</h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">
                      Theme and accent color re-tint your entire Employee Portal instantly.
                    </p>
                  </div>
                  <Radios<Theme>
                    label="Theme"
                    value={theme}
                    onChange={onTheme}
                    options={[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                    ]}
                  />
                  <Radios<string>
                    label="Accent Palette"
                    value={accent}
                    onChange={onAccent}
                    options={ACCENTS}
                  />
                  <Radios<"0" | "1">
                    label="Calendar Week Starts On"
                    value={String(weekStart)}
                    onChange={(v) => onWeekStart(v === "1" ? 1 : 0)}
                    options={[
                      { id: "0", label: "Sunday" },
                      { id: "1", label: "Monday" },
                    ]}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </FyCard>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------- shell */

function Sidebar({
  view,
  onGo,
  dark,
  totalForms,
  approvalPct,
  hasSignature,
  onQuickAction,
  onSignOut,
}: {
  view: View;
  onGo: (v: View) => void;
  dark: boolean;
  totalForms: number;
  approvalPct: number;
  hasSignature: boolean;
  onQuickAction: () => void;
  onSignOut: () => void;
}) {
  const reduce = useReducedMotion();
  const [scope, run] = useAnimate<HTMLSpanElement>();
  const refs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  const lastY = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[view];
    const rail = scope.current;
    if (!el || !rail) return;
    const y = el.offsetTop + (el.offsetHeight - 40) / 2;
    if (lastY.current === null || reduce) {
      run(rail, { y, opacity: 1 }, { duration: 0 });
      if (lastY.current === null && !reduce)
        run(rail, { scaleY: [0, 1] }, { duration: 0.55, delay: 0.35, ease: E_OUT });
    } else {
      run(rail, { y }, { duration: 0.45, ease: E_INOUT });
    }
    lastY.current = y;
  }, [view, reduce, run, scope]);

  return (
    <motion.aside
      aria-label="Primary"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.65, ease: E_OUT }}
      className="fy-scroll hidden w-[232px] flex-none flex-col overflow-y-auto overscroll-contain rounded-[26px] bg-muted pb-[18px] pt-[22px] lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-32px)] xl:w-[258px]"
    >
      <div className="flex items-center gap-3 px-[24px]">
        <BrandMark dark={dark} />
        <div className="min-w-0">
          <span className="block truncate text-[19px] font-semibold leading-tight tracking-[-0.03em]">
            MediQ Forms
          </span>
          <span className="block truncate text-[11.5px] font-medium text-muted-foreground">
            Employee Portal
          </span>
        </div>
      </div>

      <div className="relative mt-7">
        <span
          ref={scope}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-[1] h-10 w-[5px] origin-center rounded-r-md bg-[var(--fy-700)] opacity-0"
        />
        {NAV_GROUPS.map((g, gi) => (
          <nav key={g.id} aria-labelledby={`fy-nav-${g.id}`} className={gi ? "mt-5" : ""}>
            <p
              id={`fy-nav-${g.id}`}
              className="px-7 pb-2.5 text-xs font-medium uppercase tracking-[0.06em] text-[var(--fy-faint)]"
            >
              {g.label}
            </p>
            <ul>
              {g.items.map((n) => {
                const on = n.id === view;
                const Icon = n.icon;
                return (
                  <li key={n.id}>
                    <button
                      ref={(el) => {
                        refs.current[n.id] = el;
                      }}
                      type="button"
                      aria-current={on ? "page" : undefined}
                      onClick={() => onGo(n.id)}
                      className={`fy-focus-in relative flex w-full cursor-pointer items-center gap-3.5 px-7 py-2.5 text-left text-[15.5px] transition-colors duration-200 ${
                        on
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-[21px] w-[21px] flex-none transition-colors ${
                          on ? "text-[var(--fy-mark)]" : ""
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{n.label}</span>
                      {n.id === "forms" ? (
                        <motion.span
                          key={totalForms}
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                          className="ml-auto rounded-md bg-[var(--fy-950)] px-[7px] py-0.5 text-[10.5px] font-semibold text-[#f0f7f2]"
                        >
                          {totalForms}
                        </motion.span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
              {g.id === "general" ? (
                <li>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="fy-focus-in relative flex w-full cursor-pointer items-center gap-3.5 px-7 py-2.5 text-left text-[15.5px] text-muted-foreground transition-colors duration-200 hover:text-[var(--fy-rose)]"
                  >
                    <LogOut className="h-[21px] w-[21px] flex-none" strokeWidth={1.75} />
                    Sign Out
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>

      <div className="fy-swirl mx-[18px] mt-auto rounded-[20px] px-4 pb-4 pt-[18px]">
        <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#f5efe4] text-[#0b1933]">
          {hasSignature ? (
            <Sparkles className="h-[14px] w-[14px]" strokeWidth={2.1} />
          ) : (
            <PenTool className="h-[14px] w-[14px]" strokeWidth={2.1} />
          )}
        </span>
        <p className="mt-3 text-[18px] font-medium leading-[1.2] tracking-[-0.02em]">
          {hasSignature ? "E-Signature Ready" : "Setup E-Signature"}
        </p>
        <p className="mt-1.5 text-xs text-[#dfd0b6]">
          {hasSignature
            ? `${approvalPct}% approval rate · Live Sync`
            : "Save once for 1-click filing"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(245_239_228/0.18)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[#f5efe4]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hasSignature ? Math.max(0.2, approvalPct / 100) : 0.25 }}
            transition={{ duration: 0.9, ease: E_OUT, delay: 0.45 }}
          />
        </div>
        <button
          type="button"
          onClick={onQuickAction}
          className="mt-4 block w-full cursor-pointer rounded-full bg-[var(--fy-800)] p-2.5 text-center text-[13.5px] font-semibold text-inherit transition-colors hover:bg-[var(--fy-700)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#eef6f1]"
        >
          {hasSignature ? "File New Form" : "Add Signature"}
        </button>
      </div>
    </motion.aside>
  );
}

const PHONE_IDS: View[] = ["dashboard", "forms", "calendar"];
const PHONE_MAIN = NAV.filter((n) => PHONE_IDS.includes(n.id));
const PHONE_MORE = NAV.filter((n) => !PHONE_IDS.includes(n.id));

function TabBar({
  view,
  onGo,
  totalForms,
  onSignOut,
}: {
  view: View;
  onGo: (v: View) => void;
  totalForms: number;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetId = useId();
  const moreOn = !PHONE_IDS.includes(view);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        moreRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const wide = () => {
      if (mq.matches) setOpen(false);
    };
    document.addEventListener("keydown", key);
    mq.addEventListener("change", wide);
    return () => {
      document.removeEventListener("keydown", key);
      mq.removeEventListener("change", wide);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    moreRef.current?.focus();
  };

  const cell = (on: boolean) =>
    `fy-focus-in relative flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-full text-[11.5px] font-semibold leading-none transition-colors sm:text-[12.5px] ${
      on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"
    }`;

  const pill = (
    <motion.span
      layoutId="fy-tab-pill"
      className="fy-primary absolute inset-0 rounded-full"
      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
    />
  );

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {open ? (
          <motion.button
            key="scrim"
            type="button"
            tabIndex={-1}
            aria-label="Close more pages"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[39] cursor-default bg-[rgb(13_24_17/0.32)] backdrop-blur-[2px]"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            ref={sheetRef}
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            className="fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[41] mx-auto max-w-[360px] origin-bottom-right rounded-[22px] bg-card p-2.5 shadow-[var(--fy-pop)]"
          >
            <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
              <p className="text-[15px] font-semibold">More</p>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="fy-focus grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <ul className="mt-1 grid gap-0.5">
              {PHONE_MORE.map((n) => {
                const on = n.id === view;
                const Icon = n.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onGo(n.id);
                        close();
                      }}
                      className={`fy-focus-in flex h-12 w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 text-left text-[15px] transition-colors ${
                        on
                          ? "bg-[var(--fy-soft)] font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 flex-none ${on ? "text-[var(--fy-mark)]" : ""}`}
                        strokeWidth={1.8}
                      />
                      {n.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onSignOut();
                  }}
                  className="fy-focus-in flex h-12 w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 text-left text-[15px] text-[var(--fy-rose)] transition-colors hover:bg-[var(--fy-rose-bg)]"
                >
                  <LogOut className="h-5 w-5 flex-none" strokeWidth={1.8} />
                  Sign Out
                </button>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid w-full max-w-[360px] grid-cols-4 gap-1 rounded-full bg-card p-1.5 shadow-[0_0_0_1px_var(--border),0_18px_40px_-14px_rgb(19_26_21/0.35)]">
          {PHONE_MAIN.map((n) => {
            const on = n.id === view;
            const Icon = n.icon;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => onGo(n.id)}
                  className={cell(on)}
                >
                  {on ? pill : null}
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                    {n.id === "forms" ? (
                      <span className="absolute -right-3.5 -top-1.5 rounded-md bg-[var(--fy-950)] px-1 text-[9.5px] leading-[14px] text-[#f0f7f2] shadow-[0_0_0_2px_var(--card)]">
                        {totalForms}
                      </span>
                    ) : null}
                  </span>
                  <span className="relative">{n.label.replace("My ", "")}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              ref={moreRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? sheetId : undefined}
              onClick={() => setOpen((o) => !o)}
              className={cell(moreOn)}
            >
              {moreOn ? pill : null}
              <Ellipsis className="relative h-5 w-5" strokeWidth={1.8} />
              <span className="relative">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function Tray({
  notes,
  onRead,
  onClose,
  bellRef,
}: {
  notes: NoticeItem[];
  onRead: () => void;
  onClose: () => void;
  bellRef: RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !bellRef.current?.contains(e.target as Node))
        onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        bellRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [onClose, bellRef]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.15 } }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="fixed inset-x-3 top-[76px] z-50 origin-top-right rounded-[20px] bg-card p-4 shadow-[var(--fy-pop)] sm:absolute sm:inset-x-auto sm:right-[-8px] sm:top-[calc(100%+12px)] sm:w-[360px]"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-semibold">Updates & Memos</p>
        {notes.length > 0 ? (
          <button
            type="button"
            onClick={onRead}
            className="fy-focus cursor-pointer rounded-md text-[13px] font-semibold text-[var(--fy-text)] hover:underline hover:underline-offset-[3px]"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {notes.length === 0 ? (
        <p className="rounded-[14px] bg-muted p-4 text-center text-xs text-muted-foreground">
          You&apos;re all caught up! New memos and form approvals appear here live.
        </p>
      ) : (
        <ul className="grid max-h-[340px] gap-1 overflow-y-auto">
          {notes.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 + i * 0.035, duration: 0.28, ease: E_OUT }}
            >
              <button
                type="button"
                onClick={() => {
                  n.onOpen();
                  onClose();
                }}
                className={`fy-focus flex w-full cursor-pointer items-start gap-3 rounded-[14px] p-2.5 text-left text-[13.5px] leading-[1.4] text-muted-foreground transition-colors hover:bg-muted ${
                  n.unread ? "bg-[var(--fy-soft)]" : ""
                }`}
              >
                <AvatarCircle name={n.who} tint={n.tint} size={36} />
                <span className="min-w-0 flex-1">
                  <b className="font-semibold text-foreground">{n.who}</b> {n.verb}{" "}
                  <b className="font-semibold text-foreground">{n.what}</b> {n.tail}
                  <span className="mt-0.5 block text-xs text-[var(--fy-faint)]">{n.ago}</span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/* ----------------------------------------------------------- main component */

export function MediqEmployeeDashboard({
  myRequests,
  announcements,
  onOpenNewForm,
  onInspect,
}: MediqEmployeeDashboardProps) {
  const { signOut } = useAuth();
  const { activeProfile: profile } = useAppData();

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("mediq-emp-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [accent, setAccent] = useState<string>(() => {
    try {
      return localStorage.getItem("mediq-emp-accent-v2") || "#163362";
    } catch {
      return "#163362";
    }
  });
  const [weekStart, setWeekStart] = useState<0 | 1>(() => {
    try {
      return localStorage.getItem("mediq-emp-weekstart") === "0" ? 0 : 1;
    } catch {
      return 1;
    }
  });

  const [today] = useState(noon);
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [formFilter, setFormFilter] = useState<FormFilter>("all");
  const [tray, setTray] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [toastMsg, setToastMsg] = useState<{ id: number; msg: string } | null>(null);

  const boardRef = useRef<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-emp-theme", theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-emp-accent-v2", accent);
    } catch {
      // ignore storage errors
    }
  }, [accent]);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-emp-weekstart", String(weekStart));
    } catch {
      // ignore storage errors
    }
  }, [weekStart]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const say = (msg: string) => setToastMsg({ id: Date.now(), msg });

  const go = (v: View) => {
    setTray(false);
    if (v === view) return;
    setView(v);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* Live Supabase Metrics */
  const q = query.trim().toLowerCase();
  const dark = theme === "dark";
  const fullName = profile?.full_name || "Team Member";
  const firstName = fullName.split(/\s+/)[0] || "Team Member";
  const hasSignature = Boolean(profile?.signature_data);
  const currentYear = new Date().getFullYear();

  const pendingCount = myRequests.filter((r) =>
    ["pending", "hr_endorsed", "accounting_verified"].includes(r.status)
  ).length;
  const approvedCount = myRequests.filter((r) =>
    ["approved", "paid"].includes(r.status)
  ).length;
  const closedOtherCount = myRequests.filter((r) =>
    ["rejected", "cancelled"].includes(r.status)
  ).length;

  const reimbursedTotal = myRequests
    .filter((r) => r.request_type === "reimbursement" && r.status === "paid")
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const pendingFinanceCount = myRequests.filter(
    (r) =>
      (r.request_type === "reimbursement" || r.request_type === "cash_advance") &&
      ["pending", "hr_endorsed", "accounting_verified", "approved"].includes(r.status)
  ).length;

  const leaveRequests = useMemo(
    () => myRequests.filter((r) => r.request_type === "leave"),
    [myRequests]
  );

  const sumApprovedLeave = (subtype: string) =>
    leaveRequests
      .filter((r) => r.subtype === subtype && r.status === "approved")
      .reduce((sum, r) => sum + Number(r.total_days ?? 0), 0);

  const vlTaken = sumApprovedLeave("vacation");
  const slTaken = sumApprovedLeave("sick");
  const elTaken = sumApprovedLeave("emergency");
  const totalLeaveTaken = leaveRequests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.total_days ?? 0), 0);

  const approvalPct = myRequests.length
    ? Math.round((approvedCount / myRequests.length) * 100)
    : 0;

  /* Search-filtered slices */
  const quickFormOptions = useMemo(
    () =>
      FORM_LAUNCHER.map((f) => ({
        type: f.type,
        label: REQUEST_TYPE_META[f.type].label,
        code: REQUEST_TYPE_META[f.type].formCode,
        routeText: f.routeText,
      })),
    []
  );

  const searchedMyRequests = useMemo(
    () => myRequests.filter((r) => matchesRequestSearch(r, q)),
    [myRequests, q]
  );

  const filteredFormsList = useMemo(() => {
    return FORM_LAUNCHER.filter((f) => {
      if (!q) return true;
      const meta = REQUEST_TYPE_META[f.type];
      return `${meta.label} ${meta.shortLabel} ${meta.formCode} ${f.routeText} ${meta.description} ${f.type}`
        .toLowerCase()
        .includes(q);
    });
  }, [q]);

  const recentSubmissions = useMemo(
    () => searchedMyRequests.slice(0, 5),
    [searchedMyRequests]
  );

  const formsViewList = useMemo(() => {
    return searchedMyRequests.filter((r) => {
      if (
        formFilter === "pending" &&
        !["pending", "hr_endorsed", "accounting_verified"].includes(r.status)
      )
        return false;
      if (formFilter === "approved" && !["approved", "paid"].includes(r.status)) return false;
      if (formFilter === "closed" && !["rejected", "cancelled"].includes(r.status))
        return false;
      return true;
    });
  }, [searchedMyRequests, formFilter]);

  const searchedLeaveRequests = useMemo(
    () => leaveRequests.filter((r) => matchesRequestSearch(r, q)),
    [leaveRequests, q]
  );

  const filteredAnnouncements = useMemo(
    () => announcements.filter((a) => matchesAnnouncementSearch(a, q)),
    [announcements, q]
  );

  /* Live Notifications from HR Memos + Form Statuses */
  const notices: NoticeItem[] = useMemo(() => {
    const list: NoticeItem[] = [];
    for (const ann of announcements.slice(0, 4)) {
      const id = `ann-${ann.id}`;
      list.push({
        id,
        who: ann.author?.full_name || "HR Admin",
        tint: "#cfd6f7",
        verb: "posted memo",
        what: ann.title,
        tail: "",
        ago: formatDate(ann.created_at),
        unread: !readIds.has(id),
        onOpen: () => go("settings"),
      });
    }
    for (const req of myRequests.slice(0, 4)) {
      const id = `req-${req.id}-${req.status}`;
      const statusLabel = STATUS_META[req.status]?.label ?? req.status;
      list.push({
        id,
        who: REQUEST_TYPE_META[req.request_type].shortLabel,
        tint:
          req.status === "approved" || req.status === "paid"
            ? "#e6dac6"
            : req.status === "rejected"
              ? "#f6c6c2"
              : "#f5dfb5",
        verb: `(${req.reference_no})`,
        what: req.title,
        tail: `is ${statusLabel}`,
        ago: formatDate(req.updated_at || req.created_at),
        unread: !readIds.has(id),
        onOpen: () => onInspect(req),
      });
    }
    return list;
  }, [announcements, myRequests, readIds]);

  const hasUnread = notices.some((n) => n.unread);
  const topMemo =
    filteredAnnouncements.find((a) => a.is_pinned) ?? filteredAnnouncements[0] ?? null;

  const statusPillStyle = (status: FormRequest["status"]) => {
    if (status === "approved" || status === "paid")
      return "text-[var(--fy-text)] bg-[var(--fy-soft)]";
    if (status === "rejected" || status === "cancelled")
      return "text-[var(--fy-rose)] bg-[var(--fy-rose-bg)]";
    return "text-[var(--fy-amber)] bg-[var(--fy-amber-bg)]";
  };

  const rootStyle = { "--fy-a": accent } as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`fy-root ${dark ? "fy-dark" : ""} min-h-[100dvh] w-full overflow-x-hidden`} style={rootStyle}>
        <style>{STYLE}</style>

        <div className="flex min-h-[100dvh] w-full gap-3 p-2 sm:gap-3.5 sm:p-3.5 lg:gap-4 lg:p-4">
          <Sidebar
            view={view}
            onGo={go}
            dark={dark}
            totalForms={myRequests.length}
            approvalPct={approvalPct}
            hasSignature={hasSignature}
            onQuickAction={() =>
              hasSignature ? onOpenNewForm("leave") : go("settings")
            }
            onSignOut={() => void signOut()}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-3.5 lg:gap-4">
            {/* Floating Fernly Header */}
            <motion.header
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: E_OUT, delay: 0.05 }}
              className="relative z-30 flex items-center gap-2 rounded-[22px] bg-muted p-2.5 sm:gap-3 sm:rounded-[26px] sm:px-4 sm:py-3"
            >
              <span className="lg:hidden">
                <BrandMark dark={dark} />
              </span>

              <PortalSearchBar
                id="fy-emp-search"
                query={query}
                onQueryChange={setQuery}
                ariaLabel="Search digital forms, reference numbers, and memos"
                placeholder={
                  view === "calendar"
                    ? "Search scheduled forms..."
                    : "Search forms, ref #, OR #, memos..."
                }
                requests={myRequests}
                announcements={announcements}
                quickForms={quickFormOptions}
                onInspectRequest={onInspect}
                onOpenNewForm={onOpenNewForm}
                onSelectAnnouncement={() => go("settings")}
                onViewAllMatches={() => {
                  setFormFilter("all");
                  go("forms");
                }}
                viewAllLabel="View in My Forms"
              />

              <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  onClick={() => setTheme(dark ? "light" : "dark")}
                  aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
                  className="fy-focus relative grid h-11 w-11 cursor-pointer place-items-center overflow-hidden rounded-full bg-card sm:h-12 sm:w-12"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={theme}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={{ duration: 0.25, ease: E_OUT }}
                    >
                      {dark ? (
                        <Sun className="h-5 w-5" strokeWidth={1.8} />
                      ) : (
                        <Moon className="h-5 w-5" strokeWidth={1.8} />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>

                <div className="sm:relative">
                  <motion.button
                    ref={bellRef}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => setTray((o) => !o)}
                    aria-expanded={tray}
                    aria-label="Updates and HR Memos"
                    className="fy-focus relative grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-card sm:h-12 sm:w-12"
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.8} />
                    <AnimatePresence>
                      {hasUnread ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          aria-hidden="true"
                          className="absolute right-[11px] top-[10px] h-2 w-2 rounded-full bg-[var(--fy-rose)] shadow-[0_0_0_2px_var(--card)] sm:right-[13px] sm:top-3"
                        />
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                  <AnimatePresence>
                    {tray ? (
                      <Tray
                        notes={notices}
                        bellRef={bellRef}
                        onClose={() => setTray(false)}
                        onRead={() =>
                          setReadIds(new Set(notices.map((n) => n.id)))
                        }
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => go("settings")}
                  aria-label={`Profile and settings for ${fullName}`}
                  className="fy-focus hidden cursor-pointer items-center gap-3 rounded-full py-0.5 pl-0.5 pr-2 text-left sm:flex"
                >
                  <AvatarCircle name={fullName} tint="#e6dac6" size={44} />
                  <span className="hidden xl:grid">
                    <span className="max-w-[180px] truncate text-[15px] font-medium leading-tight">
                      {fullName}
                    </span>
                    <span className="max-w-[180px] truncate text-[12.5px] text-muted-foreground">
                      {profile?.employee_code} · {profile?.department}
                    </span>
                  </span>
                </button>
              </div>
            </motion.header>

            {/* Whole-Page Fluid Main Board */}
            <motion.main
              ref={(el: HTMLElement | null) => {
                boardRef.current = el;
              }}
              aria-labelledby={`fy-h-${view}`}
              className="min-w-0 flex-1 rounded-[22px] bg-muted px-3 pb-28 pt-5 sm:rounded-[26px] sm:px-6 sm:pt-6 lg:pb-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  variants={viewV}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="space-y-5 lg:flex lg:min-h-full lg:flex-col"
                >
                  {view === "dashboard" ? (
                    <>
                      <ViewHead
                        title={`Welcome, ${firstName}`}
                        sub="Paperless Employee Self-Service — file signed forms routed live to HR, Boss & Accounting."
                        id="fy-h-dashboard"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => onOpenNewForm("leave")}
                        >
                          <Plus className="h-5 w-5" />
                          File Leave Form
                        </Magnetic>
                        <Magnetic
                          className="fy-ghost"
                          onClick={() => onOpenNewForm("reimbursement")}
                        >
                          <Receipt className="h-4 w-4" />
                          Reimbursement
                        </Magnetic>
                      </ViewHead>

                      {/* Active Search Filter Indicator */}
                      <ActiveSearchBanner
                        query={query}
                        matchCount={searchedMyRequests.length}
                        entityLabel={searchedMyRequests.length === 1 ? "submitted form" : "submitted forms"}
                        onClear={() => setQuery("")}
                      />

                      {/* Exact Fernly 12-Column Grid */}
                      <div className="fy-grid">
                        <StatCard
                          area="s1"
                          hero
                          title="Total Forms Filed"
                          value={myRequests.length}
                          badge="Live"
                          note="Synced with Supabase"
                          onOpen={() => {
                            setFormFilter("all");
                            go("forms");
                          }}
                        />
                        <StatCard
                          area="s2"
                          title="Approved & Paid"
                          value={approvedCount}
                          badge={`${approvalPct}%`}
                          note="Signed off by approvers"
                          onOpen={() => {
                            setFormFilter("approved");
                            go("forms");
                          }}
                        />
                        <StatCard
                          area="s3"
                          title="In Review"
                          value={pendingCount}
                          badge={pendingCount > 0 ? "Active" : "Clear"}
                          note="Pending HR / Boss / Acct."
                          onOpen={() => {
                            setFormFilter("pending");
                            go("forms");
                          }}
                        />
                        <StatCard
                          area="s4"
                          title="Leave Days Taken"
                          value={totalLeaveTaken}
                          badge={`${currentYear}`}
                          note="Approved leave days"
                          onOpen={() => go("leave")}
                        />

                        {/* Left 6 cols: Animated Pill Bar Chart */}
                        <FormActivityBarsCard
                          myRequests={myRequests}
                          onOpenNewForm={onOpenNewForm}
                        />

                        {/* Middle 3 cols: HR Memos / Reminders Card */}
                        <FyCard area="re" className="flex flex-col" label="HR Memos">
                          <CardTitle>HR &amp; Admin Memos</CardTitle>
                          {topMemo ? (
                            <>
                              <p className="mt-5 text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--fy-text)]">
                                {topMemo.title}
                              </p>
                              <p className="mb-5 mt-2 line-clamp-3 text-[13.5px] text-muted-foreground">
                                {topMemo.body}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="mt-5 text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--fy-text)]">
                                You&apos;re all caught up
                              </p>
                              <p className="mb-5 mt-2 text-[13.5px] text-muted-foreground">
                                Company advisories from HR, Boss, or Accounting appear here in real
                                time.
                              </p>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => go(topMemo ? "settings" : "calendar")}
                            className="fy-primary fy-focus mt-auto inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14.5px] font-medium"
                          >
                            {topMemo ? (
                              <>
                                <Megaphone className="h-4 w-4" />
                                View All Memos
                              </>
                            ) : (
                              <>
                                <CalendarDays className="h-4 w-4" />
                                Open Form Calendar
                              </>
                            )}
                          </button>
                        </FyCard>

                        {/* Right 3 cols Stack: 6-Form Launcher + Dark Swirl Reimbursements Card */}
                        <div className="fy-side">
                          <FyCard
                            area="pr"
                            className="fy-grow flex flex-col"
                            label="File a Digital Form"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle>Digital Forms</CardTitle>
                              <Chip icon={Plus} onClick={() => onOpenNewForm("leave")}>
                                New
                              </Chip>
                            </div>
                            <ul className="mt-4 grid gap-2">
                              {filteredFormsList.map((f, i) => {
                                const meta = REQUEST_TYPE_META[f.type];
                                return (
                                  <motion.li
                                    key={f.type}
                                    custom={i}
                                    variants={rowV}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => onOpenNewForm(f.type)}
                                      className="fy-focus group flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-muted"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className={`fy-pico fy-pico-${f.pico}`}
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[14.5px] font-medium leading-[1.3]">
                                          <Highlight text={meta.label} q={q} />
                                        </span>
                                        <span className="block truncate text-[11.5px] text-[var(--fy-faint)]">
                                          {meta.formCode} · {f.routeText}
                                        </span>
                                      </span>
                                      <ArrowUpRight className="h-4 w-4 flex-none text-muted-foreground opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                                    </button>
                                  </motion.li>
                                );
                              })}
                            </ul>
                            {filteredFormsList.length === 0 ? (
                              <div className="mt-3 rounded-xl bg-muted p-3 text-center">
                                <p className="text-[12.5px] text-muted-foreground">
                                  No form types match &ldquo;{query.trim()}&rdquo;.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setQuery("")}
                                  className="mt-2 cursor-pointer text-xs font-semibold text-[var(--fy-text)] underline"
                                >
                                  Clear search
                                </button>
                              </div>
                            ) : null}
                          </FyCard>

                          {/* Fernly Iconic Dark Swirl Card — Live Payouts */}
                          <motion.section
                            variants={cardV}
                            style={{ gridArea: "tr" }}
                            aria-label="Reimbursements Paid Out"
                            className="fy-swirl flex min-h-[206px] flex-col rounded-[20px] p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-[18px] font-medium tracking-[-0.02em]">
                                Paid Reimbursements
                              </h2>
                              <Wallet className="h-4 w-4 text-[#e6d8bf]" />
                            </div>
                            <p className="mt-auto pt-3 text-center text-[34px] font-semibold tracking-[-0.03em] xl:text-[38px]">
                              {reimbursedTotal > 0 ? formatPHP(reimbursedTotal) : "₱0"}
                            </p>
                            <p className="mt-1 text-center text-xs text-[#dfd0b6]">
                              {pendingFinanceCount > 0
                                ? `${pendingFinanceCount} finance request${
                                    pendingFinanceCount === 1 ? "" : "s"
                                  } in queue`
                                : "Disbursed by Accounting"}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onOpenNewForm("reimbursement")}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#f5efe4] px-4 text-xs font-semibold text-[#0b1933]"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                File Expense
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onOpenNewForm("cash_advance")}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/14 px-3.5 text-xs font-semibold text-[#f5efe4] backdrop-blur-xs hover:bg-white/24"
                              >
                                Cash Adv.
                              </motion.button>
                            </div>
                          </motion.section>
                        </div>

                        {/* Bottom-Left 5 cols: Recent Digital Submissions */}
                        <FyCard area="tm" label="Recent Submissions">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle>Recent Submissions</CardTitle>
                            <Chip icon={FileText} onClick={() => go("forms")}>
                              View All
                            </Chip>
                          </div>
                          {recentSubmissions.length === 0 ? (
                            <div className="mt-5 rounded-2xl bg-muted p-6 text-center">
                              <p className="text-sm font-medium">
                                {q
                                  ? `No submissions match "${query.trim()}"`
                                  : "No forms submitted yet"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {q
                                  ? "Try another reference number, subject, status, or clear the search filter."
                                  : "Pick any form from the Digital Forms list to submit your first paperless slip."}
                              </p>
                              {q ? (
                                <button
                                  type="button"
                                  onClick={() => setQuery("")}
                                  className="fy-chip mt-3 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold"
                                >
                                  Clear search
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <ul className="mt-4 grid gap-2.5">
                              {recentSubmissions.map((r, i) => (
                                <motion.li key={r.id} custom={i + 2} variants={rowV}>
                                  <button
                                    type="button"
                                    onClick={() => onInspect(r)}
                                    className="fy-focus flex w-full cursor-pointer items-center gap-3.5 rounded-xl p-1.5 text-left transition-colors hover:bg-muted"
                                  >
                                    <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--fy-soft)] text-[var(--fy-text)]">
                                      <RequestTypeIcon
                                        type={r.request_type}
                                        className="h-4 w-4"
                                      />
                                    </span>
                                    <span className="grid min-w-0 flex-1">
                                      <span className="truncate text-[14.5px] font-medium">
                                        <Highlight text={r.title} q={q} />
                                      </span>
                                      <span className="truncate text-[12px] text-[var(--fy-faint)]">
                                        {r.reference_no} ·{" "}
                                        {REQUEST_TYPE_META[r.request_type].shortLabel} ·{" "}
                                        {formatDate(r.created_at)}
                                      </span>
                                    </span>
                                    <span
                                      className={`flex-none rounded-md px-2 py-0.5 text-[11px] font-medium shadow-[inset_0_0_0_1px_currentColor] ${statusPillStyle(
                                        r.status
                                      )}`}
                                    >
                                      {STATUS_META[r.status]?.label ?? r.status}
                                    </span>
                                  </button>
                                </motion.li>
                              ))}
                            </ul>
                          )}
                        </FyCard>

                        {/* Bottom-Middle 4 cols: Semi-Circular Approval Gauge */}
                        <FyCard area="pg" className="flex flex-col" label="Approval Progress">
                          <CardTitle>Approval Progress</CardTitle>
                          <ApprovalGauge
                            total={myRequests.length}
                            approved={approvedCount}
                            pending={pendingCount}
                            other={closedOtherCount}
                          />
                          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-700)]"
                              />
                              Approved
                            </li>
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-strong)]"
                              />
                              In Review
                            </li>
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="fy-sw-hatch h-3.5 w-3.5 rounded-full"
                              />
                              Closed
                            </li>
                          </ul>
                        </FyCard>
                      </div>

                      {/* Full Interactive Shadcn Datatable right below */}
                      <FyCard className="mt-1" label="My Submitted Digital Forms">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle>My Submitted Digital Forms</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Click any row or use Actions to open your official signed form slip,
                              print PDF, or cancel pending forms.
                            </p>
                          </div>
                        </div>
                        <EmployeeFormsDatatable
                          requests={searchedMyRequests}
                          csvFilename="my-mediq-forms.csv"
                          emptyMessage={
                            q
                              ? `No digital forms match "${query.trim()}".`
                              : "You haven't submitted any digital forms yet. Pick a form above to start!"
                          }
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "forms" ? (
                    <>
                      <ViewHead
                        title="My Forms"
                        sub="Track live approval progress, print official PDF slips, or export CSV."
                        id="fy-h-forms"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => onOpenNewForm("leave")}
                        >
                          <Plus className="h-5 w-5" />
                          File Leave
                        </Magnetic>
                        <Magnetic
                          className="fy-ghost"
                          onClick={() => onOpenNewForm("reimbursement")}
                        >
                          <Receipt className="h-4 w-4" />
                          Reimbursement
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={formsViewList.length}
                        entityLabel={formsViewList.length === 1 ? "form" : "forms"}
                        onClear={() => setQuery("")}
                      />

                      <motion.div
                        variants={fileV}
                        className="mb-1 flex flex-wrap items-center justify-between gap-4"
                      >
                        <Seg<FormFilter>
                          id="fy-form-filter"
                          label="Filter submissions"
                          value={formFilter}
                          onChange={setFormFilter}
                          options={[
                            { id: "all", label: "All" },
                            { id: "pending", label: "In Review" },
                            { id: "approved", label: "Approved & Paid" },
                            { id: "closed", label: "Rejected / Cancelled" },
                          ]}
                        />
                        <p className="px-1 text-sm text-muted-foreground">
                          <b className="font-semibold text-foreground">
                            {formsViewList.length}
                          </b>{" "}
                          {formsViewList.length === 1 ? "form" : "forms"} shown
                        </p>
                      </motion.div>

                      <FyCard label="Submitted Digital Forms">
                        <EmployeeFormsDatatable
                          requests={formsViewList}
                          csvFilename="my-mediq-forms.csv"
                          emptyMessage="No forms match the selected filter."
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "calendar" ? (
                    <EmployeeCalendarView
                      q={q}
                      requests={myRequests}
                      today={today}
                      weekStart={weekStart}
                      onInspect={onInspect}
                      onOpenNewForm={onOpenNewForm}
                    />
                  ) : view === "leave" ? (
                    <>
                      <ViewHead
                        title="Leave Summary"
                        sub={`Approved ${currentYear} leave days recorded in Supabase and your leave filing history.`}
                        id="fy-h-leave"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => onOpenNewForm("leave")}
                        >
                          <Plus className="h-5 w-5" />
                          Request Leave
                        </Magnetic>
                      </ViewHead>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                          {
                            label: "Vacation Leave (VL)",
                            days: vlTaken,
                            icon: CalendarCheck2,
                            hero: true,
                          },
                          {
                            label: "Sick Leave (SL)",
                            days: slTaken,
                            icon: HeartPulse,
                            hero: false,
                          },
                          {
                            label: "Emergency Leave (EL)",
                            days: elTaken,
                            icon: ShieldAlert,
                            hero: false,
                          },
                        ].map((tile) => {
                          const Icon = tile.icon;
                          return (
                            <FyCard
                              key={tile.label}
                              lift
                              className={`flex min-h-[146px] flex-col ${
                                tile.hero ? "fy-hero" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h2 className="text-[15.5px] font-medium">{tile.label}</h2>
                                <span
                                  className={`grid h-9 w-9 place-items-center rounded-full ${
                                    tile.hero
                                      ? "bg-white/15 text-white"
                                      : "bg-[var(--fy-soft)] text-[var(--fy-text)]"
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                              </div>
                              <p className="mt-auto flex items-baseline gap-2 pt-3">
                                <span className="text-[44px] font-semibold leading-none tracking-[-0.04em]">
                                  <CountUp value={tile.days} />
                                </span>
                                <span
                                  className={`text-sm ${
                                    tile.hero ? "text-[#e6d8bf]" : "text-muted-foreground"
                                  }`}
                                >
                                  {tile.days === 1 ? "day taken" : "days taken"}
                                </span>
                              </p>
                            </FyCard>
                          );
                        })}
                      </div>

                      <FyCard label="Leave Applications">
                        <EmployeeFormsDatatable
                          requests={searchedLeaveRequests}
                          allowedTypes={["leave"]}
                          csvFilename="my-leave-requests.csv"
                          emptyMessage={
                            q
                              ? `No leave applications match "${query.trim()}".`
                              : "No leave applications filed yet."
                          }
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : (
                    <EmployeeSettingsView
                      profile={profile}
                      announcements={announcements}
                      theme={theme}
                      onTheme={setTheme}
                      accent={accent}
                      onAccent={(hex) => {
                        setAccent(hex);
                        say(
                          `Accent set to ${
                            ACCENTS.find((a) => a.hex === hex)?.label ?? "custom"
                          }`
                        );
                      }}
                      weekStart={weekStart}
                      onWeekStart={(w) => {
                        setWeekStart(w);
                        say(`Calendar week starts on ${w === 1 ? "Monday" : "Sunday"}`);
                      }}
                      onToast={say}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.main>
          </div>
        </div>

        <TabBar
          view={view}
          onGo={go}
          totalForms={myRequests.length}
          onSignOut={() => void signOut()}
        />

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[70] flex justify-center px-4 lg:bottom-6"
        >
          <AnimatePresence>
            {toastMsg ? (
              <motion.p
                key={toastMsg.id}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.25, ease: E_IN } }}
                transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                className="max-w-full rounded-full bg-[var(--fy-950)] px-[18px] py-3 text-sm font-medium text-[#f1f8f3] shadow-[0_16px_40px_-14px_rgb(13_58_35/0.6)]"
              >
                {toastMsg.msg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
