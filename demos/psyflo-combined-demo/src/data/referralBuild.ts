import { DAY, longDate } from "@/lib/time";
import { PROGRAM_LABEL, type PayerId, type Program, type RequestEvent, type Urgency } from "./types";
import { ACCEPTED_CREDENTIALS, AGE_MIN, CHANNEL_LABEL, CHECK_DOC, CHECK_PROBLEM, CHECK_LABEL, CHECK_ORDER, DECLINE_LABEL, KNOWN_ICD, PROGRAM_ASAM, URGENCY_LABEL, staffById } from "./referralLabels";
import type { Channel, CheckKey, CoverageKind, DeclineReason, DocPlan, FieldKey, Referral, ReferralCheck, ReferralField, ReferralNote, ReferralStatus, SourceDef, StaffId } from "./referralTypes";
import { buildCoverage, buildFit, hash } from "./referralInsight";
import { payerById } from "./seed";

/** What a compact seed entry says. `buildReferral` expands it into a full referral. */
export interface ReferralSpec {
  id: string;
  ago: number;
  channel: Channel;
  source: SourceDef;
  initials: string;
  age: number;
  sex: "F" | "M";
  payer: PayerId | null;
  last4?: string;
  program: Program;
  urgency: Urgency;
  status: ReferralStatus;
  owner?: StaffId;
  opened?: boolean;
  decideAfter?: number;
  admitAfter?: number;
  intakeIn?: number;
  infoAskedAgo?: number;
  infoMessage?: string;
  lapsed?: boolean;
  coverageRun?: boolean;
  decline?: { reason: DeclineReason; note: string; courtesy: boolean };
  requestId?: string;
  plan: Partial<DocPlan> & Pick<DocPlan, "reason" | "substances" | "meds" | "risk" | "dx">;
  fit?: { suggested?: Program; confidence?: number };
  notes?: { by: StaffId; ago: number; text: string }[];
  overrides?: Partial<Record<CheckKey, string>>;
}

/** Programs that need an authorization before the first day. IOP often does not. */
export const authRequired = (payer: PayerId, program: Program): boolean => program !== "IOP" || payer === "cardinal" || payer === "harborview" || payer === "lakeshore";

/* ------------------------------------------------------------------ extracted fields */
type FieldSource = Pick<Referral, "id" | "patient" | "payerId" | "memberIdMasked" | "program" | "urgency" | "plan">;
const BASE_CONF: Record<FieldKey, number> = { patient: 99, age: 97, clinician: 96, credentials: 94, npi: 92, reason: 95, diagnoses: 93, service: 96, urgency: 90, orderDate: 95, insurance: 94, memberId: 91, contact: 93 };

const dxText = (dx: { code: string; label: string }[]): string => dx.map((d) => `${d.code} ${d.label}`).join("; ");
/** Reads "F10.20 Alcohol use disorder; F33.1 Major depression" back into code and label pairs. */
export function parseDiagnoses(text: string): { code: string; label: string }[] {
  return text
    .split(/[;\n]/)
    .map((part) => part.trim())
    .map((part) => /^([A-Z]\d{2}(?:\.\w{1,4})?)\s*(.*)$/.exec(part))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ code: m[1], label: m[2] || KNOWN_ICD[m[1]] || "Diagnosis" }));
}

export function buildFields(r: FieldSource, prev: ReferralField[] = []): ReferralField[] {
  const p = r.plan;
  const payer = r.payerId ? payerById(r.payerId).name : "None listed";
  const row = (key: FieldKey, label: string, value: string, kind: ReferralField["kind"] = "text", missing = false): ReferralField => ({
    key,
    label,
    value: missing ? "Not found on the form" : value,
    kind,
    confidence: missing ? 0 : Math.min(99, BASE_CONF[key] - 2 + (hash(r.id + key) % 5)),
  });
  const fresh: ReferralField[] = [
    row("patient", "Patient", r.patient.initials),
    row("age", "Age", String(r.patient.age)),
    row("clinician", "Referring clinician", p.clinician.name),
    row("credentials", "Credentials", p.clinician.credentials),
    row("npi", "NPI", p.clinician.npi),
    row("reason", "Reason for referral", p.reason, "long", !p.reason),
    row("diagnoses", "Diagnoses", dxText(p.dx), "long", !p.dx.length),
    row("service", "Requested service", `${PROGRAM_LABEL[r.program]} (ASAM ${p.asam})`, "program"),
    row("urgency", "Urgency", URGENCY_LABEL[r.urgency], "urgency"),
    row("orderDate", "Order date", `${longDate(p.orderAt)}, valid until ${longDate(p.expiresAt)}`),
    row("insurance", "Insurance", payer, "payer", !r.payerId),
    row("memberId", "Member ID", r.memberIdMasked, "text", !r.memberIdMasked.startsWith("…")),
    row("contact", "Contact", p.phone, "text", !p.phone),
  ];
  return fresh.map((f) => prev.find((x) => x.key === f.key && x.edited) ?? f);
}

/* ------------------------------------------------------------------ the nine validation checks */
type CheckSource = Pick<Referral, "patient" | "program" | "urgency" | "channel" | "plan">;

function judge(r: CheckSource, key: CheckKey): { state: ReferralCheck["state"]; detail: string } {
  const p = r.plan;
  const c = p.clinician;
  switch (key) {
    case "signature":
      return p.signed
        ? { state: "pass", detail: `Signed by ${c.name}, ${c.credentials}, on ${longDate(p.orderAt)}.` }
        : { state: "warn", detail: r.channel === "phone" ? "This came by phone, so there is no written order on file yet." : "The signature line is empty. Reader cannot confirm who ordered this." };
    case "expiry":
      return p.expiresAt >= 0
        ? { state: "pass", detail: `The order is valid until ${longDate(p.expiresAt)}.` }
        : { state: "warn", detail: `The order expired on ${longDate(p.expiresAt)}. A current order is needed.` };
    case "credentials":
      return ACCEPTED_CREDENTIALS.test(c.credentials)
        ? { state: "pass", detail: `${c.credentials} is on the accepted list (MD, DO, NP, PA, PhD, LCSW, LPCC).` }
        : { state: "warn", detail: `"${c.credentials}" is not on the accepted list (MD, DO, NP, PA, PhD, LCSW, LPCC). A cosigning clinician is needed.` };
    case "components": {
      const missing = [!p.reason && "the reason for referral", !p.substances && "substance use history", !p.meds.length && "medications", !p.risk && "risk screening"].filter(Boolean);
      return missing.length ? { state: "warn", detail: `Missing: ${missing.join(", ")}.` } : { state: "pass", detail: "Reason, substance use history, medications and risk screening are all on the form." };
    }
    case "diagnosis": {
      if (!p.dx.length) return { state: "warn", detail: "No diagnosis code on the form. Reader found symptoms only." };
      const bad = p.dx.filter((d) => !(d.code in KNOWN_ICD));
      return bad.length ? { state: "warn", detail: `${bad[0].code} is too short to bill. A full code is needed.` } : { state: "pass", detail: `${p.dx.map((d) => d.code).join(", ")} found. The codes are valid.` };
    }
    case "service":
      return p.asam === PROGRAM_ASAM[r.program]
        ? { state: "pass", detail: `The form asks for ASAM level ${p.asam}, which is what ${PROGRAM_LABEL[r.program]} delivers.` }
        : { state: "warn", detail: `The form asks for ASAM level ${p.asam}. ${PROGRAM_LABEL[r.program]} delivers level ${PROGRAM_ASAM[r.program]}.` };
    case "urgent":
      if (r.urgency === "routine") return { state: "pass", detail: "Marked routine, so no urgent criteria are needed." };
      return p.risk ? { state: "pass", detail: `Documented: ${p.risk.split(". ")[0].replace(/\.$/, "")}.` } : { state: "warn", detail: "Marked urgent, but there is no risk screening on the form." };
    case "age":
      return r.patient.age >= AGE_MIN ? { state: "pass", detail: `Age ${r.patient.age}. The program serves adults ${AGE_MIN} and over.` } : { state: "fail", detail: `Age ${r.patient.age}. The program serves adults ${AGE_MIN} and over.` };
    case "contact":
      return p.phone ? { state: "pass", detail: `Phone ${p.phone}, with another contact on the face sheet.` } : { state: "warn", detail: "There is no phone number or other way to reach the patient." };
  }
}

export function evaluateChecks(r: CheckSource, prev: ReferralCheck[] = []): ReferralCheck[] {
  return CHECK_ORDER.map((key) => ({ key, doc: CHECK_DOC[key], label: CHECK_LABEL[key], ...judge(r, key), resolved: prev.find((c) => c.key === key)?.resolved }));
}

export const issueCount = (checks: ReferralCheck[]): number => checks.filter((c) => c.state !== "pass" && !c.resolved).length;
export const hasFail = (checks: ReferralCheck[]): boolean => checks.some((c) => c.state === "fail" && !c.resolved);

/* ------------------------------------------------------------------ the full referral */
const RECEIVED_VERB: Record<Channel, string> = { fax: "Received by fax from", eReferral: "Received as an e-referral from", portal: "Received through the portal from", phone: "Taken by phone from", email: "Received by email from" };

function makePlan(s: ReferralSpec, receivedAt: number): DocPlan {
  const h = hash(s.id);
  const orderAt = s.plan.orderAt ?? receivedAt - DAY;
  return {
    program: s.program,
    urgency: s.urgency,
    initials: s.initials,
    age: s.age,
    payerId: s.payer,
    memberIdMasked: s.payer && s.last4 ? `…${s.last4}` : "Not provided",
    org: s.source.org,
    orgSub: s.source.orgSub,
    sex: s.sex,
    dobCode: String(1000 + (h % 9000)),
    phone: `(614) 555-0${100 + (h % 90)}`,
    altContact: `${["Sister", "Partner", "Parent", "Friend"][h % 4]}, (614) 555-0${100 + ((h >> 3) % 90)}`,
    clinician: s.source.clinician,
    asam: PROGRAM_ASAM[s.program],
    orderAt,
    expiresAt: s.plan.expiresAt ?? orderAt + 30 * DAY,
    signed: true,
    pages: 2,
    ...s.plan,
  };
}

export function buildReferral(s: ReferralSpec, clock = 0): Referral {
  const receivedAt = clock - s.ago;
  const plan = makePlan(s, receivedAt);
  const core = {
    id: s.id,
    receivedAt,
    channel: s.channel,
    source: { name: s.source.name, kind: s.source.kind, fax: s.source.fax },
    patient: { initials: s.initials, age: s.age },
    payerId: s.payer,
    memberIdMasked: plan.memberIdMasked,
    program: s.program,
    urgency: s.urgency,
    plan,
  };
  const coverageOutcome: CoverageKind = s.payer === null ? "unconfirmed" : s.lapsed ? "lapsed" : authRequired(s.payer, s.program) ? "auth_first" : "cleared";
  let checks = evaluateChecks(core);
  for (const [key, reason] of Object.entries(s.overrides ?? {}) as [CheckKey, string][]) {
    checks = checks.map((c) => (c.key === key ? { ...c, resolved: { how: "override" as const, reason, at: receivedAt + 40 } } : c));
  }
  const decidedAt = s.decideAfter === undefined ? undefined : receivedAt + s.decideAfter;
  const owner = s.owner ?? null;
  const closed = s.status === "accepted" || s.status === "scheduled" || s.status === "admitted";

  const notes: ReferralNote[] = (s.notes ?? []).map((n, i) => ({ id: `${s.id}-n${i}`, at: clock - n.ago, by: n.by, text: n.text }));
  const ref: Referral = {
    ...core,
    status: s.status,
    owner,
    opened: s.opened ?? false,
    fields: buildFields(core),
    checks,
    coverage: s.coverageRun ? buildCoverage(core, coverageOutcome, receivedAt + 6) : null,
    coverageOutcome,
    fit: buildFit(core, s.fit),
    events: [],
    notes,
    decidedAt,
    infoAskedAt: s.infoAskedAgo === undefined ? undefined : clock - s.infoAskedAgo,
    infoRequest: s.infoAskedAgo === undefined ? undefined : { via: s.channel === "phone" || s.channel === "portal" ? "email" : s.channel, message: s.infoMessage ?? "" },
    decline: s.decline,
    accepted: closed && decidedAt !== undefined ? { program: s.program, admitBy: decidedAt + DAY, by: owner ?? "jp" } : undefined,
    intakeAt: s.status === "scheduled" && s.intakeIn !== undefined ? clock + s.intakeIn : s.status === "admitted" && s.admitAfter !== undefined ? receivedAt + s.admitAfter : undefined,
    admittedAt: s.status === "admitted" && s.admitAfter !== undefined ? receivedAt + s.admitAfter : undefined,
    requestId: s.requestId,
  };
  ref.events = buildEvents(ref, s, clock);
  return ref;
}

function buildEvents(r: Referral, s: ReferralSpec, clock: number): RequestEvent[] {
  let n = 0;
  const e = (at: number, actor: RequestEvent["actor"], text: string, done = true, detail?: string): RequestEvent => ({ id: `${r.id}#${n++}`, at, actor, text, done, detail });
  const t0 = r.receivedAt;
  const issues = r.checks.filter((c) => c.state !== "pass");
  const out: RequestEvent[] = [
    e(t0, "system", `${RECEIVED_VERB[r.channel]} ${r.source.name}`),
    e(t0 + 1, "reader", `Reader read ${r.plan.pages + 1} pages and found ${r.fields.length} fields`),
    issues.length
      ? e(t0 + 3, "reader", `Reader checked the referral against the program's requirements and found ${issues.length} ${issues.length === 1 ? "thing" : "things"} to check`, true, issues.map((c) => CHECK_PROBLEM[c.key]).join(". "))
      : e(t0 + 3, "reader", "Reader checked the referral against the program's requirements: all 9 checks passed"),
    e(t0 + 4, "placement", `Placement suggests ${PROGRAM_LABEL[r.fit.suggested]} (${r.fit.confidence}% confidence)`),
  ];
  if (r.coverage) out.push(e(t0 + 6, "verify", `Verify checked coverage: ${r.coverage.headline}`));
  if (r.owner && r.status !== "new") out.push(e(t0 + 20, "you", `Assigned to ${staffById(r.owner).name}`));
  for (const [key, reason] of Object.entries(s.overrides ?? {})) out.push(e(t0 + 41, "you", `You overrode: ${CHECK_LABEL[key as CheckKey]}`, true, reason));
  for (const note of r.notes) out.push(e(note.at, "you", `${staffById(note.by).name} added a note`, true, note.text));
  if (r.status === "awaiting_info" && r.infoAskedAt !== undefined) {
    out.push(e(r.infoAskedAt, "you", `You asked ${r.source.name} for more information by ${CHANNEL_LABEL[r.infoRequest?.via ?? "fax"].toLowerCase()}`, true, r.infoRequest?.message || undefined));
    out.push(e(clock + 90, "reader", "Reader will read the reply when it arrives", false));
  }
  if (r.decidedAt !== undefined && r.accepted) out.push(e(r.decidedAt, "you", `Accepted into ${PROGRAM_LABEL[r.accepted.program]}`));
  if (r.requestId && r.decidedAt !== undefined) out.push(e(r.decidedAt + 8, "you", `You started the authorization ${r.requestId}`));
  if (r.status === "scheduled" && r.intakeAt !== undefined) {
    out.push(e((r.decidedAt ?? t0) + 12, "you", "You scheduled the intake visit"));
    out.push(e(r.intakeAt, "you", "Intake visit", false));
  }
  if (r.status === "admitted" && r.admittedAt !== undefined) out.push(e(r.admittedAt, "you", "Marked admitted"));
  if (r.decline && r.decidedAt !== undefined) {
    out.push(e(r.decidedAt, "you", `Declined: ${DECLINE_LABEL[r.decline.reason]}`, true, r.decline.note || undefined));
    if (r.decline.courtesy) out.push(e(r.decidedAt + 2, "system", `Courtesy reply sent to ${r.source.name} by ${CHANNEL_LABEL[r.channel === "phone" || r.channel === "portal" ? "email" : r.channel].toLowerCase()}`));
  }
  return out;
}

