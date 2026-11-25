import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { HOUR } from "@/lib/time";
import { gainOf } from "@/data/caseModel";
import type { Rec } from "@/data/caseDetail";
import type { Tone } from "@/data/types";
import { consumerNo, type EhrCase } from "@/ehr/model";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { plural } from "@/lib/format";

/* Small pieces the three views share. Plain words, no explainer text. */

/** The two legend chips under the header: green is what is already in Lauris, yellow is what the extension typed. */
export function Legend() {
  return (
    <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-edge bg-white px-4 py-1.5 text-[12px] text-ink">
      <span className="rounded-full border border-[#BFE3CB] bg-[#E6F4EA] px-[9px] py-0.5">green · already in Lauris</span>
      <span className="rounded-full border border-[#E8C56A] bg-[#FFF8E6] px-[9px] py-0.5">yellow · Psyflo typed, check it</span>
    </div>
  );
}

/** A checkbox without the kit's label wrapper (a click on its tick icon would fire twice there). */
export function Tick({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] disabled:opacity-50", checked ? "border-forest bg-forest text-white" : "border-field bg-white")}
    >
      {checked ? <Check size={12} className="ico pointer-events-none" /> : null}
    </button>
  );
}

export function PanelTitle({ children, count }: { children: ReactNode; count?: number | string }) {
  return (
    <h2 className="m-0 flex items-center gap-2 text-[14px] font-semibold text-ink">
      {children}
      {count !== undefined ? <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-neutral-bg px-1.5 text-[12px] font-semibold text-neutral-ink">{count}</span> : null}
    </h2>
  );
}

/** A card of the panel: white, hairline border, small radius. */
export function PCard({ children, className, id, tone }: { children: ReactNode; className?: string; id?: string; tone?: "selected" | "alert" | "warn" | "typed" }) {
  return (
    <div
      id={id}
      className={cn(
        "min-w-0 rounded-xl border px-3 py-2.5",
        tone === "selected" ? "border-[#BFDAD7] bg-[#F6F9F8]" : tone === "alert" ? "border-risk-edge bg-risk-bg" : tone === "warn" ? "border-mid-edge bg-mid-bg" : tone === "typed" ? "border-[#E8C56A] bg-[#FFF8E6]" : "border-edge bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** "Typed · not saved" (yellow) until a person saves in Lauris, then "Saved in Lauris" (green). */
export function TypedChip({ unsaved }: { unsaved: boolean }) {
  return unsaved ? <Pill tone="mid" dot>Typed · not saved</Pill> : <Pill tone="good">Saved in Lauris</Pill>;
}

export const ptsPill = (rec: Rec): ReactNode => <Pill tone="good">+{plural(gainOf(rec), "pt")}</Pill>;

/** The sticky footer: the buttons stay in view while the cards scroll. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <footer className="sticky bottom-0 z-[5] flex shrink-0 flex-col gap-2 border-t border-edge bg-white px-4 py-3 shadow-[0_-8px_16px_rgba(21,27,36,0.06)]">{children}</footer>;
}

/** The "Typing into Lauris…" beat before the extension types, about 700 ms. Skipped when the person asked for reduced motion. */
export function useTypingBeat(): { busy: boolean; run: (fn: () => void) => void } {
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = (fn: () => void) => {
    if (busy) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      fn();
      return;
    }
    setBusy(true);
    timer.current = window.setTimeout(() => {
      setBusy(false);
      fn();
    }, 700);
  };
  return { busy, run };
}

/** Suggestions | Denial corrections, shown on a denied case. The address says which (`?view=denial`). */
export function ViewTabs({ current }: { current: "auth" | "denial" }) {
  const [, setSp] = useSearchParams();
  const go = (v: "auth" | "denial") =>
    setSp((p) => {
      const n = new URLSearchParams(p);
      if (v === "denial") n.set("view", "denial");
      else n.delete("view");
      return n;
    }, { replace: true });
  const tab = (v: "auth" | "denial", label: string) => (
    <button
      type="button" role="tab" aria-selected={current === v} onClick={() => go(v)}
      className={cn("h-8 flex-1 rounded-[8px] px-2 text-[13px] font-semibold transition-colors", current === v ? "bg-navy text-white" : "text-ink2 hover:bg-white")}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="What the extension shows" className="flex gap-1 rounded-[10px] bg-tile p-1">
      {tab("auth", "Suggestions")}
      {tab("denial", "Denial corrections")}
    </div>
  );
}

/** Who is open in Lauris: the consumer, the payer, the level of care, what is due and the approval chance. */
export function CaseStrip({ c }: { c: EhrCase }) {
  const clock = useStore((s) => s.clock);
  const { detail } = c;
  const left = detail.dueAt === undefined || detail.chip ? null : detail.dueAt - clock;
  const dueTone: Tone = left === null ? "neutral" : left < 6 * HOUR ? "risk" : left < 24 * HOUR ? "mid" : "neutral";
  const applied = c.work.applied.length > 0;
  return (
    <PCard className="flex flex-col gap-1.5 bg-tile">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <b className="text-[15px]">{c.consumer.initials}, {c.consumer.age}</b>
        <span className="text-[12px] text-muted">Lauris #{consumerNo(detail.id)} · {detail.id}</span>
      </div>
      <div className="text-[13px] text-ink2">{c.consumer.payerName} · {c.consumer.level}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {c.due ? <Pill tone={dueTone} dot>{c.due}</Pill> : null}
        <span className="text-[13px] font-semibold" aria-live="polite">{detail.phase === "denial" ? "Chance to overturn" : "Approval chance"} {detail.baseChance}% → {c.projected}%</span>
        <span className="text-[12px] text-muted">{applied ? `now ${c.chance}%` : "with every action"}</span>
      </div>
    </PCard>
  );
}

/** A link-styled button that goes to a page of Psyflo (or another page of Lauris). */
export function GoLink({ to, children, external }: { to: string; children: ReactNode; external?: boolean }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)} className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-[13px] font-semibold text-forest hover:underline">
      {children}
      {external ? <ExternalLink size={13} className="ico" aria-hidden="true" /> : null}
    </button>
  );
}

export const PANEL_DEMO_LINE = "Demo data · nothing is real · reads only the page you have open";
export const lauris = paths.lauris;
