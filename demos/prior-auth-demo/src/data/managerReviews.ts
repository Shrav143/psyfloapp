import { payerById } from "./seed";
import { PROGRAM_LABEL, type CoreProgram } from "./types";
import { clockTime, DAY, toDate } from "@/lib/time";
import type { LedgerCase } from "./manager";

/* The week's clinical reviews: one per approved case, so 47 from the 56-case ledger. Cadence drafts four days ahead,
   so the 4 reviews due on the weekend still wait for a draft ("due"). 35 are drafted (29 clean, 6 with one check
   to look at) and 8 need a clinician's update. Drafting the 4 makes it 39 drafted and 33 clean. Signing a review books the next one. */

export type ReviewStatus = "due" | "drafted" | "needs_update" | "signed";
export interface ReviewCheck {
  label: string;
  passed: boolean;
  /** What Integrity found, shown in place of the tick. */
  problem?: string;
}
export interface Review {
  id: string;
  caseId: string;
  /** What the row shows: the ledger id. */
  ledgerId: string;
  initials: string;
  age: number;
  program: CoreProgram;
  payerId: LedgerCase["payerId"];
  reviewNo: number;
  /** Demo minutes (0 = Tue 20 Oct, 10:42 am). */
  dueAt: number;
  status: ReviewStatus;
  /** For needs_update: what is missing. */
  missing?: string;
  checks: ReviewCheck[];
  draft: string;
  agent: "scribe" | "cadence";
  note?: string;
  signedBy?: string;
  signedAt?: number;
  /** Booked by Cadence when the review before it was signed. It may fall after this week, so it is not always on the list. */
  scheduled?: boolean;
  /** On a signed review: when its next review is due. */
  nextAt?: number;
}

export const CHECK_LABELS = ["Every sentence traced to the chart", "Review has no errors", "All payer requirements covered", "Level of care matches the request"] as const;

const MISSING: Record<string, string> = {
  "P-1499": "Humana asked for the last 14 days of group notes. The draft cannot cite them until you confirm which notes apply.",
  "R-0912": "Aetna has not answered in 4 days. Confirm the current risk assessment before Caller resends the review.",
  "I-2218": "Anthem wants scale scores dated within 14 days. The last depression score is from 10/02.",
  "R-0975": "Aetna asked about the 10/16 medication change. The note for that visit is not in the chart yet.",
  "R-0881": "The last depression scale score is older than 14 days. Anthem requires a recent score.",
  "P-1551": "A medication change on 10/16 is in the chart without a reason. The draft cannot say why it changed.",
  "R-0899": "The urine screen from 10/17 has no result in the chart yet.",
  "R-0890": "The risk assessment has not been updated since admission.",
};

/** One check to look at: an ochre warning a clinician can sign past after reading it. */
const WARNING: Record<string, { check: number; problem: string }> = {
  "I-2207": { check: 1, problem: "The draft says the last review was 3 days ago. The ledger shows 4 days." },
  "R-0944": { check: 0, problem: "One sentence about sleep has no matching chart entry. Integrity could not trace it." },
  "R-0873": { check: 3, problem: "The draft asks for 7 days. The fee-for-service sample limit at this level of care is 5." },
  "I-2201": { check: 1, problem: "Two units are counted twice in the used total. The ledger shows 21 of 24." },
  "P-1546": { check: 0, problem: "The attendance sentence cites 9 of 10 days. The chart shows 8 of 10." },
  "P-1559": { check: 1, problem: "The review date in the header is 10/22. The payer's calendar says 10/23." },
};

/* Today, Wednesday, Thursday, Friday, Saturday, Sunday. Times are minutes after midnight. */
const SLOTS: number[][] = [
  [510, 540, 570, 600, 630, 660, 690, 750, 780, 810, 840, 900, 960],
  [510, 540, 570, 600, 630, 660, 690, 780, 840, 900, 960],
  [510, 540, 570, 600, 660, 720, 780, 840, 900, 960],
  [540, 570, 600, 660, 720, 780, 840, 900, 960],
  [540, 660],
  [570, 780],
];
const NOW_MINUTES = 10 * 60 + 42;
/** Cadence drafts reviews up to this many days ahead (days 0 to 3, Tuesday to Friday), so later ones are still "due" with no draft. */
const DRAFT_AHEAD_DAYS = 4;
/** The week ends with Sunday night. Reviews after this are booked but not on this week's list. */
export const WEEK_END = 6 * DAY - NOW_MINUTES;
export const inWeek = (r: Review): boolean => r.dueAt < WEEK_END;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Tue 10/27" */
export const reviewDate = (m: number): string => {
  const d = toDate(m);
  return `${WD[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
};
/** "Tue 10/27, 9:00 am" */
export const reviewStamp = (m: number): string => `${reviewDate(m)}, ${clockTime(toDate(m))}`;
/** Reviews the mockup places at a set time today. */
const PINNED: Record<string, number> = { "R-0988": 960, "P-1499": 900 };

const pick = <T,>(items: T[], key: string): T => items[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % items.length];

const STATUS_LINES: Record<CoreProgram, string[]> = {
  RES: [
    "Since the last review the patient has stayed on the unit and followed the daily schedule. Cravings are lower than at admission but still rated 5 or higher on most days. Sleep has improved from 4 to 6 hours.",
    "Participation is steady. The patient attended every scheduled group this period and asked for an extra individual session after a hard family call. Mood is lower on days with outside contact.",
    "Withdrawal symptoms have resolved. Energy and appetite are back to usual. The chart records one missed morning group, explained by a medical visit.",
  ],
  PHP: [
    "Attendance this period is 9 of 10 program days. Mood and concentration are improving, and the patient reports fewer panic episodes at home in the evenings.",
    "The patient is engaged in groups and has started to lead one check-in a week. Sleep is still broken on 3 nights a week.",
    "Symptoms are lower than at the start of PHP but still limit work and driving. The prescriber reviewed medications this week.",
  ],
  IOP: [
    "Attendance is 11 of 12 scheduled sessions. Recent urine screens are negative and self-report matches them. Work hours were cut back to attend.",
    "The patient is meeting weekly goals and has used coping plans twice this month at high-risk times. Cravings are mostly evening.",
    "Depression and anxiety scores are improving. The patient has one stressor at home that comes up in most sessions.",
  ],
  WM: [
    "Withdrawal scores are falling. The latest score is in the mild range and vital signs are stable. The patient is eating and sleeping in short blocks.",
    "Symptom-triggered medication was needed twice in the last 24 hours. The patient is oriented and takes part in the daily check-in.",
  ],
};
const PROGRESS_LINES = [
  "Goals from the treatment plan: two of four are met. The patient named a sponsor and has called them three times this week. Relapse-prevention work is on track and the aftercare plan is being written with the patient.",
  "The patient completed the written relapse plan and shared it in group. Family sessions are scheduled for this week. Peer support attendance is regular.",
  "Coping skills are used on most days. The patient practised refusal skills in group and reports one near miss that was handled with the plan.",
];
const RISK_LINES = [
  "No thoughts of self-harm were reported at the last three screens. Cravings are the main relapse risk. Safety plan reviewed and unchanged.",
  "Risk of return to use is moderate. No safety concerns this period. The patient has a named contact for after hours.",
];

const NEXT_LEVEL: Record<CoreProgram, string> = { RES: "PHP", PHP: "IOP", IOP: "step-down to outpatient care", WM: "Residential 3.5" };
const ASK: Record<CoreProgram, string> = { RES: "7 more days", PHP: "10 more days", IOP: "12 more units", WM: "2 more days" };

export function draftText(c: LedgerCase, reviewNo: number): string {
  const level = PROGRAM_LABEL[c.program];
  return [
    `Continued-stay review ${reviewNo} · ${level}`,
    `Payer: ${payerById(c.payerId).name} · Case ${c.id} · ${c.initials}, ${c.age} (privacy mode)`,
    `Clinical status\n${pick(STATUS_LINES[c.program], c.id)}`,
    `Treatment progress\n${pick(PROGRESS_LINES, `${c.id}p`)}`,
    `Risk and safety\n${pick(RISK_LINES, `${c.id}r`)}`,
    `Why this level of care still fits\nThe chart supports continued care at ${level}. Dimensions 3, 5 and 6 of the ASAM ratings are not yet at a level that a lower level of care can hold, and the patient's response to treatment is steady.`,
    `Request\nContinue ${level} for ${ASK[c.program]}, then review for ${c.program === "IOP" ? NEXT_LEVEL.IOP : `step-down to ${NEXT_LEVEL[c.program]}`}.`,
  ].join("\n\n");
}

const checksFor = (id: string, missing?: string): ReviewCheck[] => {
  const warn = WARNING[id];
  return CHECK_LABELS.map((label, i) => {
    if (missing && i === 2) return { label, passed: false, problem: "A required item is missing. See what the review needs from you." };
    if (warn && warn.check === i) return { label, passed: false, problem: warn.problem };
    return { label, passed: true };
  });
};

/** Chronological slots with a few reviews pinned to a set time, then the rest in ledger-clock order. */
export function buildReviews(ledger: LedgerCase[]): Review[] {
  const approved = ledger.filter((c) => c.used !== null);
  const slots = SLOTS.flatMap((times, day) => times.map((t) => ({ day, t, at: day * DAY + t - NOW_MINUTES })));
  const taken = new Map<string, number>();
  for (const [id, t] of Object.entries(PINNED)) taken.set(id, slots.findIndex((s) => s.day === 0 && s.t === t));
  const free = slots.map((_, i) => i).filter((i) => ![...taken.values()].includes(i));
  const rest = approved.filter((c) => !taken.has(c.id)).sort((a, b) => a.dueAt - b.dueAt);
  rest.forEach((c, i) => taken.set(c.id, free[i]));

  return approved
    .map((c): Review => {
      const missing = MISSING[c.id];
      const no = Number(/Continued stay (\d)/.exec(c.note)?.[1] ?? 2);
      const slot = slots[taken.get(c.id) ?? 0];
      const undrafted = !missing && slot.day >= DRAFT_AHEAD_DAYS;
      return {
        id: `rv-${c.id}`,
        caseId: c.caseId,
        ledgerId: c.id,
        initials: c.initials,
        age: c.age,
        program: c.program,
        payerId: c.payerId,
        reviewNo: no,
        dueAt: slot.at,
        status: missing ? "needs_update" : undrafted ? "due" : "drafted",
        missing,
        checks: undrafted ? [] : checksFor(c.id, missing),
        draft: undrafted ? "" : draftText(c, no),
        agent: c.program === "RES" || c.program === "WM" ? "scribe" : "cadence",
      };
    })
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** What Cadence adds to a review it drafts: the text and the four Integrity checks. */
export const draftedFrom = (c: LedgerCase, r: Review): Pick<Review, "status" | "draft" | "checks"> => ({ status: "drafted", draft: draftText(c, r.reviewNo), checks: checksFor(c.id) });

/** Days to the next review when the payer names none: residential and partial hospital weekly, IOP every two weeks, detox every three days. */
const REVIEW_EVERY: Record<CoreProgram, number> = { RES: 7, PHP: 7, IOP: 14, WM: 3 };

/** The payer's own rule ("A continued-stay review every 7 days after the first 7") wins when it asks for sooner. */
export function reviewIntervalDays(program: CoreProgram, ruleLines: string[]): number {
  const named = ruleLines.map((l) => /review every (\d+) days/i.exec(l)?.[1]).find(Boolean);
  return named ? Math.min(REVIEW_EVERY[program], Number(named)) : REVIEW_EVERY[program];
}

/** The review that follows a signed one: the same time of day, `days` later. A review signed long after it was due books from now. */
export function nextReviewAfter(r: Review, days: number, clock: number): Review {
  const due = r.dueAt + days * DAY;
  return {
    ...r,
    id: `rv-${r.ledgerId}-${r.reviewNo + 1}`,
    reviewNo: r.reviewNo + 1,
    dueAt: due > clock ? due : clock + days * DAY,
    status: "due",
    missing: undefined,
    checks: [],
    draft: "",
    note: undefined,
    signedBy: undefined,
    signedAt: undefined,
    nextAt: undefined,
    scheduled: true,
  };
}

/** A draft is clean when no review is waiting on a person and every check passed. */
export const isClean = (r: Review): boolean => r.status === "drafted" && r.checks.every((c) => c.passed);
