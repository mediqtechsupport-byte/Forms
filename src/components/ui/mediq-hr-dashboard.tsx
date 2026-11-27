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
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Ellipsis,
  Eye,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Moon,
  Palette,
  PenTool,
  Pin,
  Plus,
  Printer,
  Save,
  Settings,
  Sun,
  Trash2,
  UserRound,
  Users,
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
} from "@/lib/constants";
import { CreateAccountCard } from "@/components/CreateAccountCard";
import { EmployeeHistoryExportModal } from "@/components/EmployeeHistoryExportModal";
import { SignaturePad } from "@/components/SignaturePad";
import { RequestTypeBadge, RequestTypeIcon, RoleBadge } from "@/components/StatusBadges";
import { EmployeeFormsDatatable } from "@/components/ui/employee-forms-datatable";
import {
  ActiveSearchBanner,
  PortalSearchBar,
  matchesAnnouncementSearch,
  matchesProfileSearch,
  matchesRequestSearch,
} from "@/components/ui/portal-search-bar";
import type {
  Announcement,
  FormRequest,
  LeaveBalance,
  Profile,
  RequestType,
  UserRole,
} from "@/types/database";

/* ------------------------------------------------------------------ types */

type HrView = "dashboard" | "queue" | "employees" | "memos" | "settings";
type Theme = "light" | "dark";
type HrQueueFilter = "all" | "pending" | "leave" | "overtime" | "other";
type SetTab = "profile" | "departments" | "look";

export interface MediqHrDashboardProps {
  requests: FormRequest[];
  profiles: Profile[];
  leaveBalances: LeaveBalance[];
  announcements: Announcement[];
  onInspect: (req: FormRequest) => void;
}

/* ---------------------------------------------------------------- constants */

const E_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_P4: [number, number, number, number] = [0.16, 1, 0.3, 1];
const E_IN: [number, number, number, number] = [0.4, 0, 1, 1];
const E_INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

const HR_TYPES: RequestType[] = ["leave", "overtime", "official_business", "other"];

const HR_BAR_CATEGORIES: { type: RequestType; shortCode: string }[] = [
  { type: "leave", shortCode: "LV" },
  { type: "overtime", shortCode: "OT" },
  { type: "official_business", shortCode: "OB" },
  { type: "other", shortCode: "HR" },
];

const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "#163362", label: "Dark Navy", hex: "#163362" },
  { id: "#0f2942", label: "Midnight Navy", hex: "#0f2942" },
  { id: "#1f4fa8", label: "MediQ Royal", hex: "#1f4fa8" },
  { id: "#1d7347", label: "Forest", hex: "#1d7347" },
];

interface NavItem {
  id: HrView;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "menu",
    label: "People Ops",
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "queue", label: "HR Forms Queue", icon: ClipboardList },
      { id: "employees", label: "Staff & Credits", icon: Users },
      { id: "memos", label: "Company Memos", icon: Megaphone },
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
  { id: "profile", label: "HR Profile & E-Sig", icon: UserRound },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "look", label: "Appearance", icon: Palette },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "HR";

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
    transition: { duration: 0.48, ease: E_OUT, delay: 0.3 + i * 0.04 },
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
      className="grid flex-none place-items-center rounded-full font-semibold tracking-[0.02em] text-[#0d1c36]"
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
              on ? "text-[#f7f2e8]" : "text-muted-foreground hover:text-foreground"
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
              ? "bg-[#f5efe4] text-[#0b1933] group-hover:bg-[#e6d8bf]"
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

function HrFormsBarsCard({
  hrRequests,
  onOpenQueue,
  onSelectCategory,
}: {
  hrRequests: FormRequest[];
  onOpenQueue: () => void;
  onSelectCategory: (type: RequestType) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  const bars = useMemo(() => {
    const counts = HR_BAR_CATEGORIES.map((f) => ({
      ...f,
      label: REQUEST_TYPE_META[f.type].shortLabel,
      full: REQUEST_TYPE_META[f.type].label,
      count: hrRequests.filter((r) => r.request_type === f.type).length,
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
  }, [hrRequests]);

  const defaultSel = useMemo(() => {
    const firstNonZero = bars.findIndex((b) => b.count > 0);
    return firstNonZero >= 0 ? firstNonZero : 0;
  }, [bars]);

  const [sel, setSel] = useState(defaultSel);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

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
    const t = window.setTimeout(() => setReady(true), 700);
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
        <CardTitle id={`${id}-h`}>HR Forms Volume</CardTitle>
        <Chip icon={ClipboardList} onClick={onOpenQueue}>
          Open Queue
        </Chip>
      </div>
      <ol className="mt-9 grid min-h-[168px] flex-1 grid-cols-4 gap-3 sm:gap-5 xl:min-h-[155px]">
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
                onSelectCategory(bar.type);
              }}
              style={{ height: `${bar.pct}%` }}
              className="fy-focus relative mx-auto min-h-10 w-full max-w-[54px] cursor-pointer self-end overflow-hidden rounded-full [-webkit-tap-highlight-color:transparent]"
            >
              <motion.span
                initial={{ y: "101%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: E_P4, delay: 0.35 + i * 0.06 }}
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
          opacity: { duration: 0.25 },
          scale: { type: "spring", bounce: 0, duration: 0.4 },
        }}
        className="fy-stem pointer-events-none absolute left-0 top-0 z-[2] whitespace-nowrap rounded-[7px] bg-card px-2.5 py-[3px] text-[11px] font-semibold shadow-[0_0_0_1px_var(--border),0_6px_16px_-8px_rgb(13_28_54/0.35)]"
      >
        {activeBar.label} · {activeBar.count} filed
      </motion.div>
    </motion.section>
  );
}

function HrReviewGauge({
  total,
  processed,
  pending,
  closed,
}: {
  total: number;
  processed: number;
  pending: number;
  closed: number;
}) {
  const raw = useId();
  const pid = `fy-hrhatch-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  const pct = useCountUp(total ? Math.round((processed / total) * 100) : 100, {
    duration: 1.2,
    delay: 0.35,
  });

  const entries = [
    { k: "processed", len: share(processed), stroke: "var(--fy-700)" },
    { k: "pending", len: share(pending), stroke: "var(--fy-strong)" },
    { k: "closed", len: share(closed), stroke: `url(#${pid})` },
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
        <span className="mt-1 text-[13px] text-muted-foreground">HR Endorsed</span>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- endorsement cards */

function PendingHrEndorseGrid({
  items,
  quickEndorsingId,
  onQuickEndorse,
  onInspect,
  q,
}: {
  items: FormRequest[];
  quickEndorsingId: string | null;
  onQuickEndorse: (req: FormRequest) => void;
  onInspect: (req: FormRequest) => void;
  q: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((req) => (
        <FyCard
          key={req.id}
          lift
          className="flex flex-col justify-between border border-border/70"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground/80">
                  <Highlight text={req.reference_no} q={q} />
                </span>
                <RequestTypeBadge type={req.request_type} />
              </div>
              {req.priority === "urgent" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fy-rose-bg)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--fy-rose)]">
                  <AlertTriangle className="h-3 w-3" />
                  URGENT
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-base font-semibold leading-snug tracking-[-0.015em]">
              <Highlight text={req.title} q={q} />
            </h3>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              <Highlight text={req.employee?.full_name ?? "Employee"} q={q} /> ·{" "}
              {req.employee?.department} ({req.employee?.position})
            </p>
            {req.description ? (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {req.description}
              </p>
            ) : null}

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-muted px-3 py-2 text-xs">
              {req.total_days != null ? (
                <span className="font-semibold text-[var(--fy-text)]">
                  {req.total_days} {Number(req.total_days) === 1 ? "day" : "days"} (
                  {formatDate(req.start_date)}
                  {req.end_date && req.end_date !== req.start_date
                    ? ` – ${formatDate(req.end_date)}`
                    : ""}
                  )
                </span>
              ) : null}
              {req.total_hours != null ? (
                <span className="font-semibold text-[var(--fy-text)]">
                  {req.total_hours} hrs OT · {formatDate(req.start_date)}
                </span>
              ) : null}
              {req.destination ? (
                <span className="font-medium text-muted-foreground">{req.destination}</span>
              ) : null}
              <span className="ml-auto font-mono text-[11px] text-[var(--fy-faint)]">
                {REQUEST_TYPE_META[req.request_type].formCode}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/80 pt-3.5">
            <button
              type="button"
              disabled={quickEndorsingId === req.id}
              onClick={() => onQuickEndorse(req)}
              className="fy-primary fy-focus inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold disabled:opacity-60"
            >
              {quickEndorsingId === req.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              1-Click HR Endorse
            </button>
            <button
              type="button"
              onClick={() => onInspect(req)}
              className="fy-ghost fy-focus inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold"
            >
              <Eye className="h-3.5 w-3.5" />
              Inspect / Reject
            </button>
          </div>
        </FyCard>
      ))}
    </div>
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

function HrSettingsView({
  profile,
  profiles,
  theme,
  onTheme,
  accent,
  onAccent,
  onToast,
}: {
  profile: Profile | null;
  profiles: Profile[];
  theme: Theme;
  onTheme: (t: Theme) => void;
  accent: string;
  onAccent: (hex: string) => void;
  onToast: (msg: string) => void;
}) {
  const { saveProfile } = useAppData();
  const { toast } = useToast();
  const [tab, setTab] = useState<SetTab>("profile");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "Human Resources");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [signatureData, setSignatureData] = useState(profile?.signature_data ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      onToast("HR profile & endorsement signature saved");
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

  const deptCounts = useMemo(() => {
    const map = new Map<string, number>();
    profiles.forEach((p) => {
      map.set(p.department, (map.get(p.department) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [profiles]);

  const inputCls =
    "h-12 w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)]";
  const labelCls = "grid min-w-0 gap-1.5 text-[13.5px] font-medium text-muted-foreground";

  return (
    <>
      <ViewHead
        title="HR Settings"
        sub="Save your default HR endorsement signature stamp, review headcount by department, and customize appearance."
        id="fy-h-settings"
      />
      <div className="fy-set">
        <FyCard className="!p-2 sm:!p-2.5 md:self-start" label="Settings sections">
          <div role="tablist" aria-label="Settings sections" className="grid grid-cols-3 gap-1 md:flex md:flex-col">
            {SET_TABS.map((t) => {
              const on = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.id)}
                  className={`fy-focus-in relative flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-2 text-[13.5px] font-medium transition-colors duration-300 sm:px-4 sm:text-[14.5px] md:flex-none md:justify-start ${
                    on ? "text-[#f7f2e8]" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {on ? (
                    <motion.span
                      layoutId="fy-hr-set-pill"
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
                    <AvatarCircle
                      name={fullName || profile?.full_name || "HR Admin"}
                      tint="#e6dac6"
                      size={60}
                    />
                    <div className="min-w-0">
                      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                        HR Profile &amp; Endorsement E-Signature
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
                      Mobile / Direct No.
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
                      Default HR Endorsement Signature Stamp (appears on endorsed digital slips)
                    </p>
                    <SignaturePad
                      signerName={fullName || profile?.full_name || "HR Admin"}
                      initialSignature={signatureData || null}
                      onChange={handleSigChange}
                    />
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="fy-primary fy-focus inline-flex h-11 min-w-[180px] cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-medium disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : saved ? "Saved!" : "Save HR Stamp"}
                    </button>
                  </div>
                </form>
              ) : tab === "departments" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                      Headcount by Department
                    </h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">
                      Live registered staff counts across MediQ Pharma departments.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {deptCounts.map(([dept, count]) => (
                      <div
                        key={dept}
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold">{dept}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Registered MediQ personnel
                          </p>
                        </div>
                        <span className="text-2xl font-bold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-7">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Appearance</h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">
                      Theme and accent color re-tint your HR Admin Portal immediately.
                    </p>
                  </div>
                  <Radios<Theme>
                    label="Theme"
                    value={theme}
                    onChange={onTheme}
                    options={[
                      { id: "light", label: "Light (Navy & Beige)", icon: Sun },
                      { id: "dark", label: "Dark (Midnight Navy)", icon: Moon },
                    ]}
                  />
                  <Radios<string>
                    label="Accent Palette"
                    value={accent}
                    onChange={onAccent}
                    options={ACCENTS}
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
  pendingHrCount,
  processedPct,
  hasSignature,
  onQuickAction,
  onSignOut,
}: {
  view: HrView;
  onGo: (v: HrView) => void;
  dark: boolean;
  pendingHrCount: number;
  processedPct: number;
  hasSignature: boolean;
  onQuickAction: () => void;
  onSignOut: () => void;
}) {
  const reduce = useReducedMotion();
  const [scope, run] = useAnimate<HTMLSpanElement>();
  const refs = useRef<Partial<Record<HrView, HTMLButtonElement | null>>>({});
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
      className="fy-scroll hidden w-[236px] flex-none flex-col overflow-y-auto overscroll-contain rounded-[26px] bg-muted pb-[18px] pt-[22px] lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-32px)] xl:w-[262px]"
    >
      <div className="flex items-center gap-3 px-[24px]">
        <BrandMark dark={dark} />
        <div className="min-w-0">
          <span className="block truncate text-[19px] font-semibold leading-tight tracking-[-0.03em]">
            MediQ HR
          </span>
          <span className="block truncate text-[11.5px] font-medium text-muted-foreground">
            People Operations
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
          <nav key={g.id} aria-labelledby={`fy-hrnav-${g.id}`} className={gi ? "mt-5" : ""}>
            <p
              id={`fy-hrnav-${g.id}`}
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
                      {n.id === "queue" ? (
                        <motion.span
                          key={pendingHrCount}
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                          className="ml-auto rounded-md bg-[var(--fy-950)] px-[7px] py-0.5 text-[10.5px] font-semibold text-[#f5efe4]"
                        >
                          {pendingHrCount}
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
            <Megaphone className="h-[14px] w-[14px]" strokeWidth={2.1} />
          ) : (
            <PenTool className="h-[14px] w-[14px]" strokeWidth={2.1} />
          )}
        </span>
        <p className="mt-3 text-[18px] font-medium leading-[1.2] tracking-[-0.02em]">
          {hasSignature ? "HR Stamp Ready" : "Setup HR Stamp"}
        </p>
        <p className="mt-1.5 text-xs text-[#dfd0b6]">
          {hasSignature
            ? `${processedPct}% HR forms processed`
            : "Save signature for instant endorsement"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(245_239_228/0.18)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[#f5efe4]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hasSignature ? Math.max(0.2, processedPct / 100) : 0.25 }}
            transition={{ duration: 0.9, ease: E_OUT, delay: 0.4 }}
          />
        </div>
        <button
          type="button"
          onClick={onQuickAction}
          className="mt-4 block w-full cursor-pointer rounded-full bg-[var(--fy-800)] p-2.5 text-center text-[13.5px] font-semibold text-inherit transition-colors hover:bg-[var(--fy-700)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#f5efe4]"
        >
          {hasSignature ? "Post Company Memo" : "Add E-Signature"}
        </button>
      </div>
    </motion.aside>
  );
}

const PHONE_IDS: HrView[] = ["dashboard", "queue", "employees"];
const PHONE_MAIN = NAV.filter((n) => PHONE_IDS.includes(n.id));
const PHONE_MORE = NAV.filter((n) => !PHONE_IDS.includes(n.id));

function TabBar({
  view,
  onGo,
  pendingHrCount,
  onSignOut,
}: {
  view: HrView;
  onGo: (v: HrView) => void;
  pendingHrCount: number;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement | null>(null);
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
    `fy-focus-in relative flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-full text-[11px] font-semibold leading-none transition-colors sm:text-[12.5px] ${
      on ? "text-[#f7f2e8]" : "text-muted-foreground hover:text-foreground"
    }`;

  const pill = (
    <motion.span
      layoutId="fy-hr-tab-pill"
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
            className="fixed inset-0 z-[39] cursor-default bg-[rgb(13_28_54/0.35)] backdrop-blur-[2px]"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="More HR pages"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            className="fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[41] mx-auto max-w-[360px] origin-bottom-right rounded-[22px] bg-card p-2.5 shadow-[var(--fy-pop)]"
          >
            <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
              <p className="text-[15px] font-semibold">HR Menu</p>
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
        <ul className="grid w-full max-w-[360px] grid-cols-4 gap-1 rounded-full bg-card p-1.5 shadow-[0_0_0_1px_var(--border),0_18px_40px_-14px_rgb(13_28_54/0.35)]">
          {PHONE_MAIN.map((n) => {
            const on = n.id === view;
            const Icon = n.icon;
            const shortLabel =
              n.id === "queue" ? "Queue" : n.id === "employees" ? "Staff" : "Home";
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
                    {n.id === "queue" && pendingHrCount > 0 ? (
                      <span className="absolute -right-3.5 -top-1.5 rounded-md bg-[var(--fy-950)] px-1 text-[9.5px] leading-[14px] text-[#f5efe4] shadow-[0_0_0_2px_var(--card)]">
                        {pendingHrCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="relative">{shortLabel}</span>
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

function HrNotificationTray({
  pendingHr,
  readIds,
  onMarkAllRead,
  onInspect,
  onClose,
  bellRef,
}: {
  pendingHr: FormRequest[];
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onInspect: (req: FormRequest) => void;
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
      aria-label="Pending HR Notifications"
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.15 } }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="fixed inset-x-3 top-[76px] z-50 origin-top-right rounded-[20px] bg-card p-4 shadow-[var(--fy-pop)] sm:absolute sm:inset-x-auto sm:right-[-8px] sm:top-[calc(100%+12px)] sm:w-[360px]"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-semibold">Pending HR Review</p>
        {pendingHr.length > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="fy-focus cursor-pointer rounded-md text-[13px] font-semibold text-[var(--fy-text)] hover:underline hover:underline-offset-[3px]"
          >
            Mark read
          </button>
        ) : null}
      </div>
      {pendingHr.length === 0 ? (
        <p className="rounded-[14px] bg-muted p-4 text-center text-xs text-muted-foreground">
          All caught up — zero HR forms awaiting endorsement.
        </p>
      ) : (
        <ul className="grid max-h-[340px] gap-1 overflow-y-auto">
          {pendingHr.slice(0, 6).map((req) => (
            <li key={req.id}>
              <button
                type="button"
                onClick={() => {
                  onInspect(req);
                  onClose();
                }}
                className={`fy-focus flex w-full cursor-pointer items-start gap-3 rounded-[14px] p-2.5 text-left text-[13.5px] leading-[1.4] text-muted-foreground transition-colors hover:bg-muted ${
                  !readIds.has(req.id) ? "bg-[var(--fy-soft)]" : ""
                }`}
              >
                <AvatarCircle
                  name={req.employee?.full_name || "Staff"}
                  tint="#e6dac6"
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <b className="font-semibold text-foreground">
                    {req.employee?.full_name ?? "Staff"}
                  </b>{" "}
                  filed <b className="font-semibold text-foreground">{req.title}</b>
                  <span className="mt-0.5 block text-xs text-[var(--fy-faint)]">
                    {req.reference_no} · {formatDate(req.created_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/* ----------------------------------------------------------- main component */

export function MediqHrDashboard({
  requests,
  profiles,
  leaveBalances,
  announcements,
  onInspect,
}: MediqHrDashboardProps) {
  const { signOut } = useAuth();
  const {
    activeProfile: currentUser,
    performReview,
    saveLeaveBalance,
    saveProfile,
    publishAnnouncement,
    removeAnnouncement,
  } = useAppData();
  const { toast } = useToast();

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("mediq-hr-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [accent, setAccent] = useState<string>(() => {
    try {
      return localStorage.getItem("mediq-hr-accent") || "#163362";
    } catch {
      return "#163362";
    }
  });

  const [view, setView] = useState<HrView>("dashboard");
  const [query, setQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<HrQueueFilter>("all");
  const [tray, setTray] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [quickEndorsingId, setQuickEndorsingId] = useState<string | null>(null);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balDraft, setBalDraft] = useState({
    vacation_total: 15,
    vacation_used: 0,
    sick_total: 15,
    sick_used: 0,
    emergency_total: 5,
    emergency_used: 0,
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoCategory, setMemoCategory] = useState<Announcement["category"]>("hr_policy");
  const [memoPinned, setMemoPinned] = useState(false);
  const [postingMemo, setPostingMemo] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportEmpId, setExportEmpId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ id: number; msg: string } | null>(null);

  const openHistoryExport = (empId: string | null = null) => {
    setExportEmpId(empId);
    setExportOpen(true);
  };

  const bellRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-hr-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-hr-accent", accent);
    } catch {
      // ignore
    }
  }, [accent]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const say = (msg: string) => setToastMsg({ id: Date.now(), msg });

  const go = (v: HrView) => {
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
  const fullName = currentUser?.full_name || "HR Admin";
  const firstName = fullName.split(/\s+/)[0] || "HR";
  const hasSignature = Boolean(currentUser?.signature_data);

  const hrRequests = useMemo(
    () => requests.filter((r) => HR_TYPES.includes(r.request_type)),
    [requests]
  );

  const pendingHrList = useMemo(
    () =>
      hrRequests.filter(
        (r) =>
          r.hr_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
      ),
    [hrRequests]
  );

  const processedHrCount = useMemo(
    () =>
      hrRequests.filter(
        (r) =>
          ["endorsed", "approved"].includes(r.hr_status) ||
          ["approved", "paid"].includes(r.status)
      ).length,
    [hrRequests]
  );

  const closedHrCount = useMemo(
    () => hrRequests.filter((r) => ["rejected", "cancelled"].includes(r.status)).length,
    [hrRequests]
  );

  const approvedLeaves = useMemo(
    () =>
      hrRequests.filter((r) => r.request_type === "leave" && r.status === "approved").length,
    [hrRequests]
  );

  const approvedOtHours = useMemo(
    () =>
      hrRequests
        .filter((r) => r.request_type === "overtime" && ["approved", "paid"].includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_hours ?? 0), 0),
    [hrRequests]
  );

  const activeStaffCount = profiles.filter((p) => p.is_active).length;
  const processedPct = hrRequests.length
    ? Math.round((processedHrCount / hrRequests.length) * 100)
    : 100;

  const balanceMap = useMemo(() => {
    const map = new Map<string, LeaveBalance>();
    leaveBalances.forEach((b) => map.set(b.employee_id, b));
    return map;
  }, [leaveBalances]);

  const searchedHrRequests = useMemo(
    () => hrRequests.filter((r) => matchesRequestSearch(r, q)),
    [hrRequests, q]
  );

  const filteredQueueTable = useMemo(() => {
    return searchedHrRequests.filter((r) => {
      if (
        queueFilter === "pending" &&
        !(
          r.hr_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
        )
      )
        return false;
      if (queueFilter === "leave" && r.request_type !== "leave") return false;
      if (queueFilter === "overtime" && r.request_type !== "overtime") return false;
      if (
        queueFilter === "other" &&
        r.request_type !== "official_business" &&
        r.request_type !== "other"
      )
        return false;
      return true;
    });
  }, [searchedHrRequests, queueFilter]);

  const filteredPendingCards = useMemo(
    () => pendingHrList.filter((r) => matchesRequestSearch(r, q)),
    [pendingHrList, q]
  );

  const filteredProfiles = useMemo(
    () => profiles.filter((p) => matchesProfileSearch(p, q)),
    [profiles, q]
  );

  const filteredAnnouncements = useMemo(
    () => announcements.filter((a) => matchesAnnouncementSearch(a, q)),
    [announcements, q]
  );

  const spotlightReq = useMemo(
    () =>
      filteredPendingCards.find((r) => r.priority === "urgent") ??
      filteredPendingCards[0] ??
      null,
    [filteredPendingCards]
  );

  const recentFeed = useMemo(() => {
    const src = pendingHrList.length > 0 ? pendingHrList : hrRequests;
    return src.filter((r) => matchesRequestSearch(r, q)).slice(0, 5);
  }, [pendingHrList, hrRequests, q]);

  const hasUnread = pendingHrList.some((r) => !readIds.has(r.id));

  /* Live Actions */
  const handleQuickEndorse = async (req: FormRequest) => {
    setQuickEndorsingId(req.id);
    try {
      await performReview({
        requestId: req.id,
        action: "hr_endorse",
        remarks: "Endorsed by HR Admin",
      });
      toast(
        "Approved by HR & Sent to Boss!",
        `${req.reference_no} (${req.employee?.full_name ?? "Employee"}) has been forwarded to Boss Executive for final sign-off.`
      );
      say(`Sent ${req.reference_no} to Boss`);
    } catch (err) {
      toast("Endorsement failed", err instanceof Error ? err.message : "Try again.", "error");
    } finally {
      setQuickEndorsingId(null);
    }
  };

  const startEditBalance = (empId: string) => {
    const existing = balanceMap.get(empId);
    setBalDraft({
      vacation_total: Number(existing?.vacation_total ?? 15),
      vacation_used: Number(existing?.vacation_used ?? 0),
      sick_total: Number(existing?.sick_total ?? 15),
      sick_used: Number(existing?.sick_used ?? 0),
      emergency_total: Number(existing?.emergency_total ?? 5),
      emergency_used: Number(existing?.emergency_used ?? 0),
    });
    setEditingBalanceId(empId);
  };

  const handleSaveBalance = async (empId: string) => {
    setSavingId(empId);
    try {
      await saveLeaveBalance(empId, new Date().getFullYear(), balDraft);
      toast("Leave credits updated", "The employee balance has been saved.");
      say("Leave credits updated");
      setEditingBalanceId(null);
    } catch (err) {
      toast("Update failed", err instanceof Error ? err.message : "Unable to save.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleEmployeeMetaUpdate = async (
    emp: Profile,
    patch: Partial<Pick<Profile, "department" | "role" | "is_active">>
  ) => {
    setSavingId(emp.id);
    try {
      await saveProfile(emp.id, patch);
      toast("Employee record updated", `${emp.full_name} has been updated.`);
      say(`Updated ${emp.full_name}`);
    } catch (err) {
      toast(
        "Update blocked",
        err instanceof Error ? err.message : "Insufficient permissions.",
        "error"
      );
    } finally {
      setSavingId(null);
    }
  };

  const handlePostMemo = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setPostingMemo(true);
    try {
      await publishAnnouncement({
        title: memoTitle.trim(),
        body: memoBody.trim(),
        category: memoCategory,
        is_pinned: memoPinned,
      });
      setMemoTitle("");
      setMemoBody("");
      setMemoPinned(false);
      toast("Announcement published", "Visible immediately on all employee dashboards.");
      say("Company memo published");
    } catch (err) {
      toast("Publish failed", err instanceof Error ? err.message : "Try again.", "error");
    } finally {
      setPostingMemo(false);
    }
  };

  const handleDeleteMemo = async (id: number) => {
    try {
      await removeAnnouncement(id);
      toast("Announcement removed");
      say("Announcement removed");
    } catch (err) {
      toast("Delete failed", err instanceof Error ? err.message : "Try again.", "error");
    }
  };

  const statusPillStyle = (status: FormRequest["status"]) => {
    if (status === "approved" || status === "paid")
      return "text-[var(--fy-text)] bg-[var(--fy-soft)]";
    if (status === "rejected" || status === "cancelled")
      return "text-[var(--fy-rose)] bg-[var(--fy-rose-bg)]";
    return "text-[var(--fy-amber)] bg-[var(--fy-amber-bg)]";
  };

  const rootStyle = { "--fy-a": accent } as CSSProperties;
  const inputCls =
    "w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)]";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`fy-root ${dark ? "fy-dark" : ""} min-h-[100dvh] w-full overflow-x-hidden`}
        style={rootStyle}
      >
        <style>{STYLE}</style>

        <div className="flex min-h-[100dvh] w-full gap-3 p-2 sm:gap-3.5 sm:p-3.5 lg:gap-4 lg:p-4">
          <Sidebar
            view={view}
            onGo={go}
            dark={dark}
            pendingHrCount={pendingHrList.length}
            processedPct={processedPct}
            hasSignature={hasSignature}
            onQuickAction={() => go(hasSignature ? "memos" : "settings")}
            onSignOut={() => void signOut()}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-3.5 lg:gap-4">
            {/* Floating Header */}
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
                id="fy-hr-search"
                query={query}
                onQueryChange={setQuery}
                ariaLabel="Search HR forms, employees, or memos"
                placeholder={
                  view === "employees"
                    ? "Search employee, ID, department..."
                    : "Search leave, OT, OB, employee, ref #..."
                }
                requests={hrRequests}
                showEmployee
                profiles={profiles}
                announcements={announcements}
                onInspectRequest={onInspect}
                onSelectProfile={(emp) => {
                  setQuery(emp.full_name);
                  go("employees");
                }}
                onSelectAnnouncement={(a) => {
                  setQuery(a.title);
                  go("memos");
                }}
                onViewAllMatches={() => {
                  setQueueFilter("all");
                  go("queue");
                }}
                viewAllLabel="View in HR Queue"
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
                    aria-label="Pending HR notifications"
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
                      <HrNotificationTray
                        pendingHr={pendingHrList}
                        readIds={readIds}
                        bellRef={bellRef}
                        onClose={() => setTray(false)}
                        onMarkAllRead={() =>
                          setReadIds(new Set(pendingHrList.map((r) => r.id)))
                        }
                        onInspect={onInspect}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => go("settings")}
                  aria-label={`HR settings for ${fullName}`}
                  className="fy-focus hidden cursor-pointer items-center gap-3 rounded-full py-0.5 pl-0.5 pr-2 text-left sm:flex"
                >
                  <AvatarCircle name={fullName} tint="#e6dac6" size={44} />
                  <span className="hidden xl:grid">
                    <span className="max-w-[180px] truncate text-[15px] font-medium leading-tight">
                      {fullName}
                    </span>
                    <span className="max-w-[180px] truncate text-[12.5px] text-muted-foreground">
                      HR Admin · People Ops
                    </span>
                  </span>
                </button>
              </div>
            </motion.header>

            {/* Whole-Page Fluid Main Board */}
            <motion.main
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
                        title="HR Control Center"
                        sub={`Welcome, ${firstName} — review Leave, Overtime, Official Business & HR forms, manage leave credits, and post company memos.`}
                        id="fy-h-dashboard"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => go("memos")}
                        >
                          <Megaphone className="h-4 w-4" />
                          Post Company Memo
                        </Magnetic>
                        <Magnetic
                          className="fy-ghost"
                          onClick={() => go("employees")}
                        >
                          <Users className="h-4 w-4" />
                          Staff &amp; Credits
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={searchedHrRequests.length}
                        entityLabel={searchedHrRequests.length === 1 ? "HR form" : "HR forms"}
                        onClear={() => setQuery("")}
                      />

                      {/* 12-Column Fernly HR Grid */}
                      <div className="fy-grid">
                        <StatCard
                          area="s1"
                          hero
                          title="Pending HR Review"
                          value={pendingHrList.length}
                          badge={pendingHrList.length > 0 ? "Action" : "Clear"}
                          note="Awaiting HR endorsement"
                          onOpen={() => {
                            setQueueFilter("pending");
                            go("queue");
                          }}
                        />
                        <StatCard
                          area="s2"
                          title="Active Staff"
                          value={activeStaffCount}
                          badge={`${profiles.length} total`}
                          note="Registered portal accounts"
                          onOpen={() => go("employees")}
                        />
                        <StatCard
                          area="s3"
                          title="Approved Leaves"
                          value={approvedLeaves}
                          badge="Cleared"
                          note="Approved leave applications"
                          onOpen={() => {
                            setQueueFilter("leave");
                            go("queue");
                          }}
                        />
                        <StatCard
                          area="s4"
                          title="HR Forms Filed"
                          value={hrRequests.length}
                          badge={`${processedPct}%`}
                          note="Leave, OT, OB & Admin"
                          onOpen={() => {
                            setQueueFilter("all");
                            go("queue");
                          }}
                        />

                        {/* Left 6 cols: HR Forms Volume Pill Bars */}
                        <HrFormsBarsCard
                          hrRequests={hrRequests}
                          onOpenQueue={() => {
                            setQueueFilter("all");
                            go("queue");
                          }}
                          onSelectCategory={(type) => {
                            setQueueFilter(
                              type === "leave"
                                ? "leave"
                                : type === "overtime"
                                  ? "overtime"
                                  : "other"
                            );
                            go("queue");
                          }}
                        />

                        {/* Middle 3 cols: Next HR Endorsement Spotlight */}
                        <FyCard area="re" className="flex flex-col" label="Next HR Endorsement">
                          <CardTitle>Next HR Review</CardTitle>
                          {spotlightReq ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onInspect(spotlightReq)}
                                className="fy-focus mt-5 cursor-pointer rounded-xl text-left transition-opacity hover:opacity-80"
                              >
                                <p className="text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--fy-text)]">
                                  <Highlight text={spotlightReq.title} q={q} />
                                </p>
                                <p className="mb-5 mt-2 text-[13.5px] text-muted-foreground">
                                  {spotlightReq.employee?.full_name} · {spotlightReq.reference_no}
                                  {spotlightReq.total_days != null
                                    ? ` · ${spotlightReq.total_days}d`
                                    : spotlightReq.total_hours != null
                                      ? ` · ${spotlightReq.total_hours}h OT`
                                      : ""}
                                </p>
                              </button>
                              <button
                                type="button"
                                disabled={quickEndorsingId === spotlightReq.id}
                                onClick={() => handleQuickEndorse(spotlightReq)}
                                className="fy-primary fy-focus mt-auto inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14.5px] font-medium disabled:opacity-60"
                              >
                                {quickEndorsingId === spotlightReq.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Approve &amp; Send to Boss
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="mt-5 text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--fy-text)]">
                                All caught up
                              </p>
                              <p className="mb-5 mt-2 text-[13.5px] text-muted-foreground">
                                Zero HR digital forms are currently awaiting your endorsement.
                              </p>
                              <button
                                type="button"
                                onClick={() => go("memos")}
                                className="fy-primary fy-focus mt-auto inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14.5px] font-medium"
                              >
                                <Megaphone className="h-4 w-4" />
                                Post Company Memo
                              </button>
                            </>
                          )}
                        </FyCard>

                        {/* Right 3 cols Stack: Staff Directory + Dark Swirl OT & Memos */}
                        <div className="fy-side">
                          <FyCard
                            area="pr"
                            className="fy-grow flex flex-col"
                            label="Staff Directory"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle>Staff Directory</CardTitle>
                              <Chip icon={Users} onClick={() => go("employees")}>
                                Manage
                              </Chip>
                            </div>
                            <ul className="mt-4 grid gap-2.5">
                              {filteredProfiles.slice(0, 6).map((emp, i) => (
                                <motion.li key={emp.id} custom={i} variants={rowV}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuery(emp.full_name);
                                      go("employees");
                                    }}
                                    className="fy-focus flex w-full cursor-pointer items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-muted"
                                  >
                                    <AvatarCircle
                                      name={emp.full_name}
                                      tint="#e6dac6"
                                      size={34}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[14px] font-medium leading-[1.25]">
                                        <Highlight text={emp.full_name} q={q} />
                                      </span>
                                      <span className="block truncate text-[11.5px] text-[var(--fy-faint)]">
                                        {emp.department} · {emp.employee_code}
                                      </span>
                                    </span>
                                    <span className="flex-none rounded-md bg-[var(--fy-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fy-text)] uppercase">
                                      {emp.role}
                                    </span>
                                  </button>
                                </motion.li>
                              ))}
                            </ul>
                            {filteredProfiles.length === 0 ? (
                              <p className="mt-3 text-xs text-[var(--fy-faint)]">
                                No staff match &ldquo;{query.trim()}&rdquo;.
                              </p>
                            ) : null}
                          </FyCard>

                          {/* Dark Navy Swirl — Approved OT Hours & Memos */}
                          <motion.section
                            variants={cardV}
                            style={{ gridArea: "tr" }}
                            aria-label="Approved Overtime Hours"
                            className="fy-swirl flex min-h-[206px] flex-col rounded-[20px] p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-[18px] font-medium tracking-[-0.02em]">
                                Approved OT Hours
                              </h2>
                              <Clock className="h-4 w-4 text-[#e6d8bf]" />
                            </div>
                            <p className="mt-auto pt-3 text-center text-[36px] font-semibold tracking-[-0.03em] xl:text-[40px]">
                              {approvedOtHours.toFixed(1)}{" "}
                              <span className="text-lg font-medium text-[#dfd0b6]">hrs</span>
                            </p>
                            <p className="mt-1 text-center text-xs text-[#dfd0b6]">
                              {announcements.length} published company{" "}
                              {announcements.length === 1 ? "memo" : "memos"}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => go("memos")}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#f5efe4] px-4 text-xs font-semibold text-[#0b1933]"
                              >
                                <Megaphone className="h-3.5 w-3.5" />
                                Post Memo
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setQueueFilter("overtime");
                                  go("queue");
                                }}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/14 px-3.5 text-xs font-semibold text-[#f5efe4] backdrop-blur-xs hover:bg-white/24"
                              >
                                OT Forms
                              </motion.button>
                            </div>
                          </motion.section>
                        </div>

                        {/* Bottom-Left 5 cols: Recent HR Feed */}
                        <FyCard area="tm" label="Recent HR Submissions">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle>
                              {pendingHrList.length > 0
                                ? "Awaiting HR Endorsement"
                                : "Latest HR Submissions"}
                            </CardTitle>
                            <Chip icon={ClipboardList} onClick={() => go("queue")}>
                              View All
                            </Chip>
                          </div>
                          {recentFeed.length === 0 ? (
                            <div className="mt-5 rounded-2xl bg-muted p-6 text-center">
                              <p className="text-sm font-medium">
                                {q
                                  ? `No HR forms match "${query.trim()}"`
                                  : "No HR forms submitted yet"}
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
                              {recentFeed.map((r, i) => {
                                const canEndorse =
                                  r.hr_status === "pending" &&
                                  r.boss_status !== "approved" &&
                                  !["rejected", "cancelled"].includes(r.status);
                                return (
                                  <motion.li key={r.id} custom={i + 2} variants={rowV}>
                                    <div className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted">
                                      <button
                                        type="button"
                                        onClick={() => onInspect(r)}
                                        className="fy-focus flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
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
                                            {r.employee?.full_name} · {r.reference_no} ·{" "}
                                            {formatDate(r.created_at)}
                                          </span>
                                        </span>
                                      </button>
                                      {canEndorse ? (
                                        <button
                                          type="button"
                                          disabled={quickEndorsingId === r.id}
                                          onClick={() => handleQuickEndorse(r)}
                                          className="fy-primary fy-focus flex-none cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                                        >
                                          {quickEndorsingId === r.id ? "..." : "Send to Boss"}
                                        </button>
                                      ) : (
                                        <span
                                          className={`flex-none rounded-md px-2 py-0.5 text-[11px] font-medium shadow-[inset_0_0_0_1px_currentColor] ${statusPillStyle(
                                            r.status
                                          )}`}
                                        >
                                          {STATUS_META[r.status]?.label ?? r.status}
                                        </span>
                                      )}
                                    </div>
                                  </motion.li>
                                );
                              })}
                            </ul>
                          )}
                        </FyCard>

                        {/* Bottom-Middle 4 cols: HR Endorsement Gauge */}
                        <FyCard area="pg" className="flex flex-col" label="HR Processing Progress">
                          <CardTitle>HR Review Progress</CardTitle>
                          <HrReviewGauge
                            total={hrRequests.length}
                            processed={processedHrCount}
                            pending={pendingHrList.length}
                            closed={closedHrCount}
                          />
                          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-700)]"
                              />
                              Endorsed
                            </li>
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-strong)]"
                              />
                              Pending
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

                      {/* Pending HR Action Cards (if any pending) */}
                      {filteredPendingCards.length > 0 ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-semibold tracking-[-0.02em]">
                              Pending HR Endorsement ({filteredPendingCards.length})
                            </h2>
                            <Chip icon={ClipboardList} onClick={() => go("queue")}>
                              Full HR Queue
                            </Chip>
                          </div>
                          <PendingHrEndorseGrid
                            items={filteredPendingCards}
                            quickEndorsingId={quickEndorsingId}
                            onQuickEndorse={handleQuickEndorse}
                            onInspect={onInspect}
                            q={q}
                          />
                        </div>
                      ) : null}

                      {/* HR Forms Datatable */}
                      <FyCard className="mt-1" label="HR Digital Forms">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle>All HR Digital Forms</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Leave, Overtime, Official Business &amp; Other HR requests synced
                              live with Supabase.
                            </p>
                          </div>
                          <Chip icon={Printer} onClick={() => openHistoryExport(null)}>
                            Export &amp; Print History
                          </Chip>
                        </div>
                        <EmployeeFormsDatatable
                          requests={searchedHrRequests}
                          allowedTypes={HR_TYPES}
                          showEmployee
                          allowCancel={false}
                          onQuickEndorse={handleQuickEndorse}
                          quickEndorsingId={quickEndorsingId}
                          csvFilename="mediq-hr-requests.csv"
                          emptyMessage={
                            q
                              ? `No HR digital forms match "${query.trim()}".`
                              : "No HR digital forms submitted yet."
                          }
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "queue" ? (
                    <>
                      <ViewHead
                        title="HR Forms Queue"
                        sub="Approve & forward Leave, Overtime, Official Business, and HR/Admin requests to Boss — or export full employee history to print & archive in the database."
                        id="fy-h-queue"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => openHistoryExport(null)}
                        >
                          <Printer className="h-4 w-4" />
                          Export &amp; Print History
                        </Magnetic>
                        <Magnetic className="fy-ghost" onClick={() => go("employees")}>
                          <Users className="h-4 w-4" />
                          Staff &amp; Credits
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={filteredQueueTable.length}
                        entityLabel={filteredQueueTable.length === 1 ? "HR form" : "HR forms"}
                        onClear={() => setQuery("")}
                      />

                      <motion.div
                        variants={fileV}
                        className="mb-1 flex flex-wrap items-center justify-between gap-4"
                      >
                        <Seg<HrQueueFilter>
                          id="fy-hr-qfilter"
                          label="Filter HR forms"
                          value={queueFilter}
                          onChange={setQueueFilter}
                          options={[
                            { id: "all", label: `All HR (${hrRequests.length})` },
                            { id: "pending", label: `Pending (${pendingHrList.length})` },
                            { id: "leave", label: "Leave" },
                            { id: "overtime", label: "Overtime" },
                            { id: "other", label: "OB & Admin" },
                          ]}
                        />
                        <p className="px-1 text-sm text-muted-foreground">
                          <b className="font-semibold text-foreground">
                            {filteredQueueTable.length}
                          </b>{" "}
                          {filteredQueueTable.length === 1 ? "form" : "forms"} shown
                        </p>
                      </motion.div>

                      {queueFilter === "pending" && filteredPendingCards.length > 0 ? (
                        <PendingHrEndorseGrid
                          items={filteredPendingCards}
                          quickEndorsingId={quickEndorsingId}
                          onQuickEndorse={handleQuickEndorse}
                          onInspect={onInspect}
                          q={q}
                        />
                      ) : null}

                      <FyCard label="HR Digital Forms Table">
                        <EmployeeFormsDatatable
                          requests={filteredQueueTable}
                          allowedTypes={HR_TYPES}
                          showEmployee
                          allowCancel={false}
                          onQuickEndorse={handleQuickEndorse}
                          quickEndorsingId={quickEndorsingId}
                          csvFilename="mediq-hr-requests.csv"
                          emptyMessage="No HR digital forms match the selected filter."
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "employees" ? (
                    <>
                      <ViewHead
                        title="Staff & Leave Credits"
                        sub="Create immediately confirmed staff accounts, update departments/roles, and edit VL, SL, and EL balances."
                        id="fy-h-employees"
                      />

                      <ActiveSearchBanner
                        query={query}
                        matchCount={filteredProfiles.length}
                        entityLabel={filteredProfiles.length === 1 ? "staff account" : "staff accounts"}
                        onClear={() => setQuery("")}
                      />

                      <div className="space-y-5">
                        <div className="rounded-[20px]">
                          <CreateAccountCard allowBossRole={currentUser?.role === "boss"} />
                        </div>

                        <FyCard className="overflow-hidden !p-0" label="Employee Directory & Leave Credits">
                          <div className="border-b border-border px-5 py-4">
                            <CardTitle>Employee Directory &amp; Leave Balances</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Showing {filteredProfiles.length} staff profiles for{" "}
                              {new Date().getFullYear()}.
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                  <th className="px-5 py-3.5">Employee</th>
                                  <th className="px-4 py-3.5">Department</th>
                                  <th className="px-4 py-3.5">Role</th>
                                  <th className="px-4 py-3.5">VL (Left / Total)</th>
                                  <th className="px-4 py-3.5">SL (Left / Total)</th>
                                  <th className="px-4 py-3.5">EL (Left / Total)</th>
                                  <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/70">
                                {filteredProfiles.map((emp) => {
                                  const bal = balanceMap.get(emp.id);
                                  const isEditing = editingBalanceId === emp.id;
                                  const vlRem =
                                    Number(bal?.vacation_total ?? 15) -
                                    Number(bal?.vacation_used ?? 0);
                                  const slRem =
                                    Number(bal?.sick_total ?? 15) - Number(bal?.sick_used ?? 0);
                                  const elRem =
                                    Number(bal?.emergency_total ?? 5) -
                                    Number(bal?.emergency_used ?? 0);

                                  return (
                                    <tr
                                      key={emp.id}
                                      className="transition-colors hover:bg-muted/40"
                                    >
                                      <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                          <AvatarCircle
                                            name={emp.full_name}
                                            tint="#e6dac6"
                                            size={34}
                                          />
                                          <div>
                                            <p className="font-semibold text-foreground">
                                              <Highlight text={emp.full_name} q={q} />
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                              {emp.employee_code} · {emp.email}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3.5">
                                        <select
                                          value={emp.department}
                                          disabled={savingId === emp.id}
                                          onChange={(e) =>
                                            handleEmployeeMetaUpdate(emp, {
                                              department: e.target.value,
                                            })
                                          }
                                          className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-[var(--fy-600)]"
                                        >
                                          {DEPARTMENTS.map((d) => (
                                            <option key={d} value={d}>
                                              {d}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-3.5">
                                        {emp.role === "boss" && currentUser?.role !== "boss" ? (
                                          <RoleBadge role={emp.role} />
                                        ) : (
                                          <select
                                            value={emp.role}
                                            disabled={savingId === emp.id}
                                            onChange={(e) =>
                                              handleEmployeeMetaUpdate(emp, {
                                                role: e.target.value as UserRole,
                                              })
                                            }
                                            className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground outline-none focus-visible:border-[var(--fy-600)]"
                                          >
                                            <option value="employee">Employee</option>
                                            <option value="hr">HR Admin</option>
                                            <option value="accounting">Accounting</option>
                                            {currentUser?.role === "boss" ? (
                                              <option value="boss">Boss Admin</option>
                                            ) : null}
                                          </select>
                                        )}
                                      </td>
                                      <td className="px-4 py-3.5">
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.vacation_used}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  vacation_used: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                            <span>/</span>
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.vacation_total}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  vacation_total: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                          </div>
                                        ) : (
                                          <span className="font-semibold text-[var(--fy-text)]">
                                            {vlRem} / {Number(bal?.vacation_total ?? 15)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3.5">
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.sick_used}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  sick_used: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                            <span>/</span>
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.sick_total}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  sick_total: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                          </div>
                                        ) : (
                                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                            {slRem} / {Number(bal?.sick_total ?? 15)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3.5">
                                        {isEditing ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.emergency_used}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  emergency_used: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                            <span>/</span>
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={balDraft.emergency_total}
                                              onChange={(e) =>
                                                setBalDraft({
                                                  ...balDraft,
                                                  emergency_total: Number(e.target.value),
                                                })
                                              }
                                              className="w-12 rounded-md border border-border bg-muted px-1.5 py-1 text-xs text-foreground"
                                            />
                                          </div>
                                        ) : (
                                          <span className="font-semibold text-[var(--fy-amber)]">
                                            {elRem} / {Number(bal?.emergency_total ?? 5)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-5 py-3.5 text-right">
                                        {isEditing ? (
                                          <div className="inline-flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveBalance(emp.id)}
                                              disabled={savingId === emp.id}
                                              className="fy-primary inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                                            >
                                              <Save className="h-3.5 w-3.5" />
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingBalanceId(null)}
                                              className="fy-ghost cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => openHistoryExport(emp.id)}
                                              className="fy-chip fy-focus inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                                            >
                                              <Printer className="h-3 w-3" />
                                              Export History
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => startEditBalance(emp.id)}
                                              className="fy-chip fy-focus cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold"
                                            >
                                              Edit Credits
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </FyCard>
                      </div>
                    </>
                  ) : view === "memos" ? (
                    <>
                      <ViewHead
                        title="Company Memos"
                        sub="Publish live HR advisories, holiday schedules, and payroll cut-offs directly to every employee dashboard."
                        id="fy-h-memos"
                      />

                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                        <FyCard className="lg:col-span-2" label="Publish Company Memo">
                          <form onSubmit={handlePostMemo} className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Megaphone className="h-4 w-4 text-[var(--fy-text)]" />
                              <CardTitle>Publish Company Memo</CardTitle>
                            </div>
                            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                              Title *
                              <input
                                type="text"
                                required
                                value={memoTitle}
                                onChange={(e) => setMemoTitle(e.target.value)}
                                placeholder="e.g., Holiday Schedule / Payroll Cut-Off Reminder"
                                className={inputCls}
                              />
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                              Category
                              <select
                                value={memoCategory}
                                onChange={(e) =>
                                  setMemoCategory(e.target.value as Announcement["category"])
                                }
                                className={inputCls}
                              >
                                <option value="hr_policy">HR Policy</option>
                                <option value="holiday">Holiday Notice</option>
                                <option value="payroll">Payroll &amp; Cutoff</option>
                                <option value="urgent">Urgent Advisory</option>
                                <option value="general">General</option>
                              </select>
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                              Message *
                              <textarea
                                rows={4}
                                required
                                value={memoBody}
                                onChange={(e) => setMemoBody(e.target.value)}
                                placeholder="Details for all MediQ employees..."
                                className={`${inputCls} resize-none`}
                              />
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                              <input
                                type="checkbox"
                                checked={memoPinned}
                                onChange={(e) => setMemoPinned(e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-[var(--fy-700)]"
                              />
                              Pin announcement to top
                            </label>
                            <button
                              type="submit"
                              disabled={postingMemo}
                              className="fy-primary fy-focus flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium disabled:opacity-60"
                            >
                              {postingMemo ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Post Announcement
                            </button>
                          </form>
                        </FyCard>

                        <div className="space-y-3 lg:col-span-3">
                          {filteredAnnouncements.length === 0 ? (
                            <FyCard className="py-12 text-center" label="No announcements">
                              <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-2.5 text-sm font-semibold">
                                {q
                                  ? `No memos match "${query.trim()}"`
                                  : "No announcements published yet"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {q
                                  ? "Clear the search filter to see all company memos."
                                  : "Use the form on the left to publish your first company memo."}
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
                            </FyCard>
                          ) : (
                            filteredAnnouncements.map((ann) => (
                              <FyCard
                                key={ann.id}
                                className="flex items-start justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[15px] font-semibold">
                                      {ann.title}
                                    </span>
                                    <span className="rounded-full bg-[var(--fy-soft)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--fy-text)] uppercase">
                                      {ann.category.replace("_", " ")}
                                    </span>
                                    {ann.is_pinned ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fy-amber-bg)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fy-amber)]">
                                        <Pin className="h-3 w-3" /> Pinned
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                    {ann.body}
                                  </p>
                                  <p className="mt-2 text-xs text-[var(--fy-faint)]">
                                    By {ann.author?.full_name ?? "Admin"} ·{" "}
                                    {formatDate(ann.created_at)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMemo(ann.id)}
                                  className="fy-focus grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--fy-rose-bg)] hover:text-[var(--fy-rose)]"
                                  title="Delete announcement"
                                  aria-label={`Delete ${ann.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </FyCard>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <HrSettingsView
                      profile={currentUser}
                      profiles={profiles}
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
          pendingHrCount={pendingHrList.length}
          onSignOut={() => void signOut()}
        />

        <EmployeeHistoryExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          portalRole="hr"
          requests={requests}
          profiles={profiles}
          initialEmployeeId={exportEmpId}
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
                className="max-w-full rounded-full bg-[var(--fy-950)] px-[18px] py-3 text-sm font-medium text-[#f5efe4] shadow-[0_16px_40px_-14px_rgb(13_28_54/0.6)]"
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
