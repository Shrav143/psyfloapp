import { useState } from "react";
import { ArrowRight, Check, LocateFixed } from "lucide-react";
import { Button, InfoTip, Label, Meter, Modal, Pill, ScreenerTrend } from "@/components/ui";
import type { CaseDetail, DimRating } from "@/data/caseDetail";
import { FRAMEWORKS } from "@/data/frameworks";
import type { Tone } from "@/data/types";
import { useStore } from "@/store";
import { EvidenceChip } from "../EvidenceChip";
import { Fold } from "../Fold";
import { frameworkTitle, frameworkWhy, ratingOf } from "../frameworkView";

const TONE_DOT: Record<Tone, string> = { good: "#2E7D52", mid: "#A87A26", risk: "#B5553A", neutral: "#98A0AC" };

/** The draft section a dimension speaks to, by framework (draft section ids: clinical, level, severity, plan). "Show in draft" falls back to it when no section cites the same chart page. */
const DIM_SECTION: Record<"asam" | "mh", string[]> = {
  asam: ["clinical", "clinical", "severity", "level", "clinical", "level"],
  mh: ["severity", "level", "clinical", "level", "level", "plan"],
};
export interface ShowTarget { label: string; section: string }

/** The clinical picture beside the draft: diagnosis, the screeners, the six dimensions of the case's framework, then medications, what stands out
    and engagement folded. A dimension opens a pop-up with what the chart shows and where; "Show in draft" lights the draft sections that use that page. */
export function ClinicalRail({ detail, onShow }: { detail: CaseDetail; onShow: (target: ShowTarget) => void }) {
  const clock = useStore((s) => s.clock);
  const [dim, setDim] = useState<DimRating | null>(null);
  const fw = FRAMEWORKS[detail.framework];
  const s = detail.summary;
  const eng = detail.engagement.pct;
  const medsSource = detail.meds.length ? { label: "Medication list", quote: detail.meds.map((m) => `${m.name} ${m.dose}.`).join(" ") } : null;

  return (
    <div className="flex flex-col divide-y divide-line">
      <section aria-label="Diagnosis" className="pb-3">
        <Label>Diagnosis</Label>
        <div className="mt-1 text-[13px]">{s.diagnosis}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Pill tone={s.status.tone} dot>{s.status.text}</Pill>
          <EvidenceChip evidence={s.sources.diagnosis} detail={detail} />
          <ShowInDraft onShow={() => onShow({ label: s.sources.diagnosis.label, section: "clinical" })} what="the diagnosis" />
        </div>
      </section>

      <section aria-label="Screeners" className="py-3">
        <Label className="mb-1.5">Screeners</Label>
        <ScreenerTrend
          series={detail.screeners.map((x) => ({ key: x.id, name: x.name, measures: x.measures, min: x.min, max: x.max, points: x.points }))}
          defaultShown={detail.screeners.filter((x) => x.shown).map((x) => x.id)} now={clock} height={170} subject={`${detail.initials}, ${detail.age}`}
        />
      </section>

      <section aria-label={fw.name} className="py-3" data-testid="framework">
        <div className="flex items-center gap-1">
          <h4 className="text-[13px] font-semibold" data-testid="framework-name">{frameworkTitle(detail.framework)}</h4>
          <InfoTip label="Which framework applies" align="end">{frameworkWhy(detail)}</InfoTip>
          <span className="ml-auto text-[12px] text-muted">{fw.scale.label}</span>
        </div>
        <ul className="mt-1 flex flex-col">
          {detail.dims.map((d) => {
            const r = ratingOf(detail.framework, d.rating);
            return (
              <li key={d.n}>
                <button type="button" onClick={() => setDim(d)} aria-haspopup="dialog" className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-tile">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-bg text-[11px] font-semibold">{d.n}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]" title={d.name}>{fw.dims[d.n - 1]?.short ?? d.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink2">
                    <i className="h-2 w-2 rounded-full" style={{ background: TONE_DOT[r.tone] }} aria-hidden="true" />
                    {d.rating} · {r.word}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="pt-1">
        {detail.meds.length ? (
          <Fold head={<span className="text-[13px] font-semibold">Medications <span className="font-normal text-muted">{detail.meds.length}</span></span>}>
            <ul className="flex flex-col gap-1 pb-2 text-[13px]">
              {detail.meds.map((m) => <li key={m.name}><b className="font-semibold">{m.name}</b> <span className="text-ink2">{m.dose}</span></li>)}
            </ul>
            {medsSource ? <div className="pb-2"><EvidenceChip evidence={medsSource} detail={detail} /></div> : null}
          </Fold>
        ) : null}
        <Fold head={<span className="text-[13px] font-semibold">What stands out <span className="font-normal text-muted">{detail.standsOut.length}</span></span>} className="border-t border-line">
          <ul className="flex flex-col gap-1.5 pb-2 text-[13px]">
            {detail.standsOut.map((t) => <li key={t} className="flex items-start gap-2"><ArrowRight size={13} className="ico mt-[4px] shrink-0 text-muted" />{t}</li>)}
          </ul>
        </Fold>
        <Fold head={<span className="text-[13px] font-semibold">Engagement <span className="font-normal text-muted">{eng}%</span></span>} className="border-t border-line">
          <div className="pb-2">
            <Meter value={eng} height={6} color="#2E7D52" />
            {detail.engagement.checks.map((t) => <div key={t} className="mt-1.5 flex items-center gap-2 text-[13px]"><Check size={13} className="ico text-good" />{t}</div>)}
          </div>
        </Fold>
      </div>

      {dim ? (
        <Modal
          open onClose={() => setDim(null)} size="sm" title={`${dim.n}. ${dim.name}`}
          subtitle={`${fw.name} · ${dim.rating} of ${fw.scale.max} · ${ratingOf(detail.framework, dim.rating).word}`}
          footer={<><Button icon={LocateFixed} onClick={() => { onShow({ label: dim.source.label, section: DIM_SECTION[detail.framework === "asam" ? "asam" : "mh"][dim.n - 1] ?? "clinical" }); setDim(null); }}>Show in draft</Button><Button variant="primary" onClick={() => setDim(null)}>Close</Button></>}
        >
          <p className="m-0 text-[14px]">{dim.sentence}</p>
          <div className="mt-3 rounded-xl bg-tile px-3 py-2 text-[13px]">
            <div className="text-[12px] font-semibold text-muted">{dim.source.label}</div>
            <div className="text-ink2">{dim.source.quote}</div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ShowInDraft({ onShow, what }: { onShow: () => void; what: string }) {
  return (
    <button type="button" onClick={onShow} aria-label={`Show ${what} in the draft`} title="Show in draft" className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[12px] font-semibold text-forest hover:bg-sage-bg">
      <LocateFixed size={13} className="ico" aria-hidden="true" />
      In draft
    </button>
  );
}
