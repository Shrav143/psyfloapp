import type { RequestKind } from "./queue";
import type { SiteId } from "./sites";
import type { BuiltInPayerId, CoreProgram } from "./types";

/* The shape of one payer decision, and the words and dates every analysis shares. */

export type DxId = "aud" | "oud" | "stim" | "mood" | "trauma" | "cooc";
export const DX_GROUPS: { id: DxId; label: string }[] = [
  { id: "aud", label: "Alcohol use disorder" },
  { id: "oud", label: "Opioid use disorder" },
  { id: "stim", label: "Stimulant or other substance use" },
  { id: "mood", label: "Depression or anxiety" },
  { id: "trauma", label: "Trauma-related" },
  { id: "cooc", label: "Co-occurring" },
];
export const DX_LABEL = Object.fromEntries(DX_GROUPS.map((d) => [d.id, d.label])) as Record<DxId, string>;
export const DX_SHORT: Record<DxId, string> = { aud: "Alcohol", oud: "Opioid", stim: "Stimulant or other", mood: "Depression or anxiety", trauma: "Trauma", cooc: "Co-occurring" };

export type PopulationId = "adolescent" | "adult" | "dual" | "perinatal" | "first" | "prior";
export const POPULATIONS: { id: PopulationId; label: string }[] = [
  { id: "adolescent", label: "Adolescent" },
  { id: "adult", label: "Adult" },
  { id: "dual", label: "Dual-eligible" },
  { id: "perinatal", label: "Pregnant or postpartum" },
  { id: "first", label: "First-time treatment" },
  { id: "prior", label: "Prior admissions" },
];
export const POPULATION_LABEL = Object.fromEntries(POPULATIONS.map((p) => [p.id, p.label])) as Record<PopulationId, string>;

export const KINDS: RequestKind[] = ["initial", "concurrent", "reauth", "modify", "retro"];
export const KIND_LABEL: Record<RequestKind, string> = { initial: "Initial", concurrent: "Concurrent review", reauth: "Reauthorization", modify: "Modification", retro: "Retrospective" };

export type Outcome = "approved" | "partial" | "denied";
export const OUTCOME_LABEL: Record<Outcome, string> = { approved: "Approved as requested", partial: "Approved in part", denied: "Denied" };
export const OUTCOME_SHORT: Record<Outcome, string> = { approved: "Approved", partial: "In part", denied: "Denied" };

/** none: no peer-to-peer. scheduled: booked and not held yet. changed: the reviewer changed the decision. stood: the decision stood. */
export type P2pState = "none" | "scheduled" | "changed" | "stood";
/** none: not appealed. pending: filed, no ruling yet. The others are rulings: overturned, partly restored or upheld. */
export type AppealState = "none" | "pending" | "overturned" | "partly" | "upheld";
/** How a person edited the agent's draft. "typo" is a light edit that only fixed a typo, so it counts as sent without edits. */
export type EditKind = "written" | "typo" | "light" | "rewritten";

export interface Decision {
  /** MRN-style demo id (R-, I-, P-), or the denial id (D-) for a denial that is in Denial Intelligence. Unique. */
  id: string;
  /** The case the record belongs to. It places the record at a site, and it differs from `id` only for a denial. */
  caseId: string;
  /** Set when the record is a denial in Denial Intelligence (D-3318). */
  denialId?: string;
  /** Set when the case exists in the demo, so Open case can link to it. */
  inDemo: boolean;
  /** The demo case this decision belongs to when its own id is not a page: an earlier decision for the patient on an open request (R-1042). */
  linkId?: string;
  initials: string;
  age: number;
  site: SiteId;
  payerId: BuiltInPayerId;
  program: CoreProgram;
  kind: RequestKind;
  dx: DxId;
  population: PopulationId;
  /** 0 = Nov 2025 ... 11 = Oct 2026. A month runs from the 21st to the 20th, so the last one ends on the demo date. */
  month: number;
  /** Days before the demo date (20 Oct 2026) the payer decided. */
  day: number;
  outcome: Outcome;
  unit: "days" | "units";
  requested: number;
  approvedAmt: number;
  /** Why the payer did not approve as asked (the label in data/analytics.ts), and whether the team could have fixed it before sending. */
  reason?: string;
  preventable?: boolean;
  /** Hours from sent to decision. */
  hours: number;
  expedited: boolean;
  /** Past the CMS decision time (72 hours expedited, 7 days standard). null where the rule does not apply to the payer. */
  pastCms: boolean | null;
  infoRequest: boolean;
  p2p: P2pState;
  appeal: AppealState;
  accepted: boolean;
  /** Days from referral to the authorization decision, for first requests. */
  referralDays: number | null;
  /** FLO's advice was applied before sending, which of the steps in ACTIONS were applied, and how the agent's draft was edited (null: no draft). */
  advice: boolean;
  helps: number[];
  edit: EditKind | null;
}

/* ------------------------------------------------------------------ dates */
const DAY_MS = 86_400_000;
const utc = (y: number, m: number, d: number): number => Date.UTC(y, m, d);
/** The demo date: Tue 20 Oct 2026. */
export const DEMO_UTC = utc(2026, 9, 20);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayOf = (t: number): number => Math.round((DEMO_UTC - t) / DAY_MS);

export interface MonthInfo {
  index: number;
  /** "Oct": the month the period ends in. */
  label: string;
  /** "Oct 26" for the tooltip and the table. */
  long: string;
  /** Day offsets (days before the demo date) the month spans: `from` is the oldest day, `to` the newest. */
  from: number;
  to: number;
  /** "21 Sep to 20 Oct 2026" */
  range: string;
}
const fmtShort = (t: number): string => `${new Date(t).getUTCDate()} ${MONTH_NAMES[new Date(t).getUTCMonth()]}`;
/** Twelve months that run from the 21st to the 20th, the last one ending on the demo date. */
export const MONTHS: MonthInfo[] = Array.from({ length: 12 }, (_, i) => {
  const end = utc(2025, 10 + i, 20);
  const start = utc(2025, 9 + i, 21);
  const e = new Date(end);
  return {
    index: i,
    label: MONTH_NAMES[e.getUTCMonth()],
    long: `${MONTH_NAMES[e.getUTCMonth()]} ${String(e.getUTCFullYear()).slice(2)}`,
    from: dayOf(start),
    to: dayOf(end),
    range: `${fmtShort(start)} to ${fmtShort(end)} ${e.getUTCFullYear()}`,
  };
});
export const monthOfDay = (day: number): number => {
  const m = MONTHS.find((x) => day >= x.to && day <= x.from);
  return m ? m.index : day < 0 ? 11 : 0;
};
/** "14 Oct 2026" */
export const dateOfDay = (day: number): string => {
  const d = new Date(DEMO_UTC - day * DAY_MS);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
/** "14 Oct" */
export const shortDateOfDay = (day: number): string => {
  const d = new Date(DEMO_UTC - day * DAY_MS);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
};

/** CMS decision time: 72 hours expedited, 7 calendar days standard. It applies to Medicaid managed care and fee-for-service, so to all six Virginia plans in the demo. */
export const CMS_HOURS = { expedited: 72, standard: 168 } as const;
export const CMS_PAYERS: BuiltInPayerId[] = ["cardinal", "summit", "evergreen", "beacon", "harborview", "lakeshore"];
export const cmsApplies = (payerId: string): boolean => (CMS_PAYERS as string[]).includes(payerId);
