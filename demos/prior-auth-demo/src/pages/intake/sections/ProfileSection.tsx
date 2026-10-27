import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { SectionHead } from "../profile/bits";
import { PROFILE_GROUPS } from "../profile/model";
import { HistoryDisclosure, ProfileGroupCard } from "../profile/ProfileCards";
import { RequestDialog, RequestsCard } from "../profile/Requests";
import { useDerivedFields } from "../profile/sync";

/** C. Patient profile: one card per group with its own required count, consent at a glance, history under "Collect as appropriate",
    and a secure form (simulated) to ask the patient or guardian for what is missing. */
export function ProfileSection({ record }: { record: IntakeRecord }) {
  useDerivedFields(record);
  const [asking, setAsking] = useState(false);
  return (
    <div className="space-y-4">
      <SectionHead title="Patient profile" right={<Button icon={Send} onClick={() => setAsking(true)}>Request from the patient or guardian</Button>} />
      <RequestsCard record={record} />
      {PROFILE_GROUPS.map((g) => <ProfileGroupCard key={g} record={record} group={g} />)}
      <HistoryDisclosure record={record} />
      {asking ? <RequestDialog record={record} onClose={() => setAsking(false)} /> : null}
    </div>
  );
}
