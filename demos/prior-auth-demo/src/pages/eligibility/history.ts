/* The History of one verification, for the shared HistoryFeed: the check and how it ran, a refresh that could not run, and what is scheduled next.
   Built from the record alone (a refresh replaces the record, so only the latest check is known). The agents' answers are in "How this was checked". */
import type { HistoryItem } from "@/components/ui";
import { VERDICT_LABEL, verdictOf } from "@/data/eligibility";
import type { VerificationRecord } from "@/data/verification";
import { autoState } from "./recheck";

export function verificationHistory(rec: VerificationRecord, nextCheckAt: number | null, clock: number, verifyPaused: boolean): HistoryItem[] {
  const p = rec.row;
  const out: HistoryItem[] = [];
  const auto = autoState(p, clock, verifyPaused);
  if (p.eligibility.state === "unavailable") {
    out.push({ key: "check", at: p.checkedAt, actor: "system", text: "Check could not run: Verify is paused in Settings" });
  } else {
    out.push({ key: "check", at: p.checkedAt, actor: "verify", text: `${auto?.kind === "done" ? "Re-checked automatically" : "Checked coverage and benefits"}: ${VERDICT_LABEL[verdictOf(p)]}` });
  }
  if (p.refreshFailed !== undefined) out.push({ key: "refresh", at: p.refreshFailed, actor: "system", text: "Refresh could not run: Verify is paused in Settings" });
  if (auto && auto.kind !== "done") out.push({ key: "recheck", at: auto.at, actor: "verify", scheduled: true, text: auto.kind === "paused" ? "Re-check, waiting for Verify to be resumed" : "Re-check" });
  if (nextCheckAt !== null && nextCheckAt > clock) out.push({ key: "monthly", at: nextCheckAt, actor: "verify", scheduled: true, text: "Coverage check, then monthly" });
  return out.sort((a, b) => b.at - a.at);
}
