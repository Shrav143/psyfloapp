import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, PROGRAMS, type PayerId, type Program, type RequestEvent, type Urgency } from "@/data/types";
import { authRequired, buildCoverage, buildFields, evaluateChecks, KNOWN_ICD, URGENCY_LABEL, staffById, CHANNEL_LABEL, DECLINE_LABEL, REPLY_VIA_LABEL, PROGRAM_ASAM, ACCEPTED_CREDENTIALS, CHECK_LABEL, CHECK_PROBLEM, type CheckKey, type DeclineReason, type DocPlan, type FieldKey, type Referral, type ReferralCheck, type ReplyVia, type StaffId } from "@/data/referrals";
import { plural, uid } from "@/lib/format";
import { DAY, HOUR, longDate } from "@/lib/time";

/* Pure transitions: each takes a referral and returns a new one with timeline events added.
   The slice in referrals.ts calls them and handles toasts, notifications and capacity. */

const ev = (at: number, actor: RequestEvent["actor"], text: string, detail?: string, done = true): RequestEvent => ({ id: uid("rev"), at, actor, text, done, detail });
const withEvents = (r: Referral, ...e: RequestEvent[]): Referral => ({ ...r, events: [...r.events, ...e] });
const noScheduled = (r: Referral): Referral => ({ ...r, events: r.events.filter((e) => e.done) });

export const unresolved = (r: Referral): ReferralCheck[] => r.checks.filter((c) => c.state !== "pass" && !c.resolved);

/** The question went out and the answer has not come back. A failed age check never waits: nobody can change a patient's age by replying. */
export const isWaiting = (r: Referral, c: ReferralCheck): boolean => r.status === "awaiting_info" && c.state === "warn";

export function assign(r: Referral, owner: StaffId | null, clock: number): Referral {
  const status = r.status === "new" && owner ? "in_review" : r.status;
  return withEvents({ ...r, owner, status }, ev(clock, "you", owner ? `Assigned to ${staffById(owner).name}` : "Removed the owner"));
}

export function addNote(r: Referral, by: StaffId, text: string, clock: number): Referral {
  return withEvents({ ...r, notes: [...r.notes, { id: uid("note"), at: clock, by, text }] }, ev(clock, "you", `${staffById(by).name} added a note`, text));
}

const PROGRAM_BY_LABEL = (value: string): Program | undefined => PROGRAMS.find((p) => value.startsWith(PROGRAM_LABEL[p]));

/** Saves a corrected value, keeps what Reader first read, and re-runs the checks that depend on it. */
export function editField(r: Referral, key: FieldKey, value: string, clock: number): Referral {
  const field = r.fields.find((f) => f.key === key);
  const text = value.trim();
  if (!field || !text || field.value === text) return r;
  let next: Referral = { ...r, fields: r.fields.map((f) => (f.key === key ? { ...f, value: text, edited: true, original: f.original ?? f.value } : f)) };
  if (key === "urgency") next.urgency = (Object.keys(URGENCY_LABEL) as Urgency[]).find((u) => URGENCY_LABEL[u] === text) ?? r.urgency;
  if (key === "service") next.program = PROGRAM_BY_LABEL(text) ?? r.program;
  if (key === "patient") next = { ...next, patient: { ...next.patient, initials: text } };
  if (key === "age") next = { ...next, patient: { ...next.patient, age: Number.parseInt(text, 10) || r.patient.age } };
  if (key === "insurance") {
    const payerId = PAYERS.find((p) => p.name === text)?.id ?? null;
    next = { ...next, payerId, coverage: null, coverageOutcome: payerId === null ? "unconfirmed" : authRequired(payerId, next.program) ? "auth_first" : "cleared" };
  }
  next = { ...next, checks: evaluateChecks(next, next.checks) };
  return withEvents(next, ev(clock, "you", `You corrected ${field.label}`, `Reader read "${field.original ?? field.value}". You changed it to "${text}".`));
}

export function applyCoverage(r: Referral, clock: number): Referral {
  const coverage = buildCoverage(r, r.coverageOutcome, clock);
  return withEvents({ ...r, coverage }, ev(clock, "verify", `Verify checked coverage: ${coverage.headline}`));
}

/** Findings that would stop an accept from being clean. Shown in the accept dialog. */
export function acceptWarnings(r: Referral): string[] {
  const out = unresolved(r).map((c) => `${CHECK_PROBLEM[c.key]}. ${c.detail}`);
  if (!r.coverage) out.push("Coverage has not been checked yet.");
  else if (r.coverage.kind === "lapsed" || r.coverage.kind === "unconfirmed") out.push(`${r.coverage.headline}.`);
  return out;
}

/* What cannot be accepted without: who ordered it and signed it, who the patient is, what is asked for, a diagnosis and how it is paid.
   Every other open finding is advisory. The Accept dialog lists those and the person can go ahead. */
const BLOCKING = ["age", "credentials", "signature", "diagnosis", "service", "insurance"] as const;
const BLOCKER_NAME: Record<(typeof BLOCKING)[number], string> = {
  age: "patient age",
  credentials: "clinician credentials",
  signature: "clinician signature",
  diagnosis: "diagnosis code",
  service: "level of care",
  insurance: "insurance and member ID",
};

/** Blocking findings still open, in checklist order. "Mark OK", the referrer's reply, or asking the referrer lifts one; a failed age check only "Mark OK". */
export function acceptBlockers(r: Referral): string[] {
  const open = new Set<string>(unresolved(r).filter((c) => !isWaiting(r, c)).map((c) => c.key));
  if (r.payerId === null && r.status !== "awaiting_info") open.add("insurance");
  return BLOCKING.filter((k) => open.has(k)).map((k) => BLOCKER_NAME[k]);
}

/** The line under a disabled "Accept referral". */
export const blockersLine = (names: string[]): string => `Resolve ${plural(names.length, "item")} first: ${names.join(", ")}.`;

export function accept(r: Referral, o: { owner: StaffId; program: Program; admitBy: number }, clock: number): Referral {
  const warn = unresolved(r).length;
  const base = noScheduled({ ...r, status: "accepted", owner: o.owner, decidedAt: clock, accepted: { program: o.program, admitBy: o.admitBy, by: o.owner } });
  return withEvents(base, ev(clock, "you", `Accepted into ${PROGRAM_LABEL[o.program]}`, `Target admission ${longDate(o.admitBy)}. Owner: ${staffById(o.owner).name}.${warn ? ` ${warn} ${warn === 1 ? "finding was" : "findings were"} still open.` : ""}`));
}

export function requestInfo(r: Referral, o: { via: ReplyVia; message: string }, clock: number): Referral {
  const base = noScheduled({ ...r, status: "awaiting_info", infoAskedAt: clock, infoRequest: { via: o.via, message: o.message } });
  return withEvents(base, ev(clock, "you", `You asked ${r.source.name} for more information by ${REPLY_VIA_LABEL[o.via].toLowerCase()}`, o.message), ev(clock + 90, "reader", "Reader will read the reply when it arrives", undefined, false));
}

export function decline(r: Referral, o: { reason: DeclineReason; note: string; courtesy: boolean }, clock: number): Referral {
  const base = noScheduled({ ...r, status: "declined", decidedAt: clock, decline: o });
  const via = CHANNEL_LABEL[r.channel === "phone" || r.channel === "portal" ? "email" : r.channel].toLowerCase();
  const events = [ev(clock, "you", `Declined: ${DECLINE_LABEL[o.reason]}`, o.note || undefined)];
  if (o.courtesy) events.push(ev(clock + 1, "system", `Courtesy reply sent to ${r.source.name} by ${via}`));
  return withEvents(base, ...events);
}

export function override(r: Referral, key: CheckKey, reason: string, clock: number): Referral {
  const checks = r.checks.map((c) => (c.key === key ? { ...c, resolved: { how: "override" as const, reason, at: clock } } : c));
  return withEvents({ ...r, checks }, ev(clock, "you", `You overrode: ${CHECK_LABEL[key]}`, reason));
}

export function scheduleIntake(r: Referral, at: number, clock: number): Referral {
  const base = { ...noScheduled(r), status: "scheduled" as const, intakeAt: at };
  return withEvents(base, ev(clock, "you", "You scheduled the intake visit"), ev(at, "you", "Intake visit", undefined, false));
}

export function admit(r: Referral, clock: number): Referral {
  return withEvents({ ...noScheduled(r), status: "admitted", admittedAt: clock, intakeAt: r.intakeAt ?? clock }, ev(clock, "you", "Marked admitted"));
}

export function reopen(r: Referral, clock: number): Referral {
  return withEvents({ ...r, status: "in_review", decidedAt: undefined, decline: undefined }, ev(clock, "you", "You reopened the referral"));
}

/* ------------------------------------------------------------------ the referrer's reply (demo) */
const REPLY_PAYER: { payerId: PayerId; memberIdMasked: string } = { payerId: "summit", memberIdMasked: "…4410" };

function fixPlan(p: DocPlan, program: Program, clock: number): DocPlan {
  const expired = p.expiresAt < 0;
  return {
    ...p,
    signed: true,
    orderAt: expired ? clock - 3 * HOUR : p.orderAt,
    expiresAt: expired ? clock + 30 * DAY : p.expiresAt,
    clinician: ACCEPTED_CREDENTIALS.test(p.clinician.credentials) ? p.clinician : { name: "Dr. Elena Ruiz (cosigning)", credentials: "MD, Psychiatry", npi: "1990011190" },
    dx: p.dx.length ? p.dx.map((d) => (d.code in KNOWN_ICD ? d : { code: `${d.code}0`, label: KNOWN_ICD[`${d.code}0`] ?? d.label })) : [{ code: "F10.20", label: KNOWN_ICD["F10.20"] }],
    reason: p.reason || "Reason for referral added on the corrected form.",
    substances: p.substances || "Substance use history added on the corrected form.",
    meds: p.meds.length ? p.meds : ["None reported"],
    risk: p.risk || "No thoughts of self-harm. Risk screening completed on the corrected form.",
    asam: PROGRAM_ASAM[program],
    phone: p.phone || "(804) 555-0188",
    altContact: p.altContact || "Family member, (804) 555-0189",
  };
}

/** Demo control: the referrer answers. Fixable findings flip to pass, and an insurance card arrives if there was none. Returns the new referral and how many were fixed. */
export function simulateReply(r: Referral, clock: number): { next: Referral; fixed: number } {
  const before = unresolved(r).filter((c) => c.state === "warn").map((c) => c.key);
  const noInsurance = r.payerId === null;
  const plan: DocPlan = { ...fixPlan(r.plan, r.program, clock), ...(noInsurance ? REPLY_PAYER : {}) };
  const core: Referral = noInsurance
    ? { ...r, plan, ...REPLY_PAYER, coverage: null, coverageOutcome: authRequired(REPLY_PAYER.payerId, r.program) ? "auth_first" : "cleared" }
    : { ...r, plan };
  const rechecked = evaluateChecks(core, r.checks).map((c) => (before.includes(c.key) && c.state === "pass" ? { ...c, resolved: { how: "reply" as const, at: clock } } : c));
  const fixed = rechecked.filter((c) => c.resolved?.how === "reply").length;
  const next: Referral = { ...noScheduled(core), status: "in_review", plan, checks: rechecked, fields: buildFields(core, r.fields) };
  const passed = rechecked.filter((c) => c.state === "pass" || c.resolved).length;
  return {
    fixed,
    next: withEvents(next, ev(clock, "system", `Reply received from ${r.source.name} by ${REPLY_VIA_LABEL[r.infoRequest?.via ?? "fax"].toLowerCase()}`), ev(clock + 1, "reader", `Reader read the reply and updated the extracted fields`), ev(clock + 2, "reader", `Validation ran again: ${fixed} ${fixed === 1 ? "finding" : "findings"} resolved, ${passed} of ${rechecked.length} checks passed`)),
  };
}

/* ------------------------------------------------------------------ message to the referrer */
/** What can be asked of the referrer: any of the nine checks, plus the insurance, which is not one of them. */
export type AskKey = CheckKey | "insurance";

/** What is still missing and the referrer can supply. A failed age check is left out: nobody can change a patient's age by replying. */
export const askable = (r: Referral): AskKey[] => [...unresolved(r).filter((c) => c.state !== "fail").map((c) => c.key), ...(r.payerId === null ? (["insurance"] as const) : [])];

const detailOf = (r: Referral, key: CheckKey): string => r.checks.find((c) => c.key === key)?.detail ?? "";
const NEED: Record<AskKey, (r: Referral) => string> = {
  signature: () => "A signed copy of the referral from the ordering clinician",
  expiry: (r) => `A current order. The one on file expired on ${longDate(r.plan.expiresAt)}`,
  credentials: () => "The ordering clinician's credentials, or a cosignature from an MD, DO, NP, PA, PhD or LCSW",
  components: (r) => `The missing parts of the form (${detailOf(r, "components").replace(/^Missing: /, "").replace(/\.$/, "")})`,
  diagnosis: () => "The diagnosis with its full ICD-10 code",
  service: (r) => `Confirmation of the level of care: ${PROGRAM_LABEL[r.program]} delivers ASAM level ${PROGRAM_ASAM[r.program]}`,
  urgent: () => "A risk screening that supports the urgent priority",
  age: () => "Confirmation of the patient's age",
  contact: () => "A phone number or another way to reach the patient",
  insurance: () => "The patient's insurance and member ID, or a copy of the insurance card",
};

export function composeRequest(r: Referral, keys: AskKey[], via: ReplyVia): string {
  const lines = keys.map((k, i) => `${i + 1}. ${NEED[k](r)}`);
  const list = lines.length ? lines.join("\n") : "1. Anything you can add that supports the request";
  return `Hello,\n\nThank you for referring ${r.patient.initials} (${r.patient.age}). To finish our review we still need:\n\n${list}\n\nPlease reply by ${REPLY_VIA_LABEL[via].toLowerCase()} and Reader will pick it up as soon as it arrives.\n\nAdmissions team`;
}
