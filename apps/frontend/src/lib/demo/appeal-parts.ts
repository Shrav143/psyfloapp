import type { AppealDoc, AppealStep, StepState } from "./appeal-types";
import { addDays } from "./format";
import { PAYER_BY_ID } from "./payers";
import type { PayerId } from "./types";

export function stepsFor(
  status: string,
  receivedAt: string,
  filedAt?: string,
  receiptAt?: string,
  decidedAt?: string,
): AppealStep[] {
  const base: AppealStep[] = [
    {
      key: "received",
      title: "Denial received & categorised",
      state: "completed",
      at: receivedAt,
      note: "Reason parsed from the notice; validity check queued",
    },
    {
      key: "validity",
      title: "Denial validity check",
      state: "completed",
      at: addDays(receivedAt, 1),
      note: "Packet compared against payer criteria and clinical record",
    },
    {
      key: "draft",
      title: "Draft cover letter & appeal letter",
      state: "completed",
      at: addDays(receivedAt, 2),
      note: "Drafted from assessments, LOCUS and payer policy excerpts",
    },
    {
      key: "packet",
      title: "Appeal packet review",
      state: "completed",
      at: addDays(receivedAt, 3),
      note: "Split into three parts per payer rule",
    },
    {
      key: "signoff",
      title: "Clinician sign-off",
      state: "gate",
      note: "Nothing leaves without a signature",
    },
    { key: "submit", title: "Submission", state: "pending" },
    {
      key: "receipt",
      title: "Receipt confirmation",
      state: "pending",
      note: "Agent calls the payer 3 business days after sending",
    },
    { key: "decision", title: "Decision", state: "pending" },
  ];
  const set = (key: string, state: StepState, at?: string, note?: string) => {
    const s = base.find((x) => x.key === key);
    if (s) {
      s.state = state;
      s.at = at ?? s.at;
      s.note = note ?? s.note;
    }
  };
  if (status === "appeal_drafting") {
    set(
      "draft",
      "in_progress",
      undefined,
      "Agent drafting — 40 seconds elapsed",
    );
    set("packet", "pending");
    set("signoff", "pending");
  }
  if (
    [
      "appeal_filed",
      "receipt_unconfirmed",
      "under_review",
      "won",
      "lost",
    ].includes(status) &&
    filedAt
  ) {
    set("signoff", "completed", filedAt, "Signed by Heather M., LCSW");
    set("submit", "completed", filedAt, "Faxed · transmission report saved");
  }
  if (status === "receipt_unconfirmed") {
    set(
      "receipt",
      "in_progress",
      undefined,
      "Call scheduled for tomorrow 9:00",
    );
  }
  if (["under_review", "won", "lost"].includes(status) && filedAt) {
    set(
      "receipt",
      "completed",
      receiptAt ?? addDays(filedAt, 3),
      "Payer confirmed packet on file · ref on letter",
    );
    set(
      "decision",
      status === "under_review" ? "in_progress" : "completed",
      status === "under_review"
        ? undefined
        : (decidedAt ?? addDays(filedAt, 32)),
    );
  }
  return base;
}

export function docsFor(payerId: PayerId, missing: boolean): AppealDoc[] {
  const payer = PAYER_BY_ID[payerId];
  const docs: AppealDoc[] = [
    { name: "Cover letter", part: 1, pages: 1, status: "ready" },
    {
      name: "Appeal letter (medical necessity argument)",
      part: 1,
      pages: 3,
      status: "needs_signature",
    },
    {
      name: "Criteria crosswalk cover sheet",
      part: 1,
      pages: 2,
      status: "ready",
    },
    { name: "Denial notice", part: 1, pages: 2, status: "ready" },
    { name: "LOCUS assessment (current)", part: 2, pages: 4, status: "ready" },
    { name: "SMI eligibility checklist", part: 2, pages: 2, status: "ready" },
    {
      name: "Individualized treatment plan (signed)",
      part: 2,
      pages: 6,
      status: "ready",
    },
    {
      name: "Attendance & progress summary",
      part: 2,
      pages: 3,
      status: "ready",
    },
    {
      name: "Psychiatric evaluation (external)",
      part: 3,
      pages: 9,
      status: missing ? "missing" : "ready",
    },
    {
      name: "Primary care home monthly notes",
      part: 3,
      pages: 12,
      status: "ready",
    },
    {
      name: "Hospitalization records (2024–25)",
      part: 3,
      pages: 22,
      status: "ready",
    },
  ];
  if (payer.requiresMemberSignedAppealForm) {
    docs.push({
      name: "Member-signed appeal authorization form",
      part: 1,
      pages: 1,
      status: "ready",
    });
  }
  return docs;
}

export const CALL: { who: string; text: string }[] = [
  {
    who: "IVR",
    text: "Thank you for calling the provider services line. Your call may be recorded. Please say or enter your NPI or tax ID.",
  },
  { who: "Agent", text: "[enters NPI] Appeals status." },
  {
    who: "IVR",
    text: "Please hold for the next available representative. Estimated wait time is 34 minutes.",
  },
  {
    who: "Rep (Dana)",
    text: "Appeals department, this is Dana. Can I get the member ID and date of birth?",
  },
  {
    who: "Agent",
    text: "Calling from Harbor Behavioral Health about a written appeal faxed on the 13th, 68 pages, three parts. I have reference WEL-7065Q. Can you confirm it was received and logged?",
  },
  {
    who: "Rep (Dana)",
    text: "One moment... Yes, I see it logged on the 14th to the clinical appeals queue. The determination is due within 30 calendar days of receipt, so by the 13th of next month.",
  },
  {
    who: "Agent",
    text: "Thank you. Is any additional form required, such as a member-signed authorization?",
  },
  {
    who: "Rep (Dana)",
    text: "No, the packet is complete. You'll get the determination letter by fax and mail.",
  },
  {
    who: "Agent",
    text: "Confirmed. Reference and due date noted. Thank you, Dana.",
  },
];
