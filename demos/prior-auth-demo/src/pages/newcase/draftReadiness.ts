/* Review & Submit's readiness, in the two tracks the intake workspace uses: clinical readiness (read from the intake record when there is one) and administrative readiness (this request's coverage, requirements, documents and submission).
   Neither is an approval and neither says medical necessity is established; there is no blended number. */
import { requirementFor } from "@/data/assess/carePlan";
import { dualReadiness, READINESS_NOTE, trackOf, type DualReadinessX, type ReadinessItemX } from "@/data/assess/readiness";
import type { ReadinessStatus } from "@/data/assess/types";
import { RUN_STEPS } from "@/data/cases";
import type { IntakeRecord } from "@/data/intake/types";
import { minutesOf } from "@/data/patients";
import type { CaseEnv } from "./caseEnv";
import { serviceIdOfDraft } from "./coverage/serviceOf";
import type { ReviewModel } from "./reviewModel";

/** `go.section` of an item made here: the stage of New Authorization that fixes it. Items read from the intake keep the workspace's own sections. */
export type StageGo = "stage:service" | "stage:coverage" | "stage:documentation" | "stage:review";
const item = (id: string, label: string, state: ReadinessItemX["state"], detail: string, owner: string, go?: StageGo, status?: ReadinessStatus): ReadinessItemX => ({
  id, label, detail, owner, state, go: go ? { section: go } : undefined, status: status ?? (state === "ready" ? "complete" : state === "blocked" ? "blocked" : state === "not_applicable" ? "na" : "missing"),
});

export function draftReadiness(env: CaseEnv, review: ReviewModel, intake: IntakeRecord | undefined, now: number): DualReadinessX {
  const d = env.draft;
  const v = env.verification;
  const owner = "Authorization coordinator";
  const agentsDone = d.run.done >= RUN_STEPS.length;
  const clinicalOwn: ReadinessItemX[] = [
    item("diagnosis", "Diagnosis on the request", d.diagnoses.length ? "ready" : "needs_attention", d.diagnoses.length ? d.diagnoses.map((x) => x.code).join(", ") : "No diagnosis is on the request", "Treating clinician", "stage:service"),
    item("summary", "Clinical summary prepared", agentsDone ? "ready" : "needs_attention", agentsDone ? "The agents finished the draft summary (AI suggested draft)" : "The agents have not finished the draft summary", "Treating clinician", "stage:documentation"),
    item("signoff", "Clinician sign-off", d.sent ? "ready" : "needs_attention", d.sent ? "Signed and sent" : "Waits for a clinician to sign on this page. An agent cannot sign", "Treating clinician", "stage:review"),
  ];
  const clinical = intake ? dualReadiness(intake, now).clinical.items : clinicalOwn;

  const serviceId = serviceIdOfDraft(d);
  const req = serviceId ? requirementFor(serviceId, { payerId: d.payerId, age: d.patient.age }, d.startDate ? minutesOf(d.startDate) : now) : null;
  const firm = req?.rules.find((x) => x.status === "final" && x.kind !== "pending")?.kind;
  const intakeAdmin = intake ? dualReadiness(intake, now).administrative.items.filter((i) => i.id === "consent") : [];
  const admin: ReadinessItemX[] = [
    v.inactive ? item("coverage", "Coverage verified", "blocked", "Coverage is not active for these dates", owner, "stage:coverage")
      : v.status === "current" || v.noAuth ? item("coverage", "Coverage verified", "ready", v.noAuth ? "The payer needs no authorization for this service" : "Checked with Verify (simulated). Confirm with the plan if anything looks off", owner, "stage:coverage")
        : item("coverage", "Coverage verified", "needs_attention", v.status === "stale" ? "The last check is old or covers other dates" : "Coverage has not been checked yet", owner, "stage:coverage", "verify"),
    v.exceptions.includes("provider_unresolved") ? item("provider", "Provider participation confirmed", "needs_attention", "Network participation is not confirmed", owner, "stage:coverage", "verify") : item("provider", "Provider participation confirmed", v.status === "current" ? "ready" : "needs_attention", v.status === "current" ? "No network warning in the check (simulated)" : "Run the coverage check", owner, "stage:coverage", "verify"),
    ...intakeAdmin,
    env.readiness.missingRequired.length ? item("documents", "Required documents attached", "needs_attention", `Missing: ${env.readiness.missingRequired.map((m) => m.label.toLowerCase()).join(", ")}`, owner, "stage:documentation")
      : item("documents", "Required documents attached", "ready", `${env.readiness.required.length} required ${env.readiness.required.length === 1 ? "document is" : "documents are"} in`, owner, "stage:documentation"),
    firm === "none" ? item("requirements", "Authorization requirements checked", "not_applicable", req?.text ?? "", owner)
      : firm ? item("requirements", "Authorization requirements checked", "ready", req?.text ?? "", owner, "stage:coverage")
        : item("requirements", "Authorization requirements checked", "needs_attention", req?.text ?? "Payer requirement not yet verified.", owner, "stage:coverage", "verify"),
    req?.status === "on_file" ? item("payer-rule", "Payer rule status", "ready", "A final policy row applies. It does not say this plan's own rules are confirmed", owner) : item("payer-rule", "Payer rule status", "needs_attention", "Payer requirement not yet verified.", owner, "stage:coverage", "verify"),
    review.blocking.length ? item("submission", "Submission readiness", "blocked", `${review.blocking.length} ${review.blocking.length === 1 ? "item stops" : "items stop"} sending`, owner, "stage:review")
      : review.missing.some((m) => m.severity === "ack") ? item("submission", "Submission readiness", "needs_attention", `${review.missing.filter((m) => m.severity === "ack").length} to acknowledge before signing`, owner, "stage:review")
        : item("submission", "Submission readiness", agentsDone ? "ready" : "needs_attention", agentsDone ? "Nothing stops the signature. Sending is simulated" : "The agents have not finished the packet", owner, "stage:review"),
  ];
  return { clinical: trackOf(clinical), administrative: trackOf(admin), note: READINESS_NOTE };
}
