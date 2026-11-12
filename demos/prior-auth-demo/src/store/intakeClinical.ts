import type { StateCreator } from "zustand";
import type { ConsentEntry } from "@/data/assess/types";
import { followUpFor, GUIDED_QUESTIONS, type VoiceOption } from "@/data/intake/scripts";
import { canSign } from "@/data/assess/roles";
import { staffOf } from "@/data/intake/seed";
import { type AssessmentMode, type IntakeDocument, type IntakeRecord, type NoteSectionId, type ScribeSession, type Suggestion, type TranscriptTurn, type VoiceSession } from "@/data/intake/types";
import { assessmentFeeds } from "@/pages/intake/assessment/feed";
import * as SE from "@/pages/intake/scribe/engine";
import * as VE from "@/pages/intake/voice/engine";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* Intake: the clinical assessment, the AI Scribe and the Voice Intake Assistant. Generic actions (fields, suggestions, tasks, audit,
   safety) are in intake.ts; these build on them. What the scribe and the voice assistant produce stays inside their session until a
   person saves it; nothing they produce is ever written as verified, and neither can document risk, sign or decide anything. */

type Decision = "accepted" | "edited" | "rejected";
export const MODE_LABEL: Record<AssessmentMode, string> = { manual: "Clinician-completed", scribe: "AI-scribed", voice: "Patient-assisted" };
const SCRIBE_TASK = "Organize the live transcript into note sections";
const VOICE_TASK = "Run the Voice Intake Assistant call (simulated)";

export interface IntakeClinicalSlice {
  /* clinical assessment */
  setAssessmentMode: (id: string, mode: AssessmentMode) => void;
  /** In progress → awaiting review: a qualified clinician attests next. */
  markAssessmentReady: (id: string) => void;
  /** Called by SignOffDialog's onSign (the dialog writes the audit event). */
  signAssessment: (id: string, signerId: string, credentials: string, rolePlay: boolean) => void;
  /** Reopens a signed assessment. The reason and the replaced signature are kept. */
  amendAssessment: (id: string, reason: string) => void;
  /** A clinician documents the safety and risk screening. Any AI draft it was based on is closed as edited by that person. */
  documentSafety: (id: string, o: { value: string; by: string; rolePlay: boolean; fromSuggestions: string[] }) => void;
  setSafetyPrompt: (id: string, promptId: string, response: string, by: string, rolePlay: boolean) => void;
  setGuidedAnswer: (id: string, questionId: string, answer: string, state: "open" | "asked" | "skipped") => void;
  /** Turns the guided answers into suggestions for the assessment sections. Returns how many it added. */
  draftFromGuided: (id: string) => number;
  /** Proposes what the clinical assessment already documents, as pending evidence, to each module in use that reads it. Returns how many pieces it proposed. */
  feedModulesFromAssessment: (id: string) => number;
  /** Where the person left off, for Resume: the workspace section (a `?section=` value). */
  setLastSection: (id: string, section: string) => void;
  /** The configuration wizard step left unfinished, or null once it is finished. */
  setWizardStep: (id: string, step: string | null) => void;

  /* AI Scribe */
  scribeConsent: (id: string, consent: { by: string; method: "verbal" | "written" }, encounter: NonNullable<ScribeSession["encounter"]>) => void;
  scribeDeclined: (id: string, by: string) => void;
  scribeStart: (id: string) => void;
  scribePause: (id: string) => void;
  scribeResume: (id: string) => void;
  scribeStop: (id: string) => void;
  /** One tick of simulated audio: moves the conversation on and plays the turns that are due. */
  scribeAdvance: (id: string, seconds: number) => void;
  /** Demo control: plays the rest of the scripted conversation now. */
  scribeSkip: (id: string) => void;
  scribeRelabel: (id: string, turnId: string, speaker: TranscriptTurn["speaker"]) => void;
  /** A person corrects what the simulated transcription heard. The original is kept and the proposals from that line need checking again. */
  scribeEditTurn: (id: string, turnId: string, text: string) => void;
  /** Moves a proposal for an assessment module to another field of the same module. */
  scribeRetarget: (id: string, suggestionId: string, fieldKey: string) => void;
  /** Accepts the follow-up the scribe suggested for something the conversation did not cover, or dismisses it. */
  scribeDecideFollowUp: (id: string, missing: string, decision: "accepted" | "dismissed") => void;
  /** Accepts every undecided proposal whose source is verified (see isVerifiedSource): never risk text. Returns how many. */
  scribeAcceptVerified: (id: string) => number;
  /** The agent's last pass after Stop (summary, outstanding questions, plan). Returns the result line. */
  scribeFinishDraft: (id: string) => string;
  scribeDecideNote: (id: string, section: NoteSectionId, decision: Decision, edited?: string) => void;
  scribeDecideField: (id: string, suggestionId: string, decision: Decision, edited?: string) => void;
  scribeSaveDraft: (id: string) => void;
  /** Writes only what a person accepted. Undecided proposals wait where they belong: pending evidence in their module, pending CANS evidence, or a suggestion in their section. */
  scribeSaveApproved: (id: string) => { accepted: number; waiting: number; routed: number };
  scribeNew: (id: string) => void;

  /* Voice Intake Assistant */
  voiceStart: (id: string) => void;
  voiceSpeak: (id: string) => void;
  voiceReply: (id: string, text: string, o?: { scripted?: boolean; option?: VoiceOption }) => void;
  voiceTick: (id: string, seconds: number) => void;
  /** Demo control: plays the scripted replies up to the read-back. */
  voiceSkip: (id: string) => void;
  voiceTransfer: (id: string, reason: string) => void;
  voiceConfirm: (id: string, collectedId: string | "all") => void;
  voiceCorrect: (id: string, collectedId: string, value: string) => void;
  /** Saves what was collected as suggestions for staff review. Returns how many. */
  voiceSave: (id: string) => number;
  voiceRestart: (id: string) => void;
}

let n = 0;
/** The consent ledger entry for a recording: asked before the interview starts, kept whether it was given or not. */
const recordingConsent = (id: string, status: ConsentEntry["status"], at: number, by: string, purpose: string): ConsentEntry => ({
  id, type: "recording", recipient: "Psyflo AI Scribe (simulated audio: nothing is recorded)", purpose, status, at, by,
});
const uidC = (p: string) => `${p}-c${Date.now().toString(36)}-${++n}`;
const putDoc = (docs: IntakeDocument[], d: IntakeDocument) => [...docs.filter((x) => x.id !== d.id), d];

export const createIntakeClinicalSlice: StateCreator<AppState, [], [], IntakeClinicalSlice> = (_set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const me = () => meOf(get());
  const audit = (id: string, action: string, detail?: string, ai = false) => get().addIntakeAudit(id, { actor: ai ? SE.SCRIBE_AGENT : me(), action, detail, section: "assessment", ai });
  const patchA = (id: string, fn: (a: IntakeRecord["assessment"]) => IntakeRecord["assessment"]) => get().patchIntake(id, (r) => ({ ...r, assessment: fn(r.assessment) }));
  const patchS = (id: string, fn: (s: ScribeSession, r: IntakeRecord) => ScribeSession) => get().patchIntake(id, (r) => (r.scribe ? { ...r, scribe: fn(r.scribe, r) } : r));
  const patchV = (id: string, fn: (v: VoiceSession, r: IntakeRecord) => VoiceSession) => get().patchIntake(id, (r) => (r.voice ? { ...r, voice: fn(r.voice, r) } : r));
  const coordinatorName = (v: VoiceSession | null) => (staffOf(v?.coordinator ?? me())?.name ?? "A staff member").split(" ")[0];
  const finishTask = (id: string, action: string, patch: { status: "done" | "needs_you" | "cancelled"; result: string }) => {
    const t = rec(id)?.tasks.find((x) => x.action === action && (x.status === "running" || x.status === "queued"));
    if (t) get().updateIntakeTask(id, t.id, patch);
  };

  /* Risk the scribe hears goes to a clinician at once. If an alert is already open, the new statement is logged against it, not replaced. */
  const alertFor = (id: string, alerts: SE.Played["alerts"]) => {
    for (const a of alerts) {
      const r = rec(id);
      if (r?.safety?.status === "open") {
        get().addIntakeAudit(id, { actor: SE.SCRIBE_AGENT, action: "Heard more risk information for the open safety alert", detail: a.text, ai: true, section: "assessment" });
      } else {
        get().raiseSafety(id, { raisedBy: SE.SCRIBE_AGENT, text: `The AI Scribe heard risk information that needs a clinician now: ${a.text} Psyflo does not decide that a person is safe.`, source: a.source });
      }
    }
  };
  const play = (id: string, elapsed: number) => {
    const r = rec(id);
    if (!r?.scribe || r.scribe.status !== "recording") return;
    const out = SE.playDue(r, r.scribe, elapsed, { clock: get().clock, agentPaused: !!get().agentPaused[SE.SCRIBE_AGENT], uid: uidC });
    get().patchIntake(id, (x) => ({ ...x, scribe: out.session }));
    if (out.alerts.length) alertFor(id, out.alerts);
  };

  return {
    setAssessmentMode: (id, mode) => {
      if (rec(id)?.assessment.mode === mode) return;
      patchA(id, (a) => ({ ...a, mode }));
      audit(id, `Assessment mode: ${MODE_LABEL[mode]}`);
    },
    markAssessmentReady: (id) => {
      patchA(id, (a) => ({ ...a, status: "awaiting_review" }));
      audit(id, "Marked the clinical assessment ready for clinician review");
      get().addIntakeTask(id, { role: "completion", action: "Clinical assessment waits for a clinician's attestation", status: "needs_you", section: "assessment", approval: "required", gate: { kind: "assessment" }, result: "Only a qualified clinician signs" });
    },
    signAssessment: (id, signerId, credentials, rolePlay) => {
      /* Only a qualified clinician signs. The dialog asks already; this keeps any other caller (an agent, a script) from signing the assessment. */
      if (!canSign(signerId) || rec(id)?.assessment.status === "signed") return;
      patchA(id, (a) => ({ ...a, status: "signed", attestation: { by: signerId, credentials, at: get().clock, rolePlay } }));
      for (const t of rec(id)?.tasks.filter((x) => x.gate?.kind === "assessment" && x.status === "needs_you") ?? []) get().updateIntakeTask(id, t.id, { status: "done", approval: "approved", result: `Signed by ${staffOf(signerId)?.name ?? signerId}` });
    },
    amendAssessment: (id, reason) => {
      const prior = rec(id)?.assessment.attestation;
      patchA(id, (a) => ({ ...a, status: "in_progress", attestation: undefined, amendments: [...(a.amendments ?? []), { by: me(), at: get().clock, reason, priorSigner: prior?.by, priorSignedAt: prior?.at }] }));
      audit(id, "Amended the signed clinical assessment", reason);
    },
    documentSafety: (id, { value, by, rolePlay, fromSuggestions }) => {
      const at = get().clock;
      get().patchIntake(id, (r) => ({
        ...r,
        assessment: { ...r.assessment, status: r.assessment.status === "not_started" ? "in_progress" : r.assessment.status, fields: { ...r.assessment.fields, safety: { value, state: "verified", source: { kind: "staff", ref: rolePlay ? "Documented by the clinician (demo role-play)" : "Documented by the clinician" }, at, by, reviewedBy: by, reviewedAt: at } } },
        suggestions: r.suggestions.map((s) => (fromSuggestions.includes(s.id) && s.status === "pending" ? { ...s, status: "edited", decidedBy: by, decidedAt: at, editedValue: value } : s)),
      }));
      get().addIntakeAudit(id, { actor: by, action: `Documented the safety and risk screening${rolePlay ? " (demo role-play)" : ""}`, detail: fromSuggestions.length ? "Started from an AI draft, rewritten by the clinician" : undefined, section: "assessment" });
    },
    setSafetyPrompt: (id, promptId, response, by, rolePlay) => {
      patchA(id, (a) => ({ ...a, status: a.status === "not_started" ? "in_progress" : a.status, safetyPrompts: { ...(a.safetyPrompts ?? {}), [promptId]: { response, by, at: get().clock } } }));
      get().addIntakeAudit(id, { actor: by, action: `Safety screening prompt recorded${rolePlay ? " (demo role-play)" : ""}`, detail: response, section: "assessment" });
    },
    setGuidedAnswer: (id, qid, answer, state) => {
      patchA(id, (a) => ({ ...a, guided: { ...(a.guided ?? {}), [qid]: { answer, state, drafted: false } } }));
      const q = GUIDED_QUESTIONS.find((x) => x.id === qid);
      audit(id, state === "skipped" ? "Voice guided: skipped a question" : state === "asked" ? "Voice guided: recorded an answer" : "Voice guided: reopened a question", q?.text);
    },
    draftFromGuided: (id) => {
      const r = rec(id);
      if (!r) return 0;
      const g = r.assessment.guided ?? {};
      const fresh = GUIDED_QUESTIONS.filter((q) => g[q.id]?.state === "asked" && g[q.id].answer.trim() && !g[q.id].drafted);
      const bySection = new Map<string, typeof fresh>();
      for (const q of fresh) bySection.set(q.section, [...(bySection.get(q.section) ?? []), q]);
      const at = get().clock;
      const added: Suggestion[] = [...bySection.entries()].map(([section, qs]) => ({
        id: uidC("sg"), section: "assessment", field: section, value: qs.map((q) => g[q.id].answer.trim()).join(" "), confidence: "medium", agent: SE.SCRIBE_AGENT, at, status: "pending",
        source: { kind: "voice", ref: "Voice guided assessment (simulated)", quote: qs.map((q) => q.text).join(" ") },
      }));
      get().patchIntake(id, (x) => ({
        ...x,
        suggestions: [...x.suggestions.filter((s) => !(s.status === "pending" && s.section === "assessment" && bySection.has(s.field) && s.source.kind === "voice")), ...added],
        assessment: { ...x.assessment, guided: Object.fromEntries(Object.entries(x.assessment.guided ?? {}).map(([k, v]) => [k, fresh.some((q) => q.id === k) ? { ...v, drafted: true } : v])) },
      }));
      return added.length;
    },

    feedModulesFromAssessment: (id) => {
      const r = rec(id);
      if (!r) return 0;
      let total = 0;
      for (const f of assessmentFeeds(r)) total += get().addInstrumentEvidence(id, f.moduleId, f.evidence);
      if (total) audit(id, "Proposed what the clinical assessment already documents to the assessment modules", `${total} pieces of evidence, pending review in their modules`, true);
      return total;
    },
    setLastSection: (id, section) => {
      const cur = rec(id)?.progress;
      if (!rec(id) || cur?.section === section) return;
      get().patchIntake(id, (r) => ({ ...r, progress: { ...r.progress, section, at: get().clock } }));
    },
    setWizardStep: (id, step) => {
      const cur = rec(id)?.progress;
      if (!rec(id) || (cur?.step ?? null) === step) return;
      get().patchIntake(id, (r) => ({ ...r, progress: { section: r.progress?.section ?? "overview", ...r.progress, at: get().clock, step: step ?? undefined } }));
    },

    scribeConsent: (id, consent, encounter) => {
      const at = get().clock;
      get().patchIntake(id, (r) => {
        const base = r.scribe && r.scribe.status === "consent" ? { ...r.scribe, scriptId: SE.scriptOf(r, true).id } : SE.newScribeSession(r, ++n);
        const entry = recordingConsent(`CN-${base.id}`, "on_file", at, me(), `Consent given by ${consent.by}, ${consent.method}, before the interview.`);
        return { ...r, scribe: { ...base, status: "ready", consent: { ...consent, at }, encounter }, consents: [...(r.consents ?? []).filter((c) => c.id !== entry.id), entry] };
      });
      audit(id, "Recorded consent to the AI Scribe recording", `${consent.by} · ${consent.method}`);
    },
    scribeDeclined: (id, by) => {
      const at = get().clock;
      get().patchIntake(id, (r) => ({ ...r, consents: [...(r.consents ?? []), recordingConsent(uidC("CN"), "declined", at, me(), `Consent not given (${by}). The AI Scribe was not started.`)] }));
      audit(id, "Recording consent not given: the AI Scribe was not started", by);
    },
    scribeStart: (id) => {
      const r = rec(id);
      if (!r?.scribe || r.scribe.status !== "ready") return;
      patchS(id, (s, x) => ({ ...s, status: "recording", startedAt: get().clock, missing: s.missing?.length ? s.missing : SE.scriptOf(x).initialMissing }));
      audit(id, "Started the AI Scribe (simulated audio)");
      get().addIntakeTask(id, { role: "documentation", action: SCRIBE_TASK, status: "running", section: "assessment", source: "AI Scribe (simulated audio)", approval: "required" });
    },
    scribePause: (id) => {
      if (rec(id)?.scribe?.status !== "recording") return;
      patchS(id, (s) => ({ ...s, status: "paused" }));
      audit(id, "Paused the AI Scribe", SE.clockOf(rec(id)?.scribe?.elapsed ?? 0));
    },
    scribeResume: (id) => {
      if (rec(id)?.scribe?.status !== "paused") return;
      patchS(id, (s) => ({ ...s, status: "recording" }));
      audit(id, "Resumed the AI Scribe");
    },
    scribeStop: (id) => {
      const s = rec(id)?.scribe;
      if (!s || (s.status !== "recording" && s.status !== "paused")) return;
      patchS(id, (x) => ({ ...x, status: "stopped" }));
      audit(id, "Stopped the AI Scribe", `${SE.clockOf(s.elapsed)} recorded, ${s.turns.length} turns`);
      finishTask(id, SCRIBE_TASK, { status: "done", result: `${s.turns.length} turns organized into the draft` });
    },
    scribeAdvance: (id, seconds) => {
      const s = rec(id)?.scribe;
      if (s?.status === "recording") play(id, s.elapsed + seconds);
    },
    scribeSkip: (id) => {
      const r = rec(id);
      if (!r?.scribe || r.scribe.status !== "recording") return;
      play(id, Math.max(r.scribe.elapsed, SE.lastAt(r) + 4));
      audit(id, "Skipped ahead in the simulated conversation (demo control)");
    },
    scribeRelabel: (id, turnId, speaker) => {
      const r = rec(id);
      const t = r?.scribe?.turns.find((x) => x.id === turnId);
      if (!r || !t || t.speaker === speaker) return;
      patchS(id, (s) => ({ ...s, turns: s.turns.map((x) => (x.id === turnId ? { ...x, speaker } : x)) }));
      audit(id, "Corrected a speaker label in the transcript", `${SE.clockOf(t.at)}: ${SE.speakerLabel(SE.scriptOf(r), t.speaker)} → ${SE.speakerLabel(SE.scriptOf(r), speaker)}`);
    },
    scribeEditTurn: (id, turnId, text) => {
      const r = rec(id);
      const t = r?.scribe?.turns.find((x) => x.id === turnId);
      const next = text.trim();
      if (!r?.scribe || !t || !next || next === t.text || r.scribe.status === "saved") return;
      patchS(id, (sx) => ({ ...sx, turns: sx.turns.map((x) => (x.id === turnId ? { ...x, text: next, edited: { by: me(), at: get().clock, original: x.edited?.original ?? x.text } } : x)) }));
      audit(id, "Corrected a line of the simulated transcript", `${SE.clockOf(t.at)}: the original is kept; proposals from this line need checking again`);
    },
    scribeRetarget: (id, sgId, fieldKey) => {
      const sg = rec(id)?.scribe?.extracted?.find((x) => x.id === sgId);
      if (!sg?.moduleId || sg.status !== "pending" || sg.field === fieldKey) return;
      const moduleId = sg.moduleId;
      patchS(id, (sx) => {
        const others = (sx.extracted ?? []).filter((x) => x.id !== sgId);
        const twin = others.find((x) => x.moduleId === moduleId && x.field === fieldKey && x.status === "pending");
        /* Two proposals for one field become one, so the person decides on a single piece of text. */
        return { ...sx, extracted: twin ? others.map((x) => (x === twin ? { ...x, value: `${x.value} ${sg.value}` } : x)) : (sx.extracted ?? []).map((x) => (x.id === sgId ? { ...x, field: fieldKey } : x)) };
      });
      audit(id, "Moved an AI Scribe proposal to another field of the module", `${SE.destinationOf(rec(id) as IntakeRecord, { ...sg, field: fieldKey })}`);
    },
    scribeDecideFollowUp: (id, missing, decision) => {
      patchS(id, (sx) => {
        if (sx.followUps?.[missing] === decision) return sx;
        const plan = sx.noteDraft.plan ?? "";
        const line = `Follow up: ${followUpFor(missing)}`;
        return { ...sx, followUps: { ...(sx.followUps ?? {}), [missing]: decision }, noteDraft: decision === "accepted" && !plan.includes(line) ? { ...sx.noteDraft, plan: plan ? `${plan} ${line}` : line } : sx.noteDraft };
      });
      audit(id, `${decision === "accepted" ? "Accepted" : "Dismissed"} the AI Scribe's suggested follow-up`, missing);
    },
    scribeAcceptVerified: (id) => {
      const r = rec(id);
      const s = r?.scribe;
      if (!r || !s || s.status !== "reviewing") return 0;
      const ids = (s.extracted ?? []).filter((x) => x.status === "pending" && SE.isVerifiedSource(r, s, x)).map((x) => x.id);
      if (!ids.length) return 0;
      patchS(id, (sx) => ({ ...sx, extracted: (sx.extracted ?? []).map((x) => (ids.includes(x.id) ? { ...x, status: "accepted", decidedBy: me(), decidedAt: get().clock } : x)) }));
      audit(id, "Accepted every AI Scribe proposal with a verified source", `${ids.length} proposals; risk information is never included`);
      return ids.length;
    },
    scribeFinishDraft: (id) => {
      patchS(id, (s, r) => SE.finishDraft(r, s));
      const s = rec(id)?.scribe;
      const sections = Object.values(s?.noteDraft ?? {}).filter(Boolean).length;
      return `${sections} note sections and ${(s?.extracted ?? []).length} field suggestions wait for review; ${(s?.missing ?? []).length} missing items listed`;
    },
    scribeDecideNote: (id, section, decision, edited) => {
      patchS(id, (s) => ({ ...s, noteStatus: { ...(s.noteStatus ?? {}), [section]: decision }, noteDraft: decision === "edited" && edited !== undefined ? { ...s.noteDraft, [section]: edited } : s.noteDraft }));
      audit(id, `${decision === "rejected" ? "Rejected" : decision === "edited" ? "Edited and accepted" : "Accepted"} an AI Scribe note section`, section);
    },
    scribeDecideField: (id, sgId, decision, edited) => {
      const sg = rec(id)?.scribe?.extracted?.find((x) => x.id === sgId);
      if (!sg) return;
      patchS(id, (s) => ({ ...s, extracted: (s.extracted ?? []).map((x) => (x.id === sgId ? { ...x, status: decision, decidedBy: me(), decidedAt: get().clock, editedValue: decision === "edited" ? edited : undefined } : x)) }));
      audit(id, `${decision === "rejected" ? "Rejected" : decision === "edited" ? "Edited and accepted" : "Accepted"} an AI Scribe suggestion for ${sg.field}`, `${SE.TRANSCRIPT_REF} ${SE.clockOf(sg.source.at ?? 0)}`);
    },
    scribeSaveDraft: (id) => audit(id, "Saved the AI Scribe draft. Nothing was written to the intake"),
    scribeSaveApproved: (id) => {
      const r = rec(id);
      const s = r?.scribe;
      if (!r || !s) return { accepted: 0, waiting: 0, routed: 0 };
      const at = get().clock;
      const reviewer = staffOf(me())?.name ?? me();
      const tdoc = SE.transcriptDoc(r, s, at);
      const ndoc = SE.noteDoc(r, s, at, reviewer);
      const linked = (s.extracted ?? []).map((x): Suggestion => ({ ...x, source: { ...x.source, docId: tdoc.id } }));
      /* The safety draft is never accepted here: a clinician documents risk in the assessment. */
      const toRecord = linked.map((x): Suggestion => (SE.isRiskProposal(x) && x.status !== "rejected" ? { ...x, status: "pending", decidedBy: undefined, decidedAt: undefined, editedValue: undefined } : x));
      const live = toRecord.filter((x) => x.status !== "rejected");
      const forModules = live.filter((x) => x.moduleId);
      const forCans = live.filter((x) => x.section === "cans");
      const forRecord = toRecord.filter((x) => !x.moduleId && x.section !== "cans");
      const decided = (x: Suggestion) => x.status === "accepted" || x.status === "edited";
      const textOf = (x: Suggestion) => (x.status === "edited" ? (x.editedValue ?? x.value) : x.value);

      get().patchIntake(id, (x) => ({
        ...x,
        documents: ndoc ? putDoc(putDoc(x.documents, tdoc), ndoc) : putDoc(x.documents, tdoc),
        suggestions: [...x.suggestions, ...forRecord.map((sg) => (sg.status === "rejected" ? sg : { ...sg, status: "pending" as const, decidedBy: undefined, decidedAt: undefined }))],
        scribe: x.scribe ? { ...x.scribe, status: "saved", savedAt: at, docIds: [tdoc.id, ...(ndoc ? [ndoc.id] : [])] } : x.scribe,
      }));
      for (const sg of forRecord.filter(decided)) get().decideSuggestion(id, sg.id, sg.status as "accepted" | "edited", sg.editedValue);

      /* Proposals for an assessment module arrive there as pending evidence with their transcript source; a person's decision in the review is applied on top. */
      let routed = 0;
      let skipped = 0;
      for (const sg of forModules) {
        const moduleId = sg.moduleId as NonNullable<Suggestion["moduleId"]>;
        const added = get().addInstrumentEvidence(id, moduleId, [{
          fieldKey: sg.field, text: sg.value, source: sg.source, confidence: sg.confidence, agent: SE.SCRIBE_AGENT,
          explanation: `Proposed by the AI Scribe from the simulated transcript at ${SE.clockOf(sg.source.at ?? 0)}. A person checks it against the transcript before it fills the field.`,
        }]);
        if (!added) { skipped++; continue; }
        routed++;
        if (decided(sg)) {
          const ev = [...(rec(id)?.instruments?.[moduleId]?.evidence ?? [])].reverse().find((e) => e.status === "pending" && e.fieldKey === sg.field && e.text === sg.value);
          if (ev) get().decideInstrumentEvidence(id, moduleId, ev.id, sg.status as "accepted" | "edited", sg.status === "edited" ? textOf(sg) : undefined);
        }
      }
      if (forCans.length) {
        const ids = get().proposeCansEvidence(id, forCans.map((x) => ({ text: textOf(x), theme: x.field.replace(/^evidence:/, ""), source: x.source })), SE.SCRIBE_AGENT);
        if (forCans.some(decided)) {
          if (!rec(id)?.cans) get().startCans(id);
          forCans.forEach((x, i) => { if (decided(x)) get().decideCansEvidence(id, ids[i], true); });
        }
        routed += forCans.length;
      }
      for (const t of rec(id)?.tasks.filter((x) => x.action === SE.FINISH_ACTION && x.status === "needs_you") ?? []) get().updateIntakeTask(id, t.id, { status: "done", approval: "approved", result: "Reviewed by a person and saved" });

      const accepted = live.filter(decided).length + SE.notesAccepted(s).length;
      const waitingRecord = forRecord.filter((x) => x.status === "pending");
      const waiting = live.filter((x) => !decided(x)).length;
      audit(id, "Saved approved AI Scribe content to the intake", `${SE.notesAccepted(s).length} note sections and ${live.filter(decided).length} proposals accepted by a person; ${waiting} wait for review where they belong${skipped ? `; ${skipped} could not reach a signed module` : ""}`);
      if (waitingRecord.length) {
        get().addIntakeTask(id, { role: "documentation", action: "AI Scribe suggestions wait for review", status: "needs_you", section: "assessment", source: tdoc.name, approval: "required", gate: { kind: "suggestions", ids: waitingRecord.map((w) => w.id) }, result: `${waitingRecord.length} suggestions from the transcript, each linked to its source` });
      }
      return { accepted, waiting, routed };
    },
    scribeNew: (id) => {
      get().patchIntake(id, (r) => ({ ...r, scribe: SE.newScribeSession(r, ++n) }));
      audit(id, "Started a new AI Scribe session");
    },

    voiceStart: (id) => {
      const r = rec(id);
      if (!r) return;
      const base = r.voice && r.voice.status === "idle" ? { ...r.voice, scriptId: VE.scriptOf({ ...r, voice: null }).id } : VE.newVoiceSession(r, ++n);
      const first = VE.scriptOf({ ...r, voice: base }).steps[0].id;
      get().patchIntake(id, (x) => ({ ...x, voice: { ...base, status: "identity", step: first, phase: "assistant", coordinator: me(), elapsed: 0, turns: [], asked: [], skipped: [], collected: [], confirmed: [], corrected: [] } }));
      get().addIntakeAudit(id, { actor: me(), action: "Started the Voice Intake Assistant (simulated call)", section: "profile" });
      get().addIntakeTask(id, { role: "documentation", action: VOICE_TASK, status: "running", section: "profile", source: "Simulated call", approval: "required" });
    },
    voiceSpeak: (id) => {
      const r = rec(id);
      if (!r?.voice || r.voice.phase !== "assistant") return;
      patchV(id, (v, x) => VE.speak(x, v, coordinatorName(v)));
    },
    voiceReply: (id, text, o = {}) => {
      const r = rec(id);
      const v = r?.voice;
      if (!r || !v || v.phase !== "caller" || !text.trim()) return;
      const out = VE.reply(r, v, text.trim(), { ...o, clock: get().clock, uid: uidC, coordinator: coordinatorName(v) });
      get().patchIntake(id, (x) => ({ ...x, voice: out.session }));
      /* The call asks for consent to keep a transcript first; the answer goes in the consent ledger like the scribe's. */
      if (out.session.consent !== undefined && out.session.consent !== v.consent) {
        const at = get().clock;
        const entry = recordingConsent(`CN-${v.id}`, out.session.consent ? "on_file" : "declined", at, me(), out.session.consent ? "The caller agreed, on the simulated call, to a transcript for the intake team. Nothing is recorded." : "The caller asked for a person instead of the automated assistant.");
        get().patchIntake(id, (x) => ({ ...x, consents: [...(x.consents ?? []).filter((c) => c.id !== entry.id), { ...entry, recipient: "Psyflo Voice Intake Assistant (simulated call)" }] }));
      }
      if (!o.scripted) get().addIntakeAudit(id, { actor: me(), action: o.option ? "Picked the caller's reply" : "Typed what the caller said", detail: text.trim().slice(0, 120), section: "profile" });
      if (out.escalate) {
        get().raiseSafety(id, { raisedBy: VE.VOICE_AGENT, text: `On the voice intake call the caller said: "${out.escalate}". The assistant stopped the questions and asked for a person. A clinician reviews this now; Psyflo makes no emergency determination.`, source: { kind: "voice", ref: VE.CALL_REF, quote: out.escalate, at: v.elapsed ?? 0 } });
        finishTask(id, VOICE_TASK, { status: "needs_you", result: "Stopped for a safety concern; transfer the caller to staff" });
      } else if (out.transfer) {
        get().voiceTransfer(id, out.transfer);
      }
    },
    voiceTick: (id, seconds) => {
      const v = rec(id)?.voice;
      if (VE.callActive(v)) patchV(id, (x) => ({ ...x, elapsed: (x.elapsed ?? 0) + seconds }));
    },
    voiceSkip: (id) => {
      for (let guard = 0; guard < 80; guard++) {
        const r = rec(id);
        const v = r?.voice;
        if (!r || !v || v.status === "summary" || !VE.callActive(v)) break;
        patchV(id, (x) => ({ ...x, elapsed: (x.elapsed ?? 0) + 12 }));
        if (v.phase === "assistant") get().voiceSpeak(id);
        else get().voiceReply(id, VE.scriptedReply(r, v), { scripted: true });
      }
      const v = rec(id)?.voice;
      if (v?.status === "summary" && v.phase === "assistant") get().voiceSpeak(id);
      get().addIntakeAudit(id, { actor: me(), action: "Skipped ahead in the simulated call (demo control)", section: "profile" });
    },
    voiceTransfer: (id, reason) => {
      const v = rec(id)?.voice;
      if (!v || v.status === "saved" || v.status === "transferred") return;
      const name = coordinatorName(v);
      patchV(id, (x) => ({ ...x, status: "transferred", phase: "done", transfer: { at: x.elapsed ?? 0, reason, by: me() }, turns: [...x.turns, { id: `${x.id}:${x.turns.length}`, at: x.elapsed ?? 0, speaker: "assistant", text: x.escalation ? `I'm connecting you with ${name} now. Please stay on the line. If you are in danger, call 911, or call or text 988.` : `I'm connecting you with ${name} from the intake team now. Thank you.` }] }));
      get().addIntakeAudit(id, { actor: me(), action: "Took over the call from the Voice Intake Assistant", detail: reason, section: "profile" });
      finishTask(id, VOICE_TASK, { status: "done", result: `Transferred to staff: ${reason}` });
    },
    voiceConfirm: (id, cid) => {
      const v = rec(id)?.voice;
      if (!v) return;
      const ids = cid === "all" ? (v.collected ?? []).map((c) => c.id) : [cid];
      patchV(id, (x) => ({ ...x, confirmed: [...new Set([...(x.confirmed ?? []), ...ids])] }));
      get().addIntakeAudit(id, { actor: me(), action: cid === "all" ? "Marked every collected fact as confirmed by the caller" : "Marked a fact as confirmed by the caller", section: "profile" });
    },
    voiceCorrect: (id, cid, value) => {
      const c = rec(id)?.voice?.collected?.find((x) => x.id === cid);
      if (!c || !value.trim() || c.value === value.trim()) return;
      patchV(id, (x) => ({ ...x, collected: (x.collected ?? []).map((y) => (y.id === cid ? { ...y, value: value.trim() } : y)), corrected: [...new Set([...(x.corrected ?? []), cid])] }));
      get().addIntakeAudit(id, { actor: me(), action: `Corrected ${c.field} as the caller said`, detail: value.trim(), section: "profile" });
    },
    voiceSave: (id) => {
      const r = rec(id);
      const v = r?.voice;
      if (!r || !v || v.status === "saved") return 0;
      const at = get().clock;
      const doc = VE.callDoc(r, v, at);
      const confirmed = new Set(v.confirmed ?? []);
      const corrected = new Set(v.corrected ?? []);
      /* Nothing is written as verified: every item becomes a pending suggestion that staff accept, edit or reject in its section. */
      const out = (v.collected ?? []).map((c): Suggestion => ({ ...c, status: "pending", source: { ...c.source, docId: doc.id, ref: corrected.has(c.id) ? `${VE.CALL_REF}, corrected by the caller` : confirmed.has(c.id) ? `${VE.CALL_REF}, confirmed by the caller` : VE.CALL_REF } }));
      get().patchIntake(id, (x) => ({ ...x, documents: putDoc(x.documents, doc), suggestions: [...x.suggestions, ...out], voice: x.voice ? { ...x.voice, status: "saved", phase: "done", savedAt: at, docIds: [doc.id] } : x.voice }));
      get().addIntakeAudit(id, { actor: me(), action: "Saved the voice intake draft for staff review", detail: `${out.length} suggestions; nothing written as verified`, section: "profile" });
      finishTask(id, VOICE_TASK, { status: "done", result: `${out.length} items collected` });
      if (out.length) {
        const sections = [...new Set(out.map((o) => o.section))];
        get().addIntakeTask(id, { role: "documentation", action: "Voice intake draft waits for staff review", status: "needs_you", section: sections.includes("profile") ? "profile" : sections[0], source: doc.name, approval: "required", gate: { kind: "suggestions", ids: out.map((o) => o.id) }, result: `${out.length} suggestions in ${sections.map((s) => (s === "coverage" ? "insurance" : s)).join(", ")}` });
      }
      return out.length;
    },
    voiceRestart: (id) => {
      get().patchIntake(id, (r) => ({ ...r, voice: VE.newVoiceSession({ ...r, voice: null }, ++n) }));
      get().addIntakeAudit(id, { actor: me(), action: "Set up a new Voice Intake Assistant call", section: "profile" });
    },
  };
};
