import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Disclosure, Pill } from "@/components/ui";
import type { CansAssessment, EvidenceRef, IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { actorName, SourceLink } from "../shared/provenance";
import { AddEvidence } from "./AddEvidence";
import { CansAssistant } from "./CansAssistant";
import { CANS_THEMES, RISK_THEME, THEME_PROMPT, THEMES_NOTE, isTheme } from "./cansModel";
import { pendingEvidence } from "./cansState";
import { gatherEvidence } from "./gather";
import { ItemSelect } from "./ItemSelect";
import { ProposalCard } from "./ProposalCard";
import { DEMO_DOMAINS, domainForTheme, domainOfItem } from "./template";

interface Group { key: string; label: string; theme: string; items: EvidenceRef[]; prompt: string }

/** Accepted evidence grouped by the loaded template's domains, or by Psyflo themes when no template is loaded. */
function groupsOf(cans: CansAssessment): Group[] {
  if (cans.template) {
    const domainOf = (e: EvidenceRef) => (e.itemId ? domainOfItem(e.itemId) : undefined) ?? domainForTheme(e.theme, e.text);
    return DEMO_DOMAINS.map((d) => ({ key: d.id, label: d.label, theme: d.theme, items: cans.evidence.filter((e) => domainOf(e).id === d.id), prompt: d.clinician ? "A clinician reviews any safety information directly. Psyflo does not assess risk." : "" }));
  }
  return CANS_THEMES.map((t) => ({ key: t, label: t, theme: t, items: cans.evidence.filter((e) => (isTheme(e.theme) ? e.theme : "Other") === t), prompt: THEME_PROMPT[t] }));
}

/** Evidence Review: what the agent proposes (each waiting for a person), what a person accepted, by domain, with its source. Nothing here is a rating. */
export function EvidenceTab({ record, cans }: { record: IntakeRecord; cans: CansAssessment }) {
  const [adding, setAdding] = useState(false);
  const pending = pendingEvidence(record);
  const running = record.tasks.some((t) => t.role === "cans" && t.action.startsWith("Gather CANS evidence") && (t.status === "queued" || t.status === "running"));
  const locked = cans.status === "signed";
  const groups = groupsOf(cans);
  const filled = groups.filter((g) => g.items.length);
  const empty = groups.filter((g) => !g.items.length);
  return (
    <div className="space-y-5" data-cans-tab="evidence">
      <Card data-evidence-board>
        <CardHeader title="Evidence review" subtitle={cans.template ? "Filed under the demo placeholder template's domains. They are not CANS domains." : THEMES_NOTE} right={<><Chip>{cans.evidence.length} accepted</Chip>{pending.length ? <Pill tone="mid">{pending.length} waiting</Pill> : null}</>} />
        <CardBody className="space-y-4">
          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" icon={Sparkles} loading={running} onClick={() => gatherEvidence(record.id)}>CANS Evidence Agent: gather evidence</Button>
              <Button size="sm" icon={Plus} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>Add evidence by hand</Button>
            </div>
          ) : <p className="text-[13px] text-muted">The record is signed. Start a new version in Assessment Summary to change evidence.</p>}
          {adding && !locked ? <AddEvidence record={record} cans={cans} onDone={() => setAdding(false)} /> : null}
          {pending.length && !locked ? (
            <section aria-label="Proposed evidence" className="space-y-2">
              <h4 className="text-[13px] font-semibold text-ink2">{pending.length} proposed by the CANS Evidence Agent · accept, edit or reject each</h4>
              {pending.map((sg) => <ProposalCard key={sg.id} record={record} cans={cans} sg={sg} />)}
            </section>
          ) : null}
          <div className="space-y-3">
            {filled.map((g) => (
              <section key={g.key} aria-label={g.label} data-theme={g.label}>
                <h4 className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                  {g.label} <span className="font-normal text-muted">· {g.items.length}</span>
                  {g.theme === RISK_THEME ? <Pill tone="risk">A clinician reviews</Pill> : null}
                </h4>
                <ul className="mt-1.5 space-y-1.5">{g.items.map((e) => <KeptRow key={e.id} record={record} cans={cans} e={e} />)}</ul>
              </section>
            ))}
            {!cans.evidence.length ? <p className="text-[13px] text-muted">No evidence accepted yet. Run the CANS Evidence Agent or add evidence by hand.</p> : null}
          </div>
        </CardBody>
      </Card>
      {empty.length ? (
        <Disclosure title={`No evidence yet for ${empty.length} ${cans.template ? "domain" : "theme"}${empty.length === 1 ? "" : "s"}`} summary="Not a score, and not zero." defaultOpen={false}>
          <ul className="space-y-1.5 px-6 py-4">
            {empty.map((g) => (
              <li key={g.key} className="text-[13px]"><span className="font-medium text-ink">{g.label}:</span> <span className="text-ink2">{g.prompt || THEME_PROMPT[isTheme(g.theme) ? g.theme : "Other"]}</span></li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
      <CansAssistant record={record} cans={cans} />
    </div>
  );
}

function KeptRow({ record, cans, e }: { record: IntakeRecord; cans: CansAssessment; e: EvidenceRef }) {
  const remove = useStore((s) => s.removeCansEvidence);
  const tie = useStore((s) => s.setCansEvidenceItem);
  const meta = cans.evidenceMeta?.[e.id];
  const locked = cans.status === "signed";
  const from = meta ? (meta.from === "agent" ? `Proposed by ${actorName(meta.agent ?? "criteria")}, accepted by ${actorName(meta.by)}` : meta.from === "prior" ? `Carried forward by ${actorName(meta.by)}, needs review` : `Added by ${actorName(meta.by)}`) : null;
  return (
    <li className="rounded-xl border border-line px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-ink">{e.text}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            <SourceLink record={record} source={e.source} />
            {from ? <span>{from} · {stamp(meta?.at ?? 0)}</span> : null}
            {meta?.from === "prior" ? <Pill tone="mid">Carried forward · needs review</Pill> : null}
          </div>
        </div>
        {!locked ? (
          <button type="button" aria-label={`Remove evidence: ${e.text.slice(0, 40)}`} onClick={() => remove(record.id, e.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-tile hover:text-ink">
            <X size={15} className="ico" />
          </button>
        ) : null}
      </div>
      {cans.template ? (
        <div className="mt-1.5 flex max-w-[360px] items-center gap-2">
          <span className="shrink-0 text-[12px] text-muted">Item</span>
          <ItemSelect cans={cans} value={e.itemId ?? ""} onChange={(v) => tie(record.id, e.id, v || null)} label={`Item for: ${e.text.slice(0, 30)}`} allowNone disabled={locked} className="h-8 text-[13px]" />
        </div>
      ) : null}
    </li>
  );
}
