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
  Banknote,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Ellipsis,
  Eye,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Moon,
  Palette,
  PenTool,
  Receipt,
  Save,
  Settings,
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
import { HrMemosBoardView } from "@/components/HrMemosBoardView";
import { ProfileAvatarUploader } from "@/components/ProfileAvatarUploader";
import { SignaturePad } from "@/components/SignaturePad";
import { RequestTypeBadge, RequestTypeIcon } from "@/components/StatusBadges";
import { EmployeeFormsDatatable } from "@/components/ui/employee-forms-datatable";
import {
  ActiveSearchBanner,
  PortalSearchBar,
  matchesRequestSearch,
} from "@/components/ui/portal-search-bar";
import type { Announcement, FormRequest, Profile, RequestType } from "@/types/database";

/* ------------------------------------------------------------------ types */

type AcctView = "dashboard" | "claims" | "overtime" | "disbursed" | "memos" | "settings";
type Theme = "light" | "dark";
type ClaimsFilter = "all" | "verify" | "ready" | "paid";
type OtFilter = "all" | "pending" | "paid";
type SetTab = "profile" | "cashflow" | "look";

export interface MediqAccountingDashboardProps {
  requests: FormRequest[];
  onInspect: (req: FormRequest) => void;
}

/* ---------------------------------------------------------------- constants */

const E_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const E_P4: [number, number, number, number] = [0.16, 1, 0.3, 1];
const E_IN: [number, number, number, number] = [0.4, 0, 1, 1];
const E_INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

const FINANCE_TYPES: RequestType[] = ["reimbursement", "cash_advance"];
const ALL_ACCT_TYPES: RequestType[] = ["reimbursement", "cash_advance", "overtime"];

const ACCT_BAR_CATEGORIES: { type: RequestType; shortCode: string }[] = [
  { type: "reimbursement", shortCode: "RB" },
  { type: "cash_advance", shortCode: "CA" },
  { type: "overtime", shortCode: "OT" },
];

const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "#163362", label: "Dark Navy", hex: "#163362" },
  { id: "#0f2942", label: "Midnight Navy", hex: "#0f2942" },
  { id: "#1f4fa8", label: "MediQ Royal", hex: "#1f4fa8" },
  { id: "#1d7347", label: "Forest", hex: "#1d7347" },
];

interface NavItem {
  id: AcctView;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "menu",
    label: "Finance & Payroll",
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "claims", label: "Reimbursements & CA", icon: Receipt },
      { id: "overtime", label: "Overtime Payroll", icon: Clock },
      { id: "disbursed", label: "Disbursed Ledger", icon: FileSpreadsheet },
      { id: "memos", label: "HR Memos", icon: Megaphone },
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
  { id: "profile", label: "Finance E-Sig", icon: UserRound },
  { id: "cashflow", label: "Cashflow Summary", icon: Banknote },
  { id: "look", label: "Appearance", icon: Palette },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "AC";

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
  avatarUrl,
}: {
  name: string;
  tint?: string;
  size?: number;
  avatarUrl?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);
  const showPhoto = Boolean(avatarUrl && !imgFailed);
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center overflow-hidden rounded-full font-semibold tracking-[0.02em] text-[#0d1c36]"
      style={{
        width: size,
        height: size,
        background: tint,
        fontSize: Math.round(size * 0.32),
      }}
    >
      {showPhoto ? (
        <img
          src={avatarUrl!}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
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

function CountUp({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const v = useCountUp(value);
  return (
    <>
      {decimals > 0 ? v.toFixed(decimals) : Math.round(v)}
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
  decimals = 0,
  suffix = "",
  note,
  badge,
  hero,
  area,
  onOpen,
}: {
  title: string;
  value: number;
  decimals?: number;
  suffix?: string;
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
      aria-label={`Open ${title}: ${value}${suffix}`}
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
        <CountUp value={value} decimals={decimals} suffix={suffix} />
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

function FinanceVolumeBarsCard({
  requests,
  onOpenLedger,
  onSelectCategory,
}: {
  requests: FormRequest[];
  onOpenLedger: () => void;
  onSelectCategory: (type: RequestType) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  const bars = useMemo(() => {
    const counts = ACCT_BAR_CATEGORIES.map((f) => {
      const subset = requests.filter((r) => r.request_type === f.type);
      const totalPhp = subset.reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const totalHrs = subset.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
      return {
        ...f,
        label: REQUEST_TYPE_META[f.type].shortLabel,
        full: REQUEST_TYPE_META[f.type].label,
        count: subset.length,
        detail:
          f.type === "overtime"
            ? `${subset.length} · ${totalHrs.toFixed(1)}h`
            : `${subset.length} · ${formatPHP(totalPhp)}`,
      };
    });
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
  }, [requests]);

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
        <CardTitle id={`${id}-h`}>Finance &amp; Payroll Volume</CardTitle>
        <Chip icon={FileSpreadsheet} onClick={onOpenLedger}>
          Ledger
        </Chip>
      </div>
      <ol className="mt-9 grid min-h-[168px] flex-1 grid-cols-3 gap-4 sm:gap-6 xl:min-h-[155px]">
        {bars.map((bar, i) => (
          <li key={bar.type} className="grid min-w-0 grid-rows-[1fr_auto] gap-2.5">
            <button
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              type="button"
              aria-label={`${bar.full}, ${bar.detail}`}
              aria-pressed={sel === i}
              onPointerEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => {
                setSel(i);
                onSelectCategory(bar.type);
              }}
              style={{ height: `${bar.pct}%` }}
              className="fy-focus relative mx-auto min-h-10 w-full max-w-[58px] cursor-pointer self-end overflow-hidden rounded-full [-webkit-tap-highlight-color:transparent]"
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
              {bar.label}
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
        {activeBar.label} · {activeBar.detail}
      </motion.div>
    </motion.section>
  );
}

function DisbursementGauge({
  total,
  paid,
  inPipeline,
  closed,
}: {
  total: number;
  paid: number;
  inPipeline: number;
  closed: number;
}) {
  const raw = useId();
  const pid = `fy-accthatch-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  const pct = useCountUp(total ? Math.round((paid / total) * 100) : 0, {
    duration: 1.2,
    delay: 0.35,
  });

  const entries = [
    { k: "paid", len: share(paid), stroke: "var(--fy-700)" },
    { k: "pipeline", len: share(inPipeline), stroke: "var(--fy-strong)" },
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
        <span className="mt-1 text-[13px] text-muted-foreground">Disbursed / Paid</span>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- verify cards */

function PendingVerifyGrid({
  items,
  quickVerifyingId,
  onQuickVerify,
  onInspect,
  q,
}: {
  items: FormRequest[];
  quickVerifyingId: string | null;
  onQuickVerify: (req: FormRequest) => void;
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

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-muted px-3 py-2 text-xs">
              {req.amount != null ? (
                <span className="font-bold text-[var(--fy-text)]">
                  {formatPHP(req.amount)}
                </span>
              ) : null}
              {req.total_hours != null ? (
                <span className="font-semibold text-[var(--fy-text)]">
                  {req.total_hours} hrs OT · {formatDate(req.start_date)}
                </span>
              ) : null}
              {req.receipt_or_number ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  OR #{req.receipt_or_number}
                </span>
              ) : null}
              {req.boss_status === "approved" ? (
                <span className="rounded-md bg-[var(--fy-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--fy-text)]">
                  Boss Approved
                </span>
              ) : null}
              <span className="ml-auto font-mono text-[11px] text-[var(--fy-faint)]">
                {REQUEST_TYPE_META[req.request_type].formCode}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/80 pt-3.5">
            <button
              type="button"
              disabled={quickVerifyingId === req.id}
              onClick={() => onQuickVerify(req)}
              className="fy-primary fy-focus inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold disabled:opacity-60"
            >
              {quickVerifyingId === req.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              1-Click Verify
            </button>
            <button
              type="button"
              onClick={() => onInspect(req)}
              className="fy-ghost fy-focus inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold"
            >
              <Eye className="h-3.5 w-3.5" />
              Receipts / Mark Paid
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

function AccountingSettingsView({
  profile,
  readyToDisbursePhp,
  totalDisbursedPhp,
  pendingVerifyPhp,
  approvedOtHours,
  theme,
  onTheme,
  accent,
  onAccent,
  onToast,
}: {
  profile: Profile | null;
  readyToDisbursePhp: number;
  totalDisbursedPhp: number;
  pendingVerifyPhp: number;
  approvedOtHours: number;
  theme: Theme;
  onTheme: (t: Theme) => void;
  accent: string;
  onAccent: (hex: string) => void;
  onToast: (msg: string) => void;
}) {
  const { saveProfile, refreshAll } = useAppData();
  const { toast } = useToast();
  const [tab, setTab] = useState<SetTab>("profile");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "Finance & Accounting");
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
      onToast("Accounting profile & signature stamp saved");
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

  const inputCls =
    "h-12 w-full rounded-xl border-[1.5px] border-border bg-muted px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--fy-600)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--fy-600)_20%,transparent)]";
  const labelCls = "grid min-w-0 gap-1.5 text-[13.5px] font-medium text-muted-foreground";

  return (
    <>
      <ViewHead
        title="Accounting Settings"
        sub="Save your default Accounting approval signature stamp, review cashflow totals, and customize appearance."
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
                      layoutId="fy-acct-set-pill"
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
                  {profile ? (
                    <ProfileAvatarUploader
                      profileId={profile.id}
                      fullName={fullName || profile.full_name || "Accounting"}
                      subtitle={`${profile.employee_code ?? ""} · ${profile.email}`}
                      heading="Finance Profile & Verification E-Signature"
                      avatarUrl={profile.avatar_url}
                      onUploaded={async () => {
                        await refreshAll();
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <AvatarCircle name={fullName || "Accounting"} tint="#e6dac6" size={60} />
                      <div className="min-w-0">
                        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                          Finance Profile &amp; Verification E-Signature
                        </h2>
                      </div>
                    </div>
                  )}

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

                  <div className="rounded-2xl border border-border bg-card p-4 text-foreground">
                    <p className="mb-3 text-xs font-semibold text-muted-foreground">
                      Default Accounting Verification Stamp (appears on verified &amp; paid digital
                      vouchers)
                    </p>
                    <SignaturePad
                      signerName={fullName || profile?.full_name || "Accounting Admin"}
                      initialSignature={signatureData || null}
                      onChange={handleSigChange}
                      adaptiveTheme
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
                      {saving ? "Saving..." : saved ? "Saved!" : "Save Finance Stamp"}
                    </button>
                  </div>
                </form>
              ) : tab === "cashflow" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                      Cashflow &amp; Payroll Totals
                    </h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">
                      Live PHP disbursement pipeline across Reimbursements, Cash Advances &amp; OT.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { label: "Total Disbursed", val: formatPHP(totalDisbursedPhp) },
                      { label: "Ready to Release", val: formatPHP(readyToDisbursePhp) },
                      { label: "Pending Verification", val: formatPHP(pendingVerifyPhp) },
                      { label: "Approved Payroll OT", val: `${approvedOtHours.toFixed(1)} hrs` },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="rounded-2xl border border-border bg-muted p-4"
                      >
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                          {row.label}
                        </p>
                        <p className="mt-1.5 text-2xl font-bold tabular-nums">{row.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-7">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Appearance</h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">
                      Theme and accent color re-tint your Accounting Portal immediately.
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
  pendingVerifyCount,
  pendingOtCount,
  unreadMemos,
  totalMemos,
  paidPct,
  hasSignature,
  onQuickAction,
  onSignOut,
}: {
  view: AcctView;
  onGo: (v: AcctView) => void;
  dark: boolean;
  pendingVerifyCount: number;
  pendingOtCount: number;
  unreadMemos: number;
  totalMemos: number;
  paidPct: number;
  hasSignature: boolean;
  onQuickAction: () => void;
  onSignOut: () => void;
}) {
  const reduce = useReducedMotion();
  const [scope, run] = useAnimate<HTMLSpanElement>();
  const refs = useRef<Partial<Record<AcctView, HTMLButtonElement | null>>>({});
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
      className="fy-scroll hidden w-[236px] flex-none flex-col overflow-y-auto overscroll-contain rounded-[26px] bg-muted pb-[18px] pt-[22px] lg:sticky lg:top-4 lg:flex lg:h-[calc(100dvh-32px)] xl:w-[264px]"
    >
      <div className="flex items-center gap-3 px-[24px]">
        <BrandMark dark={dark} />
        <div className="min-w-0">
          <span className="block truncate text-[19px] font-semibold leading-tight tracking-[-0.03em]">
            MediQ Finance
          </span>
          <span className="block truncate text-[11.5px] font-medium text-muted-foreground">
            Accounting &amp; Payroll
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
          <nav key={g.id} aria-labelledby={`fy-acnav-${g.id}`} className={gi ? "mt-5" : ""}>
            <p
              id={`fy-acnav-${g.id}`}
              className="px-7 pb-2.5 text-xs font-medium uppercase tracking-[0.06em] text-[var(--fy-faint)]"
            >
              {g.label}
            </p>
            <ul>
              {g.items.map((n) => {
                const on = n.id === view;
                const Icon = n.icon;
                const badgeCount =
                  n.id === "claims"
                    ? pendingVerifyCount
                    : n.id === "overtime"
                      ? pendingOtCount
                      : null;
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
                      {badgeCount !== null ? (
                        <motion.span
                          key={badgeCount}
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                          className="ml-auto rounded-md bg-[var(--fy-950)] px-[7px] py-0.5 text-[10.5px] font-semibold text-[#f5efe4]"
                        >
                          {badgeCount}
                        </motion.span>
                      ) : n.id === "memos" && (unreadMemos > 0 || totalMemos > 0) ? (
                        <motion.span
                          key={`${unreadMemos}-${totalMemos}`}
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.45 }}
                          className={`ml-auto rounded-md px-[7px] py-0.5 text-[10.5px] font-semibold ${
                            unreadMemos > 0
                              ? "bg-[var(--fy-rose)] text-[#081428]"
                              : "bg-[var(--fy-soft)] text-[var(--fy-text)]"
                          }`}
                        >
                          {unreadMemos > 0 ? `${unreadMemos} new` : totalMemos}
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
            <Banknote className="h-[15px] w-[15px]" strokeWidth={2.1} />
          ) : (
            <PenTool className="h-[14px] w-[14px]" strokeWidth={2.1} />
          )}
        </span>
        <p className="mt-3 text-[18px] font-medium leading-[1.2] tracking-[-0.02em]">
          {hasSignature ? "Finance Stamp Ready" : "Setup Finance Stamp"}
        </p>
        <p className="mt-1.5 text-xs text-[#dfd0b6]">
          {hasSignature
            ? `${paidPct}% disbursements settled`
            : "Save e-signature for voucher release"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(245_239_228/0.18)]">
          <motion.div
            className="h-full origin-left rounded-full bg-[#f5efe4]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hasSignature ? Math.max(0.2, paidPct / 100) : 0.25 }}
            transition={{ duration: 0.9, ease: E_OUT, delay: 0.4 }}
          />
        </div>
        <button
          type="button"
          onClick={onQuickAction}
          className="mt-4 block w-full cursor-pointer rounded-full bg-[var(--fy-800)] p-2.5 text-center text-[13.5px] font-semibold text-inherit transition-colors hover:bg-[var(--fy-700)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#f5efe4]"
        >
          {hasSignature ? "Open Disbursed Ledger" : "Add E-Signature"}
        </button>
      </div>
    </motion.aside>
  );
}

const PHONE_IDS: AcctView[] = ["dashboard", "claims", "overtime"];
const PHONE_MAIN = NAV.filter((n) => PHONE_IDS.includes(n.id));
const PHONE_MORE = NAV.filter((n) => !PHONE_IDS.includes(n.id));

function TabBar({
  view,
  onGo,
  pendingVerifyCount,
  pendingOtCount,
  onSignOut,
}: {
  view: AcctView;
  onGo: (v: AcctView) => void;
  pendingVerifyCount: number;
  pendingOtCount: number;
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
      layoutId="fy-acct-tab-pill"
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
            aria-label="More accounting pages"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            className="fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[41] mx-auto max-w-[360px] origin-bottom-right rounded-[22px] bg-card p-2.5 shadow-[var(--fy-pop)]"
          >
            <div className="flex items-center justify-between px-2.5 pb-1 pt-1">
              <p className="text-[15px] font-semibold">Finance Menu</p>
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
              n.id === "claims" ? "Claims" : n.id === "overtime" ? "OT Pay" : "Home";
            const badge =
              n.id === "claims"
                ? pendingVerifyCount
                : n.id === "overtime"
                  ? pendingOtCount
                  : 0;
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
                    {badge > 0 ? (
                      <span className="absolute -right-3.5 -top-1.5 rounded-md bg-[var(--fy-950)] px-1 text-[9.5px] leading-[14px] text-[#f5efe4] shadow-[0_0_0_2px_var(--card)]">
                        {badge}
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

function AcctNotificationTray({
  pendingItems,
  announcements,
  seenMemoIds,
  readIds,
  onMarkAllRead,
  onInspect,
  onOpenMemo,
  onClose,
  bellRef,
}: {
  pendingItems: FormRequest[];
  announcements: Announcement[];
  seenMemoIds: Set<number>;
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onInspect: (req: FormRequest) => void;
  onOpenMemo: (ann: Announcement) => void;
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
      aria-label="Pending Accounting Notifications"
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.15 } }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="fixed inset-x-3 top-[76px] z-50 origin-top-right rounded-[20px] bg-card p-4 shadow-[var(--fy-pop)] sm:absolute sm:inset-x-auto sm:right-[-8px] sm:top-[calc(100%+12px)] sm:w-[360px]"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <p className="font-semibold">Finance Alerts &amp; HR Memos</p>
        {pendingItems.length > 0 || announcements.length > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="fy-focus cursor-pointer rounded-md text-[13px] font-semibold text-[var(--fy-text)] hover:underline hover:underline-offset-[3px]"
          >
            Mark read
          </button>
        ) : null}
      </div>
      {pendingItems.length === 0 && announcements.length === 0 ? (
        <p className="rounded-[14px] bg-muted p-4 text-center text-xs text-muted-foreground">
          All caught up — zero claims, OT slips, or unread HR memos.
        </p>
      ) : (
        <ul className="grid max-h-[360px] gap-1 overflow-y-auto">
          {announcements.slice(0, 4).map((ann) => (
            <li key={`memo-${ann.id}`}>
              <button
                type="button"
                onClick={() => {
                  onOpenMemo(ann);
                  onClose();
                }}
                className={`fy-focus flex w-full cursor-pointer items-start gap-3 rounded-[14px] p-2.5 text-left text-[13.5px] leading-[1.4] text-muted-foreground transition-colors hover:bg-muted ${
                  !seenMemoIds.has(ann.id) ? "bg-[var(--fy-soft)]" : ""
                }`}
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#d9c7a7] text-[#081428]">
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="font-semibold text-foreground">
                    {ann.author?.full_name ?? "HR Admin"}
                  </b>{" "}
                  posted memo <b className="font-semibold text-foreground">{ann.title}</b>
                  <span className="mt-0.5 block text-xs text-[var(--fy-faint)]">
                    HR Memo · {formatDate(ann.created_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {pendingItems.slice(0, 6).map((req) => (
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
                  avatarUrl={req.employee?.avatar_url}
                />
                <span className="min-w-0 flex-1">
                  <b className="font-semibold text-foreground">
                    {req.employee?.full_name ?? "Staff"}
                  </b>{" "}
                  submitted <b className="font-semibold text-foreground">{req.title}</b>
                  <span className="mt-0.5 block text-xs text-[var(--fy-faint)]">
                    {req.reference_no}
                    {req.amount != null ? ` · ${formatPHP(req.amount)}` : ""}
                    {req.total_hours != null ? ` · ${req.total_hours}h OT` : ""}
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

export function MediqAccountingDashboard({
  requests,
  onInspect,
}: MediqAccountingDashboardProps) {
  const { signOut } = useAuth();
  const { activeProfile: profile, announcements, performReview } = useAppData();
  const { toast } = useToast();

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem("mediq-portal-theme-v2") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [accent, setAccent] = useState<string>(() => {
    try {
      return localStorage.getItem("mediq-portal-accent-v2") || "#0f2942";
    } catch {
      return "#0f2942";
    }
  });

  const [view, setView] = useState<AcctView>("dashboard");
  const [query, setQuery] = useState("");
  const [claimsFilter, setClaimsFilter] = useState<ClaimsFilter>("all");
  const [otFilter, setOtFilter] = useState<OtFilter>("all");
  const [tray, setTray] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [seenMemoIds, setSeenMemoIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(`mediq-seen-memos-${profile?.id ?? "acct"}`);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });
  const prevMemoIdsRef = useRef<Set<number> | null>(null);
  const persistSeenMemos = useCallback(
    (next: Set<number>) => {
      setSeenMemoIds(next);
      try {
        localStorage.setItem(
          `mediq-seen-memos-${profile?.id ?? "acct"}`,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // ignore
      }
    },
    [profile?.id]
  );
  const markAllMemosRead = useCallback(() => {
    const next = new Set(seenMemoIds);
    for (const a of announcements) next.add(a.id);
    persistSeenMemos(next);
  }, [announcements, seenMemoIds, persistSeenMemos]);
  useEffect(() => {
    const cur = new Set(announcements.map((a) => a.id));
    if (prevMemoIdsRef.current !== null) {
      const newest = announcements.find((a) => !prevMemoIdsRef.current!.has(a.id));
      if (newest) setToastMsg({ id: Date.now(), msg: `New HR Memo: ${newest.title}` });
    }
    prevMemoIdsRef.current = cur;
  }, [announcements]);
  const [quickVerifyingId, setQuickVerifyingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ id: number; msg: string } | null>(null);

  const bellRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-portal-theme-v2", theme);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("fy-light", theme === "light");
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("mediq-portal-accent-v2", accent);
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

  const go = (v: AcctView) => {
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
  const fullName = profile?.full_name || "Accounting Admin";
  const firstName = fullName.split(/\s+/)[0] || "Finance";
  const hasSignature = Boolean(profile?.signature_data);

  const financialRequests = useMemo(
    () => requests.filter((r) => FINANCE_TYPES.includes(r.request_type)),
    [requests]
  );

  const overtimeRequests = useMemo(
    () => requests.filter((r) => r.request_type === "overtime"),
    [requests]
  );

  const allAcctRequests = useMemo(
    () => requests.filter((r) => ALL_ACCT_TYPES.includes(r.request_type)),
    [requests]
  );

  const disbursedRequests = useMemo(
    () => allAcctRequests.filter((r) => r.status === "paid" || r.boss_status === "approved"),
    [allAcctRequests]
  );

  const pendingVerifyList = useMemo(
    () =>
      financialRequests.filter(
        (r) =>
          r.accounting_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
      ),
    [financialRequests]
  );

  const pendingOtList = useMemo(
    () =>
      overtimeRequests.filter(
        (r) =>
          r.accounting_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
      ),
    [overtimeRequests]
  );

  const pendingAllAcct = useMemo(
    () =>
      allAcctRequests.filter(
        (r) =>
          r.accounting_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
      ),
    [allAcctRequests]
  );

  const pendingVerifyPhp = useMemo(
    () => pendingVerifyList.reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
    [pendingVerifyList]
  );

  const readyToDisbursePhp = useMemo(
    () =>
      financialRequests
        .filter((r) => ["approved", "accounting_verified"].includes(r.status))
        .reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
    [financialRequests]
  );

  const totalDisbursedPhp = useMemo(
    () =>
      financialRequests
        .filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
    [financialRequests]
  );

  const approvedOtHours = useMemo(
    () =>
      overtimeRequests
        .filter((r) => ["approved", "paid"].includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_hours ?? 0), 0),
    [overtimeRequests]
  );

  const closedAcctCount = useMemo(
    () => allAcctRequests.filter((r) => ["rejected", "cancelled"].includes(r.status)).length,
    [allAcctRequests]
  );

  const inPipelineCount = Math.max(
    0,
    allAcctRequests.length - disbursedRequests.length - closedAcctCount
  );

  const paidPct = allAcctRequests.length
    ? Math.round((disbursedRequests.length / allAcctRequests.length) * 100)
    : 0;

  const totalTrackedPhp = readyToDisbursePhp + totalDisbursedPhp + pendingVerifyPhp;

  /* Search & Filter slices */
  const matchesQuery = (r: FormRequest) => matchesRequestSearch(r, q);

  const searchedAllAcctRequests = useMemo(
    () => allAcctRequests.filter((r) => matchesRequestSearch(r, q)),
    [allAcctRequests, q]
  );

  const searchedFinancialRequests = useMemo(
    () => financialRequests.filter((r) => matchesRequestSearch(r, q)),
    [financialRequests, q]
  );

  const filteredClaimsTable = useMemo(() => {
    return searchedFinancialRequests.filter((r) => {
      if (
        claimsFilter === "verify" &&
        !(
          r.accounting_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
        )
      )
        return false;
      if (
        claimsFilter === "ready" &&
        !(r.boss_status !== "approved" && ["approved", "accounting_verified"].includes(r.status))
      )
        return false;
      if (claimsFilter === "paid" && !(r.status === "paid" || r.boss_status === "approved"))
        return false;
      return true;
    });
  }, [searchedFinancialRequests, claimsFilter]);

  const filteredOtTable = useMemo(() => {
    return overtimeRequests.filter((r) => {
      if (
        otFilter === "pending" &&
        !(
          r.accounting_status === "pending" &&
          r.boss_status !== "approved" &&
          !["rejected", "cancelled"].includes(r.status)
        )
      )
        return false;
      if (otFilter === "paid" && !(r.status === "paid" || r.boss_status === "approved"))
        return false;
      return matchesRequestSearch(r, q);
    });
  }, [overtimeRequests, otFilter, q]);

  const filteredDisbursedTable = useMemo(
    () => disbursedRequests.filter((r) => matchesRequestSearch(r, q)),
    [disbursedRequests, q]
  );

  const filteredPendingCards = useMemo(
    () => pendingAllAcct.filter((r) => matchesRequestSearch(r, q)),
    [pendingAllAcct, q]
  );

  const spotlightReq = useMemo(
    () =>
      filteredPendingCards.find((r) => r.priority === "urgent") ??
      filteredPendingCards[0] ??
      null,
    [filteredPendingCards]
  );

  const recentFeed = useMemo(() => {
    const src = pendingAllAcct.length > 0 ? pendingAllAcct : allAcctRequests;
    return src.filter((r) => matchesRequestSearch(r, q)).slice(0, 5);
  }, [pendingAllAcct, allAcctRequests, q]);

  const unreadMemosCount = useMemo(
    () => announcements.filter((a) => !seenMemoIds.has(a.id)).length,
    [announcements, seenMemoIds]
  );
  const unreadNoticeCount =
    pendingAllAcct.filter((r) => !readIds.has(r.id)).length + unreadMemosCount;
  const hasUnread = unreadNoticeCount > 0;

  /* Live Actions */
  const handleQuickVerify = async (req: FormRequest) => {
    setQuickVerifyingId(req.id);
    try {
      await performReview({
        requestId: req.id,
        action: "accounting_verify",
        remarks: "Receipts & amounts verified by Accounting Admin",
      });
      toast(
        "Approved by Accounting & Sent to Boss!",
        `${req.reference_no} (${req.employee?.full_name ?? "Employee"}) verified and forwarded to Boss Executive for final sign-off.`
      );
      say(`Sent ${req.reference_no} to Boss`);
    } catch (err) {
      toast("Verification failed", err instanceof Error ? err.message : "Try again.", "error");
    } finally {
      setQuickVerifyingId(null);
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
            pendingVerifyCount={pendingVerifyList.length}
            pendingOtCount={pendingOtList.length}
            unreadMemos={unreadMemosCount}
            totalMemos={announcements.length}
            paidPct={paidPct}
            hasSignature={hasSignature}
            onQuickAction={() => go(hasSignature ? "disbursed" : "settings")}
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
                id="fy-acct-search"
                query={query}
                onQueryChange={setQuery}
                ariaLabel="Search claims, OR numbers, employees, or overtime payroll"
                placeholder="Search employee, ref #, OR #, merchant, status..."
                requests={allAcctRequests}
                showEmployee
                onInspectRequest={onInspect}
                onViewAllMatches={() => {
                  setClaimsFilter("all");
                  go("claims");
                }}
                viewAllLabel="View in Claims Queue"
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
                    aria-label="Pending finance notifications"
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
                          className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--fy-rose)] px-1 text-[10px] font-bold text-[#081428] shadow-[0_0_0_2px_var(--card)]"
                        >
                          {unreadNoticeCount > 9 ? "9+" : unreadNoticeCount}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                  <AnimatePresence>
                    {tray ? (
                      <AcctNotificationTray
                        pendingItems={pendingAllAcct}
                        announcements={announcements}
                        seenMemoIds={seenMemoIds}
                        readIds={readIds}
                        bellRef={bellRef}
                        onClose={() => setTray(false)}
                        onMarkAllRead={() => {
                          setReadIds(new Set(pendingAllAcct.map((r) => r.id)));
                          markAllMemosRead();
                        }}
                        onOpenMemo={(ann) => {
                          const next = new Set(seenMemoIds);
                          next.add(ann.id);
                          persistSeenMemos(next);
                          go("memos");
                        }}
                        onInspect={onInspect}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => go("settings")}
                  aria-label={`Accounting profile for ${fullName}`}
                  className="fy-focus hidden cursor-pointer items-center gap-3 rounded-full py-0.5 pl-0.5 pr-2 text-left sm:flex"
                >
                  <AvatarCircle name={fullName} tint="#e6dac6" size={44} avatarUrl={profile?.avatar_url} />
                  <span className="hidden xl:grid">
                    <span className="max-w-[180px] truncate text-[15px] font-medium leading-tight">
                      {fullName}
                    </span>
                    <span className="max-w-[180px] truncate text-[12.5px] text-muted-foreground">
                      Accounting · Finance &amp; Payroll
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
                        title="Finance & Payroll"
                        sub={`Welcome, ${firstName} — verify Official Receipts, release Reimbursements & Cash Advances, and process Overtime payroll.`}
                        id="fy-h-dashboard"
                      >
                        <Magnetic
                          className="fy-primary"
                          onClick={() => go("claims")}
                        >
                          <Receipt className="h-4 w-4" />
                          Claims Queue ({pendingVerifyList.length})
                        </Magnetic>
                        <Magnetic
                          className="fy-ghost"
                          onClick={() => go("overtime")}
                        >
                          <Clock className="h-4 w-4" />
                          OT Payroll ({pendingOtList.length})
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={searchedAllAcctRequests.length}
                        entityLabel={
                          searchedAllAcctRequests.length === 1 ? "finance/OT record" : "finance/OT records"
                        }
                        onClear={() => setQuery("")}
                      />

                      {/* 12-Column Fernly Accounting Grid */}
                      <div className="fy-grid">
                        <StatCard
                          area="s1"
                          hero
                          title="To Verify"
                          value={pendingVerifyList.length}
                          badge={pendingVerifyList.length > 0 ? "Action" : "Clear"}
                          note="Reimbursements & CA queue"
                          onOpen={() => {
                            setClaimsFilter("verify");
                            go("claims");
                          }}
                        />
                        <StatCard
                          area="s2"
                          title="OT Payroll Queue"
                          value={pendingOtList.length}
                          badge={pendingOtList.length > 0 ? "Pending" : "Clear"}
                          note="Overtime awaiting payroll"
                          onOpen={() => {
                            setOtFilter("pending");
                            go("overtime");
                          }}
                        />
                        <StatCard
                          area="s3"
                          title="Disbursed Slips"
                          value={disbursedRequests.length}
                          badge={`${paidPct}%`}
                          note="Settled payouts & payroll"
                          onOpen={() => go("disbursed")}
                        />
                        <StatCard
                          area="s4"
                          title="Payroll OT Hours"
                          value={approvedOtHours}
                          decimals={1}
                          suffix="h"
                          badge="Approved"
                          note="Total approved billable OT"
                          onOpen={() => {
                            setOtFilter("all");
                            go("overtime");
                          }}
                        />

                        {/* Left 6 cols: Finance & Payroll Volume Pill Bars */}
                        <FinanceVolumeBarsCard
                          requests={allAcctRequests}
                          onOpenLedger={() => go("disbursed")}
                          onSelectCategory={(type) => {
                            if (type === "overtime") {
                              setOtFilter("all");
                              go("overtime");
                            } else {
                              setClaimsFilter("all");
                              go("claims");
                            }
                          }}
                        />

                        {/* Middle 3 cols: Next Verification Spotlight */}
                        <FyCard area="re" className="flex flex-col" label="Next Verification">
                          <CardTitle>Next Verification</CardTitle>
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
                                  {spotlightReq.amount != null
                                    ? ` · ${formatPHP(spotlightReq.amount)}`
                                    : spotlightReq.total_hours != null
                                      ? ` · ${spotlightReq.total_hours}h OT`
                                      : ""}
                                </p>
                              </button>
                              <button
                                type="button"
                                disabled={quickVerifyingId === spotlightReq.id}
                                onClick={() => handleQuickVerify(spotlightReq)}
                                className="fy-primary fy-focus mt-auto inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14.5px] font-medium disabled:opacity-60"
                              >
                                {quickVerifyingId === spotlightReq.id ? (
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
                                All verified
                              </p>
                              <p className="mb-5 mt-2 text-[13.5px] text-muted-foreground">
                                Zero claims or overtime slips are currently awaiting receipt
                                verification.
                              </p>
                              <button
                                type="button"
                                onClick={() => go("disbursed")}
                                className="fy-primary fy-focus mt-auto inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[14.5px] font-medium"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                                Open Disbursed Ledger
                              </button>
                            </>
                          )}
                        </FyCard>

                        {/* Right 3 cols Stack: Cashflow Pipeline + Dark Swirl Total Disbursed */}
                        <div className="fy-side">
                          <FyCard
                            area="pr"
                            className="fy-grow flex flex-col"
                            label="Cashflow Pipeline"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle>PHP Pipeline</CardTitle>
                              <Chip icon={Receipt} onClick={() => go("claims")}>
                                Claims
                              </Chip>
                            </div>
                            <div className="mt-4 space-y-3">
                              {[
                                {
                                  label: "Ready to Release",
                                  amount: readyToDisbursePhp,
                                  dot: "bg-[var(--fy-700)]",
                                  onClick: () => {
                                    setClaimsFilter("ready");
                                    go("claims");
                                  },
                                },
                                {
                                  label: "Pending Verification",
                                  amount: pendingVerifyPhp,
                                  dot: "bg-[var(--fy-400)]",
                                  onClick: () => {
                                    setClaimsFilter("verify");
                                    go("claims");
                                  },
                                },
                                {
                                  label: "Disbursed / Paid",
                                  amount: totalDisbursedPhp,
                                  dot: "bg-[var(--fy-strong)]",
                                  onClick: () => go("disbursed"),
                                },
                              ].map((row) => (
                                <button
                                  key={row.label}
                                  type="button"
                                  onClick={row.onClick}
                                  className="fy-focus flex w-full cursor-pointer items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left text-xs transition-colors hover:bg-[var(--fy-soft)]"
                                >
                                  <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
                                    <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                                    {row.label}
                                  </span>
                                  <span className="font-bold tabular-nums text-foreground">
                                    {formatPHP(row.amount)}
                                  </span>
                                </button>
                              ))}

                              <div className="pt-1">
                                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="bg-[var(--fy-700)] transition-all"
                                    style={{
                                      width: `${
                                        totalTrackedPhp > 0
                                          ? (totalDisbursedPhp / totalTrackedPhp) * 100
                                          : 0
                                      }%`,
                                    }}
                                  />
                                  <div
                                    className="bg-[var(--fy-400)] transition-all"
                                    style={{
                                      width: `${
                                        totalTrackedPhp > 0
                                          ? (readyToDisbursePhp / totalTrackedPhp) * 100
                                          : 0
                                      }%`,
                                    }}
                                  />
                                </div>
                                <p className="mt-1.5 text-right text-[11px] text-[var(--fy-faint)]">
                                  Total tracked: {formatPHP(totalTrackedPhp)}
                                </p>
                              </div>
                            </div>
                          </FyCard>

                          {/* Dark Navy Swirl — Total Disbursed */}
                          <motion.section
                            variants={cardV}
                            style={{ gridArea: "tr" }}
                            aria-label="Total Disbursed"
                            className="fy-swirl flex min-h-[206px] flex-col rounded-[20px] p-[18px] shadow-[var(--fy-shadow)] sm:p-5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-[18px] font-medium tracking-[-0.02em]">
                                Total Disbursed
                              </h2>
                              <Wallet className="h-4 w-4 text-[#e6d8bf]" />
                            </div>
                            <p className="mt-auto pt-3 text-center text-[34px] font-semibold tracking-[-0.03em] xl:text-[38px]">
                              {totalDisbursedPhp > 0 ? formatPHP(totalDisbursedPhp) : "₱0"}
                            </p>
                            <p className="mt-1 text-center text-xs text-[#dfd0b6]">
                              Ready to release: {formatPHP(readyToDisbursePhp)}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setClaimsFilter("ready");
                                  go("claims");
                                }}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#f5efe4] px-4 text-xs font-semibold text-[#0b1933]"
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                Release Pay
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => go("disbursed")}
                                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/14 px-3.5 text-xs font-semibold text-[#f5efe4] backdrop-blur-xs hover:bg-white/24"
                              >
                                Ledger
                              </motion.button>
                            </div>
                          </motion.section>
                        </div>

                        {/* Bottom-Left 5 cols: Recent Finance & OT Queue Feed */}
                        <FyCard area="tm" label="Recent Finance Queue">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle>
                              {pendingAllAcct.length > 0
                                ? "Awaiting Accounting Action"
                                : "Latest Finance & OT Forms"}
                            </CardTitle>
                            <Chip icon={Receipt} onClick={() => go("claims")}>
                              View All
                            </Chip>
                          </div>
                          {recentFeed.length === 0 ? (
                            <div className="mt-5 rounded-2xl bg-muted p-6 text-center">
                              <p className="text-sm font-medium">
                                {q
                                  ? `No claims or OT slips match "${query.trim()}"`
                                  : "No reimbursement, cash advance, or OT forms filed yet"}
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
                                const canVerify =
                                  r.accounting_status === "pending" &&
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
                                            {r.employee?.full_name} · {r.reference_no}
                                            {r.amount != null ? ` · ${formatPHP(r.amount)}` : ""}
                                            {r.total_hours != null ? ` · ${r.total_hours}h` : ""}
                                          </span>
                                        </span>
                                      </button>
                                      {canVerify ? (
                                        <button
                                          type="button"
                                          disabled={quickVerifyingId === r.id}
                                          onClick={() => handleQuickVerify(r)}
                                          className="fy-primary fy-focus flex-none cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60"
                                        >
                                          {quickVerifyingId === r.id ? "..." : "Send to Boss"}
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

                        {/* Bottom-Middle 4 cols: Disbursement Progress Gauge */}
                        <FyCard area="pg" className="flex flex-col" label="Disbursement Progress">
                          <CardTitle>Disbursement Progress</CardTitle>
                          <DisbursementGauge
                            total={allAcctRequests.length}
                            paid={disbursedRequests.length}
                            inPipeline={inPipelineCount}
                            closed={closedAcctCount}
                          />
                          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-700)]"
                              />
                              Paid
                            </li>
                            <li className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-3.5 rounded-full bg-[var(--fy-strong)]"
                              />
                              In Queue
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

                      {/* Pending Verification Action Cards */}
                      {filteredPendingCards.length > 0 ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-semibold tracking-[-0.02em]">
                              Pending Verification ({filteredPendingCards.length})
                            </h2>
                            <Chip icon={Receipt} onClick={() => go("claims")}>
                              Open Claims Queue
                            </Chip>
                          </div>
                          <PendingVerifyGrid
                            items={filteredPendingCards}
                            quickVerifyingId={quickVerifyingId}
                            onQuickVerify={handleQuickVerify}
                            onInspect={onInspect}
                            q={q}
                          />
                        </div>
                      ) : null}

                      {/* Reimbursements & Cash Advances Datatable */}
                      <FyCard className="mt-1" label="Reimbursements and Cash Advances">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle>Reimbursements &amp; Cash Advances</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Inspect Official Receipts, verify claim amounts, record disbursement
                              reference numbers, or export CSV.
                            </p>
                          </div>
                        </div>
                        <EmployeeFormsDatatable
                          requests={searchedFinancialRequests}
                          allowedTypes={FINANCE_TYPES}
                          showEmployee
                          allowCancel={false}
                          onQuickVerify={handleQuickVerify}
                          quickVerifyingId={quickVerifyingId}
                          csvFilename="mediq-reimbursements-cash-advances.csv"
                          emptyMessage={
                            q
                              ? `No reimbursement or cash advance forms match "${query.trim()}".`
                              : "No reimbursement or cash advance forms submitted yet."
                          }
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "claims" ? (
                    <>
                      <ViewHead
                        title="Reimbursements & CA"
                        sub="Verify BIR Official Receipts, approve release amounts, and record disbursement reference vouchers."
                        id="fy-h-claims"
                      >
                        <Magnetic className="fy-ghost" onClick={() => go("disbursed")}>
                          <FileSpreadsheet className="h-4 w-4" />
                          Disbursed Ledger
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={filteredClaimsTable.length}
                        entityLabel={filteredClaimsTable.length === 1 ? "claim" : "claims"}
                        onClear={() => setQuery("")}
                      />

                      <motion.div
                        variants={fileV}
                        className="mb-1 flex flex-wrap items-center justify-between gap-4"
                      >
                        <Seg<ClaimsFilter>
                          id="fy-acct-cfilter"
                          label="Filter claims"
                          value={claimsFilter}
                          onChange={setClaimsFilter}
                          options={[
                            { id: "all", label: `All (${financialRequests.length})` },
                            { id: "verify", label: `To Verify (${pendingVerifyList.length})` },
                            { id: "ready", label: "Ready to Release" },
                            { id: "paid", label: "Paid" },
                          ]}
                        />
                        <p className="px-1 text-sm text-muted-foreground">
                          <b className="font-semibold text-foreground">
                            {filteredClaimsTable.length}
                          </b>{" "}
                          {filteredClaimsTable.length === 1 ? "claim" : "claims"} shown
                        </p>
                      </motion.div>

                      {claimsFilter === "verify" &&
                      pendingVerifyList.filter(matchesQuery).length > 0 ? (
                        <PendingVerifyGrid
                          items={pendingVerifyList.filter(matchesQuery)}
                          quickVerifyingId={quickVerifyingId}
                          onQuickVerify={handleQuickVerify}
                          onInspect={onInspect}
                          q={q}
                        />
                      ) : null}

                      <FyCard label="Reimbursements & Cash Advances Table">
                        <EmployeeFormsDatatable
                          requests={filteredClaimsTable}
                          allowedTypes={FINANCE_TYPES}
                          showEmployee
                          allowCancel={false}
                          onQuickVerify={handleQuickVerify}
                          quickVerifyingId={quickVerifyingId}
                          csvFilename="mediq-reimbursements-cash-advances.csv"
                          emptyMessage="No reimbursement or cash advance forms match this filter."
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "overtime" ? (
                    <>
                      <ViewHead
                        title="Overtime Payroll"
                        sub={`Verify approved overtime hours (${approvedOtHours.toFixed(1)} hrs total) and export payroll cut-off sheets.`}
                        id="fy-h-overtime"
                      >
                        <Magnetic className="fy-ghost" onClick={() => go("disbursed")}>
                          <FileSpreadsheet className="h-4 w-4" />
                          Disbursed Ledger
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={filteredOtTable.length}
                        entityLabel={filteredOtTable.length === 1 ? "OT form" : "OT forms"}
                        onClear={() => setQuery("")}
                      />

                      <motion.div
                        variants={fileV}
                        className="mb-1 flex flex-wrap items-center justify-between gap-4"
                      >
                        <Seg<OtFilter>
                          id="fy-acct-otfilter"
                          label="Filter overtime payroll"
                          value={otFilter}
                          onChange={setOtFilter}
                          options={[
                            { id: "all", label: `All OT (${overtimeRequests.length})` },
                            { id: "pending", label: `Pending Payroll (${pendingOtList.length})` },
                            { id: "paid", label: "Paid" },
                          ]}
                        />
                        <p className="px-1 text-sm text-muted-foreground">
                          <b className="font-semibold text-foreground">
                            {filteredOtTable.length}
                          </b>{" "}
                          {filteredOtTable.length === 1 ? "form" : "forms"} shown
                        </p>
                      </motion.div>

                      <FyCard label="Overtime Payroll Table">
                        <EmployeeFormsDatatable
                          requests={filteredOtTable}
                          allowedTypes={["overtime"]}
                          showEmployee
                          allowCancel={false}
                          onQuickVerify={handleQuickVerify}
                          quickVerifyingId={quickVerifyingId}
                          csvFilename="mediq-overtime-payroll.csv"
                          emptyMessage="No overtime forms match this filter."
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "disbursed" ? (
                    <>
                      <ViewHead
                        title="Approved & Disbursed History"
                        sub={`Boss-approved and settled payout/payroll records (${formatPHP(totalDisbursedPhp)} disbursed) — permanently archived as read-only.`}
                        id="fy-h-disbursed"
                      >
                        <Magnetic className="fy-primary" onClick={() => go("claims")}>
                          <Receipt className="h-4 w-4" />
                          Claims Queue
                        </Magnetic>
                      </ViewHead>

                      <ActiveSearchBanner
                        query={query}
                        matchCount={filteredDisbursedTable.length}
                        entityLabel={filteredDisbursedTable.length === 1 ? "history record" : "history records"}
                        onClear={() => setQuery("")}
                      />

                      <FyCard label="Disbursed Ledger Table">
                        <EmployeeFormsDatatable
                          requests={filteredDisbursedTable}
                          allowedTypes={ALL_ACCT_TYPES}
                          showEmployee
                          allowCancel={false}
                          csvFilename="mediq-disbursement-ledger.csv"
                          emptyMessage="No disbursed or paid records yet."
                          onInspect={onInspect}
                        />
                      </FyCard>
                    </>
                  ) : view === "memos" ? (
                    <HrMemosBoardView
                      announcements={announcements}
                      seenMemoIds={seenMemoIds}
                      onMarkAllRead={markAllMemosRead}
                      query={query}
                    />
                  ) : (
                    <AccountingSettingsView
                      profile={profile}
                      readyToDisbursePhp={readyToDisbursePhp}
                      totalDisbursedPhp={totalDisbursedPhp}
                      pendingVerifyPhp={pendingVerifyPhp}
                      approvedOtHours={approvedOtHours}
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
          pendingVerifyCount={pendingVerifyList.length}
          pendingOtCount={pendingOtList.length}
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
