import { BarChart3, Building2, CalendarCheck, ChevronDown, ChevronRight, ClipboardCheck, ClipboardPen, FlaskConical, HelpCircle, Inbox, LayoutDashboard, ListChecks, LogOut, Repeat, RefreshCw, Scale, Settings, Share2, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/brand/psyflo-logo.svg";
import { Count } from "@/components/ui";
import { ACTIVE_STATUSES, effectiveStatus } from "@/data/assess/status";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectDenialBadge } from "@/store/denials";
import { selectEbBadge } from "@/store/eligibility";
import { selectClinicalReviewBadge, selectIntakeBadge, selectNeedsInfoBadge } from "@/store/intakeSelectors";
import { selectPayersBadge } from "@/store/payerConfig";
import { selectQueueBadge } from "@/store/queue";

/** Where the person is: the path, the query, and for a Referrals & Intake record the page it was opened from. */
interface Place {
  pathname: string;
  query: URLSearchParams;
  /** The Referrals & Intake item the current page belongs to, or null. */
  intake: "queue" | "active" | "assessments" | "coordination" | null;
}

interface Leaf {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** What the badge counts, for people who cannot see the number's neighbors. */
  badgeNote?: string;
  on: (p: Place) => boolean;
}

/* On a short screen (under 820 px tall) the rows and gaps tighten so more of the list shows without scrolling. */
const row = "flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-ink2 transition-colors hover:bg-[#E8E5DF] [@media(max-height:820px)]:h-9";
const gap = "mt-3.5 [@media(max-height:820px)]:mt-2";
const rowOn = "bg-forest text-white hover:bg-forest";
const label = "shrink-0 px-3 pb-1 text-[11px] tracking-[0.12em] text-muted uppercase";

/** The Referrals & Intake item a path belongs to. A record (and its configuration) belongs to the page it was opened from; reached by address, it
    belongs to Active Intakes while its work is in progress and to the Referral Queue otherwise. */
function useIntakePlace(pathname: string, from: unknown): Place["intake"] {
  const seg = pathname.split("/").filter(Boolean);
  const id = seg[0] === "intake" && seg[1] && !["active", "assessments", "coordination", "new", "start"].includes(seg[1]) ? seg[1] : undefined;
  const status = useStore((s) => {
    const r = id ? s.intakes.find((x) => x.id === id) : undefined;
    return r ? effectiveStatus(r) : null;
  });
  if (seg[0] !== "intake") return null;
  if (!seg[1] || seg[1] === "new" || seg[1] === "start") return "queue";
  if (seg[1] === "active" || seg[1] === "assessments" || seg[1] === "coordination") return seg[1];
  const nav = (from as { nav?: string } | null)?.nav;
  if (nav === "queue" || nav === "active" || nav === "assessments" || nav === "coordination") return nav;
  return status && ACTIVE_STATUSES.includes(status) ? "active" : "queue";
}

/** Which Authorizations item a page belongs to: the reviews and renewals views have their own, everything else of the workspace is All Authorizations. */
function authItem(p: Place): "all" | "reviews" | "renewals" | null {
  if (p.pathname === "/authorizations") {
    if (p.query.get("view") === "reviews" || p.query.get("tab") === "reviews") return "reviews";
    if (p.query.get("show") === "renewal") return "renewals";
    return "all";
  }
  return p.pathname.startsWith("/authorizations/case") || p.pathname.startsWith("/authorizations/new") ? "all" : null;
}

function LeafLink({ item, place }: { item: Leaf; place: Place }) {
  const on = item.on(place);
  const Icon = item.icon;
  return (
    <Link to={item.to} aria-current={on ? "page" : undefined} className={cn(row, on && rowOn)}>
      <Icon size={18} className="ico" />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <Count on={on} className="ml-auto">
          {item.badge}
          {item.badgeNote ? <span className="sr-only"> {item.badgeNote}</span> : null}
        </Count>
      ) : null}
    </Link>
  );
}

/** A group of items under a small-caps header that is also its toggle. The group opens by itself when the address enters it and closes when the address
    leaves it; in between it keeps the person's choice. While it is closed on one of its pages, its header is the highlighted item, so the place is never lost. */
function Group({ name, items, place, badge }: { name: string; items: Leaf[]; place: Place; badge?: number }) {
  const inGroup = items.some((i) => i.on(place));
  const [open, setOpen] = useState(inGroup);
  const was = useRef(inGroup);
  useEffect(() => {
    if (inGroup !== was.current) setOpen(inGroup);
    was.current = inGroup;
  }, [inGroup]);
  const id = useId();
  const lit = inGroup && !open;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className={cn(gap, "flex shrink-0 flex-col gap-[3px]")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
        title={open ? "Collapse" : "Expand"}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left transition-colors", lit ? "bg-forest text-white" : "text-muted hover:bg-[#E8E5DF] hover:text-ink")}
      >
        {/* The global button reset (font: inherit) outranks utilities, so the small caps are set on the text itself. */}
        <span className="text-[11px] tracking-[0.12em] uppercase">{name}</span>
        {!open && badge ? <Count on={lit} className="h-[18px] min-w-[18px] text-[11px] tracking-normal">{badge}</Count> : null}
        <Chevron size={14} className="ico ml-auto" />
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-[3px]">
        {open ? items.map((i) => <LeafLink key={i.label} item={i} place={place} />) : null}
      </div>
    </div>
  );
}

/** Every badge follows the site view. The slice badges read the view inside their selectors; the Dashboard badge is counted here with the same rule.
    Payers is clinic-wide on purpose: a payer's rules and changes are not site data, so its badge never changes with the view. */
export function Sidebar() {
  const location = useLocation();
  const requests = useStore((s) => s.requests);
  const { viewer, filter } = useScope();
  const dash = filter(requests, (r) => r.caseId).filter((r) => r.stage === "info_requested").length;
  const newReferrals = useStore(selectIntakeBadge);
  const needInfo = useStore(selectNeedsInfoBadge);
  const inReview = useStore(selectClinicalReviewBadge);
  const queue = useStore(selectQueueBadge);
  const eb = useStore(selectEbBadge);
  const denials = useStore(selectDenialBadge);
  const payers = useStore(selectPayersBadge);
  const toast = useStore((s) => s.toast);
  const place: Place = { pathname: location.pathname, query: new URLSearchParams(location.search), intake: useIntakePlace(location.pathname, location.state) };

  const referralBadge = newReferrals + needInfo;
  const intake: Leaf[] = [
    { to: paths.referralQueue(), label: "Referral Queue", icon: Inbox, badge: referralBadge, badgeNote: `(${newReferrals} new, ${needInfo} need information)`, on: (p) => p.intake === "queue" },
    { to: paths.activeIntakes(), label: "Active Intakes", icon: ClipboardPen, badge: inReview, badgeNote: "(in clinical review)", on: (p) => p.intake === "active" },
    { to: paths.assessments(), label: "Assessments", icon: ClipboardCheck, on: (p) => p.intake === "assessments" },
    { to: paths.coordination(), label: "Care Coordination", icon: Share2, on: (p) => p.intake === "coordination" },
  ];
  const auth: Leaf[] = [
    { to: paths.authorizations(), label: "All Authorizations", icon: ListChecks, badge: queue, on: (p) => authItem(p) === "all" },
    { to: paths.pendingReviews(), label: "Pending Reviews", icon: CalendarCheck, on: (p) => authItem(p) === "reviews" },
    { to: paths.renewals(), label: "Renewals & Extensions", icon: Repeat, on: (p) => authItem(p) === "renewals" },
  ];
  const starts = (prefix: string) => (p: Place) => p.pathname.startsWith(prefix);
  const more: Leaf[] = [
    { to: paths.eligibility(), label: "Eligibility & Benefits", icon: ShieldCheck, badge: eb, on: starts("/authorizations/eligibility") },
    { to: paths.denials(), label: "Denial Intelligence", icon: Scale, badge: denials, on: starts("/denials") },
    { to: paths.analytics(), label: "Analytics", icon: BarChart3, on: starts("/analytics") },
  ];
  const conn: Leaf[] = [
    { to: paths.emr(), label: "EMR Connect", icon: RefreshCw, on: starts("/emr") },
    { to: paths.payers(), label: "Payers", icon: Building2, badge: payers, on: starts("/payers") },
  ];
  const dashboard: Leaf = { to: paths.dashboard(), label: "Dashboard", icon: LayoutDashboard, badge: dash, on: starts("/dashboard") };
  const plain = (title: string, items: Leaf[]) => (
    <>
      <div className={cn(label, gap)}>{title}</div>
      {items.map((i) => <LeafLink key={i.label} item={i} place={place} />)}
    </>
  );
  const foot = "flex h-[34px] shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-ink2 hover:bg-[#E8E5DF]";

  return (
    <aside className="sticky top-0 flex h-screen w-[256px] shrink-0 flex-col gap-4 border-r border-[#E8E5DF] bg-side px-3.5 pt-6 pb-3.5">
      <div className="px-2">
        <img src={logo} alt="psyflo" width={91} height={30} className="block h-[30px] w-auto" />
        <div className="mt-[5px] text-[11px] tracking-[0.12em] text-muted uppercase">Prior auth &amp; UR</div>
      </div>
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto">
        <div className={label}>Main</div>
        <LeafLink item={dashboard} place={place} />
        <Group name="Referrals & Intake" items={intake} place={place} badge={referralBadge + inReview} />
        <Group name="Authorizations" items={auth} place={place} badge={queue} />
        {plain("Additional workspaces", more)}
        {plain("Connections", conn)}
      </nav>
      <div className="flex flex-col gap-0.5">
        <div className="mb-1 flex items-center gap-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF9F6] px-3 py-2 text-[12px] text-ink2">
          <FlaskConical size={16} className="ico text-muted" />
          Demo data
        </div>
        <div className={cn(label, "pt-1")}>System</div>
        <Link to={paths.settings()} aria-current={location.pathname.startsWith("/settings") ? "page" : undefined} className={cn(foot, location.pathname.startsWith("/settings") && rowOn)}>
          <Settings size={17} className="ico" />
          Settings
        </Link>
        <button type="button" onClick={() => toast({ title: "Help", body: "Press + New (top bar) to start a referral, intake, authorization or eligibility check. Ask FLO (top right) answers questions. Demo, top right, resets data, moves time forward or views as another person.", tone: "neutral" })} className={foot}>
          <HelpCircle size={17} className="ico" />
          Help
        </button>
        <div className="mt-2 flex items-center gap-3 border-t border-[#E8E5DF] px-2 pt-3" role="group" aria-label={`Signed in as ${viewer.name}, ${viewer.role}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-white" aria-hidden="true">{viewer.initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{viewer.name}</div>
            <div className="truncate text-xs text-muted">{viewer.role}</div>
          </div>
          <button type="button" aria-label="Sign out" title="Sign out" onClick={() => toast({ title: "This is a demo", body: "There is nothing to sign out of.", tone: "neutral" })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink2 hover:bg-[#E8E5DF]">
            <LogOut size={16} className="ico" />
          </button>
        </div>
      </div>
    </aside>
  );
}
