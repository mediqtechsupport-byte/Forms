import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
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
  Check,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChartNoAxesColumn,
  Clock,
  Ellipsis,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  MessageSquare,
  Moon,
  Palette,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  SquareCheckBig,
  Sun,
  UserPlus,
  UserRound,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ types */

type FullView = "analytics" | "team" | "help";
type View = "dashboard" | "tasks" | "calendar" | "settings" | FullView;
type Theme = "light" | "dark";
type Status = "todo" | "progress" | "review" | "done";
type Tag = "Design" | "Backend" | "Frontend" | "QA" | "Marketing";
type Pri = "high" | "med" | "low";
type Kind = "meeting" | "team" | "review" | "deadline" | "social";
type TaskFilter = "all" | "mine" | "high" | "week";
type DialogKind = "project" | "member" | "task";
type Pico = "api" | "flow" | "dash" | "speed" | "qa" | "new";

interface Person {
  id: string;
  name: string;
  tint: string;
}

interface Task {
  id: string;
  title: string;
  tag: Tag;
  pri: Pri;
  status: Status;
  due: number;
  who: string[];
  prog: number;
  notes: number;
}

interface Project {
  id: string;
  name: string;
  due: number;
  pico: Pico;
}

interface Member {
  id: string;
  name: string;
  tint: string;
  task: string;
  state: "done" | "prog" | "pend";
}

interface CalEvent {
  d: number;
  from: string;
  to: string;
  title: string;
  kind: Kind;
  who: string[];
}

interface Notice {
  id: string;
  who: string;
  verb: string;
  what: string;
  tail: string;
  ago: string;
  unread: boolean;
  view: View;
}

export interface FernlyDashboardProps {
  /** Starting accent. Every other shade is mixed from it; Settings > Appearance can change it live. */
  accent?: string;
  /** Workspace name in the sidebar and in the signed-in email. */
  workspaceName?: string;
  /** Signed-in user, shown in the top bar and as the owner of "My tasks". */
  userName?: string;
  /** Starting theme. Settings and the top-bar toggle own it after that; a later change from the parent still applies. */
  theme?: Theme;
  className?: string;
}

/* ------------------------------------------------------------------- data */

const ME = "tm";

const PEOPLE: Person[] = [
  { id: "tm", name: "Noah Castell", tint: "#f4c9b4" },
  { id: "ad", name: "Priya Raman", tint: "#f6c6c2" },
  { id: "ea", name: "Mateo Silva", tint: "#cdeccf" },
  { id: "io", name: "Hana Kobayashi", tint: "#cfd6f7" },
  { id: "do", name: "Owen Mercer", tint: "#f5dfb5" },
  { id: "ss", name: "Sofia Sato", tint: "#e5d3f5" },
  { id: "mk", name: "Maya Kovac", tint: "#c9ebf0" },
  { id: "lr", name: "Liam Reyes", tint: "#fde2c4" },
  { id: "nb", name: "Nadia Bello", tint: "#d8eccb" },
];

const SEED_TASKS: Task[] = [
  { id: "t1", title: "Design login & sign-up screens", tag: "Design", pri: "high", status: "progress", due: 2, who: ["ad", "mk"], prog: 0.6, notes: 4 },
  { id: "t2", title: "Passkey sign-in", tag: "Backend", pri: "high", status: "progress", due: 3, who: ["ea", "tm"], prog: 0.45, notes: 7 },
  { id: "t3", title: "Saved filters for projects", tag: "Frontend", pri: "med", status: "todo", due: 6, who: ["io"], prog: 0, notes: 2 },
  { id: "t4", title: "Marketing site refresh", tag: "Frontend", pri: "med", status: "progress", due: 4, who: ["do", "io"], prog: 0.7, notes: 3 },
  { id: "t5", title: "Write API endpoint docs", tag: "Backend", pri: "low", status: "todo", due: 9, who: ["ea"], prog: 0, notes: 1 },
  { id: "t6", title: "Safari & Firefox regression pass", tag: "QA", pri: "med", status: "review", due: 1, who: ["ss"], prog: 0.9, notes: 5 },
  { id: "t7", title: "Onboarding email sequence", tag: "Marketing", pri: "low", status: "todo", due: 12, who: ["lr", "nb"], prog: 0, notes: 0 },
  { id: "t8", title: "Monorepo cleanup", tag: "Backend", pri: "low", status: "done", due: -2, who: ["ad"], prog: 1, notes: 2 },
  { id: "t9", title: "Brand illustration set", tag: "Design", pri: "med", status: "review", due: 2, who: ["mk", "tm"], prog: 0.85, notes: 6 },
  { id: "t10", title: "Cut LCP under 2 seconds", tag: "Frontend", pri: "high", status: "todo", due: 5, who: ["do"], prog: 0, notes: 3 },
  { id: "t11", title: "Q4 launch announcement", tag: "Marketing", pri: "med", status: "progress", due: 8, who: ["nb"], prog: 0.3, notes: 1 },
  { id: "t12", title: "Dashboard analytics widgets", tag: "Frontend", pri: "high", status: "done", due: -1, who: ["io", "ad"], prog: 1, notes: 9 },
  { id: "t13", title: "Kickoff with Halcyon Labs", tag: "Marketing", pri: "med", status: "done", due: -3, who: ["tm", "lr"], prog: 1, notes: 4 },
];

const SEED_PROJECTS: Project[] = [
  { id: "p1", name: "Payments API v2", due: 8, pico: "api" },
  { id: "p2", name: "Mobile Onboarding", due: 12, pico: "flow" },
  { id: "p3", name: "Design System Audit", due: 15, pico: "dash" },
  { id: "p4", name: "Search Revamp", due: 20, pico: "speed" },
  { id: "p5", name: "Q4 Launch Site", due: 22, pico: "qa" },
];

const SEED_TEAM: Member[] = [
  { id: "m1", name: "Priya Raman", tint: "#f6c6c2", task: "Design System Tokens", state: "done" },
  { id: "m2", name: "Mateo Silva", tint: "#cdeccf", task: "Passkey Sign-in", state: "prog" },
  { id: "m3", name: "Hana Kobayashi", tint: "#cfd6f7", task: "Saved Filters for Projects", state: "pend" },
  { id: "m4", name: "Owen Mercer", tint: "#f5dfb5", task: "Marketing Site Refresh", state: "prog" },
];

const EVENTS: CalEvent[] = [
  { d: 0, from: "10:00", to: "10:30", title: "Daily stand-up", kind: "team", who: ["ea", "io", "do"] },
  { d: 0, from: "14:00", to: "16:00", title: "Check-in with Halcyon Labs", kind: "meeting", who: ["tm", "lr"] },
  { d: 1, from: "11:00", to: "12:00", title: "Design review: auth flow", kind: "review", who: ["ad", "mk", "tm"] },
  { d: 1, from: "17:00", to: "17:30", title: "Regression sign-off", kind: "deadline", who: ["ss"] },
  { d: 2, from: "09:30", to: "10:30", title: "Sprint planning", kind: "team", who: ["tm", "ea", "do", "io"] },
  { d: 3, from: "15:00", to: "16:00", title: "Passkey demo", kind: "review", who: ["ea", "tm"] },
  { d: 5, from: "13:00", to: "14:00", title: "Lunch & learn: Web Vitals", kind: "social", who: ["do", "io", "ss"] },
  { d: 6, from: "10:00", to: "11:00", title: "Search feature handoff", kind: "review", who: ["io", "ad"] },
  { d: 8, from: "16:00", to: "17:00", title: "Launch announcement due", kind: "deadline", who: ["nb", "lr"] },
  { d: 9, from: "11:00", to: "12:00", title: "Investor update", kind: "meeting", who: ["tm"] },
  { d: 12, from: "14:00", to: "15:00", title: "Retro + team lunch", kind: "social", who: ["tm", "ad", "ea", "io", "do"] },
  { d: -2, from: "10:00", to: "11:00", title: "Monorepo cleanup review", kind: "review", who: ["ad", "ea"] },
  { d: -3, from: "15:00", to: "16:00", title: "Halcyon Labs kickoff", kind: "meeting", who: ["tm", "lr"] },
  { d: -6, from: "09:00", to: "17:00", title: "Design sprint", kind: "team", who: ["ad", "mk"] },
  { d: 15, from: "10:00", to: "12:00", title: "Quarterly planning", kind: "meeting", who: ["tm", "lr", "ea"] },
  { d: 19, from: "12:00", to: "13:00", title: "Regression pass due", kind: "deadline", who: ["ss"] },
];

const NOTICES: Notice[] = [
  { id: "n1", who: "ea", verb: "moved", what: "Passkey sign-in", tail: "to In progress", ago: "5m", unread: true, view: "tasks" },
  { id: "n2", who: "ss", verb: "commented on", what: "Safari & Firefox regression pass", tail: "", ago: "32m", unread: true, view: "tasks" },
  { id: "n3", who: "ad", verb: "booked", what: "Design review: auth flow", tail: "for tomorrow", ago: "1h", unread: true, view: "calendar" },
];

const STATUSES: { id: Status; label: string; dot: string }[] = [
  { id: "todo", label: "To do", dot: "var(--fy-hatch)" },
  { id: "progress", label: "In progress", dot: "#e8a317" },
  { id: "review", label: "In review", dot: "#3b5bdb" },
  { id: "done", label: "Done", dot: "var(--fy-600)" },
];

const KINDS: Record<Kind, string> = { meeting: "Meeting", team: "Team", review: "Review", deadline: "Deadline", social: "Social" };
const PRI_LABEL: Record<Pri, string> = { high: "High", med: "Medium", low: "Low" };
const TAGS: Tag[] = ["Design", "Backend", "Frontend", "QA", "Marketing"];
const TINTS = ["#f6c6c2", "#cdeccf", "#cfd6f7", "#f5dfb5", "#e5d3f5", "#c9ebf0"];

const BARS: { d: string; full: string; v: number; kind: "plan" | "mid" | "light" | "dark" }[] = [
  { d: "S", full: "Sunday", v: 60, kind: "plan" },
  { d: "M", full: "Monday", v: 86, kind: "mid" },
  { d: "T", full: "Tuesday", v: 74, kind: "light" },
  { d: "W", full: "Wednesday", v: 96, kind: "dark" },
  { d: "T", full: "Thursday", v: 95, kind: "plan" },
  { d: "F", full: "Friday", v: 70, kind: "plan" },
  { d: "S", full: "Saturday", v: 85, kind: "plan" },
];

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  full?: boolean;
}

const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "menu",
    label: "Menu",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "tasks", label: "Tasks", icon: SquareCheckBig },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "analytics", label: "Analytics", icon: ChartNoAxesColumn, full: true },
      { id: "team", label: "Team", icon: Users, full: true },
    ],
  },
  {
    id: "general",
    label: "General",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "help", label: "Help", icon: LifeBuoy, full: true },
    ],
  },
];
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const FULL: Record<FullView, { title: string; sub: string; points: string[] }> = {
  analytics: {
    title: "Analytics",
    sub: "How the team is shipping, and where the time goes.",
    points: [
      "KPI cards with sparklines: tasks completed, hours tracked, on-time delivery, average cycle time",
      "Throughput chart against the previous period, with a 7D, 30D and 90D range",
      "Time-by-project donut and a 20-week activity heatmap",
      "Top contributors list and CSV export",
    ],
  },
  team: {
    title: "Team",
    sub: "Everyone on the workspace, what they're carrying and who's around.",
    points: [
      "A card per teammate with role, department, status and a workload meter",
      "Department filters and a live count of who is online",
      "Profile side panel with location, open tasks and assigned work",
      "Invite member dialog",
    ],
  },
  help: {
    title: "Help center",
    sub: "Answers, shortcuts, and a human when you need one.",
    points: [
      "Topic filters that narrow a searchable FAQ accordion",
      "Keyboard shortcuts reference for search and navigation",
      "A contact card for chat and email support",
    ],
  },
};

/* ----------------------------------------------------------------- helpers */

const E_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_P4: [number, number, number, number] = [0.16, 1, 0.3, 1];
const E_IN: [number, number, number, number] = [0.4, 0, 1, 1];
const E_INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

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
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseIso = (k: string) => new Date(`${k}T12:00:00`);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const fmtLong = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const fmtDow = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const fmtDowShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const fmtDayLong = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const fmtMon = new Intl.DateTimeFormat("en-US", { month: "short" });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
const hms = (s: number) => [s / 3600, (s % 3600) / 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":");
const ms = (s: number) => [s / 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":");
const ampm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "") || "fernly";

function dueLabel(t: Task, today: Date) {
  const n = t.due;
  if (t.status === "done") return { text: fmtShort.format(dayOffset(today, n)), late: false };
  if (n < 0) return { text: `${-n}d late`, late: true };
  if (n === 0) return { text: "Today", late: true };
  if (n === 1) return { text: "Tomorrow", late: false };
  return { text: `In ${n} days`, late: false };
}

function moveTask(list: Task[], id: string, status: Status, before: string | null) {
  const t = list.find((x) => x.id === id);
  if (!t) return list;
  const rest = list.filter((x) => x.id !== id);
  const moved = { ...t, status };
  const at = before ? rest.findIndex((x) => x.id === before) : -1;
  if (at < 0) return [...rest, moved];
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

/* ------------------------------------------------------------------ styles */

const STYLE = `
.fy-root{
  --fy-950:color-mix(in srgb,var(--fy-a) 46%,#000);--fy-800:color-mix(in srgb,var(--fy-a) 76%,#000);
  --fy-700:var(--fy-a);--fy-600:color-mix(in oklab,var(--fy-a) 86%,#fff);
  --fy-400:color-mix(in oklab,var(--fy-a) 60%,#fff);--fy-100:color-mix(in oklab,var(--fy-a) 13%,#fff);
  --background:#e9ebe9;--muted:#f5f6f5;--card:#fdfdfc;--card-foreground:#131a15;--foreground:#131a15;
  --muted-foreground:#646d67;--border:#e3e7e4;--ring:var(--fy-600);
  --fy-faint:#6c756f;--fy-hatch:#8d9a92;--fy-text:var(--fy-800);--fy-mark:var(--fy-700);--fy-strong:var(--fy-950);
  --fy-line:var(--fy-950);--fy-soft:var(--fy-100);--fy-mark-bg:#cdeedb;
  --fy-amber:#b06d0a;--fy-amber-bg:#fdf3e2;--fy-rose:#c23b3b;--fy-rose-bg:#fdeceb;
  --fy-shadow:0 1px 2px rgb(19 26 21/.04),0 8px 24px -12px rgb(19 26 21/.10);
  --fy-pop:0 0 0 1px var(--border),0 24px 60px -20px rgb(19 26 21/.35);
  --fy-deep:color-mix(in srgb,var(--fy-950) 55%,#000);--fy-swirl:color-mix(in srgb,var(--fy-400) 22%,transparent);
  font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:15px;line-height:1.45;color:var(--foreground);background:var(--background);
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;color-scheme:light;
}
.fy-root.fy-dark{
  --background:#0a0e0b;--muted:#111712;--card:#172019;--card-foreground:#e7eee9;--foreground:#e7eee9;
  --muted-foreground:#9ba69f;--border:#243029;--fy-faint:#8d9891;--fy-hatch:#5f6d65;
  --fy-text:var(--fy-400);--fy-mark:var(--fy-400);--fy-strong:color-mix(in oklab,var(--fy-400) 38%,#eef4f0);
  --fy-line:color-mix(in oklab,var(--fy-400) 60%,transparent);--fy-soft:color-mix(in oklab,var(--fy-a) 24%,#172019);
  --fy-mark-bg:color-mix(in oklab,var(--fy-a) 45%,transparent);
  --fy-amber:#f0b45a;--fy-amber-bg:rgb(240 180 90/.12);--fy-rose:#f39191;--fy-rose-bg:rgb(243 145 145/.12);
  --fy-shadow:0 1px 2px rgb(0 0 0/.3),0 14px 30px -16px rgb(0 0 0/.7);
  --fy-pop:0 0 0 1px var(--border),0 24px 60px -20px rgb(0 0 0/.8);color-scheme:dark;
}
.fy-root *,.fy-root *::before,.fy-root *::after{box-sizing:border-box}
.fy-focus:focus-visible{outline:none;box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--fy-600)}
.fy-focus-in:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--fy-600)}
.fy-scroll{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--fy-hatch) 55%,transparent) transparent}
.fy-noscroll{scrollbar-width:none}.fy-noscroll::-webkit-scrollbar{display:none}
.fy-primary{color:#f2f8f4;background:linear-gradient(180deg,var(--fy-700),var(--fy-950))}
.fy-primary:hover{background:linear-gradient(180deg,var(--fy-600),var(--fy-800))}
.fy-ghost{color:var(--foreground);background:var(--card);box-shadow:inset 0 0 0 1.5px var(--fy-line)}
.fy-ghost:hover{background:var(--fy-soft)}
.fy-chip{box-shadow:inset 0 0 0 1.5px var(--fy-line)}.fy-chip:hover{background:var(--fy-soft)}
.fy-hero{color:#f1f8f3;background:linear-gradient(135deg,var(--fy-800) 0%,var(--fy-950) 100%);box-shadow:0 14px 30px -16px color-mix(in srgb,var(--fy-950) 70%,transparent)}
.fy-hero::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(90% 80% at 100% 100%,color-mix(in srgb,var(--fy-400) 28%,transparent),transparent 60%)}
.fy-swirl{position:relative;isolation:isolate;overflow:hidden;color:#eef6f1;background:var(--fy-deep)}
.fy-swirl::before{content:"";position:absolute;inset:-40%;z-index:-1;background:
  repeating-radial-gradient(circle at 78% 70%,transparent 0 14px,var(--fy-swirl) 15px 16px),
  radial-gradient(70% 60% at 85% 85%,var(--fy-700),transparent 70%),
  radial-gradient(60% 50% at 10% 0%,var(--fy-950),transparent 70%)}
.fy-hatch{background:repeating-linear-gradient(-45deg,var(--fy-hatch) 0 2.4px,transparent 2.4px 8px);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--fy-hatch) 35%,transparent)}
.fy-sw-hatch{background:repeating-linear-gradient(-45deg,var(--fy-hatch) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fy-hatch) 40%,transparent)}
.fy-stem::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:10px;transform:translateX(-50%);background:var(--fy-hatch)}
.fy-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));
  grid-template-areas:"s1 s2" "s3 s4" "an an" "re re" "pr pr" "tm tm" "pg pg" "tr tr"}
.fy-side{display:contents}
@media (min-width:768px){.fy-grid{gap:16px;grid-template-areas:"s1 s2" "s3 s4" "an an" "re pr" "tm tm" "pg tr"}}
@media (min-width:1280px){
  .fy-grid{grid-template-columns:repeat(12,minmax(0,1fr));grid-template-areas:
    "s1 s1 s1 s2 s2 s2 s3 s3 s3 s4 s4 s4" "an an an an an an re re re sd sd sd" "tm tm tm tm tm pg pg pg pg sd sd sd"}
  .fy-grid{flex:1}
  .fy-side{display:flex;flex-direction:column;gap:16px;grid-area:sd;min-width:0}
  .fy-side>.fy-grow{flex:1}
}
.fy-kanban{display:grid;gap:14px;grid-template-columns:repeat(4,84%);align-items:start;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
.fy-kanban>*{scroll-snap-align:start}
@media (min-width:768px){.fy-kanban{gap:16px;grid-template-columns:repeat(4,minmax(204px,1fr))}}
.fy-cal{display:grid;gap:12px;grid-template-columns:minmax(0,1fr);grid-template-areas:"month" "agenda" "next"}
@media (min-width:768px){.fy-cal{gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"month month" "agenda next"}}
@media (min-width:1280px){.fy-cal{grid-template-columns:minmax(0,2fr) minmax(280px,1fr);grid-template-rows:auto 1fr;grid-template-areas:"month agenda" "month next";flex:1}}
.fy-pico{position:relative;flex:none;width:28px;height:28px;border-radius:8px}
.fy-pico-api{border-radius:4px;background:repeating-linear-gradient(-60deg,transparent 0 4px,#3b5bdb 4px 7px,transparent 7px 9px)}
.fy-pico-flow{border-radius:50%;background:conic-gradient(#1f9e8f 0 33%,#0b5f6b 0 66%,#6bd1c2 0)}
.fy-pico-dash{background:linear-gradient(#f08c3c,#f08c3c) 50% 0/6px 11px no-repeat,linear-gradient(#4ab6e8,#4ab6e8) 50% 100%/6px 11px no-repeat,linear-gradient(#e64980,#e64980) 0 50%/11px 6px no-repeat,linear-gradient(#40c057,#40c057) 100% 50%/11px 6px no-repeat}
.fy-pico-speed{border-radius:50%;background:conic-gradient(from 200deg,#f59f00 0 50%,#fd7e14 0 75%,transparent 0)}
.fy-pico-qa{background:radial-gradient(circle at 50% 30%,#e8590c 0 6px,transparent 6.5px),radial-gradient(circle at 28% 70%,#6741d9 0 6px,transparent 6.5px),radial-gradient(circle at 72% 70%,#364fc7 0 6px,transparent 6.5px)}
.fy-pico-new{border-radius:50%;background:radial-gradient(circle,var(--fy-400) 0 5px,transparent 5.5px),var(--fy-soft)}
.fy-tag-design{color:#a6457a;background:#fbe9f2}.fy-tag-backend{color:#2f55c9;background:#e8eefd}
.fy-tag-frontend{color:var(--fy-text);background:var(--fy-soft)}.fy-tag-qa{color:#7a4bc9;background:#f0e9fc}
.fy-tag-marketing{color:#a5620a;background:#fdf3e2}
.fy-dark .fy-tag-design{color:#f39cc8;background:rgb(243 156 200/.13)}.fy-dark .fy-tag-backend{color:#9db3ff;background:rgb(157 179 255/.13)}
.fy-dark .fy-tag-qa{color:#c7a9ff;background:rgb(199 169 255/.13)}.fy-dark .fy-tag-marketing{color:#f0b45a;background:rgb(240 180 90/.13)}
.fy-k-meeting{--c:var(--fy-600)}.fy-k-team{--c:#3b5bdb}.fy-k-review{--c:#b06d0a}.fy-k-deadline{--c:#c23b3b}.fy-k-social{--c:#7a4bc9}
.fy-dark .fy-k-meeting{--c:var(--fy-400)}.fy-dark .fy-k-team{--c:#9db3ff}.fy-dark .fy-k-review{--c:#f0b45a}.fy-dark .fy-k-deadline{--c:#f39191}.fy-dark .fy-k-social{--c:#c7a9ff}
.fy-evt{color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent)}
.fy-agenda{box-shadow:inset 4px 0 0 var(--c)}
.fy-root mark{background:var(--fy-mark-bg);color:inherit;border-radius:3px}
.fy-root input[type=date]::-webkit-calendar-picker-indicator{opacity:.6;cursor:pointer}
.fy-locked{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}
@media (min-width:768px){.fy-locked{gap:16px}}
@media (min-width:1280px){.fy-locked{grid-template-columns:minmax(300px,1fr) minmax(0,2fr);flex:1}}
.fy-set{display:grid;gap:12px;grid-template-columns:minmax(0,1fr);align-items:start}
@media (min-width:768px){.fy-set{gap:16px;grid-template-columns:220px minmax(0,1fr)}}
@media (min-width:1280px){.fy-set{grid-template-columns:260px minmax(0,1fr);max-width:1080px}}
.fy-heat{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,minmax(0,1fr));grid-template-columns:repeat(20,minmax(0,1fr));gap:3px}
@media (prefers-reduced-motion:reduce){.fy-root *,.fy-root *::before,.fy-root *::after{transition-duration:.01ms!important;animation:none!important}}
`;

/* ---------------------------------------------------------------- variants */

const viewV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
  exit: { opacity: 0, y: 14, transition: { duration: 0.22, ease: E_IN } },
};
const cardV: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.85, ease: E_OUT } },
};
const fileV: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: E_OUT } },
};
const rowV: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.55, ease: E_OUT, delay: 0.55 + i * 0.045 } }),
};

/* ------------------------------------------------------------------ atoms */

function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="25" height="25" rx="8.5" />
      <path d="M16 23.5v-9" />
      <path d="M16 16c0-4.2 2.9-6.9 7-6.9 0 4.2-2.9 6.9-7 6.9Z" />
      <path d="M16 19c0-3.3-2.3-5.4-5.6-5.4 0 3.3 2.3 5.4 5.6 5.4Z" />
    </svg>
  );
}

function Avatar({ name, tint, size = 44, ring }: { name: string; tint: string; size?: number; ring?: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center rounded-full font-semibold tracking-[0.02em] text-[rgb(19_26_21/0.78)]"
      style={{ width: size, height: size, background: tint, fontSize: Math.round(size * 0.31), boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      {initials(name)}
    </span>
  );
}

function Stack({ ids, people, ring = "var(--card)", size = 30 }: { ids: string[]; people: Person[]; ring?: string; size?: number }) {
  return (
    <span className="flex">
      {ids.map((id, i) => {
        const p = people.find((x) => x.id === id);
        if (!p) return null;
        return (
          <span key={id} className={i ? "-ml-[5px]" : ""}>
            <Avatar name={p.name} tint={p.tint} size={size} ring={ring} />
          </span>
        );
      })}
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

function Magnetic({ children, className = "", onClick, label }: { children: ReactNode; className?: string; onClick: () => void; label?: string }) {
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
      className={`fy-focus inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-[15px] font-medium transition-[background-color,box-shadow,color] duration-200 ${className}`}
    >
      {children}
    </motion.button>
  );
}

function RiseTitle({ text, id }: { text: string; id: string }) {
  const words = text.split(" ");
  let n = 0;
  return (
    <h1 id={id} aria-label={text} className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[34px] xl:text-[38px]">
      {words.map((w, wi) => (
        <span key={wi}>
          {wi > 0 ? " " : null}
          <span aria-hidden="true" className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-top">
            {[...w].map((c, ci) => {
              const i = n++;
              return (
                <motion.span key={ci} className="inline-block" initial={{ y: "115%" }} animate={{ y: "0%" }} transition={{ duration: 0.85, ease: E_P4, delay: 0.05 + i * 0.024 }}>
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

function ViewHead({ title, sub, id, children }: { title: string; sub: string; id: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1 sm:mb-6 sm:px-0">
      <div>
        <RiseTitle text={title} id={id} />
        <motion.p variants={fileV} className="mt-1.5 text-muted-foreground">
          {sub}
        </motion.p>
      </div>
      {children ? (
        <motion.div variants={fileV} className="flex w-full flex-wrap gap-3 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

function useCountUp(to: number, { duration = 1.4, delay = 0.4 }: { duration?: number; delay?: number } = {}) {
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

function Card({ children, className = "", area, label, lift, as = "section" }: { children: ReactNode; className?: string; area?: string; label?: string; lift?: boolean; as?: "section" | "article" }) {
  const Comp = as === "article" ? motion.article : motion.section;
  return (
    <Comp
      variants={cardV}
      aria-label={label}
      whileHover={lift ? { y: -4, transition: { duration: 0.45, ease: E_OUT } } : undefined}
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

function Chip({ children, onClick, icon: Icon }: { children: ReactNode; onClick: () => void; icon: LucideIcon }) {
  return (
    <button type="button" onClick={onClick} className="fy-chip fy-focus inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors">
      <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
      {children}
    </button>
  );
}

function Seg<T extends string>({ options, value, onChange, label, id }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; id: string }) {
  return (
    <div role="group" aria-label={label} className="fy-noscroll relative inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-card p-[5px] shadow-[var(--fy-shadow)]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`fy-focus-in relative h-10 flex-none whitespace-nowrap rounded-full px-[18px] text-sm font-medium transition-colors duration-200 ${on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"}`}
          >
            {on ? <motion.span layoutId={`${id}-pill`} className="fy-primary absolute inset-0 rounded-full" transition={{ type: "spring", bounce: 0, duration: 0.45 }} /> : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- dashboard view */

interface Stats {
  total: number;
  ended: number;
  running: number;
  pending: number;
}

function StatCard({ title, value, note, trend, hero, area, onOpen }: { title: string; value: number; note: string; trend?: number; hero?: boolean; area: string; onOpen: () => void }) {
  return (
    <Card as="article" area={area} lift className={`flex min-h-[150px] flex-col xl:min-h-[164px] ${hero ? "fy-hero" : ""}`}>
      <div className="flex items-start justify-between gap-2.5">
        <h2 className="text-[14.5px] font-medium tracking-[-0.015em] sm:text-[16.5px]">{title}</h2>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open tasks from ${title}`}
          className={`fy-focus grid h-[30px] w-[30px] flex-none place-items-center rounded-full transition-[transform,background-color,color] duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] hover:rotate-45 sm:h-[38px] sm:w-[38px] ${
            hero ? "bg-[#f1f8f3] text-[var(--fy-950)] hover:bg-[var(--fy-400)]" : "shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-foreground hover:text-card"
          }`}
        >
          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
      <p className="mb-2 mt-auto pt-3 text-[40px] font-semibold leading-none tracking-[-0.04em] sm:text-[48px]">
        <CountUp value={value} />
      </p>
      <p className={`flex items-center gap-2 text-[11.5px] sm:text-[13px] ${hero ? "text-[#b9e6cb]" : trend === undefined ? "text-[var(--fy-text)]" : "text-muted-foreground"}`}>
        {trend !== undefined ? (
          <span className="inline-flex items-center gap-px rounded-[5px] px-1 text-[10.5px] leading-4 shadow-[inset_0_0_0_1px_currentColor]">
            {trend}
            <ChevronUp className="h-2.5 w-2.5" strokeWidth={2.6} />
          </span>
        ) : null}
        {note}
      </p>
    </Card>
  );
}

function BarsCard() {
  const cardRef = useRef<HTMLElement | null>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [sel, setSel] = useState(2);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const id = useId();

  useLayoutEffect(() => {
    const place = () => {
      const c = cardRef.current;
      const b = barRefs.current[sel];
      const t = tipRef.current;
      if (!c || !b || !t) return;
      const cr = c.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      setPos({ x: br.left + br.width / 2 - cr.left - t.offsetWidth / 2, y: br.top - cr.top - t.offsetHeight - 12 });
    };
    place();
    const c = cardRef.current;
    if (!c) return;
    const ro = new ResizeObserver(place);
    ro.observe(c);
    return () => ro.disconnect();
  }, [sel, ready]);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 950);
    return () => window.clearTimeout(t);
  }, []);

  const b = BARS[sel];
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
      <CardTitle id={`${id}-h`}>Project Analytics</CardTitle>
      <p className="sr-only">Daily goal completion this week. Hatched bars are planned days with nothing logged yet.</p>
      <ol className="mt-5 grid min-h-[170px] flex-1 grid-cols-7 gap-2 sm:gap-3 xl:min-h-[150px]">
        {BARS.map((bar, i) => (
          <li key={bar.full} className="grid min-w-0 grid-rows-[1fr_auto] gap-2.5">
            <button
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              type="button"
              aria-label={`${bar.full}, ${bar.kind === "plan" ? "planned" : "complete"} ${bar.v}%`}
              aria-pressed={sel === i}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => setSel(i)}
              style={{ height: `${bar.v}%` }}
              className="fy-focus relative min-h-10 w-full self-end overflow-hidden rounded-full [-webkit-tap-highlight-color:transparent]"
            >
              <motion.span
                initial={{ y: "101%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1, ease: E_P4, delay: 0.55 + i * 0.07 }}
                className={`absolute inset-0 rounded-[inherit] transition-[filter] hover:brightness-110 ${
                  bar.kind === "plan" ? "fy-hatch" : bar.kind === "mid" ? "bg-[var(--fy-700)]" : bar.kind === "light" ? "bg-[var(--fy-400)]" : "bg-[var(--fy-strong)]"
                }`}
              />
            </button>
            <span aria-hidden="true" className={`text-center text-sm ${sel === i ? "font-semibold text-foreground" : "text-[var(--fy-faint)]"}`}>
              {bar.d}
            </span>
          </li>
        ))}
      </ol>
      <motion.div
        ref={tipRef}
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ x: pos.x, y: pos.y, opacity: ready ? 1 : 0, scale: ready ? 1 : 0.8 }}
        transition={{ x: { duration: 0.45, ease: E_OUT }, y: { duration: 0.45, ease: E_OUT }, opacity: { duration: 0.3 }, scale: { type: "spring", bounce: 0, duration: 0.45 } }}
        className="fy-stem pointer-events-none absolute left-0 top-0 z-[2] whitespace-nowrap rounded-[7px] bg-card px-2 py-[3px] text-[11px] font-semibold shadow-[0_0_0_1px_var(--border),0_6px_16px_-8px_rgb(19_26_21/0.35)]"
      >
        {b.kind === "plan" ? "Plan " : ""}
        {b.v}%
      </motion.div>
    </motion.section>
  );
}

function Digit({ d }: { d: number }) {
  return (
    <span className="inline-block h-[1.15em] overflow-hidden leading-[1.15]">
      <motion.span className="grid" initial={{ y: "0%" }} animate={{ y: `${-d * 10}%` }} transition={{ duration: 0.55, ease: E_OUT }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-[1.15em]">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Gauge({ stats }: { stats: Stats }) {
  const raw = useId();
  const pid = `fy-hatch-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const share = (k: "ended" | "running" | "pending") => (stats.total ? (stats[k] / stats.total) * 100 : 0);
  const pct = useCountUp(Math.round(share("ended")), { duration: 1.3, delay: 0.5 });
  let at = 0;
  const segs = (["ended", "running", "pending"] as const).map((k) => {
    const len = share(k);
    const s = { k, len, off: -at };
    at += len;
    return s;
  });
  const stroke = { ended: "var(--fy-700)", running: "var(--fy-strong)", pending: `url(#${pid})` };
  const D = "M32 120a98 98 0 0 1 196 0";
  return (
    <div className="relative mx-auto mt-3 grid w-full max-w-[290px] flex-1 place-items-end">
      <svg viewBox="0 0 260 142" className="h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <pattern id={pid} patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" style={{ fill: "var(--card)" }} />
            <path d="M-2 2l4-4M0 8l8-8M6 10l4-4" style={{ stroke: "var(--fy-hatch)", strokeWidth: 2 }} />
          </pattern>
        </defs>
        <path d={D} pathLength={100} fill="none" strokeWidth={44} strokeLinecap="round" style={{ stroke: "var(--muted)" }} />
        {[...segs].reverse().map((s, i) => (
          <motion.path
            key={s.k}
            d={D}
            pathLength={100}
            fill="none"
            strokeWidth={44}
            strokeLinecap="round"
            style={{ stroke: stroke[s.k] }}
            initial={{ strokeDasharray: "0 100", strokeDashoffset: 0, opacity: 0 }}
            animate={{ strokeDasharray: `${s.len} 100`, strokeDashoffset: s.off, opacity: s.len < 0.5 ? 0 : 1 }}
            transition={{ duration: 1.3, ease: E_INOUT, delay: 0.45 + (2 - i) * 0.08 }}
          />
        ))}
      </svg>
      <p className="absolute inset-x-0 bottom-0 grid justify-items-center">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.05em] xl:text-[48px]">{Math.round(pct)}%</span>
        <span className="mt-1 text-[13px] text-muted-foreground">Project Ended</span>
      </p>
    </div>
  );
}

interface DashProps {
  q: string;
  stats: Stats;
  projects: Project[];
  team: Member[];
  today: Date;
  elapsed: number;
  running: boolean;
  meetingFor: number | null;
  onTracker: (a: "toggle" | "stop") => void;
  onMeeting: () => void;
  onDialog: (k: DialogKind) => void;
  onGo: (v: View) => void;
}

function DashboardView({ q, stats, projects, team, today, elapsed, running, meetingFor, onTracker, onMeeting, onDialog, onGo }: DashProps) {
  const reduce = useReducedMotion();
  const plist = projects.filter((p) => !q || p.name.toLowerCase().includes(q));
  const tlist = team.filter((m) => !q || `${m.name} ${m.task}`.toLowerCase().includes(q));
  const digits = hms(elapsed).replace(/:/g, "").split("").map(Number);
  const pillCls = { done: "text-[var(--fy-text)] bg-[var(--fy-soft)]", prog: "text-[var(--fy-amber)] bg-[var(--fy-amber-bg)]", pend: "text-[var(--fy-rose)] bg-[var(--fy-rose-bg)]" };
  const pillTxt = { done: "Completed", prog: "In Progress", pend: "Pending" };
  return (
    <>
      <ViewHead title="Dashboard" sub="Everything your team is shipping, in one calm place." id="fy-h-dashboard">
        <Magnetic className="fy-primary" onClick={() => onDialog("project")}>
          <Plus className="h-5 w-5" />
          Add Project
        </Magnetic>
        <Magnetic className="fy-ghost" onClick={() => onDialog("member")}>
          <UserPlus className="h-5 w-5" />
          Add Member
        </Magnetic>
      </ViewHead>

      <div className="fy-grid">
        <StatCard area="s1" hero title="Total Projects" value={stats.total} trend={5} note="Increased from last month" onOpen={() => onGo("tasks")} />
        <StatCard area="s2" title="Ended Projects" value={stats.ended} trend={6} note="Increased from last month" onOpen={() => onGo("tasks")} />
        <StatCard area="s3" title="Running Projects" value={stats.running} trend={2} note="Increased from last month" onOpen={() => onGo("tasks")} />
        <StatCard area="s4" title="Pending Projects" value={stats.pending} note="Awaiting review" onOpen={() => onGo("tasks")} />

        <BarsCard />

        <Card area="re" className="flex flex-col" label="Reminders">
          <CardTitle>Reminders</CardTitle>
          <p className="mt-5 text-[21px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--fy-text)] xl:text-[22px]">Check-in with Halcyon Labs</p>
          <p className="mb-5 mt-2 text-[14px] text-muted-foreground">
            Time : <time dateTime="14:00">02.00 pm</time> - <time dateTime="16:00">04.00 pm</time>
          </p>
          <button
            type="button"
            aria-pressed={meetingFor !== null}
            onClick={onMeeting}
            className={`fy-focus mt-auto inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-medium text-[#f2f8f4] ${
              meetingFor !== null ? "bg-[linear-gradient(180deg,#d24b4b,#9f2525)]" : "fy-primary"
            }`}
          >
            {meetingFor !== null ? (
              <motion.span
                aria-hidden="true"
                className="h-[9px] w-[9px] rounded-full bg-white"
                animate={reduce ? undefined : { scale: [1, 0.6], opacity: [1, 0.4] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
            ) : (
              <Video className="h-5 w-5" fill="currentColor" strokeWidth={0} />
            )}
            {meetingFor !== null ? `Leave Meeting · ${ms(meetingFor)}` : "Start Meeting"}
          </button>
        </Card>

        <div className="fy-side">
          <Card area="pr" className="fy-grow flex flex-col" label="Projects">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Projects</CardTitle>
              <Chip icon={Plus} onClick={() => onDialog("project")}>
                New
              </Chip>
            </div>
            <ul className="fy-scroll mt-4 grid max-h-[244px] gap-3.5 overflow-y-auto overscroll-contain pr-1">
              <AnimatePresence initial={false}>
                {plist.map((p, i) => (
                  <motion.li
                    key={p.id}
                    layout="position"
                    custom={i}
                    variants={rowV}
                    exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }}
                    className="flex items-center gap-3.5"
                  >
                    <span aria-hidden="true" className={`fy-pico fy-pico-${p.pico}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium leading-[1.3]">
                        <Highlight text={p.name} q={q} />
                      </span>
                      <span className="block text-xs text-[var(--fy-faint)]">
                        Due date: <time dateTime={iso(dayOffset(today, p.due))}>{fmtLong.format(dayOffset(today, p.due))}</time>
                      </span>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {plist.length === 0 ? <p className="mt-3 text-[13.5px] text-[var(--fy-faint)]">No projects match your search.</p> : null}
          </Card>

          <motion.section variants={cardV} style={{ gridArea: "tr" }} aria-label="Time tracker" className="fy-swirl flex min-h-[200px] flex-col rounded-[20px] p-[18px] shadow-[var(--fy-shadow)] sm:p-5">
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">Time Tracker</h2>
            <p role="timer" aria-label={`Tracked time ${hms(elapsed)}`} className="mt-auto flex justify-center pt-3 text-center text-[40px] font-semibold tracking-[-0.02em] xl:text-[42px]">
              <span aria-hidden="true" className="flex">
                {digits.map((d, i) => (
                  <span key={i} className="flex">
                    {i === 2 || i === 4 ? <span className="px-[0.02em]">:</span> : null}
                    <Digit d={d} />
                  </span>
                ))}
              </span>
            </p>
            <div className="mt-3 flex justify-center gap-3.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onTracker("toggle")}
                aria-label={running ? "Pause timer" : "Start timer"}
                className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#f1f8f3] text-[var(--fy-950)] outline-none focus-visible:shadow-[0_0_0_3px_var(--fy-deep),0_0_0_5px_#f1f8f3]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={running ? "p" : "s"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.45 }}>
                    {running ? <Pause className="h-5 w-5" fill="currentColor" strokeWidth={0} /> : <Play className="h-5 w-5 translate-x-px" fill="currentColor" strokeWidth={0} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onTracker("stop")}
                aria-label="Stop and log timer"
                className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#d63a3a] text-[#f1f8f3] outline-none focus-visible:shadow-[0_0_0_3px_var(--fy-deep),0_0_0_5px_#f1f8f3]"
              >
                <Square className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
              </motion.button>
            </div>
          </motion.section>
        </div>

        <Card area="tm" label="Team collaboration">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Team Collaboration</CardTitle>
            <Chip icon={Plus} onClick={() => onDialog("member")}>
              Add Member
            </Chip>
          </div>
          <ul className="mt-4 grid gap-3">
            <AnimatePresence initial={false}>
              {tlist.map((m, i) => (
                <motion.li key={m.id} layout="position" custom={i + 3} variants={rowV} exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }} className="flex items-center gap-3.5">
                  <Avatar name={m.name} tint={m.tint} size={42} />
                  <span className="grid min-w-0 flex-1">
                    <span className="text-[15px] font-medium">
                      <Highlight text={m.name} q={q} />
                    </span>
                    <span className="truncate text-[12.5px] text-[var(--fy-faint)]">
                      Working on <b className="font-semibold text-foreground">{m.task}</b>
                    </span>
                  </span>
                  <span className={`flex-none rounded-md px-2 py-0.5 text-[11px] font-medium shadow-[inset_0_0_0_1px_currentColor] ${pillCls[m.state]}`}>{pillTxt[m.state]}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {tlist.length === 0 ? <p className="mt-3 text-[13.5px] text-[var(--fy-faint)]">No teammates match your search.</p> : null}
        </Card>

        <Card area="pg" className="flex flex-col" label="Project progress">
          <CardTitle>Project Progress</CardTitle>
          <Gauge stats={stats} />
          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-4 w-4 rounded-full bg-[var(--fy-700)]" />
              Completed
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-4 w-4 rounded-full bg-[var(--fy-strong)]" />
              In Progress
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="fy-sw-hatch h-4 w-4 rounded-full" />
              Pending
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- tasks view */

function TaskBody({ t, people, today, menu }: { t: Task; people: Person[]; today: Date; menu?: ReactNode }) {
  const due = dueLabel(t, today);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold fy-tag-${t.tag.toLowerCase()}`}>{t.tag}</span>
        <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${t.pri === "high" ? "text-[var(--fy-rose)]" : t.pri === "med" ? "text-[var(--fy-amber)]" : "text-muted-foreground"}`}>
          <Flag className="h-[13px] w-[13px]" />
          {PRI_LABEL[t.pri]}
        </span>
        {menu}
      </div>
      <p className={`mb-3 mt-2.5 text-[14.5px] font-semibold leading-[1.35] tracking-[-0.01em] ${t.status === "done" ? "text-muted-foreground line-through decoration-[var(--fy-hatch)]" : ""}`}>{t.title}</p>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full origin-left rounded-full bg-[var(--fy-600)]" initial={false} animate={{ scaleX: t.prog }} transition={{ duration: 0.7, ease: E_OUT }} />
      </div>
      <div className="mt-3 flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
        <span className={`inline-flex items-center gap-1 ${due.late ? "font-semibold text-[var(--fy-rose)]" : ""}`}>
          <Clock className="h-3.5 w-3.5" />
          {due.text}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {t.notes}
        </span>
        <span className="ml-auto">
          <Stack ids={t.who} people={people} />
        </span>
      </div>
    </>
  );
}

function TaskCard({
  t,
  people,
  today,
  placeholder,
  fresh,
  celebrate,
  menuOpen,
  onMenu,
  onMove,
  onPointerDown,
}: {
  t: Task;
  people: Person[];
  today: Date;
  placeholder: boolean;
  fresh: boolean;
  celebrate: boolean;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onMove: (s: Status) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
}) {
  const [scope, run] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (celebrate && !reduce && scope.current) run(scope.current, { scale: [1, 1.025, 1] }, { duration: 0.5, ease: E_INOUT });
  }, [celebrate, reduce, run, scope]);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) onMenu(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onMenu(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [menuOpen, onMenu]);

  const menu = (
    <button
      ref={btnRef}
      type="button"
      aria-label={`Move “${t.title}”`}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      onClick={() => onMenu(!menuOpen)}
      className="fy-focus ml-auto grid h-[30px] w-[30px] place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Ellipsis className="h-[18px] w-[18px]" />
    </button>
  );

  return (
    <motion.article
      layout
      data-fy-task={t.id}
      initial={fresh ? { opacity: 0, y: -16, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ layout: { type: "spring", bounce: 0, duration: 0.45 }, default: { type: "spring", bounce: 0, duration: 0.45 } }}
      onPointerDown={onPointerDown}
      className={`relative select-none rounded-2xl ${menuOpen ? "z-20" : "z-0"} ${
        placeholder ? "bg-transparent shadow-[inset_0_0_0_1.5px_var(--fy-400)]" : "cursor-grab bg-card shadow-[var(--fy-shadow)] active:cursor-grabbing"
      }`}
    >
      {placeholder ? <div aria-hidden="true" className="absolute inset-0 rounded-2xl bg-[var(--fy-soft)] opacity-60" /> : null}
      <div ref={scope} className={`px-3.5 pb-3 pt-3.5 ${placeholder ? "invisible" : ""}`}>
        <TaskBody t={t} people={people} today={today} menu={menu} />
      </div>
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Move to"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            className="absolute right-2 top-11 z-30 min-w-[190px] origin-top-right rounded-[14px] bg-card p-1.5 shadow-[var(--fy-pop)]"
          >
            <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--fy-faint)]">Move to</p>
            {STATUSES.map((s, i) => {
              const here = s.id === t.status;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  role="menuitem"
                  aria-disabled={here}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => {
                    if (here) return;
                    onMove(s.id);
                    onMenu(false);
                  }}
                  onKeyDown={(e: ReactKeyboardEvent<HTMLButtonElement>) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
                    const at = items.indexOf(e.currentTarget);
                    items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-sm outline-none ${here ? "cursor-default text-[var(--fy-faint)]" : "hover:bg-[var(--fy-soft)] focus-visible:bg-[var(--fy-soft)]"}`}
                >
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: s.dot }} />
                  {s.label}
                  {here ? <span className="ml-auto text-xs">Current</span> : null}
                </motion.button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

interface DragState {
  id: string;
  pointerId: number;
  sx: number;
  sy: number;
  offX: number;
  offY: number;
  w: number;
  active: boolean;
  from: Status;
  key: string;
}

function TasksView({
  q,
  tasks,
  setTasks,
  people,
  today,
  fresh,
  onDialog,
  onToast,
}: {
  q: string;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  people: Person[];
  today: Date;
  fresh: Set<string>;
  onDialog: (k: DialogKind) => void;
  onToast: (m: string) => void;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; w: number; dropping: boolean } | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);

  const matches = (t: Task) => {
    if (filter === "mine" && !t.who.includes(ME)) return false;
    if (filter === "high" && t.pri !== "high") return false;
    if (filter === "week" && (t.status === "done" || t.due < 0 || t.due > 7)) return false;
    if (q) {
      const hay = `${t.title} ${t.tag} ${t.who.map((id) => people.find((p) => p.id === id)?.name ?? "").join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };
  const shown = tasks.filter(matches);

  const finish = (id: string, from: Status) => {
    const t = tasksRef.current.find((x) => x.id === id);
    if (!t) return;
    const to = t.status;
    setTasks((ts) =>
      ts.map((x) => {
        if (x.id !== id) return x;
        if (to === "done" && from !== "done") return { ...x, prog: 1 };
        if (to !== "done" && from === "done") return { ...x, prog: 0.8 };
        if (to === "todo" && x.prog === 0) return x;
        if (to !== "todo" && x.prog === 0) return { ...x, prog: 0.15 };
        return x;
      }),
    );
    if (to !== from) {
      const label = STATUSES.find((s) => s.id === to)?.label ?? to;
      setLive(`Moved ${t.title} to ${label}`);
      if (to === "done") {
        setCelebrate(id);
        onToast(`“${t.title}” is done`);
        window.setTimeout(() => setCelebrate((c) => (c === id ? null : c)), 900);
      }
    }
  };

  const moveByMenu = (id: string, s: Status) => {
    const t = tasksRef.current.find((x) => x.id === id);
    if (!t) return;
    const from = t.status;
    setTasks((ts) => moveTask(ts, id, s, null));
    tasksRef.current = moveTask(tasksRef.current, id, s, null);
    finish(id, from);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const wrap = wrapRef.current;
      if (!d || !wrap || e.pointerId !== d.pointerId) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
        d.active = true;
        setMenu(null);
        setDrag({ id: d.id, w: d.w, dropping: false });
      }
      const wr = wrap.getBoundingClientRect();
      gx.set(e.clientX - wr.left - d.offX);
      gy.set(e.clientY - wr.top - d.offY);
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const col = under?.closest<HTMLElement>("[data-fy-col]");
      if (!col) {
        setOver(null);
        return;
      }
      const status = col.dataset.fyCol as Status;
      setOver(status);
      let before: string | null = null;
      for (const c of col.querySelectorAll<HTMLElement>("[data-fy-task]")) {
        if (c.dataset.fyTask === d.id) continue;
        const r = c.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) {
          before = c.dataset.fyTask ?? null;
          break;
        }
      }
      const key = `${status}|${before ?? ""}`;
      if (key !== d.key) {
        d.key = key;
        setTasks((ts) => moveTask(ts, d.id, status, before));
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      if (!d.active) return;
      setOver(null);
      const wrap = wrapRef.current;
      const ph = wrap?.querySelector<HTMLElement>(`[data-fy-task="${d.id}"]`);
      const done = () => {
        setDrag(null);
        finish(d.id, d.from);
      };
      if (!wrap || !ph || reduce || e.type === "pointercancel") {
        done();
        return;
      }
      setDrag((s) => (s ? { ...s, dropping: true } : s));
      const wr = wrap.getBoundingClientRect();
      const r = ph.getBoundingClientRect();
      Promise.all([animate(gx, r.left - wr.left, { duration: 0.35, ease: E_OUT }), animate(gy, r.top - wr.top, { duration: 0.35, ease: E_OUT })]).then(done);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gx, gy, reduce, setTasks]);

  const startDrag = (e: ReactPointerEvent<HTMLElement>, t: Task) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button,[role=menu]")) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    gx.set(r.left - wr.left);
    gy.set(r.top - wr.top);
    dragRef.current = {
      id: t.id,
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      offX: e.clientX - r.left,
      offY: e.clientY - r.top,
      w: r.width,
      active: false,
      from: t.status,
      key: "",
    };
  };

  const ghost = drag ? tasks.find((t) => t.id === drag.id) : undefined;

  return (
    <>
      <ViewHead title="Tasks" sub="Drag a card to another stage, or use its menu to move it." id="fy-h-tasks">
        <Magnetic className="fy-primary" onClick={() => onDialog("task")}>
          <Plus className="h-5 w-5" />
          New Task
        </Magnetic>
      </ViewHead>
      <motion.div variants={fileV} className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <Seg<TaskFilter>
          id="fy-filter"
          label="Filter tasks"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            { id: "mine", label: "My tasks" },
            { id: "high", label: "High priority" },
            { id: "week", label: "Due this week" },
          ]}
        />
        <p className="px-1 text-sm text-muted-foreground">
          <b className="font-semibold text-foreground">{shown.length}</b> {shown.length === 1 ? "task" : "tasks"} shown
        </p>
      </motion.div>
      <div ref={wrapRef} className="relative">
        <motion.div layoutScroll className="fy-kanban fy-scroll">
          {STATUSES.map((s) => {
            const list = shown.filter((t) => t.status === s.id);
            const isOver = over === s.id;
            return (
              <motion.section
                key={s.id}
                variants={cardV}
                data-fy-col={s.id}
                aria-label={`${s.label}, ${list.length} tasks`}
                className={`flex min-h-[420px] min-w-0 flex-col rounded-[20px] p-3.5 transition-[background-color,box-shadow] duration-200 ${
                  isOver ? "bg-[var(--fy-soft)] shadow-[inset_0_0_0_2px_var(--fy-400)]" : "bg-[color-mix(in_srgb,var(--card)_55%,transparent)] shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <div className="flex items-center gap-2.5 px-1 pb-3 pt-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
                  <h2 className="text-[15px] font-semibold">{s.label}</h2>
                  <span className="ml-auto min-w-7 rounded-full bg-card px-2 py-0.5 text-center text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_var(--border)]">{list.length}</span>
                </div>
                <div className="grid min-h-[60px] min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3">
                  {list.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      people={people}
                      today={today}
                      placeholder={drag?.id === t.id}
                      fresh={fresh.has(t.id)}
                      celebrate={celebrate === t.id}
                      menuOpen={menu === t.id}
                      onMenu={(o) => setMenu(o ? t.id : null)}
                      onMove={(st) => moveByMenu(t.id, st)}
                      onPointerDown={(e) => startDrag(e, t)}
                    />
                  ))}
                  {list.length === 0 ? <p className="rounded-[14px] px-2.5 py-5 text-center text-[13px] text-[var(--fy-faint)] shadow-[inset_0_0_0_1.5px_var(--border)]">{q ? "No matches here" : "Drop a card here"}</p> : null}
                </div>
              </motion.section>
            );
          })}
        </motion.div>
        {drag && ghost ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-40 cursor-grabbing rounded-2xl bg-card px-3.5 pb-3 pt-3.5 shadow-[0_24px_50px_-16px_rgb(19_26_21/0.4)]"
            style={{ x: gx, y: gy, width: drag.w }}
            initial={{ scale: 1 }}
            animate={{ scale: drag.dropping ? 1 : 1.03 }}
            transition={{ duration: 0.25, ease: E_OUT }}
          >
            <TaskBody t={ghost} people={people} today={today} menu={<span className="ml-auto h-[30px] w-[30px]" />} />
          </motion.div>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </>
  );
}

/* ------------------------------------------------------------- calendar view */

function CalendarView({ q, people, today, weekStart }: { q: string; people: Person[]; today: Date; weekStart: 0 | 1 }) {
  const todayIso = iso(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [dir, setDir] = useState(1);
  const [sel, setSel] = useState(todayIso);
  const [focusSel, setFocusSel] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const byDay = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const e of EVENTS) (m[iso(dayOffset(today, e.d))] ??= []).push(e);
    for (const l of Object.values(m)) l.sort((a, b) => a.from.localeCompare(b.from));
    return m;
  }, [today]);

  const lead = (month.getDay() - weekStart + 7) % 7;
  const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const total = Math.ceil((lead + dim) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - lead + i, 12));
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
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const n = moves[e.key];
    if (n === undefined) return;
    e.preventDefault();
    goto(iso(dayOffset(parseIso(sel), n)));
    setFocusSel(true);
  };

  const selDate = parseIso(sel);
  const agenda = byDay[sel] ?? [];
  const upcoming = EVENTS.filter((e) => e.d >= 0 && (!q || e.title.toLowerCase().includes(q)))
    .sort((a, b) => a.d - b.d || a.from.localeCompare(b.from))
    .slice(0, 5);
  const dow = Array.from({ length: 7 }, (_, i) => fmtDowShort.format(new Date(2026, 0, 4 + weekStart + i)));

  return (
    <>
      <ViewHead title="Calendar" sub="Meetings, reviews and deadlines across the team." id="fy-h-calendar">
        <Magnetic className="fy-ghost" onClick={() => goto(todayIso)}>
          <CalendarDays className="h-5 w-5" />
          Today
        </Magnetic>
      </ViewHead>
      <div className="fy-cal">
        <Card area="month" className="flex flex-col" label="Month">
          <div className="flex items-center justify-between gap-3">
            <h2 aria-live="polite" className="text-[22px] font-semibold tracking-[-0.03em]">
              {fmtMonth.format(month)}
            </h2>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="fy-focus grid h-10 w-10 place-items-center rounded-full bg-muted transition-colors hover:bg-[var(--fy-soft)]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Next month" onClick={() => step(1)} className="fy-focus grid h-10 w-10 place-items-center rounded-full bg-muted transition-colors hover:bg-[var(--fy-soft)]">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div aria-hidden="true" className="mb-2 mt-4 grid grid-cols-7 gap-1 md:gap-1.5">
            {dow.map((d) => (
              <span key={d} className="text-center text-xs font-semibold uppercase tracking-[0.06em] text-[var(--fy-faint)]">
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
                  center: { x: "0%", opacity: 1, transition: { duration: 0.45, ease: E_OUT } },
                  out: (d: number) => ({ x: `${-d * 6}%`, opacity: 0, transition: { duration: 0.2, ease: E_IN } }),
                }}
                initial="enter"
                animate="center"
                exit="out"
                onKeyDown={onKey}
                className="grid h-full auto-rows-[52px] grid-cols-7 gap-1 md:auto-rows-[minmax(84px,1fr)] md:gap-1.5"
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
                      aria-label={`${fmtFull.format(d)}${isToday ? ", today" : ""}, ${evts.length ? `${evts.length} event${evts.length > 1 ? "s" : ""}` : "no events"}`}
                      onClick={() => goto(k)}
                      className={`fy-focus relative flex min-w-0 flex-col items-center gap-[3px] rounded-[12px] p-1 text-left transition-[background-color,box-shadow] duration-200 md:items-start md:gap-1.5 md:rounded-[14px] md:p-2 ${
                        on ? "bg-card shadow-[inset_0_0_0_2px_var(--fy-600)]" : out ? "bg-transparent hover:bg-[var(--fy-soft)]" : "bg-muted hover:bg-[var(--fy-soft)]"
                      }`}
                    >
                      <motion.span
                        key={on ? "on" : "off"}
                        aria-hidden="true"
                        initial={on ? { scale: 0.7 } : false}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                        className={`grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold md:h-[30px] md:w-[30px] md:text-sm ${isToday ? "bg-[var(--fy-700)] text-[#f2f8f4]" : out ? "text-[var(--fy-faint)] opacity-60" : ""}`}
                      >
                        {d.getDate()}
                      </motion.span>
                      <span aria-hidden="true" className="flex flex-wrap gap-1 md:hidden">
                        {evts.slice(0, 3).map((e, i) => (
                          <span key={i} className={`h-[7px] w-[7px] rounded-full bg-[var(--c)] fy-k-${e.kind}`} />
                        ))}
                      </span>
                      <span aria-hidden="true" className="hidden w-full min-w-0 flex-col gap-1 md:flex">
                        {evts.slice(0, 2).map((e, i) => (
                          <span key={i} className={`fy-evt block max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold fy-k-${e.kind}`}>
                            {e.title}
                          </span>
                        ))}
                        {evts.length > 2 ? <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">+{evts.length - 2} more</span> : null}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-muted-foreground">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <li key={k} className="inline-flex items-center gap-[7px]">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full bg-[var(--c)] fy-k-${k}`} />
                {KINDS[k]}
              </li>
            ))}
          </ul>
        </Card>

        <motion.section variants={cardV} style={{ gridArea: "agenda" }} aria-labelledby="fy-agenda-h" className="min-w-0 rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} transition={{ duration: 0.4, ease: E_OUT }}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--fy-text)]">
                {fmtDow.format(selDate)}
                {sel === todayIso ? " · Today" : ""}
              </p>
              <h2 id="fy-agenda-h" className="mt-0.5 text-[28px] font-semibold tracking-[-0.035em]">
                {fmtDayLong.format(selDate)}
              </h2>
              {agenda.length ? (
                <ol className="mt-4 grid gap-2.5">
                  {agenda.map((e, i) => (
                    <motion.li
                      key={e.title}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, ease: E_OUT, delay: 0.06 + i * 0.05 }}
                      className={`fy-agenda grid grid-cols-[64px_1fr] gap-3 rounded-[14px] bg-muted p-3 fy-k-${e.kind}`}
                    >
                      <span className="text-[12.5px] font-semibold leading-[1.4] text-muted-foreground">
                        {ampm(e.from)}
                        <small className="block font-medium text-[var(--fy-faint)]">{ampm(e.to)}</small>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-semibold leading-[1.3]">{e.title}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-[var(--c)]">{KINDS[e.kind]}</span>
                        <span className="mt-2 block">
                          <Stack ids={e.who} people={people} ring="var(--muted)" size={28} />
                        </span>
                      </span>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-[13.5px] text-[var(--fy-faint)]">Nothing scheduled. Enjoy the focus time.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <motion.section variants={cardV} style={{ gridArea: "next" }} aria-labelledby="fy-next-h" className="min-w-0 rounded-[20px] bg-card p-[18px] shadow-[var(--fy-shadow)] sm:p-5">
          <CardTitle id="fy-next-h">Coming up</CardTitle>
          <ol className="mt-3 grid gap-1">
            {upcoming.map((e) => {
              const d = dayOffset(today, e.d);
              const k = iso(d);
              return (
                <li key={e.title}>
                  <button
                    type="button"
                    onClick={() => goto(k)}
                    aria-pressed={k === sel}
                    className={`fy-focus flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted ${k === sel ? "bg-muted" : ""}`}
                  >
                    <span className="grid h-[46px] w-[46px] flex-none place-items-center content-center rounded-xl bg-[var(--fy-soft)] leading-none text-[var(--fy-text)]">
                      <b className="text-[17px]">{d.getDate()}</b>
                      <small className="text-[10.5px] font-semibold uppercase">{fmtMon.format(d)}</small>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        <Highlight text={e.title} q={q} />
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {e.d === 0 ? "Today" : e.d === 1 ? "Tomorrow" : fmtDowShort.format(d)} · {ampm(e.from)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {upcoming.length === 0 ? <li className="p-2 text-[13.5px] text-[var(--fy-faint)]">No upcoming events match your search.</li> : null}
          </ol>
        </motion.section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ dialog */

interface Field {
  name: string;
  label: string;
  type: "text" | "date" | "select";
  value: string;
  options?: string[];
  min?: string;
}

function Dialog({ title, fields, submit, onClose, onSubmit }: { title: string; fields: Field[]; submit: string; onClose: () => void; onSubmit: (v: Record<string, string>) => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const boxRef = useRef<HTMLFormElement | null>(null);
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLElement>("input,select")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && boxRef.current) {
        const els = [...boxRef.current.querySelectorAll<HTMLElement>("input,select,button")];
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [onClose]);
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!vals[fields[0].name]?.trim()) return;
    onSubmit(vals);
  };
  const inputCls =
    "h-12 w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)]";
  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" tabIndex={-1} aria-label="Close dialog" className="absolute inset-0 cursor-default bg-[rgb(13_24_17/0.4)] backdrop-blur-[3px]" onClick={onClose} />
      <motion.form
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        onSubmit={send}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
        transition={{ duration: 0.35, ease: E_OUT }}
        className="relative grid w-full max-w-[420px] gap-4 rounded-[22px] bg-card p-6 text-foreground shadow-[0_30px_80px_-20px_rgb(19_26_21/0.45)]"
      >
        <div className="flex items-center justify-between">
          <h2 id={`${id}-t`} className="text-[22px] font-semibold tracking-[-0.03em]">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="fy-focus grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {fields.map((f) => (
          <label key={f.name} className="grid gap-1.5 text-[13.5px] font-medium text-muted-foreground">
            {f.label}
            {f.type === "select" ? (
              <select value={vals[f.name]} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))} className={inputCls}>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type}
                required={f.type === "date" || f === fields[0]}
                min={f.min}
                maxLength={60}
                value={vals[f.name]}
                onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
                className={inputCls}
              />
            )}
          </label>
        ))}
        <div className="mt-1.5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="fy-ghost fy-focus h-11 rounded-full px-5 text-[15px] font-medium">
            Cancel
          </button>
          <button type="submit" className="fy-primary fy-focus h-11 rounded-full px-5 text-[15px] font-medium">
            {submit}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- settings */

interface Profile {
  name: string;
  email: string;
  role: string;
  tz: string;
  bio: string;
}

type SetTab = "profile" | "notify" | "look";

const SET_TABS: { id: SetTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "notify", label: "Notifications", icon: Bell },
  { id: "look", label: "Appearance", icon: Palette },
];

const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "#1d7347", label: "Forest", hex: "#1d7347" },
  { id: "#1f4fa8", label: "Ocean", hex: "#1f4fa8" },
  { id: "#0f766e", label: "Teal", hex: "#0f766e" },
  { id: "#b1491d", label: "Ember", hex: "#b1491d" },
];

const TZS = ["GMT+7 · Jakarta", "GMT+0 · London", "GMT+1 · Lagos", "GMT−5 · New York"];

const SWITCHES: { t: string; d: string }[] = [
  { t: "Task assigned to me", d: "When someone hands you a task or adds you to one." },
  { t: "Mentions & comments", d: "Replies and @mentions on tasks you follow." },
  { t: "Meeting reminders", d: "Ten minutes before anything on your calendar." },
  { t: "Weekly digest", d: "A Monday summary of what shipped and what slipped." },
  { t: "Product updates", d: "New features in Fernly, at most once a month." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface RadioOpt<T extends string> {
  id: T;
  label: string;
  hex?: string;
  icon?: LucideIcon;
}

function Radios<T extends string>({ label, options, value, onChange }: { label: string; options: RadioOpt<T>[]; value: string; onChange: (v: T) => void }) {
  const gid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.findIndex((o) => o.id.toLowerCase() === value.toLowerCase());
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const n = steps[e.key];
    const j = n !== undefined ? (i + n + options.length) % options.length : e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : -1;
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
              className={`fy-focus inline-flex h-11 items-center gap-2.5 rounded-full ${o.hex || o.icon ? "pl-2 pr-4" : "px-5"} text-[14.5px] font-medium transition-[background-color,box-shadow,color] duration-300 ${
                on ? "bg-[var(--fy-soft)] text-foreground shadow-[inset_0_0_0_2px_var(--fy-600)]" : "bg-muted text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)] hover:text-foreground"
              }`}
            >
              {o.hex ? (
                <span className="relative grid h-7 w-7 flex-none place-items-center rounded-full text-white" style={{ background: o.hex }}>
                  <AnimatePresence initial={false}>
                    {on ? (
                      <motion.span key="c" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.35, ease: E_OUT }} className="grid">
                        <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              ) : Icon ? (
                <span className={`grid h-7 w-7 flex-none place-items-center rounded-full transition-colors duration-300 ${on ? "fy-primary" : "bg-card"}`}>
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

function Switch({ on, label, desc, onToggle }: { on: boolean; label: string; desc: string; onToggle: () => void }) {
  const id = useId();
  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
      <div className="min-w-0">
        <p id={`${id}-t`} className="text-[15px] font-semibold">
          {label}
        </p>
        <p id={`${id}-d`} className="mt-0.5 text-[13.5px] text-muted-foreground">
          {desc}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
        onClick={onToggle}
        className={`fy-focus relative h-8 w-[52px] flex-none rounded-full transition-[background-color,box-shadow] duration-300 ${on ? "bg-[var(--fy-700)]" : "bg-[var(--border)] shadow-[inset_0_0_0_1.5px_var(--fy-hatch)]"}`}
      >
        <motion.span
          aria-hidden="true"
          className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)]"
          initial={false}
          animate={{ x: on ? 20 : 0 }}
          transition={{ duration: 0.35, ease: E_OUT }}
        />
      </button>
    </li>
  );
}

interface SettingsProps {
  theme: Theme;
  onTheme: (t: Theme) => void;
  accent: string;
  onAccent: (hex: string) => void;
  weekStart: 0 | 1;
  onWeekStart: (w: 0 | 1) => void;
  profile: Profile;
  onProfile: (p: Profile) => void;
  onToast: (msg: string) => void;
}

function SettingsView({ theme, onTheme, accent, onAccent, weekStart, onWeekStart, profile, onProfile, onToast }: SettingsProps) {
  const [tab, setTab] = useState<SetTab>("profile");
  const [draft, setDraft] = useState<Profile>(profile);
  const [errs, setErrs] = useState<{ name?: string; email?: string }>({});
  const [saved, setSaved] = useState(false);
  const [sw, setSw] = useState<boolean[]>([true, true, true, false, false]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const uid = useId();

  useEffect(() => setDraft(profile), [profile]);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [saved]);

  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = SET_TABS.findIndex((t) => t.id === tab);
    const steps: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    const n = steps[e.key];
    const j = n !== undefined ? (i + n + SET_TABS.length) % SET_TABS.length : e.key === "Home" ? 0 : e.key === "End" ? SET_TABS.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(SET_TABS[j].id);
    tabRefs.current[j]?.focus();
  };

  const set = (k: keyof Profile, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (k === "name" || k === "email") setErrs((e) => ({ ...e, [k]: undefined }));
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const email = draft.email.trim();
    const next = { name: name ? undefined : "Enter your name.", email: EMAIL_RE.test(email) ? undefined : "Enter a valid email, like name@company.com." };
    setErrs(next);
    if (next.name || next.email) {
      formRef.current?.querySelector<HTMLInputElement>(next.name ? "[name=name]" : "[name=email]")?.focus();
      return;
    }
    onProfile({ ...draft, name, email });
    setSaved(true);
    onToast("Profile saved");
  };

  const inputCls =
    "h-12 w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)] aria-[invalid=true]:border-[var(--fy-rose)]";
  const labelCls = "grid min-w-0 gap-1.5 text-[13.5px] font-medium text-muted-foreground";
  const paneId = (t: SetTab) => `${uid}-pane-${t}`;
  const tabId = (t: SetTab) => `${uid}-tab-${t}`;

  return (
    <>
      <ViewHead title="Settings" sub="Your profile, notifications and how Fernly looks." id="fy-h-settings" />
      <div className="fy-set">
        <Card className="!p-2 sm:!p-2.5 md:self-start" label="Settings sections">
          <div role="tablist" aria-label="Settings sections" onKeyDown={onTabKey} className="grid grid-cols-3 gap-1 md:flex md:flex-col">
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
                  id={tabId(t.id)}
                  aria-selected={on}
                  aria-controls={paneId(t.id)}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`fy-focus-in relative flex h-11 min-w-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-2 text-[13.5px] font-medium sm:px-4 sm:text-[14.5px] transition-colors duration-300 md:flex-none md:justify-start ${on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {on ? <motion.span layoutId="fy-set-pill" className="fy-primary absolute inset-0 rounded-full" transition={{ type: "spring", bounce: 0, duration: 0.45 }} /> : null}
                  <Icon className="relative hidden h-[18px] w-[18px] flex-none sm:block" strokeWidth={1.9} aria-hidden="true" />
                  <span className="relative truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="min-h-[420px] overflow-hidden lg:min-h-0" label="Settings">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              id={paneId(tab)}
              role="tabpanel"
              aria-labelledby={tabId(tab)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: E_OUT } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: E_IN } }}
            >
              {tab === "profile" ? (
                <form ref={formRef} noValidate onSubmit={save} onReset={(e) => { e.preventDefault(); setDraft(profile); setErrs({}); }}>
                  <div className="flex items-center gap-4">
                    <Avatar name={draft.name.trim() || profile.name} tint="#f4c9b4" size={64} />
                    <div className="min-w-0">
                      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Profile</h2>
                      <p className="mt-0.5 text-[14px] text-muted-foreground">This is how teammates see you across the workspace.</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className={labelCls}>
                      Full name
                      <input name="name" value={draft.name} maxLength={40} autoComplete="name" aria-invalid={!!errs.name} aria-describedby={errs.name ? `${uid}-en` : undefined} onChange={(e) => set("name", e.target.value)} className={inputCls} />
                      {errs.name ? <em id={`${uid}-en`} className="text-[13px] not-italic text-[var(--fy-rose)]">{errs.name}</em> : null}
                    </label>
                    <label className={labelCls}>
                      Email
                      <input name="email" type="email" value={draft.email} autoComplete="email" aria-invalid={!!errs.email} aria-describedby={errs.email ? `${uid}-ee` : undefined} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                      {errs.email ? <em id={`${uid}-ee`} className="text-[13px] not-italic text-[var(--fy-rose)]">{errs.email}</em> : null}
                    </label>
                    <label className={labelCls}>
                      Role
                      <input name="role" value={draft.role} maxLength={40} autoComplete="organization-title" onChange={(e) => set("role", e.target.value)} className={inputCls} />
                    </label>
                    <label className={labelCls}>
                      Time zone
                      <select name="tz" value={draft.tz} onChange={(e) => set("tz", e.target.value)} className={inputCls}>
                        {TZS.map((z) => (
                          <option key={z}>{z}</option>
                        ))}
                      </select>
                    </label>
                    <label className={`${labelCls} sm:col-span-2`}>
                      Bio
                      <textarea name="bio" rows={3} maxLength={200} value={draft.bio} onChange={(e) => set("bio", e.target.value)} className={`${inputCls} h-auto resize-none py-3 leading-[1.5]`} />
                    </label>
                  </div>
                  <div className="mt-6 flex justify-end gap-2.5">
                    <button type="reset" className="fy-ghost fy-focus h-11 rounded-full px-5 text-[15px] font-medium">
                      Discard
                    </button>
                    <button type="submit" className="fy-primary fy-focus relative h-11 min-w-[140px] overflow-hidden rounded-full px-5 text-[15px] font-medium">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={saved ? "s" : "l"}
                          initial={{ y: 14, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -14, opacity: 0 }}
                          transition={{ duration: 0.3, ease: E_OUT }}
                          className="inline-flex items-center justify-center gap-1.5"
                        >
                          {saved ? (
                            <>
                              <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                              Saved
                            </>
                          ) : (
                            "Save changes"
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </div>
                </form>
              ) : tab === "notify" ? (
                <div>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Notifications</h2>
                  <p className="mt-0.5 text-[14px] text-muted-foreground">Choose what reaches you, and where.</p>
                  <ul className="mt-4 divide-y divide-[var(--border)]">
                    {SWITCHES.map((s, i) => (
                      <Switch
                        key={s.t}
                        on={sw[i]}
                        label={s.t}
                        desc={s.d}
                        onToggle={() => {
                          setSw((a) => a.map((v, j) => (j === i ? !v : v)));
                          onToast(`${s.t} ${sw[i] ? "off" : "on"}`);
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="grid gap-7">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Appearance</h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">The theme and accent re-tint the whole workspace.</p>
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
                  <Radios<string> label="Accent" value={accent} onChange={onAccent} options={ACCENTS} />
                  <Radios<"0" | "1">
                    label="Week starts on"
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
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------- full-template pages */

function Block({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={`relative min-w-0 rounded-[14px] bg-card ${className}`}>{children}</div>;
}

function Bone({ className = "" }: { className?: string }) {
  return <span className={`block rounded-full bg-[var(--border)] ${className}`} />;
}

function AnalyticsSketch() {
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className={`p-3 ${i === 0 ? "fy-hero" : ""}`}>
            <Bone className={`h-2 w-1/2 ${i === 0 ? "bg-[rgb(241_248_243/0.35)]" : ""}`} />
            <Bone className={`mt-3 h-4 w-1/3 ${i === 0 ? "bg-[rgb(241_248_243/0.7)]" : "bg-[var(--fy-hatch)]"}`} />
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-3 h-5 w-full">
              <path d={["M0 20 L20 14 L40 16 L60 8 L80 10 L100 3", "M0 16 L20 18 L40 10 L60 12 L80 6 L100 8", "M0 12 L20 10 L40 14 L60 6 L80 8 L100 4", "M0 6 L20 10 L40 8 L60 14 L80 12 L100 16"][i]} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ stroke: i === 0 ? "#f1f8f3" : "var(--fy-600)" }} />
            </svg>
          </Block>
        ))}
      </div>
      <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
        <Block className="flex flex-col p-3 sm:col-span-2">
          <Bone className="h-2.5 w-1/4" />
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="mt-3 h-[110px] min-h-[110px] w-full flex-1">
            <path d="M0 80 C40 70 60 40 100 50 S160 20 200 34 S260 10 300 18 V100 H0Z" style={{ fill: "var(--fy-soft)" }} />
            <path d="M0 70 C40 76 70 60 110 66 S170 50 210 58 S270 46 300 50" fill="none" strokeWidth={2} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" style={{ stroke: "var(--fy-hatch)" }} />
            <path d="M0 80 C40 70 60 40 100 50 S160 20 200 34 S260 10 300 18" fill="none" strokeWidth={2.5} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--fy-700)" }} />
          </svg>
        </Block>
        <Block className="grid place-items-center p-3">
          <span className="aspect-square h-auto w-[min(70%,180px)] rounded-full [mask:radial-gradient(circle,transparent_54%,#000_55%)]" style={{ background: "conic-gradient(var(--fy-700) 0 42%,var(--fy-400) 0 68%,var(--fy-strong) 0 84%,var(--border) 0)" }} />
        </Block>
      </div>
      <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
        <Block className="grid content-center p-3 sm:col-span-2">
          <div className="fy-heat">
            {Array.from({ length: 140 }, (_, i) => {
              const l = (i * 37 + (i % 7) * 11) % 5;
              return <span key={i} className={`aspect-square rounded-[3px] ${l === 0 ? "bg-[var(--border)]" : ""}`} style={l ? { background: `color-mix(in srgb,var(--fy-700) ${l * 24}%,var(--border))` } : undefined} />;
            })}
          </div>
        </Block>
        <Block className="grid content-evenly gap-2.5 p-3">
          {TINTS.slice(0, 6).map((t, i) => (
            <span key={t} className="flex items-center gap-2">
              <span className="h-6 w-6 flex-none rounded-full" style={{ background: t }} />
              <Bone className="h-2 flex-1" />
              <Bone className={`h-2 w-6 ${i === 0 ? "bg-[var(--fy-600)]" : ""}`} />
            </span>
          ))}
        </Block>
      </div>
    </div>
  );
}

function TeamSketch() {
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex gap-1 rounded-full bg-card p-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-6 rounded-full ${i === 0 ? "fy-primary w-10" : "w-14 bg-[var(--border)]"} ${i > 1 ? "hidden sm:block" : ""}`} />
          ))}
        </span>
        <Bone className="h-2.5 w-16" />
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TINTS.map((t, i) => (
          <Block key={t} className={`grid content-center justify-items-center p-3 pt-4 ${i > 3 ? "hidden sm:grid" : ""}`}>
            <span className="relative h-11 w-11 rounded-full" style={{ background: t }}>
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full shadow-[0_0_0_2px_var(--card)] ${i % 3 === 2 ? "bg-[var(--fy-hatch)]" : "bg-[var(--fy-600)]"}`} />
            </span>
            <Bone className="mt-3 h-2.5 w-2/3" />
            <Bone className="mt-2 h-2 w-1/2" />
            <span className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-[var(--fy-600)]" style={{ width: `${[72, 45, 88, 30, 60, 52][i]}%` }} />
            </span>
          </Block>
        ))}
      </div>
    </div>
  );
}

function HelpSketch() {
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <Block className="p-4">
        <Bone className="h-3.5 w-1/3 bg-[var(--fy-hatch)]" />
        <Bone className="mt-2 h-2 w-1/2" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex items-center gap-2 rounded-xl bg-muted p-2.5">
              <span className="h-7 w-7 flex-none rounded-lg bg-[var(--fy-soft)]" />
              <span className="grid flex-1 gap-1.5">
                <Bone className="h-2 w-4/5" />
                <Bone className="h-1.5 w-1/2" />
              </span>
            </span>
          ))}
        </div>
      </Block>
      <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
        <Block className="grid content-evenly gap-3 p-4 sm:col-span-2">
          {[78, 64, 84, 58, 70, 62, 80].map((w, i) => (
            <span key={i} className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <span className="h-2.5 rounded-full bg-[var(--border)]" style={{ width: `${w}%` }} />
              <span className="ml-auto h-5 w-5 flex-none rounded-full shadow-[inset_0_0_0_1.5px_var(--fy-line)]" />
            </span>
          ))}
        </Block>
        <div className="grid grid-rows-[1fr_auto] gap-2.5">
          <Block className="grid content-evenly gap-2.5 p-3">
            {[2, 1, 2, 3, 1, 2].map((n, i) => (
              <span key={i} className="flex items-center gap-1">
                {Array.from({ length: n }, (_, k) => (
                  <span key={k} className="h-5 w-5 rounded-[5px] bg-muted shadow-[inset_0_-1.5px_0_var(--border)]" />
                ))}
                <Bone className="ml-auto h-2 w-1/3" />
              </span>
            ))}
          </Block>
          <div className="fy-swirl grid gap-2 rounded-[14px] p-3.5">
            <span className="h-6 w-6 rounded-full bg-[#eef6f1]" />
            <span className="h-2.5 w-1/2 rounded-full bg-[rgb(238_246_241/0.7)]" />
            <span className="h-2 w-3/4 rounded-full bg-[rgb(238_246_241/0.35)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

const SKETCH: Record<FullView, () => ReactNode> = {
  analytics: AnalyticsSketch,
  team: TeamSketch,
  help: HelpSketch,
};

function LockedView({ id }: { id: FullView }) {
  const page = FULL[id];
  const nav = NAV.find((n) => n.id === id);
  const Icon = nav?.icon ?? Lock;
  const name = nav?.label ?? page.title;
  const Sketch = SKETCH[id];
  return (
    <>
      <ViewHead title={page.title} sub={page.sub} id={`fy-h-${id}`} />
      <div className="fy-locked">
        <Card className="flex flex-col" label={`${name} in the full template`}>
          <div className="fy-hero relative overflow-hidden rounded-[18px] p-5 sm:p-6">
            <div className="relative z-[1] flex items-center gap-2.5">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-white/15">
                <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-semibold tracking-[0.01em]">
                <Lock className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                Included in the full Fernly template
              </span>
            </div>
            <h2 className="relative z-[1] mt-4 text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[30px]">
              What this page holds in the full template
            </h2>
            <p className="relative z-[1] mt-2 text-[15px] leading-[1.45] text-white/80">
              {name} is one of the pages in the complete Fernly app. Here is what it does:
            </p>
          </div>
          <ul className="mt-5 grid gap-3.5">
            {page.points.map((pt, i) => (
              <motion.li key={pt} custom={i} variants={rowV} className="flex gap-3 text-[15.5px] leading-[1.5] font-medium">
                <span aria-hidden="true" className="mt-[8px] h-2.5 w-2.5 flex-none rounded-full bg-[var(--fy-600)]" />
                {pt}
              </motion.li>
            ))}
          </ul>
        </Card>
        <motion.div variants={cardV} aria-hidden="true" className="relative flex min-w-0 flex-col overflow-hidden rounded-[20px] bg-card p-3 shadow-[var(--fy-shadow)] sm:p-4">
          <div className="pointer-events-none flex h-full select-none flex-col rounded-[16px] bg-muted p-2.5 opacity-90 sm:p-3">
            <Sketch />
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------- shell */

function Sidebar({ view, onGo, workspaceName, openCount, sprintPct }: { view: View; onGo: (v: View) => void; workspaceName: string; openCount: number; sprintPct: number }) {
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
      if (lastY.current === null && !reduce) run(rail, { scaleY: [0, 1] }, { duration: 0.6, delay: 0.45, ease: E_OUT });
    } else {
      run(rail, { y }, { duration: 0.5, ease: E_INOUT });
    }
    lastY.current = y;
  }, [view, reduce, run, scope]);

  return (
    <motion.aside
      aria-label="Primary"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: E_OUT }}
      className="fy-scroll hidden h-full w-[224px] flex-none flex-col overflow-y-auto overscroll-contain rounded-[26px] bg-muted pb-[18px] pt-[22px] lg:flex xl:w-[252px]"
    >
      <div className="flex items-center gap-3 px-[26px]">
        <Logo className="h-10 w-10 text-[var(--fy-mark)]" />
        <span className="truncate text-[22px] font-semibold tracking-[-0.03em]">{workspaceName}</span>
      </div>
      <div className="relative mt-8">
        <span ref={scope} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[1] h-10 w-[5px] origin-center rounded-r-md bg-[var(--fy-700)] opacity-0" />
        {NAV_GROUPS.map((g, gi) => (
          <nav key={g.id} aria-labelledby={`fy-nav-${g.id}`} className={gi ? "mt-5" : ""}>
            <p id={`fy-nav-${g.id}`} className="px-7 pb-3 text-xs font-medium uppercase tracking-[0.06em] text-[var(--fy-faint)]">
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
                      className={`fy-focus-in relative flex w-full items-center gap-3.5 px-7 py-2.5 text-left text-base transition-colors duration-200 ${on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon className={`h-[22px] w-[22px] flex-none transition-colors ${on ? "text-[var(--fy-mark)]" : ""}`} strokeWidth={1.7} />
                      {n.label}
                      {n.id === "tasks" ? (
                        <motion.span key={openCount} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0, duration: 0.45 }} className="ml-auto rounded-md bg-[var(--fy-950)] px-[7px] py-0.5 text-[10.5px] font-semibold text-[#f0f7f2]">
                          {openCount}
                        </motion.span>
                      ) : null}
                      {n.full ? (
                        <>
                          <Lock aria-hidden="true" className="ml-auto h-3.5 w-3.5 flex-none text-[var(--fy-faint)] opacity-70" strokeWidth={2} />
                          <span className="sr-only">, full template page</span>
                        </>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
      <div className="fy-swirl mx-[18px] mt-auto rounded-[20px] px-4 pb-4 pt-[18px]">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#eef6f1] text-[#071a10]">
          <Flag className="h-[14px] w-[14px]" strokeWidth={2} />
        </span>
        <p className="mt-3 max-w-[9em] text-[19px] leading-[1.15] tracking-[-0.02em]">Sprint 14 wraps Friday</p>
        <p className="mt-1.5 text-xs text-[#b9d4c3]">
          {openCount} open tasks · {sprintPct}% shipped
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(238_246_241/0.18)]">
          <motion.div className="h-full origin-left rounded-full bg-[#eef6f1]" initial={{ scaleX: 0 }} animate={{ scaleX: sprintPct / 100 }} transition={{ duration: 1, ease: E_OUT, delay: 0.6 }} />
        </div>
        <button type="button" onClick={() => onGo("tasks")} className="mt-5 block w-full rounded-full bg-[var(--fy-800)] p-2.5 text-center text-[13.5px] font-semibold text-inherit transition-colors hover:bg-[var(--fy-700)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#eef6f1]">
          Open board
        </button>
      </div>
    </motion.aside>
  );
}

const PHONE_IDS: View[] = ["dashboard", "tasks", "calendar"];
const PHONE_MAIN = NAV.filter((n) => PHONE_IDS.includes(n.id));
const PHONE_MORE = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => !PHONE_IDS.includes(n.id)) })).filter((g) => g.items.length > 0);

function TabBar({ view, onGo, openCount }: { view: View; onGo: (v: View) => void; openCount: number }) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetId = useId();
  const moreOn = !PHONE_IDS.includes(view);
  const moreLabel = NAV.find((n) => n.id === view)?.label;

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>("[data-sheet-item]")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        moreRef.current?.focus();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const els = [...sheetRef.current.querySelectorAll<HTMLElement>("button")];
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
    `fy-focus-in relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-full text-[11.5px] font-semibold leading-none transition-colors sm:text-[12.5px] ${on ? "text-[#f2f8f4]" : "text-muted-foreground hover:text-foreground"}`;
  const pill = <motion.span layoutId="fy-tab-pill" className="fy-primary absolute inset-0 rounded-full" transition={{ type: "spring", bounce: 0, duration: 0.45 }} />;

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
              <button type="button" onClick={close} aria-label="Close" className="fy-focus grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            {PHONE_MORE.map((g) => (
              <nav key={g.id} aria-labelledby={`fy-more-${g.id}`} className="mt-1">
                <p id={`fy-more-${g.id}`} className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fy-faint)]">
                  {g.label}
                </p>
                <ul className="grid gap-0.5">
                  {g.items.map((n) => {
                    const on = n.id === view;
                    const Icon = n.icon;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          data-sheet-item
                          aria-current={on ? "page" : undefined}
                          onClick={() => {
                            onGo(n.id);
                            close();
                          }}
                          className={`fy-focus-in flex h-12 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[15px] transition-colors ${on ? "bg-[var(--fy-soft)] font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        >
                          <Icon className={`h-5 w-5 flex-none ${on ? "text-[var(--fy-mark)]" : ""}`} strokeWidth={1.8} />
                          {n.label}
                          {n.full ? (
                            <>
                              <Lock aria-hidden="true" className="ml-auto h-3.5 w-3.5 flex-none text-[var(--fy-faint)] opacity-70" strokeWidth={2} />
                              <span className="sr-only">, full template page</span>
                            </>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid w-full max-w-[360px] grid-cols-4 gap-1 rounded-full bg-card p-1.5 shadow-[0_0_0_1px_var(--border),0_18px_40px_-14px_rgb(19_26_21/0.35)]">
          {PHONE_MAIN.map((n) => {
            const on = n.id === view;
            const Icon = n.icon;
            return (
              <li key={n.id}>
                <button type="button" aria-current={on ? "page" : undefined} onClick={() => onGo(n.id)} className={cell(on)}>
                  {on ? pill : null}
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                    {n.id === "tasks" ? (
                      <span className="absolute -right-3.5 -top-1.5 rounded-md bg-[var(--fy-950)] px-1 text-[9.5px] leading-[14px] text-[#f0f7f2] shadow-[0_0_0_2px_var(--card)]">{openCount}</span>
                    ) : null}
                  </span>
                  <span className="relative">{n.label}</span>
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
              {moreOn && moreLabel ? <span className="sr-only">, showing {moreLabel}</span> : null}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function Tray({ notes, people, onRead, onOpen, onClose, bellRef }: { notes: Notice[]; people: Person[]; onRead: () => void; onOpen: (n: Notice) => void; onClose: () => void; bellRef: RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !bellRef.current?.contains(e.target as Node)) onClose();
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
      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
      className="fixed inset-x-3 top-[76px] z-50 origin-top-right rounded-[20px] bg-card p-4 shadow-[var(--fy-pop)] sm:absolute sm:inset-x-auto sm:right-[-8px] sm:top-[calc(100%+12px)] sm:w-[360px]"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-semibold">Notifications</p>
        <button type="button" onClick={onRead} className="fy-focus rounded-md text-[13.5px] font-semibold text-[var(--fy-text)] hover:underline hover:underline-offset-[3px]">
          Mark all read
        </button>
      </div>
      <ul className="grid gap-1">
        {notes.map((n, i) => {
          const p = people.find((x) => x.id === n.who);
          return (
            <motion.li key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.04, duration: 0.3, ease: E_OUT }}>
              <button
                type="button"
                onClick={() => onOpen(n)}
                className={`fy-focus flex w-full items-start gap-3 rounded-[14px] p-2.5 text-left text-[13.5px] leading-[1.4] text-muted-foreground transition-colors hover:bg-muted ${n.unread ? "bg-[var(--fy-soft)]" : ""}`}
              >
                {p ? <Avatar name={p.name} tint={p.tint} size={36} /> : null}
                <span>
                  <b className="font-semibold text-foreground">{p?.name}</b> {n.verb} <b className="font-semibold text-foreground">{n.what}</b> {n.tail}
                  <span className="mt-0.5 block text-xs text-[var(--fy-faint)]">{n.ago} ago</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

/* --------------------------------------------------------------- component */

const mailFor = (name: string, ws: string) => `${slug(name.split(" ")[0] ?? "noah")}@${slug(ws)}.app`;

export default function FernlyDashboard({ accent: accentProp = "#1d7347", workspaceName = "Fernly", userName = "Noah Castell", theme: themeProp = "light", className = "" }: FernlyDashboardProps) {
  const [theme, setTheme] = useState<Theme>(themeProp);
  const [accent, setAccent] = useState(accentProp);
  const [weekStart, setWeekStart] = useState<0 | 1>(1);
  const [profile, setProfile] = useState<Profile>(() => ({ name: userName, email: mailFor(userName, workspaceName), role: "Project Lead", tz: TZS[0], bio: "Shipping calm software with a kind team." }));
  const seen = useRef({ themeProp, accentProp, userName, workspaceName });
  useEffect(() => {
    const p = seen.current;
    if (p.themeProp !== themeProp) setTheme(themeProp);
    if (p.accentProp !== accentProp) setAccent(accentProp);
    if (p.userName !== userName || p.workspaceName !== workspaceName) setProfile((pr) => ({ ...pr, name: userName, email: mailFor(userName, workspaceName) }));
    seen.current = { themeProp, accentProp, userName, workspaceName };
  }, [themeProp, accentProp, userName, workspaceName]);
  const me = profile.name;
  const [today] = useState(noon);
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [team, setTeam] = useState<Member[]>(SEED_TEAM);
  const [stats, setStats] = useState<Stats>({ total: 24, ended: 10, running: 12, pending: 2 });
  const [tracker, setTracker] = useState<{ acc: number; since: number | null }>({ acc: 5048, since: null });
  const [meetingAt, setMeetingAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [notes, setNotes] = useState<Notice[]>(NOTICES);
  const [tray, setTray] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const boardRef = useRef<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const people = useMemo(() => PEOPLE.map((p) => (p.id === ME ? { ...p, name: me } : p)), [me]);
  const q = query.trim().toLowerCase();
  const dark = theme === "dark";
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const sprintPct = Math.round((tasks.filter((t) => t.status === "done").length / Math.max(tasks.length, 1)) * 100);
  const unread = notes.some((n) => n.unread);

  const ticking = tracker.since !== null || meetingAt !== null;
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [ticking]);
  const elapsed = Math.floor(tracker.acc + (tracker.since !== null ? Math.max(0, now - tracker.since) / 1000 : 0));
  const meetingFor = meetingAt !== null ? Math.floor(Math.max(0, now - meetingAt) / 1000) : null;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const say = (msg: string) => setToast({ id: Date.now(), msg });

  const go = (v: View) => {
    setTray(false);
    if (v === view) return;
    setView(v);
    boardRef.current?.scrollTo({ top: 0 });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0 });
  };

  const onTracker = (a: "toggle" | "stop") => {
    const t = Date.now();
    setNow(t);
    if (a === "toggle") {
      setTracker((s) => (s.since !== null ? { acc: s.acc + (t - s.since) / 1000, since: null } : { acc: s.acc, since: t }));
      return;
    }
    say(elapsed ? `Logged ${hms(elapsed)} to your timesheet` : "Timer is already at zero");
    setTracker({ acc: 0, since: null });
  };

  const onMeeting = () => {
    if (meetingAt !== null) {
      setMeetingAt(null);
      say("Meeting ended");
    } else {
      const t = Date.now();
      setNow(t);
      setMeetingAt(t);
    }
  };

  const dialogs: Record<DialogKind, { title: string; submit: string; fields: Field[] }> = {
    project: {
      title: "New project",
      submit: "Add project",
      fields: [
        { name: "name", label: "Project name", type: "text", value: "" },
        { name: "due", label: "Due date", type: "date", value: iso(dayOffset(today, 14)), min: iso(today) },
      ],
    },
    member: {
      title: "Add a teammate",
      submit: "Add member",
      fields: [
        { name: "name", label: "Full name", type: "text", value: "" },
        { name: "task", label: "Working on", type: "text", value: "Onboarding" },
      ],
    },
    task: {
      title: "New task",
      submit: "Add task",
      fields: [
        { name: "title", label: "Task title", type: "text", value: "" },
        { name: "tag", label: "Team", type: "select", value: "Frontend", options: TAGS },
        { name: "pri", label: "Priority", type: "select", value: "Medium", options: ["High", "Medium", "Low"] },
      ],
    },
  };

  const submit = (kind: DialogKind, v: Record<string, string>) => {
    setDialog(null);
    if (kind === "project") {
      const name = v.name.trim().slice(0, 60);
      const due = Math.max(0, daysBetween(today, parseIso(v.due || iso(dayOffset(today, 14)))));
      setProjects((p) => [...p, { id: `p${Date.now()}`, name, due, pico: "new" }]);
      setStats((s) => ({ ...s, total: s.total + 1, pending: s.pending + 1 }));
      say(`“${name}” added to projects`);
    } else if (kind === "member") {
      const name = v.name.trim().slice(0, 40);
      setTeam((t) => [...t, { id: `m${Date.now()}`, name, tint: TINTS[t.length % TINTS.length], task: v.task.trim() || "Onboarding", state: "pend" }]);
      say(`${name} joined the team`);
    } else {
      const title = v.title.trim().slice(0, 60);
      const id = `t${Date.now()}`;
      const pri: Pri = v.pri === "High" ? "high" : v.pri === "Low" ? "low" : "med";
      setFresh((f) => new Set(f).add(id));
      setTasks((ts) => [{ id, title, tag: (TAGS.includes(v.tag as Tag) ? v.tag : "Frontend") as Tag, pri, status: "todo", due: 7, who: [ME], prog: 0, notes: 0 }, ...ts]);
      say(`“${title}” added to To do`);
    }
  };

  const rootStyle = { "--fy-a": accent } as CSSProperties;

  return (
    <MotionConfig reducedMotion="user">
      <div className={`fy-root ${dark ? "fy-dark" : ""} w-full ${className}`} style={rootStyle}>
        <style>{STYLE}</style>
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[100rem] gap-[14px] p-2.5 sm:p-[14px] lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
          <Sidebar view={view} onGo={go} workspaceName={workspaceName} openCount={openCount} sprintPct={sprintPct} />

          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-[14px] lg:min-h-0">
            <motion.header
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: E_OUT, delay: 0.08 }}
              className="relative z-30 flex items-center gap-2 rounded-[22px] bg-muted p-2.5 sm:gap-3 sm:rounded-[26px] sm:px-4 sm:py-3"
            >
              <span className="grid h-11 w-11 flex-none place-items-center lg:hidden" title={workspaceName}>
                <Logo className="h-9 w-9 text-[var(--fy-mark)]" />
                <span className="sr-only">{workspaceName}</span>
              </span>
              <form role="search" className="relative min-w-0 flex-1 sm:max-w-[380px]" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="fy-search" className="sr-only">
                  Search projects, tasks and people
                </label>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground" aria-hidden="true" />
                <input
                  ref={searchRef}
                  id="fy-search"
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setQuery("");
                  }}
                  placeholder={view === "tasks" ? "Search tasks" : view === "calendar" ? "Search events" : view === "dashboard" ? "Search projects" : "Search"}
                  className="h-11 w-full rounded-full border-0 bg-card pl-11 pr-4 text-[15px] text-foreground outline-none placeholder:text-[var(--fy-faint)] focus-visible:shadow-[0_0_0_3px_var(--muted),0_0_0_5px_var(--fy-600)] sm:h-12 sm:pl-12 [&::-webkit-search-cancel-button]:hidden"
                />
              </form>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  onClick={() => setTheme(dark ? "light" : "dark")}
                  aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
                  className="fy-focus relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-card sm:h-12 sm:w-12"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={theme} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.3, ease: E_OUT }}>
                      {dark ? <Sun className="h-5 w-5" strokeWidth={1.8} /> : <Moon className="h-5 w-5" strokeWidth={1.8} />}
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
                    aria-label={unread ? `Notifications, ${notes.filter((n) => n.unread).length} new` : "Notifications"}
                    className="fy-focus relative grid h-11 w-11 place-items-center rounded-full bg-card sm:h-12 sm:w-12"
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.8} />
                    <AnimatePresence>
                      {unread ? (
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
                        notes={notes}
                        people={people}
                        bellRef={bellRef}
                        onClose={() => setTray(false)}
                        onRead={() => setNotes((ns) => ns.map((n) => ({ ...n, unread: false })))}
                        onOpen={(n) => {
                          setNotes((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                          go(n.view);
                          setTray(false);
                        }}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
                <button type="button" onClick={() => go("settings")} aria-label={`Account settings for ${me}`} className="fy-focus hidden items-center gap-3 rounded-full py-0.5 pl-0.5 pr-1.5 text-left sm:flex">
                  <Avatar name={me} tint="#f4c9b4" size={44} />
                  <span className="hidden xl:grid">
                    <span className="max-w-[180px] truncate text-[15px] font-medium leading-tight">{me}</span>
                    <span className="max-w-[180px] truncate text-[13px] text-muted-foreground">{profile.email}</span>
                  </span>
                </button>
              </div>
            </motion.header>

            <motion.main
              ref={(el: HTMLElement | null) => {
                boardRef.current = el;
              }}
              layoutScroll
              aria-labelledby={`fy-h-${view}`}
              className="fy-scroll min-w-0 flex-1 rounded-[22px] bg-muted px-2.5 pb-28 pt-6 sm:rounded-[26px] sm:px-[22px] lg:min-h-0 lg:overflow-y-auto lg:pb-[22px]"
            >
              <AnimatePresence mode="wait">
                <motion.div key={view} variants={viewV} initial="hidden" animate="show" exit="exit" className="lg:flex lg:min-h-full lg:flex-col">
                  {view === "dashboard" ? (
                    <DashboardView
                      q={q}
                      stats={stats}
                      projects={projects}
                      team={team}
                      today={today}
                      elapsed={elapsed}
                      running={tracker.since !== null}
                      meetingFor={meetingFor}
                      onTracker={onTracker}
                      onMeeting={onMeeting}
                      onDialog={setDialog}
                      onGo={go}
                    />
                  ) : view === "tasks" ? (
                    <TasksView q={q} tasks={tasks} setTasks={setTasks} people={people} today={today} fresh={fresh} onDialog={setDialog} onToast={say} />
                  ) : view === "calendar" ? (
                    <CalendarView q={q} people={people} today={today} weekStart={weekStart} />
                  ) : view === "settings" ? (
                    <SettingsView
                      theme={theme}
                      onTheme={setTheme}
                      accent={accent}
                      onAccent={(hex) => {
                        setAccent(hex);
                        say(`Accent set to ${ACCENTS.find((a) => a.hex === hex)?.label ?? "custom"}`);
                      }}
                      weekStart={weekStart}
                      onWeekStart={(w) => {
                        setWeekStart(w);
                        say(`Weeks now start on ${w === 1 ? "Monday" : "Sunday"}`);
                      }}
                      profile={profile}
                      onProfile={setProfile}
                      onToast={say}
                    />
                  ) : (
                    <LockedView id={view} />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.main>
          </div>
        </div>

        <TabBar view={view} onGo={go} openCount={openCount} />

        <AnimatePresence>
          {dialog ? (
            <Dialog key={dialog} title={dialogs[dialog].title} submit={dialogs[dialog].submit} fields={dialogs[dialog].fields} onClose={() => setDialog(null)} onSubmit={(v) => submit(dialog, v)} />
          ) : null}
        </AnimatePresence>

        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[70] flex justify-center px-4 lg:bottom-6">
          <AnimatePresence>
            {toast ? (
              <motion.p
                key={toast.id}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.3, ease: E_IN } }}
                transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                className="max-w-full rounded-full bg-[var(--fy-950)] px-[18px] py-3 text-sm font-medium text-[#f1f8f3] shadow-[0_16px_40px_-14px_rgb(13_58_35/0.6)]"
              >
                {toast.msg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
