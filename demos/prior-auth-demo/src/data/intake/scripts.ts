import { isCoreModule } from "../assess/modules";
import { programById } from "../assess/programs";
import type { ModuleId, ProgramId } from "../assess/types";
import { CORE_BLOCKS, SUD_BLOCKS, type Block, type ScribeField, type TurnSpec } from "./scriptBlocks";
import { PROGRAM_BLOCKS } from "./scriptBlocksProgram";
import { personaFor, type Persona } from "./scriptPersonas";
import { SCRIBE_A, SCRIBE_B, SCRIBE_C, scribeGeneric } from "./scriptsFixed";
import type { ScribeScript, ScribeTurn, Speaker } from "./scriptTypes";
import type { AssessmentSectionId, IntakeRecord } from "./types";

/* Scripted conversations for the simulated AI Scribe and Voice Intake Assistant, the Voice guided assessment questions and the safety
   screening prompts. Everything here is synthetic. Nothing is recorded: the demo plays these turns as if they were heard.
   Wording is careful on purpose: what a person said is attributed to them ("mother reports"), never turned into a clinical fact. */

export * from "./scriptTypes";
export * from "./scriptsVoice";

/* ------------------------------------------------------------------ Record Intake: the interview composed for a program */

/** Suggested follow-ups for what the conversation has not yet covered. The clinician accepts or dismisses each one. */
const FOLLOW_UP: Record<string, string> = {
  "Previous withdrawal complications": "Clarify the person's history of serious withdrawal complications, such as seizures or hospital care.",
  "Details of the first withdrawal: seizures, hospital care, medications given": "Ask what happened during the first withdrawal: any seizures, any hospital care, any medication given.",
  "Relevant treatment history": "Ask what treatment the person has had before, including medications for addiction, and what helped.",
  "Medication history": "Ask for every current and recent medication and who prescribes it.",
  "Current medication list, doses and prescriber": "Confirm the list with the pharmacy or the prescriber; the person did not remember the names or doses.",
  "Discharge summary from the inpatient stay": "Request the discharge summary from the hospital. A release of information is needed.",
  "Consent to treatment (signature)": "Collect the signed consent before the visit ends.",
  "Guardian consent to treatment (signature)": "Collect the guardian's signed consent before the visit ends.",
  "School release of records (signature)": "Collect the signed school release so the school counselor can be contacted.",
  "Signed releases for the hospital and the college": "Collect signed releases before contacting the hospital team or the college.",
  "Diagnostic evaluation report": "Ask the parent for the evaluation report; it is the source for the diagnosis on file.",
};
export const followUpFor = (missing: string): string => FOLLOW_UP[missing] ?? "Ask about it before the visit ends, or add it to the plan.";

/** The id a composed interview is stored under, so a session keeps playing the same conversation if the intake is reconfigured mid-way. */
export const composedId = (programId: ProgramId, modules: ModuleId[]): string => `c:${programId}:${modules.join(",")}`;
export function parseComposedId(id: string | undefined): { programId: ProgramId; modules: ModuleId[] } | null {
  if (!id?.startsWith("c:")) return null;
  const [, programId, rest] = id.split(":");
  return programId ? { programId: programId as ProgramId, modules: (rest ? rest.split(",") : []) as ModuleId[] } : null;
}

const SECONDS = [12, 15, 11, 16, 13, 14, 17];
const keepField = (f: ScribeField, active: Set<ModuleId>): boolean =>
  f.section === "module" ? active.has(f.module) && !isCoreModule(f.module) : f.section === "cans" ? active.has("cans") : true;

/** The Record Intake interview for a program and the modules its plan uses. Pure: the same program, modules and person give the same conversation.
    Blocks are chosen by module, so adding or removing an optional module changes what the scribe listens for and where its proposals go. */
export function scriptFor(programId: ProgramId, modules: ModuleId[], who: Pick<IntakeRecord, "id" | "initials" | "age"> = { id: "IN-0000", initials: "", age: null }): ScribeScript {
  const persona: Persona = personaFor(who, programId);
  const active = new Set(modules);
  const blocks: Block[] = [...CORE_BLOCKS, ...SUD_BLOCKS, ...PROGRAM_BLOCKS].filter((b) => !b.modules || b.modules.some((m) => active.has(m))).sort((a, b) => a.order - b.order);
  const turns: ScribeTurn[] = [];
  const categories: string[] = [];
  let at = 4;
  const speakerOf = (by: TurnSpec["by"]): Speaker => {
    const child = persona.cg !== null && persona.age !== null && persona.age < 13;
    if (by === "clin") return "clinician";
    if (by === "pt") return "patient";
    if (by === "cg") return persona.cg ? "caregiver" : "patient";
    if (by === "cgPref") return persona.cg ? "caregiver" : "patient";
    return child ? "caregiver" : "patient";
  };
  for (const b of blocks) {
    const specs = b.turns(persona);
    if (!specs.length) continue;
    categories.push(b.label);
    for (const t of specs) {
      const fields = t.fields?.filter((f) => keepField(f, active));
      turns.push({ at, speaker: speakerOf(t.by), heardAs: t.heardAs, text: t.text, note: t.note, fields: fields?.length ? fields : undefined, risk: t.risk, missing: t.missing, resolves: t.resolves, block: b.label });
      at += SECONDS[turns.length % SECONDS.length];
    }
  }
  const sud = active.has("sud-history") || active.has("asam") || active.has("withdrawal");
  const minor = persona.age !== null && persona.age < 18;
  const initialMissing = [minor ? "Guardian consent to treatment (signature)" : "Consent to treatment (signature)", "Medication history", ...(sud ? ["Previous withdrawal complications", "Relevant treatment history"] : [])];
  const cg = persona.cg;
  return {
    id: composedId(programId, modules), program: programId,
    labels: { clinician: "Clinician", patient: persona.who, ...(cg ? { caregiver: cg } : {}), unknown: "Speaker not identified" },
    consenters: [`${persona.who} (patient)`, ...(cg ? [cg] : [])],
    encounterType: "Intake assessment, in person",
    others: cg ?? "None",
    initialMissing, turns, categories,
    closing: { summary: persona.core.summary, plan: persona.core.plan },
  };
}

/** The fixed scripts of the round 9 scenarios, by id, for a session already in progress. */
const FIXED: Record<string, ScribeScript> = { [SCRIBE_A.id]: SCRIBE_A, [SCRIBE_B.id]: SCRIBE_B, [SCRIBE_C.id]: SCRIBE_C };
type ScriptSource = Pick<IntakeRecord, "id" | "initials" | "age"> & { config?: Pick<NonNullable<IntakeRecord["config"]>, "programId" | "modules">; scribe?: Pick<NonNullable<IntakeRecord["scribe"]>, "scriptId" | "status"> | null };
export const activeModuleIds = (c: NonNullable<ScriptSource["config"]>): ModuleId[] => c.modules.filter((m) => m.state === "active").map((m) => m.id);

/** The conversation the scribe plays for a record. A session in progress keeps its conversation; otherwise a configured intake gets the interview for its program and
    modules, and a record that has not been configured gets the fixed scenario script (T.W. and his mother, R.H., A.K.) or a short neutral one. */
export function scribeScriptFor(r: ScriptSource, fresh = false): ScribeScript {
  const id = !fresh && r.scribe && r.scribe.status !== "consent" ? r.scribe.scriptId : undefined;
  const composed = parseComposedId(id);
  if (composed) return scriptFor(composed.programId, composed.modules, r);
  if (id && FIXED[id]) return FIXED[id];
  if (id === "scribe-generic") return scribeGeneric(r);
  if (r.config) return scriptFor(r.config.programId, activeModuleIds(r.config), r);
  if (r.id === "IN-3101") return SCRIBE_A;
  if (r.id === "IN-3102") return SCRIBE_B;
  if (r.id === "IN-3103") return SCRIBE_C;
  return scribeGeneric(r);
}

/** What the scribe will listen for, in plain words: "Substance use history, Withdrawal concerns, ..." for the consent screen and the Record Intake button. */
export function interviewTopics(r: ScriptSource): string[] {
  const s = scribeScriptFor(r, true);
  return s.categories ?? [];
}
export const programLabelOf = (r: ScriptSource): string | null => (r.config ? programById(r.config.programId).label : null);

/* ------------------------------------------------------------------ Voice guided assessment */

/** Approved questions for the Voice guided assessment mode. Safety screening is never asked by the guide: a clinician does it. */
export const GUIDED_QUESTIONS: { id: string; section: AssessmentSectionId; text: string }[] = [
  { id: "g-presenting", section: "presenting", text: "What brings you in today, in your own words?" },
  { id: "g-symptoms", section: "symptoms", text: "How have your mood, sleep and energy been over the last two weeks?" },
  { id: "g-history", section: "history", text: "Have you had times like this before? Any hospital stays for your mental health?" },
  { id: "g-functional", section: "functional", text: "How is this affecting school, work, home or relationships?" },
  { id: "g-strengths", section: "strengths", text: "What helps when things are hard? What are you good at?" },
  { id: "g-sdoh", section: "sdoh", text: "Is anything making it hard to get care, like transportation, housing, money or time off?" },
  { id: "g-prior", section: "prior", text: "Have you had counseling, therapy or other services before? What helped?" },
  { id: "g-goals", section: "goals", text: "What would you like to be different a few months from now?" },
  { id: "g-needs", section: "needs", text: "What kind of support are you hoping for?" },
];

/** Structured prompts for the safety and risk screening. The clinician records the response to each; nothing here scores or concludes. */
export const SAFETY_PROMPTS: { id: string; text: string; options: string[] }[] = [
  { id: "si", text: "Thoughts of suicide or of not wanting to be alive, now or recently", options: ["Asked: denies", "Asked: endorses", "Asked: unclear, follow up", "Not asked"] },
  { id: "plan", text: "A plan, intent or preparation", options: ["Asked: denies", "Asked: endorses", "Not applicable: no thoughts reported", "Not asked"] },
  { id: "means", text: "Access to firearms, medications or other means", options: ["Asked: no access reported", "Asked: access, safe storage discussed", "Asked: unclear, follow up", "Not asked"] },
  { id: "history", text: "Past attempts or self-harm", options: ["Asked: none reported", "Asked: reported", "Not asked"] },
  { id: "others", text: "Thoughts of harming others", options: ["Asked: denies", "Asked: endorses", "Not asked"] },
  { id: "protective", text: "Protective factors and supports", options: ["Discussed", "Not discussed"] },
  { id: "safety-plan", text: "Safety plan made or reviewed with the person", options: ["Made or reviewed today", "Not yet", "Not indicated, per clinician"] },
];
