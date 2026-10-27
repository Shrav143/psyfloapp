/* The facts the payer workflow reads, built from a New Case draft and what New Case already knows: the payer, the level of care, the Authorization type, the demo date, the requested start,
   the shared verification record, which of the payer's documents are in the case, the payer's answer once the request is sent, and the sign-off.
   Pure and cheap, so the workflow can run again whenever the person changes step or a document or a check changes. The Studio's Test Workflow fills the same shape from a form. */
import type { CaseDraft, DocSlotId } from "@/data/cases";
import type { DocItem } from "@/data/payerConfig";
import { isoOf } from "@/data/patients";
import { payerProfileOf } from "@/data/payerProfile";
import { usualDays } from "@/data/queue";
import { docsOf } from "@/data/programTables";
import type { VerificationRecord } from "@/data/verification";
import type { PsyRequest } from "@/data/types";
import { DAY } from "@/lib/time";
import type { AppState } from "@/store";
import type { CaseFacts, PayerResponse, Workflow } from "@/data/workflow/types";
import { slotForTitle } from "../documents";
import { datesOfService, verificationKey, verificationView } from "../verificationFor";
import { approveAll } from "./engine";

/** What the facts read from the store. The whole `AppState` satisfies it. */
export type FactsState = Pick<AppState, "clock" | "verifications" | "requests" | "payerConfig" | "customPayers">;

/** Which of the payer's documents (by the id on its list) the case holds. A document marked "not available" is not in the case, so the workflow waits for it like the review does. */
export function documentFacts(draft: Pick<CaseDraft, "documents">, items: DocItem[] | null): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!items) return out;
  const taken = new Set<DocSlotId>();
  for (const item of items) {
    const fixed = slotForTitle(item.title);
    const slot: DocSlotId = fixed && !taken.has(fixed) ? fixed : `item:${item.title}`;
    taken.add(slot);
    out[item.id] = draft.documents.some((d) => d.slot === slot);
  }
  return out;
}

/** The payer's answer, from the request this case became. "none" until it is sent and while the payer is still looking. */
export function payerResponseOf(request: PsyRequest | undefined): PayerResponse {
  if (!request) return "none";
  if (request.stage === "info_requested") return "more_info";
  if (request.outcome === "approved") return "approved";
  if (request.outcome === "partly_approved") return "partial";
  if (request.outcome === "denied") return "denied";
  return "none";
}

const COVERAGE = { active: "active", inactive: "inactive" } as const;
const BENEFIT = { covered: "covered", limited: "limited", not_covered: "not_covered" } as const;
const NETWORK = { in_network: "yes", out_of_network: "no" } as const;

/** The existing authorization the request is about: the one chosen in Intake, or the one the verification found. */
function existingAuthOf(draft: CaseDraft, record: VerificationRecord | undefined): CaseFacts["existingAuth"] {
  const basis = draft.basis;
  if (basis?.to) return { ref: draft.authorizationId ?? basis.label, unitsRemaining: basis.left ?? 0, expiresOn: basis.to };
  const found = record?.existingAuth;
  return found ? { ref: found.ref, unitsRemaining: Math.max(0, found.approved - found.used), expiresOn: found.to } : undefined;
}

/** The sign-off counts as the approval of every step that asks for a person (an approval step, anything marked "approval", every step that reaches a payer, an agent's answer that needs review).
    None is approved until a clinician signs; once the request is sent they all are. */
export function approvalsFor(workflow: Pick<Workflow, "nodes">, draft: Pick<CaseDraft, "sent">): NonNullable<CaseFacts["approvals"]> {
  return draft.sent ? approveAll(workflow) : {};
}

/** The case has a coverage check that describes it: a record for this payer and level of care. Until then the verification facts are "unknown" because nobody asked yet, not because the plan did not answer. */
export function hasVerification(draft: CaseDraft, state: Pick<FactsState, "clock" | "verifications">): boolean {
  const key = verificationKey(draft);
  const record = key ? state.verifications[key] : undefined;
  return !!record && verificationView(draft, record, state.clock).status !== "other";
}

/** The facts for a draft, or null while Intake does not know the payer and the level of care yet. The approvals are added by `approvalsFor` once the workflow is known. */
export function factsFromCase(draft: CaseDraft, state: FactsState): CaseFacts | null {
  if (!draft.payerId || !draft.program) return null;
  const key = verificationKey(draft);
  const record = key ? state.verifications[key] : undefined;
  /* A check made for another payer or level of care does not describe this case. */
  const usable = record && verificationView(draft, record, state.clock).status !== "other" ? record : undefined;
  const request = draft.caseId ? state.requests.find((r) => r.id === draft.caseId || r.caseId === draft.caseId) : undefined;
  const profile = payerProfileOf(draft.payerId, state.customPayers);
  const dos = draft.kind === "retro" ? datesOfService(draft) : null;
  const config = state.payerConfig[draft.payerId];
  const items = config ? docsOf(config.docs, draft.payerId, draft.program) : null;
  const requestedUnits = draft.kind === "modify" && draft.change?.amount ? draft.change.amount : (usualDays(draft.program) ?? undefined);

  return {
    payerId: draft.payerId,
    product: profile.product,
    state: profile.state,
    service: draft.program,
    requestType: draft.kind,
    today: isoOf(state.clock),
    requestedStart: draft.startDate,
    ...(dos ? { serviceDates: dos } : {}),
    coverage: usable ? COVERAGE[usable.coverage.state as keyof typeof COVERAGE] ?? "unknown" : "unknown",
    benefit: usable ? BENEFIT[usable.benefits as keyof typeof BENEFIT] ?? "unknown" : "unknown",
    authRequirement: usable ? usable.authRequirement : "unknown",
    inNetwork: usable ? NETWORK[usable.provider as keyof typeof NETWORK] ?? "unknown" : "unknown",
    existingAuth: existingAuthOf(draft, usable),
    requestedUnits,
    documents: documentFacts(draft, items),
    payerResponse: payerResponseOf(request),
    portalStatus: draft.run.failed === "verify" || draft.run.skipped.includes("verify") ? "down" : "up",
    waitingDays: request && draft.sent ? Math.max(0, Math.floor((state.clock - request.stageSince) / DAY)) : 0,
  };
}
