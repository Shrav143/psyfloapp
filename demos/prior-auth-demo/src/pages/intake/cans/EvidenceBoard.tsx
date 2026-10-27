import { useState } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { AgentChip, Button, Card, CardBody, CardHeader, Chip, Pill } from "@/components/ui";
import type { CansAssessment, IntakeRecord, Suggestion } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { actorName, SourceLink } from "../shared/provenance";
import { AddEvidence } from "./AddEvidence";
import { CANS_THEMES, RISK_THEME, THEME_PROMPT, THEMES_NOTE, isTheme, type CansTheme } from "./cansModel";
import { findEvidence } from "./evidence";

/* The evidence board: what the record says, filed under Psyflo themes (never CANS domains), each statement with its source. The CANS Evidence
   Agent proposes statements; a person keeps or discards each one, and may add evidence by hand. Nothing here is a rating. */

export function gatherEvidence(recordId: string) {
  const current = useStore.getState().intakes.find((x) => x.id === recordId);
  /* Nothing to review means nothing to approve: the task then ends as Done instead of waiting on a person. */
  const approval = current?.cans && findEvidence(current).length ? "required" : "none";
  let taskId: string | null = null;
  taskId = runAgent(recordId, {
    role: "cans", action: "Gather CANS evidence from documents, assessment and transcript", section: "cans", approval, ms: 1500,
    source: "Record documents, clinical assessment fields, AI Scribe transcript",
    work: () => {
      const s = useStore.getState();
      const r = s.intakes.find((x) => x.id === recordId);
      if (!r?.cans) return "No CANS preparation record. Nothing was proposed.";
      const found = findEvidence(r);
      if (!found.length) return "No new evidence found in the documents, assessment or transcript.";
      const ids = s.proposeCansEvidence(recordId, found, "criteria");
      if (taskId) s.updateIntakeTask(recordId, taskId, { gate: { kind: "suggestions", sections: ["cans"], ids } });
      const docs = new Set(found.filter((f) => f.source.docId).map((f) => f.source.docId)).size;
      return `Proposed ${found.length} statement${found.length === 1 ? "" : "s"} from ${docs} document${docs === 1 ? "" : "s"}${found.some((f) => f.source.kind !== "document") ? " and the record" : ""}. Each waits for a person to keep or discard it.`;
    },
  });
}

export function EvidenceBoard({ record, cans, readOnly }: { record: IntakeRecord; cans: CansAssessment; readOnly?: boolean }) {
  const [adding, setAdding] = useState(false);
  const pending = record.suggestions.filter((x) => x.section === "cans" && x.field.startsWith("evidence:") && x.status === "pending");
  const running = record.tasks.some((t) => t.role === "cans" && t.action.startsWith("Gather CANS evidence") && (t.status === "queued" || t.status === "running"));
  const byTheme = (t: CansTheme) => cans.evidence.filter((e) => (isTheme(e.theme) ? e.theme : "Other") === t);
  const empty = CANS_THEMES.filter((t) => !byTheme(t).length);
  return (
    <Card data-evidence-board>
      <CardHeader title="Evidence board" subtitle={THEMES_NOTE} right={<Chip>{cans.evidence.length} kept</Chip>} />
      <CardBody className="space-y-4">
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" icon={Sparkles} loading={running} onClick={() => gatherEvidence(record.id)}>CANS Evidence Agent: gather evidence</Button>
            <Button size="sm" icon={Plus} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>Add evidence by hand</Button>
          </div>
        ) : null}
        {adding && !readOnly ? <AddEvidence record={record} onDone={() => setAdding(false)} /> : null}
        {pending.length && !readOnly ? (
          <section aria-label="Proposed evidence" className="space-y-2">
            <h4 className="text-[13px] font-semibold text-ink2">{pending.length} proposed by the CANS Evidence Agent · keep or discard each</h4>
            {pending.map((sg) => <Proposal key={sg.id} record={record} sg={sg} />)}
          </section>
        ) : null}
        <div className="space-y-3">
          {CANS_THEMES.filter((t) => byTheme(t).length).map((t) => (
            <section key={t} aria-label={t} data-theme={t}>
              <h4 className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                {t} <span className="font-normal text-muted">· {byTheme(t).length}</span>
                {t === RISK_THEME ? <Pill tone="risk">A clinician reviews</Pill> : null}
              </h4>
              <ul className="mt-1.5 space-y-1.5">
                {byTheme(t).map((e) => <EvidenceRow key={e.id} record={record} cans={cans} id={e.id} readOnly={readOnly} />)}
              </ul>
            </section>
          ))}
          {!cans.evidence.length ? <p className="text-[13px] text-muted">No evidence kept yet. Run the CANS Evidence Agent or add evidence by hand.</p> : null}
        </div>
        {empty.length ? (
          <section aria-label="Themes with no evidence" className="rounded-xl bg-tile px-3.5 py-3">
            <h4 className="text-[13px] font-semibold text-ink2">No evidence yet for {empty.length} theme{empty.length === 1 ? "" : "s"}. Not a score, and not zero.</h4>
            <ul className="mt-1.5 space-y-1">
              {empty.map((t) => (
                <li key={t} className="text-[13px]"><span className="font-medium text-ink">{t}:</span> <span className="text-ink2">{THEME_PROMPT[t]}</span></li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardBody>
    </Card>
  );
}

function EvidenceRow({ record, cans, id, readOnly }: { record: IntakeRecord; cans: CansAssessment; id: string; readOnly?: boolean }) {
  const remove = useStore((s) => s.removeCansEvidence);
  const e = cans.evidence.find((x) => x.id === id);
  if (!e) return null;
  const meta = cans.evidenceMeta?.[id];
  return (
    <li className="flex items-start gap-2 rounded-xl border border-line px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-ink">{e.text}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <SourceLink record={record} source={e.source} />
          {meta ? <span>{meta.from === "agent" ? `Proposed by ${actorName(meta.agent ?? "criteria")}, kept by ${actorName(meta.by)}` : `Added by ${actorName(meta.by)}`} · {stamp(meta.at)}</span> : null}
        </div>
      </div>
      {!readOnly ? (
        <button type="button" aria-label={`Remove evidence: ${e.text.slice(0, 40)}`} onClick={() => remove(record.id, id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-tile hover:text-ink">
          <X size={15} className="ico" />
        </button>
      ) : null}
    </li>
  );
}

function Proposal({ record, sg }: { record: IntakeRecord; sg: Suggestion }) {
  const decide = useStore((s) => s.decideCansEvidence);
  const theme = sg.field.replace(/^evidence:/, "");
  return (
    <div data-proposal={sg.id} className={cn("rounded-xl border px-3.5 py-2.5", "border-mid-edge bg-mid-bg/50")}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <AgentChip agent={sg.agent} />
        <Chip>{theme}</Chip>
        <Pill tone="mid">AI suggested · needs review</Pill>
        {theme === RISK_THEME ? <Pill tone="risk">A clinician reviews</Pill> : null}
      </div>
      <p className="mt-1.5 text-[14px] text-ink">{sg.value}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <SourceLink record={record} source={sg.source} />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, sg.id, true)}>Keep</Button>
          <Button size="sm" icon={X} onClick={() => decide(record.id, sg.id, false)}>Discard</Button>
        </div>
      </div>
    </div>
  );
}
