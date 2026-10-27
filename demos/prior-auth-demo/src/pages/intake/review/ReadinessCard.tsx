import { useState } from "react";
import { Info } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Pill } from "@/components/ui";
import { REQUIREMENT_LABEL, type CheckItem, type Readiness } from "@/data/intake/checklist";
import type { IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { useStore } from "@/store";
import { KIND_LABEL, ORG_RULE_LABEL, orgRulesFor } from "../policy/match";
import { PolicyButton } from "../policy/PolicyButton";
import { GoTo } from "./ChecklistCard";
import { CheckPill, ReadinessPill, RuleStatusPill, SourceAnchor } from "./pills";

/** A short list: label, status and where to fix it. The detail is in the checklist below. */
function ItemList({ recordId, items }: { recordId: string; items: CheckItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 4);
  return (
    <ul className="mt-1.5 space-y-1">
      {shown.map((b) => (
        <li key={b.id} data-blocker={b.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <span className="min-w-0 flex-1 font-medium">{b.label}</span>
          <CheckPill status={b.status} />
          <GoTo recordId={recordId} item={b} />
        </li>
      ))}
      {items.length > 4 ? (
        <li><button type="button" className="text-[12px] font-semibold text-forest hover:underline" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${items.length}`}</button></li>
      ) : null}
    </ul>
  );
}

/** Authorization readiness, kept apart from completeness: whether the service needs an authorization (or a registration, or nothing, or the
    policy is not settled), and whether New Case has what it needs. It never says a request will be approved. */
export function ReadinessCard({ record, rd }: { record: IntakeRecord; rd: Readiness }) {
  const orgRules = useStore((s) => s.orgRules);
  const createTask = useStore((s) => s.createPersonTask);
  const complete = useStore((s) => s.completeIntakeTask);
  const svc = serviceById(rd.serviceId);
  const plan = record.payerId ? vaPlanOf(record.payerId) : undefined;
  const org = orgRulesFor(orgRules, rd.serviceId, record.payerId);
  const regTask = record.tasks.find((t) => t.kind === "registration" && t.status === "needs_you");
  const regDone = record.tasks.find((t) => t.kind === "registration" && t.status === "done");
  return (
    <Card data-card="readiness">
      <CardHeader title="Authorization readiness" right={<ReadinessPill status={rd.status} />} />
      <CardBody className="space-y-4">
        <div>
          <p data-testid="readiness-headline" className="text-[14px]">{rd.headline}</p>
          <p className="mt-2 flex items-center gap-2 rounded-xl bg-sage-bg px-3 py-2 text-[13px] font-medium text-ink">
            <Info size={15} className="ico shrink-0 text-forest" aria-hidden="true" />
            {rd.note}
          </p>
        </div>
        <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-muted">Service</dt>
          <dd>{svc.label}{svc.code ? ` (${svc.code})` : ""}{rd.selected ? " · selected on the care pathway" : " · requested; no pathway selected yet"}</dd>
          <dt className="text-muted">Requirement</dt>
          <dd>{REQUIREMENT_LABEL[rd.requirement]}{rd.timing ? ` · ${rd.timing}` : ""}</dd>
          <dt className="text-muted">Reviewer</dt>
          <dd>{plan ? `${plan.reviewer} · ${plan.channel}` : "No plan on file"}</dd>
        </dl>

        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Requirements that apply</h4>
            <PolicyButton serviceId={rd.serviceId} payerId={record.payerId} age={record.age} label="All rules" />
          </div>
          <ul className="mt-1.5 divide-y divide-line">
            {rd.rules.map((r) => (
              <li key={r.id} data-req={r.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{r.label}</span>
                  <RuleStatusPill rule={r} />
                  <Chip>{KIND_LABEL[r.kind]}</Chip>
                </div>
                <p className="mt-0.5 text-[13px] text-ink2">{r.detail}</p>
                <SourceAnchor rule={r} />
              </li>
            ))}
            {org.map((r) => (
              <li key={r.id} data-org-rule={r.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{r.label}</span>
                  <Pill tone="mid">{ORG_RULE_LABEL}</Pill>
                  <Chip>{KIND_LABEL[r.kind]}</Chip>
                </div>
                <p className="mt-0.5 text-[13px] text-ink2">{r.detail} It does not change what DMAS or the plan requires.</p>
              </li>
            ))}
          </ul>
        </div>

        {rd.status === "not_ready" && rd.blockers.length ? (
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Stops the handoff</h4>
            <ItemList recordId={record.id} items={rd.blockers} />
          </div>
        ) : null}
        {rd.warnings.length && rd.status !== "not_needed" ? (
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">To verify (does not stop the handoff)</h4>
            <ItemList recordId={record.id} items={rd.warnings} />
          </div>
        ) : null}
        {rd.openIntake && rd.status !== "handed_off" ? <p className="text-[13px] text-muted">{rd.openIntake} other intake {rd.openIntake === 1 ? "item is" : "items are"} open. They make the intake complete; they do not decide the handoff.</p> : null}

        {rd.requirement === "registration" && rd.status !== "handed_off" ? (
          <div className="rounded-xl border border-edge bg-tile px-3.5 py-3">
            <p className="text-[13px] font-semibold">Register within 1 business day</p>
            {regTask ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-ink2">Task open: {regTask.action}</span>
                <Button size="sm" variant="primary" onClick={() => complete(record.id, regTask.id, `Registered with ${plan?.name ?? "the plan"} through ${plan?.channel ?? "its channel"} (outside Psyflo).`)}>Mark registered</Button>
              </div>
            ) : regDone ? (
              <p className="mt-1 text-[13px] text-good-ink">{regDone.result}</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-ink2">No authorization handoff. A person registers the service with the plan.</span>
                <Button size="sm" variant="primary" onClick={() => createTask(record.id, { kind: "registration", action: `Register ${svc.short} with ${plan?.short ?? "the plan"} within 1 business day`, result: `Register through ${plan?.channel ?? "the plan's channel"}. Nothing is sent from Intake.` })}>Create the registration task</Button>
              </div>
            )}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
