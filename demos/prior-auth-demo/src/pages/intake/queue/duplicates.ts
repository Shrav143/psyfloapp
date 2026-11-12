import type { IntakeRecord } from "@/data/intake/types";

/* Before a new intake is created: is this person already in the queue? Same initials and age, or the same masked member ID.
   Only records the viewer may see are searched (minimum necessary). */

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
const last4 = (v: string | undefined) => (v ?? "").replace(/\D/g, "").slice(-4);

export interface DuplicateHit {
  record: IntakeRecord;
  why: string;
}

export function findDuplicates(records: IntakeRecord[], who: { initials: string; age: number | null; memberLast4?: string }): DuplicateHit[] {
  const ini = norm(who.initials);
  const m4 = last4(who.memberLast4);
  const hits: DuplicateHit[] = [];
  for (const r of records) {
    const onFile = last4(r.coverage.medicaidId?.value) || last4(r.suggestions.find((s) => s.field === "medicaidId" && s.status === "pending")?.value);
    if (m4.length === 4 && onFile === m4) hits.push({ record: r, why: `same member ID ending ${m4}` });
    else if (ini.length >= 2 && who.age !== null && norm(r.initials) === ini && r.age === who.age) hits.push({ record: r, why: "same initials and age" });
  }
  return hits;
}
