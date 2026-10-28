import { Link } from "react-router-dom";
import { Banner, Pill } from "@/components/ui";
import { programAvailability } from "@/data/assess/programs";
import { CAPACITY_SEED, programIdOf } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { capacityOf, waitlistCount } from "@/store/intakeReferral";

/** What the requested program's availability is on the policy date, and its demo capacity. A retired service says "not available in this policy period":
    a clinician reviews what fits next, and nothing assumes a one-to-one replacement. Capacity is demo configuration, not a real census. */
export function ServiceNotes({ record, now }: { record: IntakeRecord; now: number }) {
  const programId = programIdOf(record.serviceId);
  const capOpen = useStore((s) => s.capacityOpen);
  const intakes = useStore((s) => s.intakes);
  if (!programId) {
    return <p className="py-2 text-[12px] text-muted">{serviceById(record.serviceId).short}: availability and coverage are not verified for this service.</p>;
  }
  const av = programAvailability(programId, "VA", Math.max(record.serviceDate, now));
  const cap = capacityOf({ capacityOpen: capOpen }, programId);
  const waiting = cap ? waitlistCount({ intakes }, programId) : 0;
  const retired = av.status === "retired";
  return (
    <div className="flex flex-col gap-2 py-2" data-service-notes>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <Pill tone={av.status === "available" ? "good" : retired ? "risk" : "mid"}>{av.status === "available" ? "Available" : retired ? "Not available in this policy period" : "Starts later"}</Pill>
        {cap ? (
          <>
            <Pill tone={cap.open > 0 ? "neutral" : "mid"}>{cap.open} of {cap.total} {cap.unit}s open</Pill>
            <span className="text-[12px] text-muted">Demo configuration{waiting ? ` · ${waiting} on the waitlist` : ""}</span>
          </>
        ) : null}
        {!cap && CAPACITY_SEED[programId] === undefined ? <span className="text-[12px] text-muted">No capacity limit in the demo</span> : null}
      </div>
      {retired ? (
        <Banner tone="mid" title={`${serviceById(record.serviceId).short} is not available in this policy period`}>
          It ended June 30, 2027. A clinician reviews what fits next; there is no one-to-one replacement.{" "}
          <Link to={paths.intakeRecord(record.id, "care")} className="font-semibold underline">Open care planning</Link>
        </Banner>
      ) : av.status === "starts" ? (
        <p className="text-[12px] text-muted">{av.note}</p>
      ) : null}
    </div>
  );
}
