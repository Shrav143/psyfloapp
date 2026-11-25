import { useState } from "react";
import { Eye, FilePlus2, History, Replace, Ban } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { ModuleId, PriorAssessment } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { longDate, stamp } from "@/lib/time";
import { useStore } from "@/store";
import { PriorDrawer } from "../cans/PriorDrawer";
import { CannotReuseModal, ReuseModal } from "../cans/PriorModals";
import { ageLabel, DECISION_LABEL, REUSE_LABEL, staleFlag, STATUS_LABEL } from "../cans/priorModel";
import { Facts } from "../cans/ui";
import { actorName } from "../shared/provenance";

/** "Existing assessment found": assessments found for the person from another provider or an earlier episode, for one module. A person reviews one (read-only),
    reuses it as a starting point (a draft marked "Carried forward from <date>, needs review"; nothing is signed), starts a new assessment, or says it cannot
    be reused and why. Draw it above any module: it shows nothing when the record has no prior assessment for that module. */
export function PriorAssessmentsCard({ record, moduleId }: { record: IntakeRecord; moduleId: ModuleId }) {
  const priors = (record.priorAssessments ?? []).filter((p) => p.moduleId === moduleId);
  if (!priors.length) return null;
  return (
    <div className="space-y-3" data-prior-assessments={moduleId}>
      {priors.map((p) => <PriorCard key={p.id} record={record} prior={p} />)}
    </div>
  );
}

function PriorCard({ record, prior }: { record: IntakeRecord; prior: PriorAssessment }) {
  const now = useStore((s) => s.clock);
  const review = useStore((s) => s.reviewPrior);
  const startNew = useStore((s) => s.startNewFromPrior);
  const requestUpdate = useStore((s) => s.requestPriorUpdate);
  const [drawer, setDrawer] = useState(false);
  const [reuse, setReuse] = useState(false);
  const [cannot, setCannot] = useState(false);
  const decision = record.priorDecisions?.[prior.id];
  const stale = staleFlag(prior, now);
  const done = decision?.action === "reused" || decision?.action === "new_started";
  const blocked = prior.reuse === "not_permitted" || decision?.action === "cannot_reuse";
  return (
    <Card data-prior={prior.id}>
      <CardHeader
        title="Existing assessment found"
        subtitle={`${prior.label} · ${prior.provider}`}
        right={<><Pill tone={prior.status === "current" ? "good" : "mid"}>{STATUS_LABEL[prior.status]}</Pill>{stale ? <Pill tone="mid">May be stale</Pill> : null}</>}
      />
      <CardBody className="space-y-3">
        <Facts
          cols={3}
          items={[
            ["Assessment date", `${longDate(prior.date)} · ${ageLabel(prior, now)}`],
            ["Assessor", prior.clinician],
            ["Source", prior.provider],
            ["Version", prior.version],
            ["Reuse", REUSE_LABEL[prior.reuse]],
          ]}
        />
        {stale ? <p className="text-[13px] text-mid-ink">{stale}</p> : null}
        <p className="text-[13px] text-ink2">{prior.note}</p>
        {decision ? (
          <p data-prior-decision={decision.action} className="rounded-xl bg-tile px-3 py-2 text-[13px] text-ink">
            <span className="font-semibold">{DECISION_LABEL[decision.action]}</span> · {actorName(decision.by)} · {stamp(decision.at)}
            {decision.reason ? <span className="block text-ink2">Reason: {decision.reason}</span> : null}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={Eye} onClick={() => { setDrawer(true); review(record.id, prior.id); }}>Review</Button>
          <Button size="sm" variant="primary" icon={Replace} disabled={blocked || done} title={blocked ? "Reuse is not permitted for this assessment" : undefined} onClick={() => setReuse(true)}>Reuse as starting point</Button>
          <Button size="sm" icon={FilePlus2} disabled={done} onClick={() => startNew(record.id, prior.id)}>Start new assessment</Button>
          <Button size="sm" icon={Ban} disabled={decision?.action === "cannot_reuse" || decision?.action === "reused"} onClick={() => setCannot(true)}>Cannot reuse</Button>
          <Button size="sm" variant="ghost" icon={History} disabled={decision?.action === "update_requested"} onClick={() => requestUpdate(record.id, prior.id)}>Ask the source for an update</Button>
        </div>
      </CardBody>
      <PriorDrawer prior={prior} now={now} open={drawer} onClose={() => setDrawer(false)} />
      {reuse ? <ReuseModal record={record} prior={prior} onClose={() => setReuse(false)} /> : null}
      {cannot ? <CannotReuseModal record={record} prior={prior} onClose={() => setCannot(false)} /> : null}
    </Card>
  );
}
