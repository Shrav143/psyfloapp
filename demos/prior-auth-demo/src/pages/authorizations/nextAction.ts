import type { CaseDetail } from "@/data/caseDetail";
import { groupRecs, isWithPayer, type CaseWork, type LiveView } from "@/data/caseModel";
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
    if (live.needsYou) return { text: "Review Packet's answer to the payer's question", button: open };
    if (live.stage === "decided" && /write-back waits for you/i.test(live.line)) return { text: "Confirm the write-back to the EMR", button: open };
    // With the payer, the person's next step is to wait; how often Navigator looks is not theirs to act on.
    if (live.moved && isWithPayer(live.stage)) return { text: `Wait for ${payer} to decide`, button: open };
    if (live.moved || live.stage === "decided") return { text: live.line, button: open };
  }
  if (detail.phase === "denial") {
    return {
      text: "Review the brief and make the peer-to-peer call",
      button: detail.denialId ? { label: "Open in Denial Intelligence", go: { to: "denial", id: detail.denialId } } : undefined,
    };
  }
  if (detail.phase === "payer" || live?.sent) {
    if (detail.needsInput) return { text: "Review Packet's answer to the payer's question", button: live ? { label: "Open on the Dashboard", go: { to: "dashboard", requestId: live.requestId } } : undefined };
    return { text: `Wait for ${payer} to decide`, button: live ? { label: "Open on the Dashboard", go: { to: "dashboard", requestId: live.requestId } } : undefined };
  }
  if (canSend) return { text: "Review the draft, then sign and send it", button: { label: "Send to payer", go: { to: "review" } } };
  const first = groupRecs(detail, work).open[0];
  if (first) return { text: first.title, button: { label: "Go to this action", go: { to: "tab", tab: "actions", rec: first.id } } };
  return { text: "Read the draft again", button: { label: "Open the draft", go: { to: "tab", tab: "draft" } } };
}
