/* Where a value on the intake came from, said in a few words under its checklist row.
   A note is shown only while the field still holds exactly what its source gave, so it never claims a source for something the person edited. */
import type { CaseDraft, ReadKey } from "@/data/cases";
import type { IntakeRecord } from "@/data/intake/types";
import { draftFieldsFromIntake } from "./fromIntake";
import type { EmrChart } from "./lookups";

export type FieldKey = Exclude<ReadKey, `doc:${string}`>;
type Snap = Partial<Record<FieldKey, string>>;

const codes = (list: { code: string }[]): string => list.map((x) => x.code).join(",");

/** The comparable value of each intake field. */
export const fieldSnap = (d: CaseDraft): Snap => ({
  patient: `${d.patient.initials}|${d.patient.age ?? ""}`,
  payer: d.payerId ?? "",
  member: d.memberId,
  program: d.program ?? "",
  type: d.type ?? "",
  diagnoses: codes(d.diagnoses),
  reason: d.reason,
});
/** What the intake record gives each field. It does not choose the request type, so that is left out. */
const recordSnap = (d: CaseDraft, r: IntakeRecord): Snap => {
  const { type: _type, ...rest } = fieldSnap({ ...d, ...draftFieldsFromIntake(r, d.kind) });
  return rest;
};
const chartSnap = (c: EmrChart): Snap => ({ patient: `${c.initials}|${c.age}`, payer: c.payerId, member: c.memberId, program: c.program, type: c.type, diagnoses: c.diagnoses.join(","), reason: c.reason });

/** "Read from X by Reader. Check it.", "From the intake record", "From EMR Connect", or nothing. */
export function sourceNote(d: CaseDraft, key: FieldKey, intake: IntakeRecord | undefined, chart: EmrChart | undefined): string {
  const now = fieldSnap(d)[key];
  if (!now) return "";
  const read = d.read?.[key];
  if (read && read.value === now) return `Read from ${read.file} by Reader. Check it.`;
  if (intake && recordSnap(d, intake)[key] === now) return "From the intake record";
  if (chart && chartSnap(chart)[key] === now) return "From EMR Connect";
  return "";
}
