import { ClipboardList } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { LON_PENDING, lonFor } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { useStore } from "@/store";
import { AppliesInstead } from "./CansApplicability";
import { CANS_STATUS_LABEL } from "./cansModel";
import { LonReviewForm } from "./LonReviewForm";
import { Facts, RuleNote } from "./ui";

/* Level of Need. The level itself is always "pending validated policy configuration": no model, algorithm or threshold is configured, so
   Psyflo shows no number or tier. A person may record a review, and a qualified clinician records a disposition in words. */

const ASSESS_LABEL: Record<IntakeRecord["assessment"]["status"], string> = { not_started: "Not started", in_progress: "In progress", awaiting_review: "Awaiting clinician review", signed: "Signed" };
const APPLY: Record<"yes" | "unresolved" | "no", { label: string; tone: "neutral" | "mid" }> = {
  yes: { label: "Pending validated configuration", tone: "mid" },
  unresolved: { label: "Applicability not confirmed", tone: "mid" },
  no: { label: "Does not apply", tone: "neutral" },
};

/** `instead` lists what applies instead when the model does not apply (left out when the CANS card above already lists it). */
export function LevelOfNeed({ record, instead = true }: { record: IntakeRecord; instead?: boolean }) {
  const start = useStore((s) => s.startLonReview);
  const l = lonFor(record.serviceId);
  const svc = serviceById(record.serviceId);
  return (
    <Card data-lon={l.applies}>
      <CardHeader title="Level of Need" subtitle={svc.label} right={<Pill tone={APPLY[l.applies].tone}>{APPLY[l.applies].label}</Pill>} />
      <CardBody className="space-y-3">
        {l.applies !== "no" ? (
          <div data-lon-level className="rounded-xl border border-line bg-tile px-3.5 py-3">
            <p className="text-[14px] font-semibold text-ink">{LON_PENDING}</p>
            <p className="mt-0.5 text-[13px] text-ink2">Level: none. Model version: none configured. Psyflo shows no level, number, tier or threshold.</p>
          </div>
        ) : (
          <p className="text-[14px] text-ink">The Level of Need Model is not loaded for {svc.short}. Psyflo shows no Level of Need for this service.</p>
        )}
        <p className="text-[13px] text-ink2">Virginia's Level of Need Model is not LOCUS, CALOCUS-CASII or ASAM. Psyflo does not derive a level from those instruments or from the CANS Lifetime.</p>
        {l.rule ? <RuleNote rule={l.rule} /> : null}
        <Facts
          items={[
            ["Clinical assessment", ASSESS_LABEL[record.assessment.status]],
            ["CANS Lifetime", record.cans ? `${CANS_STATUS_LABEL[record.cans.status]} (no ratings)` : "No CANS record"],
          ]}
        />
        {l.applies === "yes" ? (
          record.lon ? (
            <LonReviewForm record={record} lon={record.lon} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-field px-3.5 py-3">
              <p className="min-w-0 flex-1 text-[13px] text-ink2">No review yet. A review records documented needs and next steps for a qualified reviewer. It never produces a level.</p>
              <Button size="sm" variant="primary" icon={ClipboardList} onClick={() => start(record.id)}>Start a Level of Need review</Button>
            </div>
          )
        ) : null}
        {l.applies === "unresolved" ? <p className="text-[13px] text-ink2">Psyflo does not start a Level of Need review for {svc.short} until DMAS confirms that the model applies.</p> : null}
        {l.applies === "no" && instead ? <AppliesInstead record={record} /> : null}
      </CardBody>
    </Card>
  );
}
