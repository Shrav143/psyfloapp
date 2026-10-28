import { Link } from "react-router-dom";
import { Label } from "@/components/ui";
import { isModuleSigned } from "@/data/assess/carePlan";
import type { CaseDraft } from "@/data/cases";
import { paths } from "@/routes";
import type { CaseEnv } from "./caseEnv";

/** Beside the agents' rows, for a request prepared from an intake record: what they worked from, and what they do not do. It replaces the approval figure and its levers, which a request like this does not carry. */
export function RecordReadPanel({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const r = env.intake;
  if (!r) return null;
  const signed = Object.keys(r.instruments ?? {}).filter((id) => isModuleSigned(r, id as Parameters<typeof isModuleSigned>[1])).length;
  const plan = r.carePlan?.status === "approved" ? `Care plan version ${r.carePlan.version ?? 1}, approved` : "No approved care plan";
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="record-read-panel">
      <Label>Worked from the intake record</Label>
      <ul className="flex flex-col gap-1 text-[13px]">
        <li><Link to={paths.intakeRecord(r.id)} className="font-semibold text-forest hover:underline">{r.id}</Link> <span className="text-muted">{r.initials}, {r.age}</span></li>
        <li>{signed} signed assessment {signed === 1 ? "module" : "modules"}{r.assessment.status === "signed" ? " and a signed clinical assessment" : ""}</li>
        <li>{plan}</li>
        <li>{draft.documents.length} {draft.documents.length === 1 ? "document" : "documents"} in the packet</li>
      </ul>
      <p className="text-[12px] text-muted">The agents arrange what the record documents. No estimate of approval is made, they do not choose a service, and only a clinician signs.</p>
    </div>
  );
}
