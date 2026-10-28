import type { DocBlock } from "@/components/ui/DocumentSheet";
import { FIELD_SPECS } from "@/data/intake/fields";
import { scribeScriptFor, type ScribeScript, type Speaker } from "@/data/intake/scripts";
import type { ScribeField } from "@/data/intake/scriptBlocks";
import { NOTE_SECTIONS, ROLE_AGENT, SECTION_LABEL, type IntakeDocument, type IntakeRecord, type NoteSectionId, type ScribeSession, type SourceRef, type Suggestion } from "@/data/intake/types";
import { fieldLabelOf, moduleLabelOf, resolveField } from "./route";

/* The simulated scribe, as pure functions the store calls. A 250 ms tick moves the conversation 3 seconds, so a scripted turn every
   12 to 18 seconds of conversation arrives every 1 to 1.5 seconds on screen. The Clinical Documentation Agent's output stays inside the
   session (note sections and field suggestions) until a person reviews it and saves. */

export const TICK_MS = 250;
export const SECONDS_PER_TICK = 3;
export const SCRIBE_AGENT = ROLE_AGENT.documentation;
export const TRANSCRIPT_REF = "AI Scribe transcript";
/** The agent task that writes the summary, questions and plan after Stop. */
export const FINISH_ACTION = "Prepare the draft intake note";

/** "04:12" */
export const clockOf = (sec: number): string => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** The interview the scribe plays for a record. A session keeps its own conversation; `fresh` asks for the one the intake's current configuration calls for. */
export const scriptOf = (r: IntakeRecord, fresh = false): ScribeScript => scribeScriptFor(r, fresh);
export const speakerLabel = (script: ScribeScript, sp: Speaker): string => script.labels[sp] ?? (sp === "unknown" ? "Speaker not identified" : sp[0].toUpperCase() + sp.slice(1));
/** Script index of a played turn ("scribe-a:4" is the fifth turn). */
export const turnIndex = (turnId: string): number => Number(turnId.split(":")[1] ?? -1);

const fieldOf = (f: ScribeField): string | null => (f.section === "module" ? null : f.section === "cans" ? `evidence:${f.theme}` : f.field);
/** "Patient profile · Transportation barriers" for an extracted suggestion; a module proposal reads "Withdrawal & medical risk · Prior withdrawal history". */
export function extractLabel(r: IntakeRecord, sg: Suggestion): string {
  if (sg.moduleId) return fieldLabelOf(sg.moduleId, sg.field);
  if (sg.section === "assessment" && sg.field === "safety") return "Safety and risk screening";
  if (sg.section === "cans") return `Evidence theme: ${sg.field.replace(/^evidence:/, "")}`;
  const hit = scriptOf(r).turns.flatMap((t) => t.fields ?? []).find((f) => f.section === sg.section && fieldOf(f) === sg.field);
  return hit?.label ?? FIELD_SPECS.find((f) => f.key === sg.field)?.label ?? sg.field;
}
/** Where a proposal goes, in words: the module and field, or the section of the record. */
export function destinationOf(r: IntakeRecord, sg: Suggestion): string {
  if (sg.moduleId) return `${moduleLabelOf(sg.moduleId)} › ${fieldLabelOf(sg.moduleId, sg.field)}`;
  if (sg.section === "cans") return "CANS evidence";
  return `${SECTION_LABEL[sg.section]} · ${extractLabel(r, sg)}`;
}

export function newScribeSession(r: IntakeRecord, n: number): ScribeSession {
  return { id: `SC-${r.id.slice(3)}-${n}`, status: "consent", elapsed: 0, turns: [], scriptId: scriptOf(r, true).id, cursor: 0, noteDraft: {}, simulated: true, noteStatus: {}, extracted: [], missing: [] };
}

const excerpt = (t: string) => (t.length > 110 ? `${t.slice(0, 107).trimEnd()}...` : t);
const add = (prev: string | undefined, text: string) => (prev ? `${prev} ${text}` : text);

export interface Played {
  session: ScribeSession;
  /** Risk statements that need a safety alert for a clinician. */
  alerts: { text: string; source: SourceRef }[];
}

/** Plays every scripted turn due by `elapsed`. When the agent is paused, the transcript still arrives but nothing is drafted. */
export function playDue(r: IntakeRecord, s: ScribeSession, elapsed: number, o: { clock: number; agentPaused: boolean; uid: (p: string) => string }): Played {
  const script = scriptOf(r);
  let next: ScribeSession = { ...s, elapsed };
  const alerts: Played["alerts"] = [];
  while (next.cursor < script.turns.length && script.turns[next.cursor].at <= elapsed) {
    const i = next.cursor;
    const t = script.turns[i];
    const turnId = `${script.id}:${i}`;
    const source = (quote: string): SourceRef => ({ kind: "transcript", ref: TRANSCRIPT_REF, quote: excerpt(quote), at: t.at, blockId: turnId });
    next = { ...next, cursor: i + 1, turns: [...next.turns, { id: turnId, at: t.at, speaker: t.heardAs ?? t.speaker, text: t.text }] };
    if (o.agentPaused) continue;
    const draft = { ...next.noteDraft };
    const status = { ...(next.noteStatus ?? {}) };
    for (const [sec, text] of Object.entries(t.note ?? {}) as [NoteSectionId, string][]) {
      draft[sec] = add(draft[sec], text);
      status[sec] = "pending";
    }
    let extracted = [...(next.extracted ?? [])];
    for (const f of t.fields ?? []) {
      if (f.section === "module") {
        /* Evidence for an assessment module: the field is found in the module's form now, and a second statement for the same field is added to the first. */
        const at = resolveField(f.module, f.words, f.keys);
        if (!at) continue;
        const prior = extracted.find((x) => x.moduleId === f.module && x.field === at.key && x.status === "pending");
        const sg: Suggestion = prior
          ? { ...prior, value: prior.value.includes(f.value) ? prior.value : `${prior.value} ${f.value}`, confidence: prior.confidence === "high" && f.confidence === "high" ? "high" : f.confidence === "low" ? "low" : prior.confidence }
          : { id: o.uid("sg"), section: "assessment", field: at.key, moduleId: f.module, value: f.value, source: source(t.text), confidence: f.confidence, agent: SCRIBE_AGENT, at: o.clock, status: "pending" };
        extracted = [...extracted.filter((x) => x !== prior), sg];
      } else if (f.section === "cans") {
        if (extracted.some((x) => x.section === "cans" && x.value === f.value)) continue;
        extracted = [...extracted, { id: o.uid("sg"), section: "cans", field: `evidence:${f.theme}`, value: f.value, source: source(t.text), confidence: f.confidence, agent: SCRIBE_AGENT, at: o.clock, status: "pending" }];
      } else {
        const sg: Suggestion = { id: o.uid("sg"), section: f.section, field: f.field, value: f.value, source: source(t.text), confidence: f.confidence, agent: SCRIBE_AGENT, at: o.clock, status: "pending" };
        extracted = [...extracted.filter((x) => !(x.section === f.section && x.field === f.field && !x.moduleId && x.status === "pending")), sg];
      }
    }
    if (t.risk) {
      draft.risk = add(draft.risk, t.risk.text);
      status.risk = "pending";
      /* Risk is one suggestion for the safety section, which a clinician documents. Each new statement is added to it. */
      const prior = extracted.find((x) => x.section === "assessment" && x.field === "safety" && x.status === "pending");
      const value = add(prior?.value, t.risk.text);
      extracted = [...extracted.filter((x) => x !== prior), { id: prior?.id ?? o.uid("sg"), section: "assessment", field: "safety", value, source: prior?.source ?? source(t.text), confidence: "medium", agent: SCRIBE_AGENT, at: o.clock, status: "pending" }];
      if (t.risk.alert) alerts.push({ text: t.risk.text, source: source(t.text) });
    }
    const missing = [...(next.missing ?? []).filter((m) => !(t.resolves ?? []).includes(m)), ...(t.missing ?? []).filter((m) => !(next.missing ?? []).includes(m))];
    next = { ...next, noteDraft: draft, noteStatus: status, extracted, missing };
  }
  return { session: next, alerts };
}

/** Plays the whole remaining script at once (the demo's Skip ahead). */
export const lastAt = (r: IntakeRecord): number => {
  const t = scriptOf(r).turns;
  return t[t.length - 1]?.at ?? 0;
};
export const scriptDone = (r: IntakeRecord, s: ScribeSession): boolean => s.cursor >= scriptOf(r).turns.length;

/** After Stop, the agent writes the summary, the outstanding questions (what is missing) and the plan. Every section with text waits for review. */
export function finishDraft(r: IntakeRecord, s: ScribeSession): ScribeSession {
  const script = scriptOf(r);
  const draft = { ...s.noteDraft };
  if (s.turns.length) {
    draft.summary = script.closing.summary;
    draft.plan = add(draft.plan, script.closing.plan);
  }
  if ((s.missing ?? []).length) draft.questions = (s.missing ?? []).join("\n");
  const noteStatus: ScribeSession["noteStatus"] = {};
  for (const n of NOTE_SECTIONS) if (draft[n.id]) noteStatus[n.id] = s.noteStatus?.[n.id] && s.noteStatus[n.id] !== "pending" ? s.noteStatus[n.id] : "pending";
  return { ...s, noteDraft: draft, noteStatus, status: "reviewing" };
}

export const notesAccepted = (s: ScribeSession) => NOTE_SECTIONS.filter((n) => s.noteDraft[n.id] && (s.noteStatus?.[n.id] === "accepted" || s.noteStatus?.[n.id] === "edited"));
export const fieldsAccepted = (s: ScribeSession) => (s.extracted ?? []).filter((x) => x.status === "accepted" || x.status === "edited");

const meta = (r: IntakeRecord, s: ScribeSession, script: ScribeScript): DocBlock => ({
  kind: "meta",
  items: [
    ["Patient", `${r.initials || "Not entered"}${r.age !== null ? `, ${r.age}` : ""}`],
    ["Encounter", s.encounter?.type ?? script.encounterType],
    ["Clinician", s.encounter?.clinician ?? "Not entered"],
    ["Recording consent", s.consent ? `${s.consent.by}, ${s.consent.method}` : "Not recorded"],
  ],
});

/** The transcript as a record document, so every field it fed links back to the exact turn. */
export function transcriptDoc(r: IntakeRecord, s: ScribeSession, at: number): IntakeDocument {
  const script = scriptOf(r);
  return {
    id: `doc-${s.id}-transcript`, name: `AI Scribe transcript ${s.id} (simulated)`, kind: "other", receivedAt: at, simulated: true,
    pages: [[
      { kind: "letterhead", org: "Psyflo AI Scribe", sub: "Simulated transcript. Nothing was recorded; the demo played a scripted conversation." },
      meta(r, s, script),
      ...s.turns.map((t): DocBlock => ({ kind: "p", id: t.id, text: `[${clockOf(t.at)}] ${speakerLabel(script, t.speaker)}: ${t.text}` })),
    ]],
  };
}

/** The note sections a person accepted, as a record document. */
export function noteDoc(r: IntakeRecord, s: ScribeSession, at: number, reviewer: string): IntakeDocument | null {
  const keep = notesAccepted(s);
  if (!keep.length) return null;
  return {
    id: `doc-${s.id}-note`, name: `Encounter note from the AI Scribe ${s.id}`, kind: "other", receivedAt: at, simulated: true,
    pages: [[
      { kind: "letterhead", org: "Psyflo AI Scribe", sub: `AI-generated draft, reviewed and accepted by ${reviewer}` },
      meta(r, s, scriptOf(r)),
      ...keep.flatMap((n): DocBlock[] => [{ kind: "h", text: n.label }, { kind: "p", id: `note-${n.id}`, text: s.noteDraft[n.id] ?? "" }]),
    ]],
  };
}

/* ------------------------------------------------------------------ what the scribe has heard, and how the review lists it */

export interface Topic { label: string; covered: boolean }
/** The topics of this interview, and which of them have come up so far ("Detected documentation"). */
export function detectedTopics(r: IntakeRecord, s: ScribeSession): Topic[] {
  const script = scriptOf(r);
  const heard = new Set(script.turns.slice(0, s.cursor).map((t) => t.block));
  return (script.categories ?? []).map((label) => ({ label, covered: heard.has(label) }));
}

/** A proposal's source is verified when it quotes the transcript turn it cites, that turn has not been edited, its speaker label is not in doubt, the confidence is
    not low and it is not risk text. It means the person can check it against the transcript at a glance; it is never a decision. */
export function isVerifiedSource(r: IntakeRecord, s: ScribeSession, sg: Suggestion): boolean {
  if (sg.section === "assessment" && sg.field === "safety") return false;
  if (sg.confidence === "low") return false;
  const turn = s.turns.find((t) => t.id === sg.source.blockId);
  if (!turn || turn.edited || !sg.source.quote) return false;
  const quote = sg.source.quote;
  const quoted = quote.endsWith("...") ? turn.text.startsWith(quote.slice(0, -3)) : turn.text.includes(quote);
  const heard = scriptOf(r).turns[turnIndex(turn.id)]?.heardAs;
  return quoted && !(heard !== undefined && turn.speaker === heard);
}
export const isRiskProposal = (sg: Suggestion): boolean => sg.section === "assessment" && sg.field === "safety" && !sg.moduleId;

export interface ReviewGroup {
  id: string;
  title: string;
  /** "risk" holds statements a clinician reviews; nothing in it can be accepted from the review. */
  kind: "risk" | "module" | "record" | "cans";
  items: Suggestion[];
}
/** The proposals of a session grouped for review: risk first, then one group per assessment module, the CANS evidence, and the shared sections of the record. */
export function reviewGroups(s: ScribeSession): ReviewGroup[] {
  const all = s.extracted ?? [];
  const groups: ReviewGroup[] = [];
  const risk = all.filter(isRiskProposal);
  if (risk.length) groups.push({ id: "risk", title: "Risk information for a clinician", kind: "risk", items: risk });
  const mods = [...new Set(all.flatMap((x) => (x.moduleId ? [x.moduleId] : [])))];
  for (const m of mods) groups.push({ id: `m:${m}`, title: moduleLabelOf(m), kind: "module", items: all.filter((x) => x.moduleId === m) });
  const cans = all.filter((x) => x.section === "cans");
  if (cans.length) groups.push({ id: "cans", title: "CANS evidence themes", kind: "cans", items: cans });
  for (const sec of ["referral", "profile", "coverage", "assessment"] as const) {
    const items = all.filter((x) => x.section === sec && !x.moduleId && !isRiskProposal(x));
    if (items.length) groups.push({ id: sec, title: sec === "assessment" ? "Clinical assessment" : SECTION_LABEL[sec], kind: "record", items });
  }
  return groups;
}
