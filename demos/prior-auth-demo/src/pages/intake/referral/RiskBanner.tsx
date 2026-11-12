import { useMemo } from "react";
import { Banner } from "@/components/ui";
import { CLINICIAN_AT, staffOf } from "@/data/intake/seed";
import { riskFindings } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { isReferralDraftId } from "@/store/intakeReferral";

/** Risk language in what the referral says. A clinician reviews it; nothing here decides that a person is safe. Once a record carries a safety alert,
    the alert banner at the top of the record takes over, so this shows only before one exists. */
export function RiskBanner({ record }: { record: IntakeRecord }) {
  const found = useMemo(() => riskFindings(record), [record]);
  if (!found.length || record.safety) return null;
  const clinician = staffOf(CLINICIAN_AT[record.site]);
  return (
    <div data-risk-banner>
    <Banner tone="risk" title="Risk information in this referral">
      <ul className="mt-1 list-disc pl-5">
        {found.slice(0, 3).map((f) => <li key={`${f.field}-${f.text}`}>“{f.text}”</li>)}
      </ul>
      <p className="mt-2 font-semibold">A clinician reviews this. Psyflo does not decide whether a person is safe.</p>
      <p className="mt-1">
        {isReferralDraftId(record.id) ? `Saving this referral sends an alert to ${clinician?.name ?? "the site's clinician"}.` : "Raise a safety alert so the site's clinician sees it."} Declining or redirecting waits until a clinician has reviewed it.
      </p>
    </Banner>
    </div>
  );
}
