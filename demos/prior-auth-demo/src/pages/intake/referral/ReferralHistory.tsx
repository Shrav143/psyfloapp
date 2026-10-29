import { Disclosure } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { AuditFeed } from "../review/AuditFeed";

/** What happened to this referral, newest first. Every action a person took and every agent run is here. */
export function ReferralHistory({ record }: { record: IntakeRecord }) {
  const events = record.audit.slice().sort((a, b) => b.at - a.at);
  return (
    <Disclosure title="Referral history" summary={`${events.length} event${events.length === 1 ? "" : "s"}`} keepMounted={false}>
      <AuditFeed events={events} label="Referral history" empty="Nothing has happened to this referral yet." />
    </Disclosure>
  );
}
