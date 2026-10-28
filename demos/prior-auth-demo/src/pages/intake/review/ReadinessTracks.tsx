import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Ban, CircleAlert, CircleCheck, MinusCircle } from "lucide-react";
import { Disclosure, Pill } from "@/components/ui";
import { countsLine, fixPath, trackSummary, type DualReadinessX, type ItemState, type ReadinessItemX, type ReadinessTrackX } from "@/data/assess/readiness";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";

/* Clinical readiness and administrative readiness, shown as two tracks with their own items. Each item says what it is, its state in words, who owns it and where to fix it.
   There is no blended number: readiness is not an approval and not a finding of medical necessity. */

const TONE: Record<ItemState, Tone> = { ready: "good", needs_attention: "mid", blocked: "risk", not_applicable: "neutral" };
const WORD: Record<ItemState, string> = { ready: "Ready", needs_attention: "Needs attention", blocked: "Blocked", not_applicable: "Not applicable" };
const ICON = { ready: { i: CircleCheck, c: "text-good" }, needs_attention: { i: CircleAlert, c: "text-mid" }, blocked: { i: Ban, c: "text-risk" }, not_applicable: { i: MinusCircle, c: "text-faint" } } as const;
const trackTone = (t: ReadinessTrackX): Tone => (t.state === "complete" ? "good" : t.state === "blocked" ? "risk" : "mid");

function Item({ item, fix }: { item: ReadinessItemX; fix?: ReactNode }) {
  const I = ICON[item.state];
  return (
    <li data-readiness-item={item.id} data-state={item.state} className="flex items-start gap-2.5 py-2.5">
      <I.i size={16} className={cn("ico mt-0.5 shrink-0", I.c)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-medium text-ink">{item.label}</span>
          <Pill tone={TONE[item.state]}>{WORD[item.state]}</Pill>
        </div>
        <p className="mt-0.5 text-[13px] text-ink2">{item.detail}</p>
        {item.state !== "not_applicable" ? <p className="mt-0.5 text-[12px] text-muted">Owner: {item.owner}</p> : null}
      </div>
      {fix && (item.state === "needs_attention" || item.state === "blocked") ? <span className="shrink-0 pt-0.5">{fix}</span> : null}
    </li>
  );
}

function Track({ title, track, fix, id }: { title: string; track: ReadinessTrackX; fix: (i: ReadinessItemX) => ReactNode; id: string }) {
  const open = track.items.filter((i) => i.state === "needs_attention" || i.state === "blocked");
  const done = track.items.filter((i) => i.state === "ready");
  const notApplicable = track.items.filter((i) => i.state === "not_applicable");
  return (
    <section data-track={id} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[14px] font-semibold text-ink">{title}</h4>
        <Pill tone={trackTone(track)} dot>{trackSummary(track)}</Pill>
      </div>
      <p className="mt-0.5 text-[12px] text-muted" data-track-counts>{countsLine(track)}</p>
      {open.length ? <ul className="mt-1 divide-y divide-line">{open.map((i) => <Item key={i.id} item={i} fix={fix(i)} />)}</ul> : <p className="mt-1 text-[13px] text-ink2">Every applicable item is done.</p>}
      {done.length ? (
        <Disclosure variant="plain" title={<span className="font-sans text-[13px] font-semibold">Done ({done.length})</span>} summary={done.map((i) => i.label).join(", ")}>
          <ul className="divide-y divide-line px-1">{done.map((i) => <Item key={i.id} item={i} />)}</ul>
        </Disclosure>
      ) : null}
      {notApplicable.length ? (
        <Disclosure variant="plain" title={<span className="font-sans text-[13px] font-semibold">Not applicable ({notApplicable.length})</span>} summary={notApplicable.map((i) => i.label).join(", ")}>
          <ul className="divide-y divide-line px-1">{notApplicable.map((i) => <Item key={i.id} item={i} />)}</ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

/** Both tracks. `fix` draws the way to fix one item: by default a link into the intake workspace; New Authorization passes its own, to a stage. */
export function ReadinessTracks({ readiness, recordId, fix, className }: { readiness: DualReadinessX; recordId?: string; fix?: (i: ReadinessItemX) => ReactNode; className?: string }) {
  const link = (i: ReadinessItemX): ReactNode =>
    fix ? fix(i) : recordId && i.go ? <Link to={fixPath(recordId, i.go)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Open<ArrowRight size={13} className="ico" aria-hidden="true" /></Link> : null;
  return (
    <div className={cn("space-y-4", className)} data-testid="readiness-tracks">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px]">
        <span>Clinical readiness: <b className="font-semibold">{trackSummary(readiness.clinical)}</b></span>
        <span>Administrative readiness: <b className="font-semibold">{trackSummary(readiness.administrative)}</b></span>
      </div>
      <Track id="clinical" title="Clinical readiness" track={readiness.clinical} fix={link} />
      <Track id="administrative" title="Administrative readiness" track={readiness.administrative} fix={link} />
      <p className="rounded-xl bg-sage-bg px-3 py-2 text-[13px] font-medium text-ink">{readiness.note}</p>
    </div>
  );
}
