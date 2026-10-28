import { useState, type ReactNode } from "react";
import { Banner, Button, Checkbox } from "@/components/ui";
import type { ReferralNotice } from "@/data/intake/decision";
import { partTwoApplies } from "@/data/intake/referralFacts";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";

type Basis = NonNullable<ReferralNotice["basis"]>;

/** What a person relies on to send a notice to the referrer. A release of information on file is the clear basis. Without one, a person attests under the
    organization's protocol (not legal advice), except for a substance use program, where the release must be on file first (42 CFR Part 2). Sending is always
    a person's act; this only decides whether the button is ready. */
export function useSendBasis(record: IntakeRecord): { basis: Basis | null; node: ReactNode } {
  const edit = useStore((s) => s.editReferralField);
  const [attested, setAttested] = useState(false);
  const roi = record.profile.roi?.value === "On file";
  const part2 = partTwoApplies(record);
  if (roi) return { basis: "release_on_file", node: <p className="text-[13px] text-good-ink">A release of information is on file for the referrer.</p> };
  if (part2) {
    return {
      basis: null,
      node: (
        <Banner tone="mid" title="A release of information is needed first" action={<Button size="sm" onClick={() => edit(record.id, "profile", "roi", "On file", "verified", { kind: "staff", ref: "Recorded by staff" })}>Record that a release is on file</Button>}>
          This program treats substance use. 42 CFR Part 2 consent must be on file before anything is sent. Organization protocol, not legal advice.
        </Banner>
      ),
    };
  }
  return {
    basis: attested ? "protocol_attested" : null,
    node: (
      <div className="flex flex-col gap-1.5 rounded-xl bg-tile px-3.5 py-3">
        <Checkbox checked={attested} onChange={setAttested} label="The referrer may receive this under our organization's protocol" />
        <p className="pl-7 text-[12px] text-muted">No release of information is on file. The notice has no clinical details. Organization protocol, not legal advice.</p>
      </div>
    ),
  };
}
