import { useState } from "react";
import { Link } from "react-router-dom";
import { PenLine, Sparkles } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Disclosure, Pill, TextArea } from "@/components/ui";
import { clinicalSummary, draftSummaryText, type SummaryLine } from "@/data/assess/carePlan";
import type { IntakeRecord } from "@/data/intake/types";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { actorName } from "../shared/provenance";
import { SignOffDialog } from "../shared/SignOff";

const STATE: Record<SummaryLine["state"], { label: string; tone: "good" | "neutral" | "mid" }> = { signed: { label: "Signed", tone: "good" }, referral: { label: "From the referral", tone: "neutral" }, draft: { label: "Not signed", tone: "mid" } };

function LineList({ record, lines }: { record: IntakeRecord; lines: SummaryLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={l.id} data-summary-line={l.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-ink">{l.label}</span>
            <Pill tone={STATE[l.state].tone}>{STATE[l.state].label}{l.state === "signed" && l.by ? `, ${actorName(l.by)}` : ""}</Pill>
          </div>
          <p className="mt-0.5 text-[14px] text-ink2">{l.text}</p>
          <Link to={paths.intakeRecord(record.id, l.from.module ? `m:${l.from.module}` : l.from.section)} className="mt-0.5 inline-block text-[12px] font-medium text-forest hover:underline">{l.from.label}</Link>
        </li>
      ))}
    </ul>
  );
}

/** The clinical summary a clinician reads before choosing a service. Every line says where it came from; only signed work counts as clinician-confirmed.
    The written summary starts as an AI suggested draft built from those lines, and stays a draft until a clinician confirms it. */
export function SummaryCard({ record }: { record: IntakeRecord }) {
  const setSummary = useStore((s) => s.setCareSummary);
  const confirm = useStore((s) => s.confirmCareSummary);
  const startPlan = useStore((s) => s.startCarePlan);
  const [signing, setSigning] = useState(false);
  const { lines, unsigned } = clinicalSummary(record);
  const modules = lines.filter((l) => l.id.startsWith("module:"));
  const sum = record.carePlan?.summary;
  const locked = record.carePlan?.status === "approved";
  const running = record.tasks.some((t) => t.role === "pathway" && t.action === "Draft the clinical summary" && (t.status === "queued" || t.status === "running"));

  const draft = () => {
    startPlan(record.id);
    runAgent(record.id, {
      role: "pathway", action: "Draft the clinical summary", section: "pathway", source: "Signed assessment modules, clinical assessment and referral", ms: 1200,
      work: () => {
        const r = useStore.getState().intakes.find((x) => x.id === record.id);
        if (!r) return "The record was not found.";
        useStore.getState().setCareSummary(record.id, draftSummaryText(clinicalSummary(r)), true);
        return "Drafted a summary from signed work. A clinician reviews and confirms it.";
      },
    });
  };

  return (
    <Card data-card="clinical-summary">
      <CardHeader
        title="Clinical summary"
        subtitle="Built from the referral and the signed assessment work. Each line links to where it came from."
        right={sum?.confirmedBy ? <Pill tone="good" dot>Confirmed by {actorName(sum.confirmedBy)}</Pill> : <Pill tone="mid">Draft: a clinician confirms it</Pill>}
      />
      <CardBody className="space-y-4">
        <LineList record={record} lines={lines.filter((l) => !l.id.startsWith("module:"))} />
        {modules.length ? (
          <Disclosure variant="plain" title={<span className="font-sans text-[13px] font-semibold">Signed assessment modules ({modules.length})</span>} summary={modules.map((l) => l.label).join(", ")}>
            <div className="px-1 py-2"><LineList record={record} lines={modules} /></div>
          </Disclosure>
        ) : null}
        {unsigned.length ? <p className="text-[13px] text-muted">Not in the summary because they are not signed: {unsigned.join(", ")}.</p> : null}

        <div className="rounded-xl border border-line bg-tile/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">Written summary</span>
              {sum ? (sum.ai ? <Pill tone="mid">AI suggested draft</Pill> : <Pill tone="neutral">Edited by a person</Pill>) : null}
              {sum ? <span className="text-[12px] text-muted">{stamp(sum.draftedAt)}</span> : null}
            </div>
            {!locked ? <Button size="sm" icon={Sparkles} loading={running} onClick={draft}>{sum ? "Draft it again" : "Draft a summary"}</Button> : null}
          </div>
          {sum ? (
            <TextArea
              aria-label="Written clinical summary" rows={Math.min(10, Math.max(4, sum.text.split("\n").length + 1))} value={sum.text} disabled={locked}
              onChange={(e) => setSummary(record.id, e.target.value, false)} className="mt-2"
            />
          ) : (
            <p className="mt-1.5 text-[13px] text-muted">No written summary yet. The Care Pathway Agent drafts one from the lines above; a clinician edits and confirms it.</p>
          )}
          {sum && !locked ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" icon={PenLine} disabled={!sum.text.trim() || !!sum.confirmedBy} onClick={() => setSigning(true)}>{sum.confirmedBy ? "Confirmed" : "Confirm the summary"}</Button>
              {sum.confirmedBy ? <Chip>{actorName(sum.confirmedBy)}{sum.rolePlay ? " (demo role-play)" : ""} · {sum.confirmedAt !== undefined ? stamp(sum.confirmedAt) : ""}</Chip> : <span className="text-[12px] text-muted">An edit after confirmation needs confirming again.</span>}
            </div>
          ) : null}
        </div>
      </CardBody>
      <SignOffDialog
        open={signing} onClose={() => setSigning(false)} record={record} title="Confirm the clinical summary"
        attestation="I reviewed this summary against the signed record. It states clinical findings, not a placement or a medical necessity decision."
        signLabel="Confirm summary" onSign={(signer, rolePlay) => { confirm(record.id, signer.id, rolePlay); }}
      />
    </Card>
  );
}
