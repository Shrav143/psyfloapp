import type { CaseDetail } from "@/data/caseDetail";
import { AGENTS } from "@/data/agents";
import { groupRecs, type CaseWork, type LiveView } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import type { TabId } from "./caseTypes";

/* The one thing a person should do next on a request. The queue row and the top of the case page both read it, so they always agree.
   It uses what the case page already has: the open recommended actions, the send gates and where the Dashboard says the request is. */

/** Where the button goes. */
export type NextGo =
  | { to: "tab"; tab: TabId; rec?: string }
  | { to: "review" }
  | { to: "dashboard"; requestId: string }
  | { to: "denial"; id: string };

export interface NextAction {
  /** "Name the step-down provider": the action itself, with no "Next:" in front. */
  text: string;
  /** One short line that says why, shown under the action on the case page. */
  why?: string;
  /** The primary button. Absent when nothing is left for a person to do. */
  button?: { label: string; go: NextGo };
}

interface Input {
  detail: CaseDetail;
  work: CaseWork;
  live: LiveView | null;
  /** Every send gate is open (see canSend in caseModel). */
  canSend: boolean;
}

export function nextActionOf({ detail, work, live, canSend }: Input): NextAction {
  const payer = payerById(detail.payerId).shortName;
  if (live) {
    const open = { label: "Open on the Dashboard", go: { to: "dashboard", requestId: live.requestId } } as const;
    if (live.needsYou) return { text: "Review Packet's answer to the payer's question", why: "The payer asked for more information. Packet drafted the answer.", button: open };
    if (live.stage === "decided" && /write-back waits for you/i.test(live.line)) return { text: "Confirm the write-back to the EMR", why: /next review booked/i.test(live.line) ? "Cadence booked the next review." : undefined, button: open };
    if (live.moved || live.stage === "decided") return { text: live.line, button: open };
  }
  if (detail.phase === "denial") {
    return {
      text: "Review the brief and make the peer-to-peer call", why: "This request was denied. Advocate owns the next step: the brief and the appeal are in Denial Intelligence, and this page keeps the draft and the evidence the call will use.",
      button: detail.denialId ? { label: "Open in Denial Intelligence", go: { to: "denial", id: detail.denialId } } : undefined,
    };
  }
  if (detail.phase === "payer" || live?.sent) {
    if (detail.needsInput) return { text: "Review Packet's answer to the payer's question", why: detail.statusLine, button: live ? { label: "Open on the Dashboard", go: { to: "dashboard", requestId: live.requestId } } : undefined };
    return { text: `Wait for ${payer} to decide`, why: detail.statusLine, button: live ? { label: "Open on the Dashboard", go: { to: "dashboard", requestId: live.requestId } } : undefined };
  }
  if (canSend) return { text: "Review the draft, then sign and send it", why: "Integrity passed all four checks. Only a clinician can sign.", button: { label: "Send to payer", go: { to: "review" } } };
  const first = groupRecs(detail, work).open[0];
  if (first) {
    return {
      text: first.title,
      why: first.input ? `${AGENTS[first.agent].name} needs your answer before it can apply this.` : first.bullets[0],
      button: { label: "Go to this action", go: { to: "tab", tab: "actions", rec: first.id } },
    };
  }
  return { text: "Read the draft again", why: "Integrity has not read it since the last edit.", button: { label: "Open the draft", go: { to: "tab", tab: "draft" } } };
}
