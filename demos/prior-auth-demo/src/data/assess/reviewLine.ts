/* Who is responsible for a configured rule row and when it last changed: every rule is configuration with a reviewer and a last-updated date (the client's Part 20),
   shown wherever a requirement's source is shown. A row with no named reviewer says so instead of naming "Pending assignment" as a person. */

export interface ReviewInfo {
  reviewer: string;
  /** ISO date of the last change. */
  updated: string;
}

/** "Oct 19, 2026" from an ISO date. */
export const isoDay = (iso: string): string => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Reviewed by Clinical director (demo), updated Oct 19, 2026". */
export function reviewLine(r: ReviewInfo): string {
  const on = isoDay(r.updated);
  if (r.reviewer === "Pending assignment") return `No reviewer assigned yet, updated ${on}`;
  if (r.reviewer === "Not a payer policy") return `Demo row with no reviewer, updated ${on}`;
  return `Reviewed by ${r.reviewer}, updated ${on}`;
}
