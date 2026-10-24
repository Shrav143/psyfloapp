import { useMemo, type ReactNode } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { Button, Modal, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import { buildLong, DIM_TONE_WORD, paragraphs, type LongText } from "./lib/long";
import { dimensionText, dimsSummaryText, dimsSummaryTitle, recommendationText, weakSummaryText } from "./lib/summaryText";
import { useCopy } from "./lib/useCopy";
import { useDialogFocus, useDialogState } from "./lib/useDialogFocus";
import type { DenialView } from "./lib/useDenialView";

const DOT = { good: "bg-good", mid: "bg-mid", risk: "bg-risk", neutral: "bg-faint" } as const;
const MANUAL = "Select the text and press Ctrl or Cmd C";

/** A copy button that says "Copied" for two seconds. The wrapper is the live region, so a screen reader hears the change. */
export function CopyButton({ text, label, hidden, size = "sm", variant = "outline" }: { text: string; label: string; hidden?: string; size?: "sm" | "md"; variant?: "outline" | "primary" }) {
  const { state, copy } = useCopy();
  return (
    <span aria-live="polite" className="inline-flex flex-col items-end gap-1">
      <Button size={size} variant={variant} icon={state === "copied" ? Check : Copy} onClick={() => void copy(text)}>
        {state === "copied" ? "Copied" : label}
        {hidden ? <span className="sr-only"> {hidden}</span> : null}
      </Button>
      {state === "failed" ? <span role="status" className="text-[12px] text-mid-ink">{MANUAL}</span> : null}
    </span>
  );
}

/** The scrolling text of a pop-up: selectable, a readable width, focused when it opens so the arrow keys scroll it. */
function Body({ from, children }: { from: ReturnType<typeof useDialogState>["from"]; children: ReactNode }) {
  const ref = useDialogFocus(from);
  return <div ref={ref} tabIndex={-1} className="mx-auto max-w-[720px] select-text text-[14px] leading-[1.7] outline-none">{children}</div>;
}

const H = ({ children }: { children: ReactNode }) => <h3 className="mt-7 mb-2 border-b border-line pb-1.5 font-serif text-[18px] font-semibold first:mt-0">{children}</h3>;

function Shell({ open, from, onClose, title, view, text, children }: { open: boolean; from: ReturnType<typeof useDialogState>["from"]; onClose: () => void; title: string; view: DenialView; text: string; children: ReactNode }) {
  const { req, analysis } = view;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      subtitle={`${req.id} · ${analysis.ctx.who} · ${analysis.ctx.payerName}`}
      footer={<><CopyButton text={text} label="Copy all" size="md" variant="primary" /><Button onClick={onClose}>Close</Button></>}
    >
      <Body from={from}>{children}</Body>
    </Modal>
  );
}

function Recommendations({ long }: { long: LongText }) {
  return (
    <ol className="flex flex-col gap-4">
      {long.recommendations.map((r, i) => (
        <li key={r.title} className="flex gap-3.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-[13px] font-semibold" aria-hidden="true">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <b className="leading-snug">{r.title}</b>
              <CopyButton text={recommendationText(r)} label="Copy" hidden={`recommendation ${i + 1}`} />
            </div>
            <p className="mt-1">{r.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "Full summary" in the header of Where the denial is weak: the long version of the findings and the recommendations, as plain text to copy. */
export function WeakPointsSummary({ view }: { view: DenialView }) {
  const dialog = useDialogState();
  const long = useMemo(() => buildLong(view.req.id, view.meta.type, view.analysis), [view]);
  const text = useMemo(() => weakSummaryText(view, long), [view, long]);
  return (
    <>
      <Button size="sm" icon={FileText} onClick={dialog.show}>Full summary</Button>
      <Shell open={dialog.open} from={dialog.from} onClose={dialog.hide} title="Where the denial is weak, full summary" view={view} text={text}>
        <H>What the chart shows as a whole</H>
        {paragraphs(long.synthesis).map((p) => <p key={p} className="mb-3 last:mb-0">{p}</p>)}
        <H>Findings</H>
        <div className="flex flex-col gap-5">
          {view.analysis.findings.map((f, i) => (
            <div key={f.id}>
              <div className="flex items-center gap-2.5"><Pill tone={f.sev === "Critical" ? "risk" : "mid"}>{f.sev}</Pill><b className="leading-snug">{f.title}</b></div>
              <p className="mt-1.5">{long.findings[i]}</p>
              <p className="mt-1 text-[13px] text-muted">Source: {f.source}</p>
            </div>
          ))}
        </div>
        <H>What we would do</H>
        <Recommendations long={long} />
        <H>Criteria to cite</H>
        <ul className="list-disc pl-5">{long.criteria.map((c) => <li key={c}>{c}</li>)}</ul>
        <H>Documents to attach</H>
        <ul className="list-disc pl-5">{long.evidence.map((c) => <li key={c}>{c}</li>)}</ul>
        <H>If the payer pushes back</H>
        <p>{long.outlook}</p>
      </Shell>
    </>
  );
}

/** "Full summary" in the header of the framework card (ASAM Criteria, LOCUS or CALOCUS-CASII): one paragraph per dimension. */
export function DimensionsSummary({ view }: { view: DenialView }) {
  const dialog = useDialogState();
  const long = useMemo(() => buildLong(view.req.id, view.meta.type, view.analysis), [view]);
  const text = useMemo(() => dimsSummaryText(view, long), [view, long]);
  return (
    <>
      <Button size="sm" icon={FileText} onClick={dialog.show}>Full summary</Button>
      <Shell open={dialog.open} from={dialog.from} onClose={dialog.hide} title={dimsSummaryTitle(view)} view={view} text={text}>
        <div className="flex flex-col gap-5">
          {long.dims.map((d) => (
            <div key={d.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn("h-[10px] w-[10px] rounded-full", DOT[d.tone])} aria-hidden="true" />
                  <b>{d.label}</b>
                  <span className="text-[13px] text-muted">{DIM_TONE_WORD[d.tone]}</span>
                </div>
                <CopyButton text={dimensionText(d)} label="Copy" hidden={d.label} />
              </div>
              <p className="mt-1.5">{d.text}</p>
            </div>
          ))}
        </div>
      </Shell>
    </>
  );
}
