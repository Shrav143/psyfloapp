import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FastForward, FlaskConical, RotateCcw, Sparkles } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DAY, HOUR, clockTime, stamp, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { resetDemo, useStore } from "@/store";
import { UnreadDot } from "./Panels";
import { ProgramSwitcher } from "./ProgramSwitcher";
import { SiteSwitcher } from "./SiteSwitcher";
import { VIEWERS } from "@/data/viewers";
import { Check } from "lucide-react";

const PATH: [string, string][] = [
  ["Dashboard: where every request stands", paths.dashboard()],
  ["Authorizations: every request in one list", paths.authorizations()],
  ["Intake: Virginia redesign scenarios", paths.intake()],
  ["New Case: start from a referral", paths.referrals()],
  ["Eligibility & Benefits: verify a patient", paths.eligibilityVerify()],
  ["Denial Intelligence: D-3318", paths.denials("D-3318")],
  ["Payers: Cardinal, Changes", paths.payers("cardinal", "changes")],
  ["Authorizations: reviews this week", paths.authorizations("reviews")],
];

/** The Demo menu: reset data, move the clock, jump along a suggested path. Not part of the product. */
function DemoMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const clock = useStore((s) => s.clock);
  const advance = useStore((s) => s.advanceClock);
  const toast = useStore((s) => s.toast);
  const viewerId = useStore((s) => s.viewerId);
  const setViewer = useStore((s) => s.setViewer);
  const nav = useNavigate();
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const item = "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm hover:bg-tile";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-9 items-center gap-2 rounded-xl border border-field bg-white px-3 text-[13px] font-medium whitespace-nowrap text-ink2 hover:bg-tile">
        <FlaskConical size={16} className="ico" />
        <span className="max-lg:sr-only">Demo</span>
        <span className="rounded-md bg-neutral-bg px-1.5 py-0.5 text-[11px]">{stamp(clock)}</span>
      </button>
      {open ? (
        <div className="psy-fade-up absolute top-11 right-0 z-40 max-h-[calc(100vh-76px)] w-[min(340px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-2xl border border-field bg-white p-2 shadow-[0_12px_32px_rgba(21,27,36,0.14)]">
          <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Time</div>
          <div className="px-3 pb-1 text-[13px] text-muted">The demo clock is {toDate(clock).toDateString()}, {clockTime(toDate(clock))}. It only moves when you move it.</div>
          <button type="button" className={item} onClick={() => advance(HOUR)}><FastForward size={16} className="ico" />Fast-forward 1 hour</button>
          <button type="button" className={item} onClick={() => advance(DAY)}><FastForward size={16} className="ico" />Fast-forward 1 day</button>
          <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Viewing as</div>
          <div className="px-3 pb-1 text-[13px] text-muted">Access is by site (minimum necessary). Try Dr. Rivera, who sees Site A only.</div>
          <div role="group" aria-label="Viewing as">
            {VIEWERS.map((v) => (
              <button key={v.id} type="button" className={item} aria-pressed={viewerId === v.id} onClick={() => setViewer(v.id)}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-bg text-[10px] font-semibold" aria-hidden="true">{v.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{v.name}</span>
                  <span className="block text-[12px] text-muted">{v.role}{v.sites.length > 1 ? ", both sites" : ""}</span>
                </span>
                {viewerId === v.id ? <Check size={15} className="ico shrink-0 text-forest" aria-label="Current" /> : null}
              </button>
            ))}
          </div>
          <div className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Suggested path</div>
          {PATH.map(([label, to], i) => (
            <button key={to} type="button" className={item} onClick={() => { setOpen(false); nav(to); }}>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-neutral-bg text-[11px] font-semibold">{i + 1}</span>{label}
            </button>
          ))}
          <div className="my-1.5 border-t border-line" />
          <button type="button" className={cn(item, "text-risk-ink")} onClick={() => { resetDemo(); setOpen(false); nav(paths.dashboard()); toast({ title: "Demo data reset", body: "Everything is back to the starting point.", tone: "neutral" }); }}>
            <RotateCcw size={16} className="ico" />Reset demo data
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar() {
  const setAsk = useStore((s) => s.setAskOpen);
  const askOpen = useStore((s) => s.askOpen);
  const setNotif = useStore((s) => s.setNotifOpen);
  const notifOpen = useStore((s) => s.notifOpen);
  const btn = "relative grid h-9 w-9 place-items-center rounded-xl border border-field bg-white text-ink2 hover:bg-tile";
  return (
    <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-[#ECE9E4] bg-canvas/90 px-4 backdrop-blur lg:px-7">
      <SiteSwitcher />
      <ProgramSwitcher />
      <div className="ml-auto flex items-center gap-2 lg:gap-3.5">
        <DemoMenu />
        <button type="button" aria-label="Ask FLO" title="Ask FLO" onClick={() => setAsk(!askOpen)} className={btn}>
          <Sparkles size={18} className="ico" />
        </button>
        <button type="button" aria-label="Notifications" title="Notifications" onClick={() => setNotif(!notifOpen)} className={btn}>
          <Bell size={18} className="ico" />
          <UnreadDot />
        </button>
      </div>
    </div>
  );
}
