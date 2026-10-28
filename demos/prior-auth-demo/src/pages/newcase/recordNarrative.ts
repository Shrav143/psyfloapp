/* The medical-necessity summary of a request that comes from an intake record, drafted only from that record. Nothing here is made up and nothing is judged: the draft arranges what the record documents
   (the referral, the signed clinical assessment, the signed assessment modules, the approved care plan, in the clinician's own words) and puts each part under the module or document it was read from, as a link into the workspace.
   What the record does not document says "Not documented in the intake". It never names a score, a level of care or a criterion the record does not hold, and it never says the record supports a service: the clinician selected the service and writes the rationale.
   It is an AI suggested draft (simulated); a person edits it and a clinician signs it. Pure. */
import { isModuleSigned, selectedServiceOf, serviceName } from "@/data/assess/carePlan";
import { moduleById, schemaOf } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { CaseDraft, NarrativeRef, NarrativeSection } from "@/data/cases";
import { staffOf } from "@/data/intake/seed";
import { ASSESSMENT_SECTIONS, type IntakeRecord } from "@/data/intake/types";
import { paths } from "@/routes";

/** What a part of the draft says when the record holds nothing for it. */
export const NOT_DOCUMENTED = "Not documented in the intake";
/** The tag every record-based summary carries, on screen and in the request's history. */
export const AI_DRAFT_TAG = "AI suggested draft, simulated";

const who = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a clinician");
const sentence = (s: string): string => {
  const t = s.trim().replace(/\s+/g, " ");
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
const ref = (record: IntakeRecord, label: string, section: string): NarrativeRef => ({ label, to: paths.intakeRecord(record.id, section) });
const gap = (what: string): string => `${what}: ${NOT_DOCUMENTED}.`;
const section = (id: string, heading: string, text: string, refs: NarrativeRef[]): NarrativeSection => ({ id, heading, text, sources: [], refs });

/** The referral's own statements. A referral is the referrer's account, so every line says so. */
function referralSection(r: IntakeRecord): NarrativeSection {
  const f = r.referral;
  const lines = [
    f.reason?.value && `Reason for referral: ${f.reason.value}`,
    f.concerns?.value && `Concerns listed: ${f.concerns.value}`,
    f.hospitalization?.value && `Recent care: ${f.hospitalization.value}`,
    f.previousServices?.value && `Earlier services: ${f.previousServices.value}`,
  ].filter((x): x is string => !!x);
  const text = lines.length ? lines.map(sentence).join(" ") : gap("Referral");
  return section("referral", "Referral, as the referrer wrote it", text, [ref(r, "Referral", "referral")]);
}

/** The diagnosis as the record documents it: the referral's line, else the codes the record names, else nothing. */
function diagnosisSection(r: IntakeRecord, d: CaseDraft): NarrativeSection {
  const documented = r.referral.dxDocumented?.value;
  const codes = d.diagnoses.map((x) => x.code).join(", ");
  const text = documented ? `Diagnosis as documented in the referral: ${sentence(documented)}` : codes ? `Codes the record names: ${codes}. No diagnosis line is documented in the referral.` : gap("Diagnosis");
  return section("diagnosis", "Diagnosis", text, [ref(r, "Referral", "referral")]);
}

/** The signed clinical assessment, field by field. An assessment that is not signed is not used. */
function assessmentSection(r: IntakeRecord): NarrativeSection {
  const a = r.assessment;
  const link = ref(r, a.status === "signed" ? `Clinical assessment, signed by ${who(a.attestation?.by)}` : "Clinical assessment", "clinical");
  if (a.status !== "signed") return section("assessment", "Clinical assessment", "The clinical assessment is not signed, so none of it is used here.", [link]);
  const lines = ASSESSMENT_SECTIONS.filter((s) => ["presenting", "symptoms", "history", "functional", "safety", "sdoh", "prior"].includes(s.id))
    .map((s) => ({ label: s.label, value: a.fields[s.id]?.value?.trim() ?? "" }))
    .filter((l) => l.value);
  return section("assessment", "Clinical assessment", lines.length ? lines.map((l) => sentence(`${l.label}: ${l.value}`)).join(" ") : gap("Clinical assessment"), [link]);
}

/** One signed module: the documented fields in its own words, the result a clinician typed (when one was), and the level of care a clinician confirmed (when one was). Null when it documents nothing. */
function moduleSection(r: IntakeRecord, id: ModuleId): NarrativeSection | null {
  const inst = r.instruments?.[id];
  if (!inst || !isModuleSigned(r, id)) return null;
  const labels = new Map(schemaOf(id).sections.flatMap((s) => s.fields).map((f) => [f.key, f.label] as const));
  const lines = Object.entries(inst.fields)
    .filter(([, v]) => v.value.trim() && v.state !== "not_applicable")
    .map(([k, v]) => sentence(`${labels.get(k) ?? k}: ${v.value}`));
  if (inst.score?.value) lines.push(sentence(`Result entered by the clinician: ${inst.score.value}`));
  if (inst.loc?.confirmed) lines.push(sentence(`Level of care confirmed by the clinician: ${inst.loc.confirmed}`));
  if (!lines.length) return null;
  const def = moduleById(id);
  return section(`module:${id}`, def.label, lines.join(" "), [ref(r, `${def.label}, signed by ${who(inst.signedBy)}`, `m:${id}`)]);
}

/** The approved care plan, in the clinician's words. A draft plan is not used. */
function planSection(r: IntakeRecord): NarrativeSection {
  const c = r.carePlan;
  const link = ref(r, c?.status === "approved" ? `Care plan version ${c.version ?? 1}, approved by ${who(c.approvedBy)}` : "Care plan", "care");
  if (!c || c.status !== "approved") return section("plan", "Care plan", "The care plan is not approved by a clinician, so it is not used here.", [link]);
  const sel = selectedServiceOf(r);
  const goals = c.goals.map((g) => g.text.trim()).filter(Boolean);
  const lines = [
    sel ? `Service selected by ${who(c.selectedBy)}: ${serviceName(sel)}.` : "No service is selected in the care plan.",
    c.rationale.trim() ? sentence(`Rationale, as the clinician wrote it: ${c.rationale}`) : gap("Rationale"),
    goals.length ? sentence(`Goals, as written: ${goals.map((g, i) => `${i + 1}. ${g.replace(/[.!?]$/, "")}`).join("; ")}`) : gap("Goals"),
    c.interventions.trim() ? sentence(`Planned interventions, as written: ${c.interventions}`) : gap("Planned interventions"),
    c.frequency.trim() ? sentence(`Frequency, as the clinician typed it: ${c.frequency}`) : gap("Frequency"),
    c.duration?.trim() ? sentence(`Duration, as the clinician typed it: ${c.duration}`) : gap("Duration"),
    c.transition?.trim() ? sentence(`Transition plan: ${c.transition}`) : "",
    c.coordination.trim() ? sentence(`Care coordination: ${c.coordination}`) : "",
  ].filter(Boolean);
  return section("plan", "Care plan", lines.join(" "), [link]);
}

/** What a request that follows an earlier authorization rests on: the authorization on file (the demo episode's own counts), the change asked for and the dates, as the person entered them here. No progress is claimed: the record says what it says. */
function basisSection(r: IntakeRecord, d: CaseDraft): NarrativeSection | null {
  const mdy = (iso: string | null | undefined): string => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : "");
  const b = d.basis;
  const used = b && b.authorized !== null && b.used !== null ? `${b.used} of ${b.authorized} ${b.unit} of the current authorization are recorded as used${b.from && b.to ? ` (window ${mdy(b.from)} to ${mdy(b.to)})` : ""}.` : "";
  const entered: NarrativeRef = { label: "Entered in New Authorization" };
  const onFile: NarrativeRef = { label: "Authorization on file (demo episode data)" };
  switch (d.kind) {
    case "concurrent":
      return section("basis", "Progress since the last review", [used, gap("Progress since the last review")].filter(Boolean).join(" "), used ? [onFile, ref(r, "Clinical assessment", "clinical")] : [ref(r, "Clinical assessment", "clinical")]);
    case "reauth":
      return section("basis", "Progress since the authorization began", [used, gap("Progress since the authorization began")].filter(Boolean).join(" "), used ? [onFile, ref(r, "Clinical assessment", "clinical")] : [ref(r, "Clinical assessment", "clinical")]);
    case "modify": {
      const c = d.change;
      return section("basis", "What changes and why", [c ? `The request is for ${c.kind.replace(/_/g, " ")}${c.amount ? `: ${c.amount} more` : ""}.` : "", c?.detail.trim() ? sentence(c.detail) : "The reason for the change has not been entered yet.", used].filter(Boolean).join(" "), [entered]);
    }
    case "retro":
      return section("basis", "Dates of service and why no authorization was in place", [d.startDate ? `Care was given from ${mdy(d.startDate)}${d.endDate ? ` to ${mdy(d.endDate)}` : ""}.` : "The dates of service have not been entered yet.", d.retroReason?.trim() ? sentence(d.retroReason) : "The reason an authorization was not in place has not been entered yet."].join(" "), [entered]);
    default:
      return null;
  }
}

/** What the person answered when an agent asked (a person's own statement, not the record's). */
function answersSection(d: CaseDraft): NarrativeSection | null {
  const lines = d.answers.filter((a) => !a.fromCase).map((a) => sentence(`${a.question} Answered here: ${a.answer}${a.note ? ` (${a.note})` : ""}`));
  const note = d.sendBackNote ? [sentence(`Reviewer's note, addressed: ${d.sendBackNote}`)] : [];
  return lines.length || note.length ? section("answers", "Answers added in New Authorization", [...lines, ...note].join(" "), [{ label: "Entered in New Authorization" }]) : null;
}

/** The record's own summary of a request: sections in reading order, each with the module or document it was read from. */
export function recordNarrative(d: CaseDraft, r: IntakeRecord): NarrativeSection[] {
  const ids = Object.keys(r.instruments ?? {}) as ModuleId[];
  const modules = ids.map((id) => moduleSection(r, id)).filter((x): x is NarrativeSection => !!x);
  const unsigned = ids.filter((id) => r.instruments?.[id]?.status !== "signed" && r.instruments?.[id]?.status !== "not_started" && r.config?.modules.find((m) => m.id === id)?.state !== "off").map((id) => moduleById(id).label);
  const scored = ids.some((id) => isModuleSigned(r, id) && r.instruments?.[id]?.score?.value);
  const basis = basisSection(r, d);
  const answers = answersSection(d);
  return [
    referralSection(r),
    diagnosisSection(r, d),
    ...(basis ? [basis] : []),
    assessmentSection(r),
    ...modules,
    ...(scored ? [] : [section("screeners", "Screener results", gap("Results of screening instruments entered by a clinician"), [ref(r, "Assessment instruments", "overview")])]),
    ...(unsigned.length ? [section("unsigned", "Not used because not signed", `${unsigned.join(", ")}.`, [ref(r, "Review & sign-off", "signoff")])] : []),
    planSection(r),
    ...(answers ? [answers] : []),
  ];
}

/** Whether a section names where it came from: a module or document of the record, or the person's entry, or says nothing is documented. The check "each section names its source" reads this. */
export const namesItsSource = (s: NarrativeSection): boolean => (s.refs?.length ?? 0) > 0 || s.text.includes(NOT_DOCUMENTED);
