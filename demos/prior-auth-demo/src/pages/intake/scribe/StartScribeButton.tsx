import { Mic } from "lucide-react";
import { Button } from "@/components/ui";

/** Built by the assessment, scribe and voice engineer: Start AI Scribe from the Intake header (pick or create the encounter) or a record. Replace this placeholder. */
export function StartScribeButton(_: { intakeId?: string }) {
  return <Button icon={Mic} onClick={() => undefined}>Start AI Scribe</Button>;
}
