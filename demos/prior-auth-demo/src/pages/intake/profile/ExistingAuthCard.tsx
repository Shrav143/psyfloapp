import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill, TextInput } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { LEGACY_LAST_DAY, POLICY_RULES, vaDate } from "@/data/va/policy";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { DAY, longDate, toDate } from "@/lib/time";
import { useStore } from "@/store";
import { IntakeField } from "../shared/provenance";
import { RuleRow } from "./bits";
import { reviewerOf } from "./model";

const iso = (m: number) => {
  const d = toDate(m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const LAST_ISO = iso(LEGACY_LAST_DAY);
const RETIRE_RULE = POLICY_RULES.find((r) => r.id === "legacy-end");

/** A current authorization on a retiring service: when it ends, when the service ends, and a renewal follow-up that never runs past June 30, 2027. */
function LegacyAuth({ record, now }: { record: IntakeRecord; now: number }) {
  const add = useStore((s) => s.addCoverageFollowUp);
  const L = record.legacy;
  const [open, setOpen] = useState(false);
  const [through, setThrough] = useState(LAST_ISO);
  if (!L) return null;
  const svc = serviceById(L.serviceId);
  const next = serviceById(record.serviceId);
  const active = L.authEnds >= now;
  const serviceEnded = svc.status === "retiring" && now > LEGACY_LAST_DAY;
  const renewal = record.tasks.find((t) => t.action.startsWith(`Renew ${L.authorizationId}`) && t.status !== "cancelled");
  const canRenew = svc.status === "retiring" && !serviceEnded && L.authEnds < LEGACY_LAST_DAY;
  const tooLate = !!through && through > LAST_ISO;
  const tooEarly = !!through && through <= iso(L.authEnds);
  const gap = record.serviceId !== L.serviceId && record.serviceDate > L.authEnds + DAY;
  const create = () => {
    const end = vaDate(through);
    add(record.id, {
      action: `Renew ${L.authorizationId} (${svc.short}) from ${longDate(L.authEnds + DAY)} through ${longDate(end)}, no later than June 30, 2027`,
      result: `Request it from ${reviewerOf(record.payerId) ?? "the plan"} before ${longDate(L.authEnds)}. ${svc.short} ends June 30, 2027, so a renewal cannot run past it.`,
    });
    setOpen(false);
  };
  return (
    <div data-legacy-auth={L.authorizationId} className="border-b border-line py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-semibold">{L.authorizationId}</span>
        <Pill tone={active ? "good" : "neutral"}>{active ? `Active through ${longDate(L.authEnds)}` : `Ended ${longDate(L.authEnds)}`}</Pill>
      </div>
      <p className="mt-1 text-[13px] text-ink2">
        {svc.label}{svc.code ? ` (${svc.code})` : ""} · {vaPlanOf(record.payerId ?? "")?.name ?? "Plan not on file"}
      </p>
      {svc.status === "retiring" && RETIRE_RULE ? <ul className="mt-1"><RuleRow rule={RETIRE_RULE} /></ul> : null}
      {gap && canRenew ? (
        <p className="mt-1 rounded-lg bg-mid-bg px-2.5 py-1.5 text-[12px] text-mid-ink">
          {next.short} is planned from {longDate(record.serviceDate)}. Without a renewal there is no authorization from {longDate(L.authEnds + DAY)} until {svc.short} ends on June 30, 2027.
        </p>
      ) : null}
      {serviceEnded ? <p className="mt-1 text-[12px] text-muted">{svc.short} ended June 30, 2027. It cannot be renewed.</p> : null}
      {canRenew ? (
        renewal ? (
          <p data-renewal="created" className="mt-2 text-[12px] text-good-ink">
            Follow-up {renewal.status === "done" ? "done" : "created"}: {renewal.action}
          </p>
        ) : open ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-medium text-ink2">
              Renew through
              <TextInput type="date" value={through} min={iso(L.authEnds + DAY)} max={LAST_ISO} onChange={(e) => setThrough(e.target.value)} className="mt-1 w-[170px]" aria-describedby={`renew-${L.authorizationId}`} />
            </label>
            <Button size="sm" variant="primary" disabled={!through || tooLate || tooEarly} onClick={create}>Create follow-up</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <p id={`renew-${L.authorizationId}`} className={tooLate || tooEarly ? "w-full text-[12px] text-risk-ink" : "w-full text-[12px] text-muted"}>
              {tooLate ? `${svc.short} ends June 30, 2027. A renewal cannot run past it.` : tooEarly ? `Choose a date after ${longDate(L.authEnds)}.` : "No later than June 30, 2027, the service's last day."}
            </p>
          </div>
        ) : (
          <Button size="sm" className="mt-2" icon={CalendarPlus} onClick={() => setOpen(true)}>Create a renewal follow-up</Button>
        )
      ) : null}
    </div>
  );
}

/** Authorizations already on file, from the record and the EMR, and the free-text note. */
export function ExistingAuthCard({ record, now }: { record: IntakeRecord; now: number }) {
  return (
    <Card data-card="existing-auths">
      <CardHeader title="Existing authorizations" right={record.legacy ? <Pill tone="neutral">1 on file</Pill> : undefined} />
      <CardBody className="py-2">
        <LegacyAuth record={record} now={now} />
        <IntakeField record={record} section="coverage" field="existingAuths" label="Existing authorizations, if known" kind="long" />
      </CardBody>
    </Card>
  );
}
