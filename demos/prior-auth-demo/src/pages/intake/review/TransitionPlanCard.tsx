import { Link } from "react-router-dom";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip, Dropdown, Pill } from "@/components/ui";
import type { LegacyClient } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { LEGACY_LAST_DAY, REDESIGN_START } from "@/data/va/policy";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { DAY, longDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { TRANSITION_LABEL } from "@/store/intakeReview";
import { actorName } from "../shared/provenance";

export const LEGACY_STATUS_LABEL = TRANSITION_LABEL;
export const LEGACY_STATUS_OPTIONS = (Object.keys(LEGACY_STATUS_LABEL) as LegacyClient["status"][]).map((v) => ({ value: v, label: LEGACY_STATUS_LABEL[v] }));

/** For a person on a retiring service: what they have now, the dates that matter, where the clinical review stands and what to do next.
    The options are options to review, never a mapping. */
export function TransitionPlanCard({ record }: { record: IntakeRecord }) {
  const clock = useStore((s) => s.clock);
  const client = useStore((s) => s.legacyRoster.find((c) => c.intakeId === record.id));
  const setStatus = useStore((s) => s.updateTransitionStatus);
  const createTask = useStore((s) => s.createPersonTask);
  const toast = useStore((s) => s.toast);
  const l = record.legacy;
  if (!l) return null;
  const svc = serviceById(l.serviceId);
  const plan = record.payerId ? vaPlanOf(record.payerId) : undefined;
  const gap = Math.round((LEGACY_LAST_DAY - l.authEnds) / DAY);
  const renewal = record.tasks.find((t) => t.kind === "renewal");
  const selected = record.pathways.find((p) => p.status === "selected");
  type Mark = { label: string; at: number; tone: "now" | "warn" | "end" | "start" };
  const marks: Mark[] = [
    { label: "Today", at: clock, tone: "now" },
    { label: `${l.authorizationId} ends`, at: l.authEnds, tone: "warn" },
    { label: `Last day of ${svc.short}`, at: LEGACY_LAST_DAY, tone: "end" },
    { label: "Redesigned services start", at: REDESIGN_START, tone: "start" },
  ];
  const dates = [...marks].sort((a, b) => a.at - b.at);
  return (
    <Card data-card="transition-plan">
      <CardHeader title="Transition plan" right={<Pill tone="mid">Transitioning existing patient</Pill>} />
      <CardBody className="space-y-4">
        <p className="text-[14px]">
          Receives <b className="font-semibold">{svc.label} ({svc.code})</b>{plan ? ` with ${plan.name}` : ""}. Authorization {l.authorizationId} runs through {longDate(l.authEnds)}.
        </p>
        <ol aria-label="Transition timeline" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dates.map((d) => (
            <li key={d.label} className={cn("rounded-xl border px-3 py-2", d.tone === "warn" ? "border-mid-edge bg-mid-bg" : d.tone === "start" ? "border-good-edge bg-good-bg" : "border-edge bg-tile")}>
              <div className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{d.label}</div>
              <div className="text-[14px] font-semibold tabular-nums">{longDate(d.at)}</div>
            </li>
          ))}
        </ol>
        {gap > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mid-edge bg-mid-bg/60 px-3 py-2">
            <p className="min-w-0 flex-1 text-[13px] text-mid-ink">The authorization ends {gap} days before {svc.short} retires. A renewal through June 30, 2027 may be needed; the plan decides.</p>
            {renewal ? (
              <span className="text-[12px] font-semibold text-mid-ink">{renewal.status === "done" ? "Renewal recorded" : "Renewal task open"}</span>
            ) : (
              <Button size="sm" icon={CalendarPlus} onClick={() => createTask(record.id, { kind: "renewal", action: `Plan the renewal of ${l.authorizationId} through June 30, 2027`, result: "Prepare it in Authorizations. The plan decides; nothing is sent from Intake." })}>Create a renewal task</Button>
            )}
          </div>
        ) : null}
        <div>
          <h4 className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">Clinical service review</h4>
          <p className="mt-1 text-[13px] text-ink2">
            {selected ? `${selected.serviceId === "external" ? selected.externalLabel ?? "External program" : serviceById(selected.serviceId).short} selected by ${actorName(selected.decidedBy ?? "")}.` : "No option selected. A clinician reviews the options; Psyflo does not pick one."}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-muted">Options to review, not a mapping:</span>
            {record.pathways.map((p) => <Chip key={p.id}>{p.serviceId === "external" ? p.externalLabel ?? "External" : serviceById(p.serviceId).short}</Chip>)}
            <Link to={paths.intakeRecord(record.id, "pathway")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest hover:underline">Go to Care pathway<ArrowRight size={13} className="ico" /></Link>
          </div>
        </div>
        {client ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Transition status ({client.id})</span>
            <Dropdown<LegacyClient["status"]>
              ariaLabel="Transition status"
              value={client.status}
              options={LEGACY_STATUS_OPTIONS}
              onChange={(v) => {
                setStatus(client.id, v);
                toast({ title: "Transition status updated", body: `${client.initials}: ${LEGACY_STATUS_LABEL[v]}`, tone: "good" });
              }}
            />
            <Link to={paths.intake({ view: "transition" })} className="text-[12px] font-semibold text-forest hover:underline">Open the July 2027 transition view</Link>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
