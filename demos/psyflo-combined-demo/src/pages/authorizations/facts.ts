import { AGENTS } from "@/data/agents";
import type { CaseDraft } from "@/data/cases";
import type { CaseDetail } from "@/data/caseDetail";
import type { LiveView } from "@/data/caseModel";
import type { DocItem } from "@/data/payerConfig";
import type { LedgerCase } from "@/data/manager";
import { payerById } from "@/data/seed";
import { SITES, siteName, type SiteId } from "@/data/sites";
import { DAY, shortDate, toDate } from "@/lib/time";
import { docEntries } from "@/pages/newcase/documents";
import type { AppliedWorkflow } from "@/data/workflow/types";
import { shortSpan } from "./queueLogic";

/* The authorization facts row at the top of the case page. A fact appears only when this request has the data for it:
   a request that is not approved yet has no approved, used or left, and a request with no ledger row has no review date. */

export interface Fact {
  label: string;
  value: string;
  /** One short muted line under the value. */
  note?: string;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateText = (at: number): string => `${WEEKDAY[toDate(at).getDay()]} ${shortDate(at)}`;
const count = (n: number, unit: "days" | "units"): string => `${n} ${n === 1 ? unit.slice(0, -1) : unit}`;

/** The Case Manager ledger row for this request, if it has one. A denial belongs to an earlier case, so its case ID is tried too. */
export function ledgerRowOf(ledger: LedgerCase[], detail: Pick<CaseDetail, "id" | "requestId">): LedgerCase | undefined {
  return ledger.find((c) => c.id === detail.requestId) ?? ledger.find((c) => c.id === detail.id) ?? ledger.find((c) => c.caseId === detail.id);
}

/** The approved window, from the first day of the stay to the day the approval ends. The ledger records days used and the end date, not a start date,
    so for the programs counted in days the stay is taken to have begun as many days before the demo's day one as days are used. Units (IOP) have no calendar window. */
export function windowOf(ledger: LedgerCase | undefined): { from: number; to: number } | null {
  if (!ledger || ledger.used === null || !ledger.total || ledger.unit !== "days" || ledger.clockKind !== "expiry") return null;
  return { from: -ledger.used * DAY, to: ledger.dueAt };
}

/** How many of the documents the payer lists for this level of care are in the case, and which are not. */
export function documentStatus(draft: Pick<CaseDraft, "payerId" | "program" | "documents">, items: DocItem[] | null): { have: number; total: number; missing: string[] } {
  const entries = docEntries(draft.payerId, draft.program, items);
  const missing = entries.filter((e) => !draft.documents.some((d) => d.slot === e.slot)).map((e) => e.label);
  return { have: entries.length - missing.length, total: entries.length, missing };
}

/** Who the request waits on, in a few words. */
export function waitingOn(detail: Pick<CaseDetail, "payerId" | "phase" | "agent" | "needsInput">, live: LiveView | null): { who: string; note?: string } | null {
  const payer = payerById(detail.payerId).shortName;
  if (live) {
    if (live.stage === "decided") return null;
    if (live.needsYou) return { who: "You", note: `to answer ${payer}` };
    if (live.sent) return { who: payer, note: "decision" };
  }
  if (detail.phase === "denial") return { who: "You", note: "peer-to-peer call" };
  if (detail.phase === "payer") return { who: detail.needsInput ? "You" : payer, note: detail.needsInput ? `to answer ${payer}` : "decision" };
  if (detail.phase === "ready") return { who: "You", note: "to sign" };
  return { who: "You", note: detail.needsInput ? "an answer" : `after ${AGENTS[detail.agent].name} drafts` };
}

interface Input {
  detail: CaseDetail;
  live: LiveView | null;
  ledger: LedgerCase | undefined;
  docs: { have: number; total: number; missing: string[] } | null;
  clock: number;
  /** The case's site, or null when the viewer can see only one site (then a site label tells them nothing). */
  site?: SiteId | null;
  /** The payer workflow the case follows, when it has one (set in New Case). */
  workflow?: Pick<AppliedWorkflow, "name" | "version" | "usedDefault"> | null;
}

export function authFacts({ detail, live, ledger, docs, clock, site, workflow }: Input): Fact[] {
  const out: Fact[] = [{ label: "Request type", value: detail.type }];
  const unit = ledger?.unit ?? (detail.program === "IOP" ? "units" : "days");
  out.push({ label: "Requested", value: count(detail.days, unit) });

  if (ledger && ledger.used !== null && ledger.total) {
    out.push({ label: "Approved", value: count(ledger.total, ledger.unit), note: `${ledger.used} used · ${ledger.total - ledger.used} left` });
    const win = windowOf(ledger);
    const kind = ledger.clockKind;
    const label = kind === "expiry" || kind === "units" ? "Approval ends" : kind === "review" || kind === "next" ? "Next review" : null;
    if (win) {
      // The window already names the end date, so "Approval ends" is not shown a second time.
      const left = win.to - clock;
      out.push({ label: "Window", value: `${shortDate(win.from)} to ${shortDate(win.to)}`, note: left <= 0 ? "ended" : `ends in ${shortSpan(left)}` });
    } else if (label) {
      const left = ledger.dueAt - clock;
      out.push({ label, value: dateText(ledger.dueAt), note: left <= 0 ? "now" : `in ${shortSpan(left)}` });
    }
  }

  if (docs && docs.total > 0) {
    const n = docs.missing.length;
    out.push({ label: "Documents", value: n === 0 ? "Complete" : `${docs.have} of ${docs.total}`, note: n === 0 ? `All ${docs.total} in the packet` : n <= 2 ? `Missing: ${docs.missing.join(", ")}` : `${n} missing` });
  }

  if (workflow) out.push({ label: "Workflow", value: workflow.name, note: workflow.usedDefault ? "Illustrative default" : `Version ${workflow.version}` });

  const w = waitingOn(detail, live);
  if (w) out.push({ label: "Waiting on", value: w.who, note: w.note });
  if (site) out.push({ label: "Site", value: siteName(site), note: SITES.find((x) => x.id === site)?.sub });
  return out;
}
