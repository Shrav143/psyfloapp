import type { DocBlock } from "@/components/ui/DocumentSheet";
import { FIELD_SPECS, isRequired } from "@/data/intake/fields";
import { UNSAFE, VOICE_ESCALATION, voiceScriptFor, type Extract, type VoiceOption, type VoiceScript, type VoiceStep } from "@/data/intake/scripts";
import { ROLE_AGENT, type IntakeDocument, type IntakeRecord, type Suggestion, type VoiceSession } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";

/* The simulated Voice Intake Assistant, as pure functions the store calls. One question at a time: the assistant speaks (phase
   "assistant"), then waits for the caller (phase "caller"). It skips what the record already has, asks a clarifying question when an
   answer is vague, asks for missing required items before the read-back, and stops and hands off to a person on any safety concern.
   What it collects stays in the session until the coordinator saves a draft for staff review. */

export const VOICE_AGENT = ROLE_AGENT.documentation;
export const CALL_REF = "Voice intake call";
/** Call time runs at 4 simulated seconds per real second. */
export const CALL_SECONDS_PER_TICK = 1;
export const CALL_TICK_MS = 250;

export const scriptOf = (r: IntakeRecord): VoiceScript => voiceScriptFor(r, r.voice?.scriptId);
const ACTIVE: VoiceSession["status"][] = ["identity", "language", "role", "consent", "questions", "summary"];
export const callActive = (v: VoiceSession | null | undefined): boolean => !!v && ACTIVE.includes(v.status) && v.phase !== "done";
export const STATUS_LABEL: Record<VoiceSession["status"], string> = {
  idle: "Not started", identity: "Confirming identity", language: "Language", role: "Explaining its role", consent: "Consent", questions: "Intake questions",
  summary: "Read-back", confirm: "Coordinator confirms", saved: "Draft saved for staff review", escalated: "Escalated to a person", transferred: "Transferred to staff",
};

export function newVoiceSession(r: IntakeRecord, n: number): VoiceSession {
  return { id: `VS-${r.id.slice(3)}-${n}`, status: "idle", language: "English", turns: [], asked: [], scriptId: scriptOf(r).id, cursor: 0, simulated: true, collected: [], confirmed: [], corrected: [], skipped: [], elapsed: 0 };
}

const valueIn = (r: IntakeRecord, section: Extract["section"], field: string): string =>
  (section === "assessment" ? r.assessment.fields[field]?.value : r[section][field]?.value) ?? "";
/** The record already has this field (so the assistant does not ask again). */
export const onRecord = (r: IntakeRecord, section: Extract["section"], field: string): boolean => !!valueIn(r, section, field).trim();
const collectedHas = (v: VoiceSession, section: string, field: string) => (v.collected ?? []).some((c) => c.section === section && c.field === field);

const fill = (t: string, coordinator: string) => t.replace(/\{coordinator\}/g, coordinator);
const statusOfKind = (k: VoiceStep["kind"]): VoiceSession["status"] => (k === "question" ? "questions" : k);

/** The next step after `fromId`: on-file questions are skipped (and tracked), missing-data prompts only when the field is still missing. */
export function advance(r: IntakeRecord, v: VoiceSession, fromId: string): VoiceSession {
  const steps = scriptOf(r).steps;
  let asked = [...v.asked];
  let skipped = [...(v.skipped ?? [])];
  for (let i = steps.findIndex((s) => s.id === fromId) + 1; i < steps.length; i++) {
    const st = steps[i];
    if (asked.includes(st.id)) continue;
    const has = st.onFile ? onRecord(r, st.onFile.section, st.onFile.field) : false;
    if (has) {
      asked = [...asked, st.id];
      skipped = [...skipped, st.id];
      continue;
    }
    if (st.missingOnly && st.onFile && collectedHas(v, st.onFile.section, st.onFile.field)) continue;
    return { ...v, asked, skipped, step: st.id, phase: "assistant", clarifying: false };
  }
  return { ...v, asked, skipped, step: "summary", phase: "assistant", clarifying: false };
}

/** The read-back covers the facts a caller can check by ear, said the way a person would say them, not read like a form. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const plain = (v: string) => v.replace(/\s*\([^)]*\)\.?$/, "").replace(/\.$/, "").replace(/;/g, ",");
const lower = (v: string) => (v ? v[0].toLowerCase() + v.slice(1) : v);
const READ_BACK: [field: string, say: (v: string) => string][] = [
  ["preferredName", (v) => `you go by ${plain(v)}`],
  ["dob", (v) => {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return iso ? `you were born ${MONTHS[+iso[2] - 1]} ${+iso[3]}, ${iso[1]}` : `date of birth ${plain(v)}`;
  }],
  ["reason", (v) => `you're looking for ${lower(plain(v).replace(/^(Asks for|Parent asks for)\s*/i, ""))}`],
  ["medicaidId", (v) => `your Medicaid ID ends in ${v.replace(/\D/g, "") || plain(v)}`],
  ["preferences", (v) => `for visits you prefer ${lower(plain(v))}`],
  ["commPrefs", (v) => `to reach you: ${lower(plain(v))}`],
  ["emergencyContact", (v) => `your emergency contact is ${lower(plain(v))}`],
];
const sayCollected = (cs: Suggestion[]): { line: string; used: number } => {
  const parts = READ_BACK.flatMap(([f, say]) => cs.filter((c) => c.field === f).map((c) => say(c.value)));
  return { line: parts.join("; "), used: parts.length };
};

/** The field label for a collected item, as the script names it. */
export const labelOfCollected = (r: IntakeRecord) => (c: Suggestion): string => {
  for (const st of scriptOf(r).steps) {
    const hit = [...st.extract, ...(st.options ?? []).flatMap((o) => o.extract ?? [])].find((x) => x.section === c.section && x.field === c.field);
    if (hit) return hit.label;
  }
  return FIELD_SPECS.find((f) => f.key === c.field)?.label ?? c.field;
};

/** Required intake items still missing after what is on file and what the call collected. */
export function missingRequired(r: IntakeRecord, v: VoiceSession): { field: string; section: string; label: string; how: "asks" | "staff" | "not_asked" }[] {
  const ctx = { age: r.age, schoolBased: serviceById(r.serviceId).setting === "school" };
  const script = scriptOf(r);
  return FIELD_SPECS.filter((f) => isRequired(f, ctx) && !onRecord(r, f.section, f.key) && !collectedHas(v, f.section, f.key)).map((f) => {
    const step = script.steps.find((s) => s.onFile?.field === f.key);
    const how = script.staffCollects.some((s) => s.field === f.key) ? "staff" : step && !v.asked.includes(step.id) ? "asks" : "not_asked";
    return { field: f.key, section: f.section, label: f.label, how };
  });
}

/** The assistant's next turn. */
export function speak(r: IntakeRecord, v: VoiceSession, coordinator: string): VoiceSession {
  const script = scriptOf(r);
  const say = (text: string) => ({ id: `${v.id}:${v.turns.length}`, at: v.elapsed ?? 0, speaker: "assistant" as const, text: fill(text, coordinator) });
  const ack = v.ack ? `${v.ack} ` : "";
  if (v.step === "summary") {
    const staff = missingRequired(r, v).filter((m) => m.how === "staff");
    const said = sayCollected(v.collected ?? []);
    const rest = (v.collected ?? []).length - said.used;
    const lines = said.line;
    const staffLine = staff.length ? `Staff will also confirm a few things with you at the first visit: ${staff.map((m) => m.label.toLowerCase()).join(" and ")}. ` : "";
    const body = lines ? `${lines[0].toUpperCase()}${lines.slice(1)}.${rest > 0 ? ` I also noted ${rest} other details for staff.` : ""} Is any of that wrong?` : "I didn't collect anything yet.";
    return { ...v, status: "summary", phase: "caller", ack: undefined, turns: [...v.turns, say(`${ack}${staffLine}Here's what I have. ${body}`)] };
  }
  if (v.step === "closing") return { ...v, status: "confirm", phase: "done", ack: undefined, turns: [...v.turns, say(`${ack}${script.closing}`)] };
  const st = script.steps.find((s) => s.id === v.step);
  if (!st) return v;
  const text = v.clarifying && st.clarify ? st.clarify.ask : st.ask;
  return { ...v, status: statusOfKind(st.kind), phase: "caller", ack: undefined, asked: v.asked.includes(st.id) ? v.asked : [...v.asked, st.id], turns: [...v.turns, say(`${ack}${text}`)] };
}

/** The scripted reply the caller gives to the current prompt. */
export function scriptedReply(r: IntakeRecord, v: VoiceSession): string {
  const script = scriptOf(r);
  if (v.step === "summary") return script.summaryReply;
  const st = script.steps.find((s) => s.id === v.step);
  if (!st) return "";
  return v.clarifying && st.clarify ? st.clarify.reply : st.reply;
}
/** Quick replies the coordinator can pick instead of the scripted one. */
export function optionsFor(r: IntakeRecord, v: VoiceSession): VoiceOption[] {
  const st = scriptOf(r).steps.find((s) => s.id === v.step);
  return v.clarifying ? [] : (st?.options ?? []);
}

const vague = (t: string) => t.trim().split(/\s+/).length < 5;
const wantsPerson = /^\s*(no|nope)\b|rather (talk|speak)|a (real )?person|human/i;

export interface Replied {
  session: VoiceSession;
  escalate?: string;
  transfer?: string;
}

/** The caller answers. Typed answers fill the step's first field as said; scripted answers carry the script's structured fields. */
export function reply(r: IntakeRecord, v: VoiceSession, text: string, o: { scripted?: boolean; option?: VoiceOption; clock: number; uid: (p: string) => string; coordinator: string }): Replied {
  const script = scriptOf(r);
  const turn = { id: `${v.id}:${v.turns.length}`, at: v.elapsed ?? 0, speaker: script.callerSpeaker, text };
  let next: VoiceSession = { ...v, turns: [...v.turns, turn], cursor: v.cursor + 1 };
  if (o.option?.escalate || UNSAFE.test(text)) {
    const say = { id: `${v.id}:${next.turns.length}`, at: v.elapsed ?? 0, speaker: "assistant" as const, text: VOICE_ESCALATION };
    return { session: { ...next, status: "escalated", phase: "done", escalation: { at: v.elapsed ?? 0, text }, turns: [...next.turns, say] }, escalate: text };
  }
  const collect = (list: Extract[]): Suggestion[] => {
    let c = [...(next.collected ?? [])];
    for (const x of list) {
      const sg: Suggestion = { id: o.uid("sg"), section: x.section, field: x.field, value: x.value, source: { kind: "voice", ref: CALL_REF, quote: text.length > 110 ? `${text.slice(0, 107)}...` : text, at: turn.at, blockId: turn.id }, confidence: x.confidence, agent: VOICE_AGENT, at: o.clock, status: "pending" };
      c = [...c.filter((y) => !(y.section === x.section && y.field === x.field)), sg];
    }
    return c;
  };
  if (v.step === "summary") {
    const fix = o.scripted ? script.correction : undefined;
    if (fix) {
      const hit = (next.collected ?? []).find((c) => c.field === fix.field);
      if (hit) next = { ...next, collected: (next.collected ?? []).map((c) => (c === hit ? { ...c, value: fix.value, source: { ...c.source, quote: text, at: turn.at, blockId: turn.id } } : c)), corrected: [...(next.corrected ?? []), hit.id] };
    }
    return { session: { ...next, step: "closing", phase: "assistant", ack: fix ? fix.ack : `Thank you. ${o.coordinator} will correct anything that needs it before it is saved.` } };
  }
  const st = script.steps.find((s) => s.id === v.step);
  if (!st) return { session: next };
  if (o.option?.transfer) return { session: { ...next, collected: collect(o.option.extract ?? []), language: o.option.extract?.find((x) => x.field === "language")?.value ?? next.language }, transfer: o.option.transfer };
  if (st.kind === "consent") {
    if (!o.scripted && !o.option && wantsPerson.test(text)) return { session: { ...next, consent: false }, transfer: "The caller asked for a person" };
    next = { ...next, consent: true };
  }
  if (st.clarify && !v.clarifying && (o.scripted ? true : vague(text))) return { session: { ...next, clarifying: true, phase: "assistant", ack: undefined } };
  const list = o.option?.extract ?? (o.scripted || o.option ? st.extract : st.kind === "identity" || st.kind === "role" || st.kind === "consent" ? [] : st.extract.slice(0, 1).map((x) => ({ ...x, value: text.trim(), confidence: "medium" as const })));
  next = { ...next, collected: collect(list), ack: st.ack };
  if (st.kind === "language") next = { ...next, language: list.find((x) => x.field === "language")?.value ?? next.language };
  return { session: advance(r, next, st.id) };
}

/** The call as a record document, so each suggestion links to the turn it came from. */
export function callDoc(r: IntakeRecord, v: VoiceSession, at: number): IntakeDocument {
  const script = scriptOf(r);
  const label = (sp: string) => (sp === "assistant" ? "Assistant (automated)" : sp === script.callerSpeaker ? script.callerLabel : sp === "coordinator" ? "Coordinator" : sp);
  return {
    id: `doc-${v.id}`, name: `Voice intake call ${v.id} transcript (simulated)`, kind: "other", receivedAt: at, simulated: true,
    pages: [[
      { kind: "letterhead", org: "Psyflo Voice Intake Assistant", sub: "Simulated call. No telephony, speech recognition or voice vendor is connected." },
      { kind: "meta", items: [["Caller", script.callerLabel], ["Language", v.language], ["Consent to the call transcript", v.consent ? "Given verbally" : "Not given"], ["Status", STATUS_LABEL[v.status]]] },
      ...v.turns.map((t): DocBlock => ({ kind: "p", id: t.id, text: `[${String(Math.floor(t.at / 60)).padStart(2, "0")}:${String(t.at % 60).padStart(2, "0")}] ${label(t.speaker)}: ${t.text}` })),
    ]],
  };
}
