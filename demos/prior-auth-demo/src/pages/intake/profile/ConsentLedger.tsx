import { Check, X } from "lucide-react";
import { Button, Card, CardHeader, Pill } from "@/components/ui";
import { programById } from "@/data/assess/programs";
import { CONSENT_LABEL, type ConsentEntry, type ConsentType } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import type { Tone } from "@/data/types";

const TONE: Record<ConsentEntry["status"], Tone> = { on_file: "good", needed: "mid", declined: "risk", revoked: "risk", expired: "mid" };
const WORD: Record<ConsentEntry["status"], string> = { on_file: "On file", needed: "Needed", declined: "Declined", revoked: "Revoked", expired: "Expired" };
/** The consents a person records here: payment and release for every intake, and the Part 2 disclosure for a substance use program. */
const TYPES: ConsentType[] = ["payment", "part2_disclosure", "release"];

/** The consent and disclosure ledger: each consent with who receives the information and what for, and the control to record it as on file, declined or
    revoked. Readiness reads this ledger. */
export function ConsentLedger({ record }: { record: IntakeRecord }) {
  const set = useStore((s) => s.setConsentStatus);
  const sud = record.config ? programById(record.config.programId).category === "sud" : false;
  const ledger = record.consents ?? [];
  const missing = TYPES.filter((t) => (t !== "part2_disclosure" || sud) && !ledger.some((c) => c.type === t));
  return (
    <Card data-card="consent-ledger">
      <CardHeader title="Consent and disclosure" subtitle={sud ? "Substance use records need the patient's consent before they are disclosed. Organization protocol, not legal advice." : "What the person agreed to share, and with whom. Organization protocol, not legal advice."} />
      <ul className="divide-y divide-line px-5 pb-3">
        {ledger.filter((c) => c.type !== "recording").map((c) => (
          <li key={c.id} data-consent={c.type} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5">
            <span className="min-w-0 flex-1 text-[13px]"><span className="block font-medium">{CONSENT_LABEL[c.type]}</span><span className="block text-muted">{c.recipient} · {c.purpose}</span></span>
            <Pill tone={TONE[c.status]}>{WORD[c.status]}</Pill>
            <span className="flex gap-1.5">
              {c.status !== "on_file" ? <Button size="sm" icon={Check} onClick={() => set(record.id, c.type, "on_file")}>Record as on file</Button> : <Button size="sm" onClick={() => set(record.id, c.type, "revoked")}>Record as revoked</Button>}
              {c.status === "needed" ? <Button size="sm" icon={X} onClick={() => set(record.id, c.type, "declined")}>Declined</Button> : null}
            </span>
          </li>
        ))}
        {missing.map((t) => (
          <li key={t} data-consent-missing={t} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className="min-w-0 flex-1 text-[13px] font-medium">{CONSENT_LABEL[t]}</span>
            <Pill>Not recorded</Pill>
            <Button size="sm" icon={Check} onClick={() => set(record.id, t, "on_file")}>Record as on file</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
