import type { RunStep } from "@/lib/demo/agents";
import type { Appeal, AppealDoc, AppealStep } from "@/lib/demo/appeals";
import { DEMO_TODAY } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { RECEIPT_CALL_AT } from "../../~lib/appeal-helpers";

export const CLINICIAN = "Heather M., LCSW";

/** Session-only document status changes (a requested record arrives, a letter gets signed). */
export type DocOverrides = Record<string, AppealDoc["status"]>;

export const PART_TITLE: Record<1 | 2 | 3, string> = {
  1: "Part 1 · Letters, crosswalk and notice",
  2: "Part 2 · Clinical assessments",
  3: "Part 3 · External medical records",
};

export function docsWith(
  appeal: Appeal,
  overrides: DocOverrides,
  signed: boolean,
): AppealDoc[] {
  return appeal.docs.map((d) => {
    const status = overrides[d.name] ?? d.status;
    return {
      ...d,
      status: signed && status === "needs_signature" ? "ready" : status,
    };
  });
}

export function totalPages(docs: AppealDoc[]): number {
  return docs.reduce((n, d) => n + (d.status === "missing" ? 0 : d.pages), 0);
}

export function partPages(docs: AppealDoc[], part: 1 | 2 | 3): number {
  return totalPages(docs.filter((d) => d.part === part));
}

export function overlaySteps(
  steps: AppealStep[],
  signed: boolean,
  submitted: boolean,
  pages: number,
): AppealStep[] {
  return steps.map((s) => {
    if (s.state === "completed") {
      return s;
    }
    if (signed && s.key === "signoff") {
      return {
        ...s,
        state: "completed",
        at: DEMO_TODAY,
        note: `Signed by ${CLINICIAN} · 10:42`,
      };
    }
    if (submitted && s.key === "submit") {
      return {
        ...s,
        state: "completed",
        at: DEMO_TODAY,
        note: `${pages} pages in three parts · transmission report saved`,
      };
    }
    if (submitted && s.key === "receipt") {
      return {
        ...s,
        state: "in_progress",
        note: `Receipt call scheduled ${RECEIPT_CALL_AT}`,
      };
    }
    return s;
  });
}

export function sendScript(
  appeal: Appeal,
  pages: number,
  destination: string,
): RunStep[] {
  const payer = PAYER_BY_ID[appeal.payerId];
  const split =
    payer.packetSplit === "three-part"
      ? "Three separate documents, as the payer requires"
      : "Single document with part bookmarks";
  const transmit: RunStep =
    appeal.channel === "fax"
      ? {
          label: `Dial ${destination}`,
          state: "pending",
          detail: "Handshake · line confirmed",
          ms: 1200,
        }
      : appeal.channel === "portal"
        ? {
            label: `Open ${destination} with the Harbor service account`,
            state: "pending",
            detail: "Session vault · MFA satisfied",
            ms: 1200,
          }
        : {
            label: `Address message to ${destination}`,
            state: "pending",
            detail: "Read receipt requested",
            ms: 1000,
          };
  return [
    {
      label: "Prepare packet with the signed letters",
      state: "pending",
      detail: split,
      ms: 1100,
    },
    transmit,
    {
      label: `Transmit ${pages} pages`,
      state: "pending",
      detail: `Part 1 · Part 2 · Part 3 · ${pages} pages total`,
      ms: 1800,
    },
    {
      label: "Save transmission report to the appeal",
      state: "pending",
      detail: "Timestamp, page count and confirmation captured",
      ms: 900,
    },
    {
      label: `Schedule receipt confirmation call · ${RECEIPT_CALL_AT}`,
      state: "pending",
      detail: "Caller agent · 3 business days after sending",
      ms: 800,
    },
  ];
}

export const CALL_SCRIPT: RunStep[] = [
  {
    label: "Dial provider services line",
    state: "pending",
    detail: "Recorded · transcribed",
    ms: 900,
  },
  {
    label: "Navigate IVR (4 menus)",
    state: "pending",
    detail: "Appeals status",
    ms: 1200,
  },
  {
    label: "Hold",
    state: "pending",
    detail: "34 minutes · staff not on the line",
    ms: 1600,
  },
  {
    label: "Confirm receipt with representative",
    state: "pending",
    detail: "Logged date, queue and due date",
    ms: 1300,
  },
  {
    label: "Write reference and due date back to the appeal",
    state: "pending",
    detail: "Nothing overwritten",
    ms: 700,
  },
];

export function liveTranscript(
  appeal: Appeal,
  pages: number,
): { who: string; text: string }[] {
  const payer = PAYER_BY_ID[appeal.payerId];
  return [
    {
      who: "IVR",
      text: `Thank you for calling ${payer.short} provider services. Your call may be recorded. Please say or enter your NPI or tax ID.`,
    },
    { who: "Agent", text: "[enters NPI] Appeals status." },
    {
      who: "IVR",
      text: "Please hold for the next available representative. Estimated wait time is 34 minutes.",
    },
    {
      who: "Rep (Marcus)",
      text: "Appeals department, this is Marcus. Can I get the member ID and date of birth?",
    },
    {
      who: "Agent",
      text: `Calling from Harbor Behavioral Health about a written appeal sent on the 21st, ${pages} pages in three parts, for member ${appeal.mrn}. Can you confirm it was received and logged?`,
    },
    {
      who: "Rep (Marcus)",
      text: "One moment... Yes, logged on the 22nd to the clinical appeals queue. The determination is due within 30 calendar days of receipt.",
    },
    {
      who: "Agent",
      text: "Thank you. Is any additional form required, such as a member-signed authorization?",
    },
    {
      who: "Rep (Marcus)",
      text: payer.requiresMemberSignedAppealForm
        ? "The member-signed form is on file with the packet. Nothing else is needed."
        : "No, the packet is complete. You'll get the determination letter by fax and mail.",
    },
    {
      who: "Agent",
      text: "Confirmed. Reference and due date noted. Thank you, Marcus.",
    },
  ];
}
