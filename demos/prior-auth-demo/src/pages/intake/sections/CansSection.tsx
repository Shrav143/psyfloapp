import { ClipboardPlus } from "lucide-react";
import { Banner, Button, Card, CardBody } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { CansApplicability } from "../cans/CansApplicability";
import { cansApplies } from "../cans/cansModel";
import { CansRecordCard } from "../cans/CansRecordCard";
import { EvidenceBoard } from "../cans/EvidenceBoard";
import { LevelOfNeed } from "../cans/LevelOfNeed";
import { RatingsCard } from "../cans/RatingsCard";
import { useIntakeNow } from "../lib/policyNow";

/** CANS Lifetime and Level of Need. Whether the CANS shows at all comes from the policy layer (cansFor), as of the policy "now". */
export function CansSection({ record }: { record: IntakeRecord }) {
  const now = useIntakeNow();
  const start = useStore((s) => s.startCans);
  const { applies, rule } = cansApplies(record, now);
  const active = applies === "required" || applies === "upcoming";
  return (
    <div className="space-y-5" data-section="cans">
      <CansApplicability record={record} applies={applies} rule={rule} />
      {active && !record.cans ? (
        <Card data-cans-start>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">No CANS preparation record yet</p>
              <p className="text-[13px] text-ink2">Starting one lets staff gather evidence. It creates no items and no ratings.</p>
            </div>
            <Button variant="primary" icon={ClipboardPlus} onClick={() => start(record.id)}>Start CANS preparation record</Button>
          </CardBody>
        </Card>
      ) : null}
      {active && record.cans ? (
        <>
          <CansRecordCard record={record} cans={record.cans} applies={applies} />
          <EvidenceBoard record={record} cans={record.cans} />
          <RatingsCard record={record} cans={record.cans} />
        </>
      ) : null}
      {!active && record.cans ? (
        <>
          <Banner tone="neutral" title="A CANS preparation record exists from an earlier service">
            It is kept, read-only, for the audit trail. It is not used for this service.
          </Banner>
          <EvidenceBoard record={record} cans={record.cans} readOnly />
        </>
      ) : null}
      <LevelOfNeed record={record} instead={applies !== "not_applicable" && applies !== "unresolved"} />
    </div>
  );
}
