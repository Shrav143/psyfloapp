import { planTypeOf } from "./cases";
import type { CustomPayer, PayerConfig, PendingChange } from "./payerConfig";
import { PROGRAM_LABEL, PROGRAMS, type PayerSummary, type Program } from "./types";
import { shortDate } from "@/lib/time";

/* What Payers and Eligibility & Benefits say about a payer: plan type and routing, the programs it covers, what it asks for and the policy status.
   Everything is read from the payer record and its saved configuration. Nothing here is verified against a payer. */

export interface PlanInfo {
  /** "Medicaid managed care (HMO)" */
  label: string;
  /** The same in a row of a list: "Medicaid HMO". */
  short: string;
  /** Where claims go: "Claims go to Summit, not to the state". */
  routing: string;
  /** The routing with a short lead-in, as the "It is the right plan" check reads it. */
  detail: string;
}

/** The plan type and where claims go, from the payer's group and the plan type New Case would pre-fill. A payer with no plan type gives null, and the caller shows nothing. */
export function planInfo(p: PayerSummary): PlanInfo | null {
  const kind = planTypeOf(p.id);
  if (!kind) return null;
  const who = p.shortName;
  if (p.group === "Ohio Medicaid" && kind !== "Fee-for-service") {
    const routing = `Claims go to ${who}, not to the state`;
    return { label: kind === "HMO" || kind === "PPO" ? `Medicaid managed care (${kind})` : "Medicaid managed care", short: kind === "HMO" || kind === "PPO" ? `Medicaid ${kind}` : "Medicaid managed care", routing, detail: `Managed by ${p.name}. ${routing}` };
  }
  if (kind === "Fee-for-service") {
    const medicaid = p.group === "Ohio Medicaid";
    const routing = medicaid ? "Claims go to the state, not to a health plan" : `Claims go to ${p.name}`;
    const label = medicaid ? "Medicaid fee for service" : "Fee for service";
    return { label, short: label, routing, detail: routing };
  }
  if (p.group === "Medicare Advantage" || kind === "Medicare Advantage") {
    const routing = `Claims go to ${p.name}, not to Medicare`;
    return { label: "Medicare Advantage", short: "Medicare Advantage", routing, detail: `A Medicare Advantage plan. ${routing}` };
  }
  if (p.group === "Behavioral carve-out" || kind === "Behavioral carve-out") {
    const routing = `Behavioral health is carved out to ${p.name}. Claims go to ${who}, not to the medical plan`;
    return { label: "Behavioral health carve-out", short: "Behavioral carve-out", routing, detail: routing };
  }
  const routing = `Claims go to ${p.name}`;
  return { label: `Commercial ${kind}`, short: `Commercial ${kind}`, routing, detail: routing };
}

/** The programs a payer covers: the ones chosen when it was added, or for the built-in six the programs that have a document list. */
export function programsCovered(id: string, cfg: PayerConfig | undefined, custom: CustomPayer[]): Program[] {
  const added = custom.find((c) => c.id === id);
  if (added) return PROGRAMS.filter((p) => added.programs.includes(p));
  return cfg ? PROGRAMS.filter((p) => cfg.docs[p].length > 0) : [];
}

/** The programs as one short phrase for a row of a list: "4 programs" when it covers every program, or the names when fewer. */
export function programsShort(list: Program[]): string {
  if (!list.length) return "No programs";
  return list.length === PROGRAMS.length ? `${list.length} programs` : list.map((p) => PROGRAM_LABEL[p]).join(", ");
}

export interface RequestNeed {
  needed: boolean;
  /** The saved rule that says so, in the rule's own words. */
  note: string;
}
export interface RequestNeeds {
  initial: RequestNeed;
  review: RequestNeed;
}

/** Whether an initial request and a continued-stay review are needed, read from the saved workflow and the submission-window rule. A rule edited on Payers changes this. */
export function requestNeeds(cfg: PayerConfig): RequestNeeds {
  const lines = cfg.rules.find((r) => r.id === "windows")?.lines ?? [];
  const notice = lines.find((l) => /notice|initial/i.test(l));
  const review = lines.find((l) => /continued-stay|review/i.test(l)) ?? lines.find((l) => /recertification/i.test(l));
  const step = (re: RegExp) => cfg.workflow.steps.some((s) => re.test(s.title));
  return {
    initial: { needed: !!notice || step(/send the request/i), note: notice ?? "Sent through the saved workflow" },
    review: { needed: !!review || step(/review/i), note: review ?? "The next review is booked after a decision" },
  };
}

/** The short cue on a payer's row: what the payer asks for. */
export function needsCue(n: RequestNeeds): string {
  if (n.initial.needed && n.review.needed) return "Initial + review";
  if (n.initial.needed) return "Initial only";
  if (n.review.needed) return "Review only";
  return "None on file";
}

export interface PolicyStatus {
  /** A change still waiting for a person, if any. */
  waiting: PendingChange | null;
  /** When a change was last acknowledged or applied in Psyflo, as "10/12", and what it was. Null when the log has none. */
  last: { date: string; title: string } | null;
  /** Where the rules come from. The demo's rules are sample data, never read from a payer. */
  source: string;
}

export function policyStatus(cfg: PayerConfig): PolicyStatus {
  const ack = cfg.pending?.acknowledged;
  const logged = cfg.changes.find((c) => !c.noticed);
  const last = ack && cfg.pending ? { date: shortDate(ack.at), title: `${cfg.pending.title}, acknowledged` } : logged ? { date: logged.date, title: logged.title } : null;
  return { waiting: cfg.pending, last, source: cfg.rulesVersion === "benchmark" ? "Psyflo benchmark, not a payer's policy" : `Demo sample rules, version ${cfg.rulesVersion}` };
}

/** The label that sits next to a payer's name. The demo's rules are never verified, so the label is always there. */
export const DEMO_RULES_LABEL = "Demo rules. Not verified against the payer's current policy.";
