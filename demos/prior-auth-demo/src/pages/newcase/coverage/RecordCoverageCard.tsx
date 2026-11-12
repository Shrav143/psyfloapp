import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { staffOf } from "@/data/intake/seed";
import { payerNameOf } from "@/data/patients";
import { longDate } from "@/lib/time";
import { SimulatedTag } from "@/pages/intake/shared/provenance";
import { paths } from "@/routes";
import { useStore } from "@/store";

const STATE = { active: { label: "Active in the response", tone: "good" }, inactive: { label: "Not active in the response", tone: "risk" }, not_checked: { label: "Not checked", tone: "neutral" }, checking: { label: "Checking", tone: "neutral" }, uncertain: { label: "Uncertain", tone: "mid" }, conflict: { label: "Sources disagree", tone: "mid" } } as const;

/** What the intake record already knows about this person's coverage: the plan, the member ID, the coverage type and the eligibility response (simulated). It is read, not re-entered; the check below is this request's own. */
export function RecordCoverageCard({ draft }: { draft: CaseDraft }) {
  const r = useStore((s) => s.intakes.find((x) => x.id === draft.intakeId));
  if (!r) return null;
  const e = r.eligibility;
  const st = STATE[e.status];
  const confirmed = e.verified?.member;
  return (
    <Card data-card="record-coverage">
      <CardHeader title="Coverage on the record" subtitle={`Read from intake ${r.id}. Nothing is asked again.`} right={<Link to={paths.intakeRecord(r.id, "patient:coverage")} className="text-[13px] font-semibold text-forest hover:underline">Open Patient &amp; coverage</Link>} />
      <CardBody>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
          <div><dt className="text-muted">Plan</dt><dd className="font-medium">{r.payerId ? payerNameOf(r.payerId) : "None on file"}</dd></div>
          <div><dt className="text-muted">Coverage type</dt><dd className="font-medium">{r.coverage.coverageType?.value ?? "Not on file"}</dd></div>
          <div><dt className="text-muted">Member ID</dt><dd className="font-medium">{draft.memberId || "Not on file"}</dd></div>
          <div>
            <dt className="text-muted">Eligibility response</dt>
            <dd className="flex flex-wrap items-center gap-1.5"><Pill tone={st.tone} dot>{st.label}</Pill><SimulatedTag />{e.checkedAt !== undefined ? <span className="text-muted">{longDate(e.checkedAt)}</span> : null}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[13px] text-ink2">{confirmed ? `Member eligibility was confirmed with the plan by ${staffOf(confirmed.by)?.name ?? confirmed.by}.` : "Not confirmed with the plan by a person. The simulated response is a starting point; the check below is this request's own."}</p>
      </CardBody>
    </Card>
  );
}
