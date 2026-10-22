/* What is wrong or missing in Intake and in Eligibility & Benefits, as the items "What is missing" lists and the stepper counts.
   Blocking is only what the product rules say: no patient, payer, service or requested dates, coverage confirmed inactive with no documented exception,
   and a duplicate nobody has answered. Everything else warns and can be saved as a draft. */
import { authType } from "./authType";
import type { CaseEnv } from "./caseEnv";
import type { MissingItem } from "./missing";
import { patientReady } from "./intakeRules";
import { noAuthLine, retroRule } from "./payerRules";
import { EXCEPTION_TEXT, reasonOf } from "./verificationFor";
import { payerById } from "@/data/seed";

const block = (id: string, label: string, text: string, fix: MissingItem["fix"]): MissingItem => ({ id, label, text, severity: "block", fix });
const ack = (id: string, label: string, text: string, fix?: MissingItem["fix"]): MissingItem => ({ id, label, text, severity: "ack", fix });
const note = (id: string, label: string, text: string, fix?: MissingItem["fix"]): MissingItem => ({ id, label, text, severity: "note", fix });

export function intakeIssues(env: CaseEnv): MissingItem[] {
  const { draft: d } = env;
  const def = authType(d.kind);
  const out: MissingItem[] = [];
  if (!patientReady(d)) out.push(block("patient", "Patient", def.existing ? "No patient is chosen. Find the patient this request is for." : "No patient yet. Add the initials and age.", "intake"));
  if (!d.payerId) out.push(block("payer", "Payer", "No payer yet. Add the payer and plan.", "intake"));
  if (!d.program) out.push(block("service", "Service", "No level of care yet. Choose the service the request is for.", "intake"));
  if (!d.startDate) out.push(block("dates", d.kind === "retro" ? "Dates of service" : "Requested dates", d.kind === "retro" ? "No dates of service yet. Add the first and the last day care was given." : "No start date yet. Add the day the stay would start.", "intake"));
  else if (d.kind === "retro" && !d.endDate) out.push(ack("dates-end", "Last date of service", "Add the last day care was given without an authorization. Until then the request names only the first day.", "intake"));
  if (def.existing && patientReady(d) && !d.authorizationId) out.push(ack("authorization", "Authorization", "No authorization is chosen. The request is not linked to one, so the payer cannot match it.", "intake"));
  if (d.kind === "modify" && !d.change?.detail.trim()) out.push(ack("change", "Proposed change", "Say what should change and why. A modification is a request, not an approval.", "intake"));
  if (d.kind === "retro" && !d.retroReason?.trim()) out.push(ack("retro-reason", "Why it was not obtained ahead of time", "The payer will ask why no authorization was in place. Add the reason.", "intake"));
  if (d.kind === "retro" && d.payerId) {
    const rule = retroRule(env.ctx, payerById(d.payerId).shortName);
    if (!rule.onFile) out.push(note("retro-rule", "Retroactive rule", rule.text));
  }
  const authz = env.authorization;
  if (def.existing && authz && authz.status === "pending") out.push(note("auth-pending", "Authorization", "This authorization is not approved yet, so there is nothing to review. Check that it is the right one."));
  if (env.duplicate) {
    const said = reasonOf(d, "duplicate");
    out.push(said ? note("duplicate", "Possible duplicate", `${env.duplicate.title}. You went on and said why: ${said.reason}`) : block("duplicate", "Possible duplicate", `${env.duplicate.title}. Open it, or continue with a reason.`, "intake"));
  }
  return out;
}

export function eligibilityIssues(env: CaseEnv): MissingItem[] {
  const { draft: d, verification: v } = env;
  const out: MissingItem[] = [];
  if (v.status === "needs_input") {
    out.push(ack("coverage", "Coverage", "Coverage was not checked. Add the payer, level of care, member ID and dates so Verify can check it.", "intake"));
    return out;
  }
  if (v.status === "none" || v.status === "other") {
    out.push(ack("coverage", "Coverage", "Coverage has not been checked yet. Open Eligibility & Benefits to run the check.", "eligibility"));
    return out;
  }
  if (v.status === "stale") out.push(note("coverage-old", "Coverage", `The last check was ${v.ageHours === null ? "some time" : `${v.ageHours} hours`} ago. Refresh it before you send.`, "eligibility"));
  const coverage = reasonOf(d, "coverage");
  const unavailable = reasonOf(d, "unavailable");
  for (const e of v.exceptions) {
    const t = EXCEPTION_TEXT[e];
    if (e === "coverage_inactive") out.push(coverage ? note("coverage-x", "Coverage", `${t.title}. You went on with a documented exception: ${coverage.reason}`) : block("coverage-x", "Coverage", `${t.title}. ${t.next}`, "eligibility"));
    else if (e === "service_unavailable") out.push(unavailable ? note("unavailable", "Verification", `The check could not run. You went on and said why: ${unavailable.reason}`) : ack("unavailable", "Verification", `${t.title}. ${t.next}`, "eligibility"));
    else if (e === "member_id_mismatch" && coverage) out.push(note(e, "Member ID", `${t.title}. You went on with a documented exception: ${coverage.reason}`));
    else out.push(ack(e, EXCEPTION_LABEL[e], `${t.title}. ${t.next}`, "eligibility"));
  }
  if (v.noAuth) {
    const said = reasonOf(d, "no_auth");
    const line = noAuthLine(env.ctx.rules, d.program);
    out.push(said ? note("no-auth", "No authorization needed", `The payer needs no authorization for this service. You went on with a documented exception: ${said.reason}`) : ack("no-auth", "No authorization needed", `The payer needs no authorization for this service${line ? `: ${line}` : ""}. Save the verification, return to Case Manager, or go on with a documented exception.`, "eligibility"));
  }
  return out;
}

const EXCEPTION_LABEL = {
  coverage_inactive: "Coverage", payer_changed: "Payer changed", member_id_mismatch: "Member ID", benefit_unconfirmed: "Benefit", service_not_covered: "Service not covered",
  provider_unresolved: "Network", service_unavailable: "Verification", requirement_unknown: "Authorization requirement",
} as const;
