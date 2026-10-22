import { Pill } from "@/components/ui";
import { AUTH_LABEL, VERDICT_LABEL, VERDICT_TONE, type EbPatient, type Verdict } from "@/data/eligibility";
import type { Tone } from "@/data/types";

export const patientLabel = (p: EbPatient): string => (p.initials ? `${p.initials}${p.age ? `, ${p.age}` : ""}` : `Member ${p.memberMasked}`);

export function EligibilityChip({ p }: { p: EbPatient }) {
  const { state, on } = p.eligibility;
  if (state === "unavailable") return <Pill tone="neutral" dot>Not checked</Pill>;
  if (state === "active" && p.idMismatch) return <Pill tone="mid" dot>ID differs</Pill>;
  if (state === "active") return <Pill tone="good" dot>Active</Pill>;
  if (state === "lapsed") return <Pill tone="risk" dot>Lapsed {on}</Pill>;
  if (state === "ended") return <Pill tone="risk" dot>Ended {on}</Pill>;
  return <Pill tone="risk" dot>Not found</Pill>;
}

export function BenefitsChip({ p }: { p: EbPatient }) {
  if (p.eligibility.state === "unavailable") return <Pill tone="neutral">Not checked</Pill>;
  const tone: Tone = p.benefits === "covered" ? "good" : p.benefits === "limited" || p.benefits === "needs_confirmation" ? "mid" : "risk";
  return <Pill tone={tone}>{p.benefits === "covered" ? "Covered" : p.benefits === "limited" ? "Limited" : p.benefits === "needs_confirmation" ? "Not confirmed" : "Not covered"}</Pill>;
}

/** The day or unit limit as "14 of 14 days", or "No day limit". It sits on the quiet second line of a row. */
export const limitText = (p: EbPatient): string | null => (p.limit ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit}` : p.noDayLimit ? "No day limit" : null);

export function AuthChip({ p }: { p: EbPatient }) {
  if (p.eligibility.state === "unavailable") return <Pill tone="neutral">Not checked</Pill>;
  const a = AUTH_LABEL[p.auth];
  return <Pill tone={a.tone}>{a.text}</Pill>;
}

export function VerdictChip({ v }: { v: Verdict }) {
  return (
    <Pill tone={VERDICT_TONE[v]} dot>
      {VERDICT_LABEL[v]}
    </Pill>
  );
}
