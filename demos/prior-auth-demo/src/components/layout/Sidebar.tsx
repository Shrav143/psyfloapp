import { BarChart3, Building2, ChevronDown, ChevronRight, ClipboardList, HelpCircle, ListChecks, LayoutDashboard, LogOut, RefreshCw, Scale, Settings, ShieldCheck, PlusCircle, FlaskConical, type LucideIcon } from "lucide-react";
import { useScope } from "@/lib/scope";
import { NavLink, useLocation } from "react-router-dom";
import { Count } from "@/components/ui";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectDenialBadge } from "@/store/denials";
import { selectEbBadge } from "@/store/eligibility";
import { selectPayersBadge } from "@/store/payerConfig";
import { selectQueueBadge } from "@/store/queue";
import { selectReferralBadge } from "@/store/referrals";

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Paths that keep this item highlighted. */
  match?: string[];
  /** For a sub-item that shares its parent's address: when it is the one highlighted. */
  isOn?: (pathname: string) => boolean;
  subs?: Item[];
}

const link = "flex h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-ink2 transition-colors hover:bg-[#EADFD0]";

function NavItem({ item, depth = 0 }: { item: Item; depth?: number }) {
  const { pathname } = useLocation();
  const inGroup = !!item.subs?.some((s) => pathname.startsWith(s.to)) || (item.subs && pathname.startsWith("/authorizations"));
  const exact = item.to === paths.authorizations();
  // The parent is "on" only for the queue and case pages, not for its sub-pages.
  const subActive = item.subs?.some((s) => pathname.startsWith(s.to));
  const on = item.match ? item.match.some((m) => pathname.startsWith(m)) : exact ? pathname === item.to || (pathname.startsWith("/authorizations/case") && !subActive) : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <>
      <NavLink to={item.to} end={exact} className={cn(link, depth > 0 && "ml-3 h-9 text-[13px]", on && !subActive && "bg-forest text-white hover:bg-forest")}>
        <Icon size={depth ? 16 : 18} className="ico" />
        <span className="truncate">{item.label}</span>
        {item.subs ? <span className="ml-1 opacity-70">{inGroup ? <ChevronDown size={15} className="ico" /> : <ChevronRight size={15} className="ico" />}</span> : null}
        {item.badge ? <Count on={on && !subActive} className="ml-auto">{item.badge}</Count> : null}
      </NavLink>
      {item.subs && inGroup ? item.subs.map((s) => <SubLink key={s.to} item={s} />) : null}
    </>
  );
}

function SubLink({ item }: { item: Item }) {
  const { pathname } = useLocation();
  const on = item.isOn ? item.isOn(pathname) : item.match ? item.match.some((m) => pathname.startsWith(m)) : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={!!item.isOn} className={cn(link, "ml-3 h-9 gap-2.5 pr-2 text-[13px]", on && "bg-forest text-white hover:bg-forest")}>
      <Icon size={16} className="ico" />
      <span className="truncate">{item.label}</span>
      {item.badge ? <Count on={on} className="ml-auto">{item.badge}</Count> : null}
    </NavLink>
  );
}

/** Every badge follows the site view. The slice badges (Authorizations, Eligibility, denials, referrals) read the view inside their selectors; the
    Dashboard badge is counted here with the same rule. Payers is clinic-wide on purpose: a payer's rules and changes are not site data, so its badge never changes with the view. */
export function Sidebar() {
  const requests = useStore((s) => s.requests);
  const { viewer, filter } = useScope();
  const dash = filter(requests, (r) => r.caseId).filter((r) => r.stage === "info_requested").length;
  const referrals = useStore(selectReferralBadge);
  const queue = useStore(selectQueueBadge);
  const eb = useStore(selectEbBadge);
  const denials = useStore(selectDenialBadge);
  const payers = useStore(selectPayersBadge);
  const toast = useStore((s) => s.toast);

  const main: Item[] = [
    { to: paths.dashboard(), label: "Dashboard", icon: LayoutDashboard, badge: dash, match: ["/dashboard"] },
    {
      to: paths.authorizations(), label: "Authorizations", icon: ClipboardList, badge: queue,
      subs: [
        // The same page as the parent: the one worklist. It is the highlighted item on the worklist and on a case page.
        { to: paths.authorizations(), label: "All Authorizations", icon: ListChecks, isOn: (p) => p === "/authorizations" || p.startsWith("/authorizations/case") },
        { to: "/authorizations/new", label: "New Case", icon: PlusCircle, badge: referrals },
        { to: paths.eligibility(), label: "Eligibility & Benefits", icon: ShieldCheck, badge: eb },
      ],
    },
    { to: paths.denials(), label: "Denial Intelligence", icon: Scale, badge: denials, match: ["/denials"] },
    { to: paths.analytics(), label: "Analytics", icon: BarChart3, match: ["/analytics"] },
  ];
  const conn: Item[] = [
    { to: paths.emr(), label: "EMR Connect", icon: RefreshCw, match: ["/emr"] },
    { to: paths.payers(), label: "Payers", icon: Building2, badge: payers, match: ["/payers"] },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[256px] shrink-0 flex-col gap-[22px] border-r border-[#EADFD2] bg-side px-3.5 pt-6 pb-3.5">
      <div className="px-2">
        <div className="font-serif text-[24px] leading-none font-semibold tracking-[-0.4px] text-[#1C473B]">
          psyflo<i className="not-italic text-sage">.</i>
        </div>
        <div className="mt-[5px] text-[11px] tracking-[0.12em] text-muted uppercase">Prior auth &amp; UR</div>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-[3px] overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] tracking-[0.12em] text-muted uppercase">Main</div>
        {main.map((i) => (
          <NavItem key={i.label} item={i} />
        ))}
        <div className="mt-3.5 px-3 pb-1 text-[11px] tracking-[0.12em] text-muted uppercase">Connections</div>
        {conn.map((i) => (
          <NavItem key={i.label} item={i} />
        ))}
      </nav>
      <div className="flex flex-col gap-0.5">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-[#EADFD2] bg-[#FBF8F3] px-3 py-2.5 text-[12px] text-ink2">
          <FlaskConical size={16} className="ico text-muted" />
          Demo data
        </div>
        <NavLink to={paths.settings()} className={({ isActive }) => cn("flex h-[34px] items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-ink2 hover:bg-[#EADFD0]", isActive && "bg-forest text-white hover:bg-forest")}>
          <Settings size={17} className="ico" />
          Settings
        </NavLink>
        <button type="button" onClick={() => toast({ title: "Help", body: "Press Ask FLO (top right) to ask a question. Use Demo, top right, to reset, move time forward or view as another person.", tone: "neutral" })} className="flex h-[34px] items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-ink2 hover:bg-[#EADFD0]">
          <HelpCircle size={17} className="ico" />
          Help
        </button>
        <button type="button" onClick={() => toast({ title: "This is a demo", body: "There is nothing to sign out of.", tone: "neutral" })} className="flex h-[34px] items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-ink2 hover:bg-[#EADFD0]">
          <LogOut size={17} className="ico" />
          Sign out
        </button>
        <div className="mt-2.5 flex items-center gap-3 border-t border-[#EADFD2] px-2 pt-3.5" role="group" aria-label={`Signed in as ${viewer.name}, ${viewer.role}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-white" aria-hidden="true">{viewer.initials}</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{viewer.name}</div>
            <div className="truncate text-xs text-muted">{viewer.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
