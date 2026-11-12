import { Link } from "react-router-dom";
import { Check, RefreshCw } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { recordDocs } from "@/data/assess/recordDocs";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { slotLabel } from "./documents";

/** What the intake record already holds, attached without anyone uploading it again: the referral, the signed assessment and modules, the approved care plan and any document a person chose to attach.
    Below it, what the payer asks for that the record does not hold. The agents' authoring tools stay for the narratives only this authorization needs. */
export function RecordDocsCard({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const sync = useStore((s) => s.syncCaseFromIntake);
  const toast = useStore((s) => s.toast);
  if (!intake) return null;
  const offered = recordDocs(intake);
  const attached = draft.documents.filter((x) => x.from);
  const missing = env.readiness.missingRequired.filter((m) => !draft.documents.some((x) => x.slot === m.slot));
  const refresh = () => {
    const n = sync(draft.id);
    toast({ title: n ? `${n} ${n === 1 ? "document" : "documents"} added from the record` : "Nothing new on the record", tone: n ? "good" : "neutral" });
  };
  return (
    <Card data-card="record-docs">
      <CardHeader
        title="From the intake record"
        subtitle={`Read from ${intake.id}. Attached automatically; nothing is uploaded again.`}
        right={<><Pill tone={missing.length ? "mid" : "good"} dot>{missing.length ? `${missing.length} required missing` : "Required documents are in"}</Pill><Button size="sm" icon={RefreshCw} onClick={refresh}>Refresh from the record</Button></>}
      />
      <CardBody className="space-y-4">
        {attached.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Attached from the record">
            {attached.map((d) => {
              const src = offered.find((o) => o.slot === d.slot);
              return (
                <li key={d.slot} data-record-doc={d.slot} title={d.from}>
                  <Link to={paths.intakeRecord(intake.id, src?.module ? `m:${src.module}` : src?.section ?? "documents")} className="inline-flex items-center gap-1.5 rounded-full bg-good-bg px-3 py-1 text-[13px] font-medium text-good-ink hover:underline">
                    <Check size={13} className="ico" aria-hidden="true" />
                    {slotLabel(d.slot)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink2">The record holds nothing for this payer's document list yet. Sign the assessment work and approve the care plan in the intake, and it appears here.</p>
        )}
        {missing.length ? (
          <div className="rounded-xl bg-tile px-3.5 py-2.5" data-testid="record-missing">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">Still missing for this payer</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px]">{missing.map((m) => <li key={m.slot}>{m.label}</li>)}</ul>
            <p className="mt-1 text-[12px] text-muted">Add them below, or finish them in the intake.</p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
