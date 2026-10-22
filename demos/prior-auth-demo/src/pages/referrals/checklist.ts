import type { CheckState as BoxState } from "@/components/ui";
import { CHECK_EVIDENCE, CHECK_LABEL, REPLY_VIA_LABEL, locate, staffById, type CheckKey, type Referral, type ReferralCheck, type ReferralDoc } from "@/data/referrals";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { ago, longDate } from "@/lib/time";
import { paths } from "@/routes";
import { isWaiting, unresolved, type AskKey } from "@/store/referralsLogic";

/* The referral as a checklist: what Reader found, and what is still missing. Pure, so the list of arrived referrals
   can count the open items without drawing a card. */

export interface ChecklistRow {
  id: string;
  label: string;
  state: BoxState;
  detail: string;
  /** What "Ask the referrer" sends for this row. None when the referrer cannot supply it: a failed age check has only "Mark OK". */
  ask: AskKey | null;
  /** The finding "Mark OK" accepts. None for rows that are not one of the nine checks. */
  markable: CheckKey | null;
  /** The question went out and the answer has not come back. */
  waiting: boolean;
  /** Does not count toward "n of m ready" yet. */
  optional: boolean;
}

interface ChecklistSection {
  title: string;
  rows: ChecklistRow[];
}

interface Checklist {
  sections: ChecklistSection[];
  done: number;
  total: number;
}

/** Where a case's referral checklist lives, so Back from the full referral returns to it. */
export const checklistPath = (draftId: string | undefined, referralId: string): string => `${paths.newCase({ draft: draftId })}?ref=${referralId}`;

/** Without an insurance on the referral the missing insurance is the problem, so only a lapsed plan counts here. */
const coverageProblem = (r: Referral): boolean => r.coverage?.kind === "lapsed";

/** Open items, counted without building the card: the unresolved checks, a missing insurance and a coverage check that found a problem. Equals `total - done` of the checklist. */
export const toCheck = (r: Referral): number => unresolved(r).length + (r.payerId === null ? 1 : 0) + (coverageProblem(r) ? 1 : 0);

type RowKey = CheckKey | "patient" | "insurance" | "coverage";
const SECTIONS: { title: string; keys: RowKey[] }[] = [
  { title: "Patient", keys: ["patient", "contact", "age"] },
  { title: "Referrer", keys: ["credentials", "signature", "expiry"] },
  { title: "Clinical", keys: ["diagnosis", "components", "service", "urgent"] },
  { title: "Coverage", keys: ["insurance", "coverage"] },
];

/** Nothing was found at all, as opposed to something found that is wrong. */
const NOTHING_FOUND: CheckKey[] = ["signature", "components", "urgent", "contact"];
const nothingFound = (r: Referral, key: CheckKey): boolean => NOTHING_FOUND.includes(key) || (key === "diagnosis" && r.plan.dx.length === 0);

/** What the Incoming referrals list says about one referral. "missing" counts only what Reader found nothing for (a signature, a diagnosis, an insurance);
    "review" counts what it found and doubts (an expired order, a lapsed plan). It is the same count the checklist shows as items still to check. */
export interface IntakeStatus {
  kind: "waiting" | "complete" | "missing" | "review";
  n: number;
}
export function intakeStatus(r: Referral): IntakeStatus {
  if (r.status === "awaiting_info") return { kind: "waiting", n: toCheck(r) };
  const open = unresolved(r);
  const missing = open.filter((c) => nothingFound(r, c.key)).length + (r.payerId === null ? 1 : 0);
  const review = open.length - open.filter((c) => nothingFound(r, c.key)).length + (coverageProblem(r) ? 1 : 0);
  if (missing > 0) return { kind: "missing", n: missing };
  if (review > 0) return { kind: "review", n: review };
  return { kind: "complete", n: 0 };
}

const base = (id: string, label: string, state: BoxState, detail: string): ChecklistRow => ({ id, label, state, detail, ask: null, markable: null, waiting: false, optional: false });

interface Ctx {
  r: Referral;
  docs: ReferralDoc[];
  clock: number;
  coverageRunning: boolean;
}

/** "Found: <value> · Referral form, page 2". The page comes from where Reader found it. */
function found(c: Ctx, block: string, value: string): string {
  const at = locate(c.docs, block);
  return `Found: ${value.charAt(0).toUpperCase()}${value.slice(1)}${at ? ` · ${at.docTitle}, page ${at.page}` : ""}`;
}

/** What Reader read for a check that passed. Null when the check's own sentence says it better. */
function foundValue(r: Referral, key: CheckKey): string | null {
  const p = r.plan;
  const field = (k: string): string => r.fields.find((f) => f.key === k)?.value ?? "";
  switch (key) {
    case "signature":
      return `signed ${longDate(p.orderAt)} by ${p.clinician.name}`;
    case "expiry":
      return `valid until ${longDate(p.expiresAt)}`;
    case "credentials":
      return `${field("clinician")}, ${field("credentials")}`;
    case "components":
      return "reason, substance use history, medications and risk screening";
    case "diagnosis":
      return p.dx.map((d) => d.code).join(", ");
    case "service":
      return `${PROGRAM_LABEL[r.program]}, ASAM ${p.asam}`;
    case "urgent":
      return r.urgency === "routine" ? null : p.risk.split(". ")[0].replace(/\.$/, "");
    case "age":
      return `age ${r.patient.age}`;
    case "contact":
      return `phone ${p.phone}`;
  }
}

const waitingText = (c: Ctx): string => {
  const { r, clock } = c;
  const when = r.infoAskedAt === undefined ? "" : `, ${ago(r.infoAskedAt, clock)}`;
  return `Waiting on the referrer. Asked by ${REPLY_VIA_LABEL[r.infoRequest?.via ?? "fax"].toLowerCase()}${when}.`;
};

function checkRow(c: Ctx, check: ReferralCheck): ChecklistRow {
  const { key } = check;
  const row = base(key, CHECK_LABEL[key], "done", "");
  const value = foundValue(c.r, key);
  const evidence = value === null ? check.detail : found(c, CHECK_EVIDENCE[key], value);
  if (check.resolved?.how === "override") return { ...row, detail: `Marked OK by ${staffById("jp").name}: ${check.resolved.reason ?? ""}` };
  if (check.resolved?.how === "reply") return { ...row, detail: `Resolved by the referrer's reply. ${evidence}` };
  if (check.state === "pass") return { ...row, detail: evidence };
  const waiting = isWaiting(c.r, check);
  const nothing = nothingFound(c.r, key);
  return { ...row, state: nothing ? "missing" : "warn", detail: waiting ? waitingText(c) : check.detail, ask: check.state === "fail" ? null : key, markable: key, waiting };
}

function insuranceRow(c: Ctx): ChecklistRow {
  const { r } = c;
  const label = "Insurance and member ID are found";
  if (r.payerId) return base("insurance", label, "done", found(c, "insurance", `${payerById(r.payerId).name}, member ID ${r.memberIdMasked}`));
  const waiting = r.status === "awaiting_info";
  return { ...base("insurance", label, "missing", waiting ? waitingText(c) : "There is no insurance or member ID on the face sheet."), ask: "insurance", waiting };
}

/** Optional until Verify has run. Once it has, its answer is part of the list: ready, or something to check. */
function coverageRow(c: Ctx): ChecklistRow {
  const label = "Verify checked coverage";
  const { r } = c;
  const later = (state: BoxState, detail: string): ChecklistRow => ({ ...base("coverage", label, state, detail), optional: true });
  if (c.coverageRunning) return later("working", "Verify is checking coverage.");
  if (!r.payerId) return later("optional", "Verify needs the insurance and member ID first.");
  if (!r.coverage) return later("optional", "Not checked yet. Verify looks up eligibility, the plan and whether an authorization is needed first.");
  return base("coverage", label, coverageProblem(r) ? "warn" : "done", r.coverage.headline);
}

export function buildChecklist(r: Referral, docs: ReferralDoc[], clock: number, coverageRunning: boolean): Checklist {
  const c: Ctx = { r, docs, clock, coverageRunning };
  const row = (key: RowKey): ChecklistRow => {
    if (key === "patient") return base("patient", "Patient initials and age", "done", found(c, "patient", `${r.patient.initials}, ${r.patient.age}`));
    if (key === "insurance") return insuranceRow(c);
    if (key === "coverage") return coverageRow(c);
    return checkRow(c, r.checks.find((x) => x.key === key) as ReferralCheck);
  };
  const sections = SECTIONS.map((s) => ({ title: s.title, rows: s.keys.map(row) }));
  const counted = sections.flatMap((s) => s.rows).filter((x) => !x.optional);
  return { sections, done: counted.filter((x) => x.state === "done").length, total: counted.length };
}
