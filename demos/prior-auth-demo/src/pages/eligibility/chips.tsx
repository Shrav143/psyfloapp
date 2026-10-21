import { Pill } from "@/components/ui";
import { VERDICT_LABEL, VERDICT_TONE, type AuthState, type EbPatient, type Verdict } from "@/data/eligibility";
import type { Tone } from "@/data/types";

export const patientLabel = (p: EbPatient): string => (p.initials ? `${p.initials}${p.age ? `, ${p.age}` : ""}` : `Member ${p.memberMasked}`);

export function EligibilityChip({ p }: { p: EbPatient }) {
  const { state, on } = p.eligibility;
  if (state === "active") return <Pill tone="good" dot>Active</Pill>;
  if (state === "lapsed") return <Pill tone="risk" dot>Lapsed {on}</Pill>;
  if (state === "ended") return <Pill tone="risk" dot>Ended {on}</Pill>;
  return <Pill tone="risk" dot>Not found</Pill>;
}

export function BenefitsChip({ p }: { p: EbPatient }) {
  const tone: Tone = p.benefits === "covered" ? "good" : p.benefits === "limited" ? "mid" : "risk";
  return <Pill tone={tone}>{p.benefits === "covered" ? "Covered" : p.benefits === "limited" ? "Limited" : "Not covered"}</Pill>;
}

const AUTH: Record<AuthState, { text: string; tone: Tone }> = {
  not_required: { text: "Not required", tone: "neutral" },
  on_file: { text: "On file", tone: "good" },
  in_progress: { text: "In progress", tone: "neutral" },
  reviewing: { text: "Payer reviewing", tone: "neutral" },
  retro_open: { text: "Retro request open", tone: "mid" },
  required: { text: "Required, not on file", tone: "mid" },
};
export const limitText = (p: EbPatient): string | null => (p.limit ? `${p.limit.used} of ${p.limit.of} ${p.limit.unit}` : p.noDayLimit ? "No day limit" : null);

export function AuthChip({ p }: { p: EbPatient }) {
  const a = AUTH[p.auth];
  const lim = limitText(p);
  return (
    <div>
      <Pill tone={a.tone}>{a.text}</Pill>
      {lim ? <div className="mt-1 text-xs text-muted">{lim}</div> : null}
    </div>
  );
}

export function VerdictChip({ v }: { v: Verdict }) {
  return (
    <Pill tone={VERDICT_TONE[v]} dot>
      {VERDICT_LABEL[v]}
    </Pill>
  );
}
