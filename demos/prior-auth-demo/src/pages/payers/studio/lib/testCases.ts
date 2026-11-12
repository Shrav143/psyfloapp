import type { DocItem } from "@/data/payerConfig";
import { addDays, DEMO_TODAY } from "@/data/workflow/facts";
import type { Program } from "@/data/types";
import type { ApprovalState, CaseFacts, RequestType, WfNode, Workflow } from "@/data/workflow/types";
import { baseFacts } from "./engine";

/* The fictional test case: the facts a person types into the form, and the presets that fill it. Nothing here is a real patient; the demo date is 2026-10-20. */

export const DEMO_DATE = DEMO_TODAY;

export type Approvals = "none" | "all" | "some";
type Docs = DocItem[];

/** The form state: the facts plus how the manual approvals are given, because approvals are keyed by a workflow's step ids and the workflow can change. */
export interface TestCase {
  facts: CaseFacts;
  /** Which existing authorization fields are shown. */
  hasExisting: boolean;
  approvals: Approvals;
  approvedIds: string[];
  /** Dates of service, for a retroactive request. */
  serviceFrom: string;
  serviceTo: string;
}

export interface PresetContext { payerId: string; service: Program; docs: Docs }
export interface Preset {
  id: string;
  label: string;
  /** One line under the chip: what it shows. */
  hint: string;
  make: (c: PresetContext) => TestCase;
}

const allDocs = (docs: Docs, except?: RegExp): Record<string, boolean> => Object.fromEntries(docs.map((d) => [d.id, !(except && except.test(d.title))]));

/** A fresh case for a payer, service and request type, as the engine starts one (coverage active, every document in, no answer, portal up), with what the preset changes. */
export function freshCase(c: PresetContext, type: RequestType, over: Partial<CaseFacts> = {}): TestCase {
  const facts: CaseFacts = { ...baseFacts(c.payerId, c.service, type, c.docs), ...over };
  return { facts, hasExisting: !!facts.existingAuth, approvals: "none", approvedIds: [], serviceFrom: facts.serviceDates?.from ?? "", serviceTo: facts.serviceDates?.to ?? "" };
}

export const PRESETS: Preset[] = [
  { id: "clean", label: "Clean initial request", hint: "Everything is in order and every approval is given.", make: (c) => ({ ...freshCase(c, "initial"), approvals: "all" }) },
  { id: "plan-missing", label: "Treatment plan missing", hint: "Eligibility passes, then it waits for the treatment plan.", make: (c) => freshCase(c, "initial", { documents: allDocs(c.docs, /treatment plan/i) }) },
  { id: "inactive", label: "Coverage inactive", hint: "The check finds no active coverage.", make: (c) => freshCase(c, "initial", { coverage: "inactive" }) },
  { id: "no-auth", label: "No authorization required", hint: "The payer needs no authorization for this service.", make: (c) => freshCase(c, "initial", { authRequirement: "not_required" }) },
  {
    id: "retro",
    label: "Retro outside the window",
    hint: "Service started 45 days ago, after the payer's limit.",
    make: (c) => {
      const from = addDays(DEMO_DATE, -45);
      const to = addDays(DEMO_DATE, -30);
      return freshCase(c, "retro", { requestedStart: from, serviceDates: { from, to } });
    },
  },
  { id: "portal-down", label: "Portal down", hint: "Ready to send, but the payer's portal is down.", make: (c) => ({ ...freshCase(c, "initial", { portalStatus: "down" }), approvals: "all" }) },
  { id: "more-info", label: "Payer asks for more information", hint: "The payer answered with a request for more.", make: (c) => ({ ...freshCase(c, "initial", { payerResponse: "more_info", waitingDays: 3 }), approvals: "all" }) },
  { id: "partial", label: "Partial approval", hint: "The payer approved fewer days than asked.", make: (c) => ({ ...freshCase(c, "initial", { payerResponse: "partial", waitingDays: 2 }), approvals: "all" }) },
];

/** The steps of a workflow that wait for a person: the approval steps and every step marked "A person approves first". */
export const gateNodes = (w: Pick<Workflow, "nodes">): WfNode[] => w.nodes.filter((n) => n.approval || n.kind === "act_human_approval");

/** The facts the engine runs on: the form's facts with the approvals worked out for this workflow and the dates of service only for a retro request. */
export function factsOf(t: TestCase, w: Pick<Workflow, "nodes">): CaseFacts {
  const gates = gateNodes(w);
  const approvals: Record<string, ApprovalState> = {};
  for (const g of gates) if (t.approvals === "all" || (t.approvals === "some" && t.approvedIds.includes(g.id))) approvals[g.id] = "approved";
  const retro = t.facts.requestType === "retro" && t.serviceFrom && t.serviceTo;
  return { ...t.facts, existingAuth: t.hasExisting ? (t.facts.existingAuth ?? { ref: "A-demo", unitsRemaining: 5, expiresOn: addDays(t.facts.today, 7) }) : undefined, serviceDates: retro ? { from: t.serviceFrom, to: t.serviceTo } : undefined, approvals };
}

