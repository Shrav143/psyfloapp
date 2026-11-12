import type { Appeal } from "@/lib/demo/appeals";
import { type DenialStatus, denialById } from "@/lib/demo/denials";
import {
  addDays,
  DEMO_TODAY,
  daysBetween,
  VISIT_RATE,
} from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";

/** An appeal with the session overlay applied: signed or sent from the workspace looks filed everywhere. */
export type AppealView = Appeal & { status: DenialStatus; nextStep: string };

export const RECEIPT_CALL_AT = "24 Sep 09:00";

export const CHANNEL_LABEL: Record<Appeal["channel"], string> = {
  fax: "Fax",
  portal: "Portal",
  email: "Email",
};

/** Medicare has no appeal fax on file; fall back to the MAC rather than print "undefined". */
export function destinationFor(appeal: Appeal): string {
  const payer = PAYER_BY_ID[appeal.payerId];
  if (appeal.channel === "fax") {
    return payer.appealFax
      ? `Fax ${payer.appealFax}`
      : `Fax · ${payer.authPortal}`;
  }
  if (appeal.channel === "portal") {
    return payer.authPortal;
  }
  return appeal.destination;
}

export function freeCareValue(days: number): number {
  return Math.round(days * VISIT_RATE);
}

export function daysLeft(iso: string): number {
  return daysBetween(DEMO_TODAY, iso);
}

export function nextStepFor(appeal: Appeal): string {
  const step = appeal.steps.find((s) => s.state !== "completed");
  if (!step) {
    return appeal.outcome === "won" ? "Closed · overturned" : "Closed";
  }
  if (step.state === "gate") {
    return `${step.title} · Heather M.`;
  }
  return step.title;
}

export function applySession(
  appeal: Appeal,
  signed: string[],
  submitted: string[],
): AppealView {
  const status = denialById(appeal.denialId)?.status ?? "appeal_drafting";
  if (!appeal.filedAt && submitted.includes(appeal.id)) {
    return {
      ...appeal,
      filedAt: DEMO_TODAY,
      decisionDueAt: addDays(DEMO_TODAY, 30),
      status: "receipt_unconfirmed",
      nextStep: `Receipt confirmation · call ${RECEIPT_CALL_AT}`,
    };
  }
  if (!appeal.filedAt && signed.includes(appeal.id)) {
    return {
      ...appeal,
      status: "appeal_signoff",
      nextStep: "Submission · signed, ready to send",
    };
  }
  return { ...appeal, status, nextStep: nextStepFor(appeal) };
}

/** Open appeals first, soonest deadline first; decided ones after, newest first. */
export function sortAppeals(rows: AppealView[]): AppealView[] {
  return [...rows].sort((a, b) => {
    const ao = a.outcome ? 1 : 0;
    const bo = b.outcome ? 1 : 0;
    if (ao !== bo) {
      return ao - bo;
    }
    if (ao === 0) {
      return a.deadline < b.deadline ? -1 : 1;
    }
    return (a.filedAt ?? "") < (b.filedAt ?? "") ? 1 : -1;
  });
}

export function summarizeAppeals(rows: AppealView[]) {
  const open = rows.filter((a) => !a.outcome);
  return {
    awaitingReceipt: open.filter((a) => a.filedAt && !a.receiptConfirmedAt)
      .length,
    underReview: rows.filter((a) => a.status === "under_review").length,
    won: rows.filter((a) => a.outcome === "won").length,
    lost: rows.filter((a) => a.outcome === "lost").length,
    freeCareDays: open.reduce((n, a) => n + a.freeCareDays, 0),
    openCount: open.length,
  };
}
