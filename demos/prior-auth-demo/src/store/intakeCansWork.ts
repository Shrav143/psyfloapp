import type { StateCreator } from "zustand";
import { canSign } from "@/data/assess/roles";
import { staffOf } from "@/data/intake/seed";
import type { CansAssessment, CansTemplateRef, IntakeRecord, SourceRef, Suggestion } from "@/data/intake/types";
import type { AgentKey } from "@/data/types";
import { longDate } from "@/lib/time";
import { cansBlockers, mirrorCans } from "@/pages/intake/cans/cansState";
import { buildDemoItems, DEMO_TEMPLATE_VERSION, domainForTheme, relevantItem } from "@/pages/intake/cans/template";
import type { AppState } from "./index";
import { meOf } from "./intake";

/* The CANS Lifetime record: the template an administrator loads, the items a person rates in their own words, the evidence an agent proposes and a person
   keeps, the sign-off and the versions. Agents only ever add suggestions or drafts. Nothing here rates an item or computes a result, and every change
   keeps the instrument instance the workspace reads (`instruments.cans`) in step through mirrorCans. */

/** One statement the CANS Evidence Agent proposes, or a person adds by hand. `theme` is a Psyflo theme, never a CANS domain; `itemId` is the item of the loaded template a person ties it to. */
export interface EvidenceProposal { text: string; theme: string; source: SourceRef; itemId?: string }
/** A template file an administrator tried to validate. Validation always fails in the demo: the official mapping is not available. */
export interface CansTemplateAttempt { id: string; fileName: string; at: number; by: string; recordId: string; result: string }
/** The organization's CANS template. "none": the official mapping is not loaded and no items exist. */
export type CansTemplateState = { kind: "none" } | CansTemplateRef;
/** The template in force: the organization's setting, or, when this browser session has not loaded one but a saved record carries it, that record's. Stable references only. */
export const templateOf = (s: Pick<AppState, "cansTemplate" | "intakes">): CansTemplateState => (s.cansTemplate.kind !== "none" ? s.cansTemplate : (s.intakes.find((r) => r.cans?.template)?.cans?.template ?? s.cansTemplate));

export interface IntakeCansWorkSlice {
  cansTemplateAttempts: CansTemplateAttempt[];
  cansTemplate: CansTemplateState;

  /** Staff open a CANS Lifetime record. With the demo placeholder template loaded it starts with its blank items; otherwise it has none. */
  startCans: (id: string) => void;
  /** An administrator loads the demo placeholder template for every CANS record that has no items yet. `rolePlay`: the viewer is not an administrator and played the clinic owner. */
  loadCansDemoTemplate: (id: string, adminId: string, rolePlay: boolean) => void;
  /** A person types a rating label and/or a note for one item. Nothing is computed from either. */
  setCansItem: (id: string, itemId: string, patch: { response?: string; note?: string }) => void;
  /** The CANS Evidence Agent's proposals. Returns the new suggestion ids. */
  proposeCansEvidence: (id: string, items: EvidenceProposal[], agent: AgentKey) => string[];
  /** Keep or discard a proposal. Keeping may edit the statement and tie it to an item. */
  decideCansEvidence: (id: string, suggestionId: string, keep: boolean, opts?: { edited?: string; itemId?: string }) => void;
  addCansEvidence: (id: string, item: EvidenceProposal) => void;
  removeCansEvidence: (id: string, evidenceId: string) => void;
  /** Ties kept evidence to an item (or to none). */
  setCansEvidenceItem: (id: string, evidenceId: string, itemId: string | null) => void;
  /** The agent's evidence summary, as a suggestion for the narrative. Returns its id. */
  proposeCansSummary: (id: string, text: string, agent: AgentKey) => string;
  decideCansSummary: (id: string, suggestionId: string, decision: "accepted" | "edited" | "rejected", edited?: string) => void;
  setCansNarrative: (id: string, text: string) => void;
  setCansDetails: (id: string, patch: Partial<Pick<CansAssessment, "assessor" | "date">>) => void;
  recordCredentialCheck: (id: string, credential: string, status: "verified" | "unverified", note?: string) => void;
  validateCansTemplate: (id: string, fileName: string) => string;
  /** The record is ready for the clinician's review. Returns false while something blocks it (cansBlockers). */
  markCansReady: (id: string) => boolean;
  /** A qualified clinician signs. Returns false while something blocks it or when the signer may not sign. */
  signCans: (id: string, signerId: string, rolePlay: boolean) => boolean;
  /** Starts the next version of a signed record and keeps the signed one in its history. */
  amendCans: (id: string, reason: string) => void;
}

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;

/** A new CANS record. With the placeholder template loaded it carries the blank items; without, none. */
export function newCans(by: string, at: number, tpl: CansTemplateState): CansAssessment {
  const base: CansAssessment = {
    status: "in_progress", templateVersion: "awaiting-dmas-mapping", credentialStatus: "not_checked", domains: [], items: [], evidence: [], narrative: "", reassessDue: null,
    evidenceMeta: {}, startedBy: by, startedAt: at, version: 1,
  };
  return tpl.kind === "none" ? base : withTemplate(base, tpl);
}
/** The record with the placeholder items. Evidence already kept is filed under the item its wording points at; a person can change that. */
function withTemplate(c: CansAssessment, tpl: CansTemplateRef): CansAssessment {
  return {
    ...c, ...buildDemoItems(), templateVersion: tpl.version, template: tpl,
    evidence: c.evidence.map((e) => (e.itemId ? e : { ...e, itemId: relevantItem(domainForTheme(e.theme, e.text).id, e.text)?.id })),
  };
}

export const createIntakeCansWorkSlice: StateCreator<AppState, [], [], IntakeCansWorkSlice> = (set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => get().patchIntake(id, fn);
  const me = () => meOf(get());
  const now = () => get().clock;
  const audit = (id: string, action: string, detail?: string, actor = me()) => get().addIntakeAudit(id, { actor, action, detail, section: "cans", ai: false });
  /** Changes the CANS record and keeps `instruments.cans` in step. A signed record is never changed here. */
  const cansPatch = (id: string, fn: (c: CansAssessment) => CansAssessment) => patch(id, (r) => (r.cans && r.cans.status !== "signed" ? mirrorCans({ ...r, cans: fn(r.cans) }, now()) : r));
  /** Any change after "ready for review" takes it back to in progress: the reviewer saw something else. */
  const reopened = (c: CansAssessment): CansAssessment => (c.status === "ready_for_review" ? { ...c, status: "in_progress" } : c);
  const closeTasks = (id: string, match: (t: IntakeRecord["tasks"][number]) => boolean, result?: string) => {
    for (const t of rec(id)?.tasks ?? []) if (t.status === "needs_you" && match(t)) get().updateIntakeTask(id, t.id, { status: "done", approval: "approved", result: result ?? t.result });
  };
  const decideSg = (r: IntakeRecord, sid: string, status: Suggestion["status"], edited?: string): IntakeRecord => ({
    ...r, suggestions: r.suggestions.map((x) => (x.id === sid ? { ...x, status, decidedBy: me(), decidedAt: now(), editedValue: edited } : x)),
  });
  const itemName = (r: IntakeRecord | undefined, itemId: string) => r?.cans?.items.find((i) => i.id === itemId)?.name ?? itemId;

  return {
    cansTemplateAttempts: [],
    cansTemplate: { kind: "none" },

    startCans: (id) => {
      if (rec(id)?.cans) return;
      const tpl = templateOf(get());
      patch(id, (r) => mirrorCans({ ...r, cans: newCans(me(), now(), tpl) }, now()));
      audit(id, "Started a CANS Lifetime record", tpl.kind === "none" ? "Template awaiting-dmas-mapping: no items configured" : "Demo placeholder template: blank prompts, not CANS content");
    },

    loadCansDemoTemplate: (id, adminId, rolePlay) => {
      const at = now();
      const tpl: CansTemplateRef = { kind: "demo-placeholder", version: DEMO_TEMPLATE_VERSION, loadedBy: adminId, loadedAt: at, rolePlay: rolePlay || undefined };
      const changed: string[] = [];
      set((s) => ({
        cansTemplate: tpl,
        intakes: s.intakes.map((r) => {
          if (!r.cans || r.cans.items.length || r.cans.status === "signed") return r;
          changed.push(r.id);
          return mirrorCans({ ...r, cans: withTemplate(r.cans, tpl) }, at);
        }),
      }));
      if (!rec(id)?.cans) get().startCans(id);
      const who = `${staffOf(adminId)?.name ?? adminId}${rolePlay ? " (demo role-play)" : ""}`;
      audit(id, "Loaded the demo placeholder CANS template (administrator action)", `${who}. Blank prompts, not CANS content: no official items or scale.`, adminId);
      for (const rid of changed) if (rid !== id) audit(rid, "The demo placeholder CANS template was loaded for the organization", who, adminId);
    },

    setCansItem: (id, itemId, p) => {
      const it = rec(id)?.cans?.items.find((x) => x.id === itemId);
      if (!it) return;
      const response = (p.response ?? it.response ?? "").trim();
      const note = (p.note ?? it.note ?? "").trim();
      if (response === (it.response ?? "") && note === (it.note ?? "")) return;
      cansPatch(id, (c) => reopened({
        ...c, items: c.items.map((x) => (x.id === itemId ? { ...x, response: response || null, note: note || undefined, state: response ? ("rated" as const) : ("unrated" as const), reviewer: me(), reviewedAt: now() } : x)),
      }));
      const ratingChanged = response !== (it.response ?? "");
      audit(id, ratingChanged ? (response ? `Entered a rating label for ${it.name}` : `Cleared the rating label for ${it.name}`) : `Updated the note for ${it.name}`, ratingChanged && response ? `Typed by the assessor: “${response}”. Not a scale value; nothing is computed.` : undefined);
    },

    proposeCansEvidence: (id, items, agent) => {
      const ids = items.map(() => uid("sg"));
      patch(id, (r) => ({
        ...r,
        suggestions: [...r.suggestions, ...items.map((it, i): Suggestion => ({ id: ids[i], section: "cans", field: `evidence:${it.theme}`, value: it.text, source: it.source, confidence: it.source.kind === "staff" ? "high" : "medium", agent, at: now(), status: "pending" }))],
      }));
      return ids;
    },
    decideCansEvidence: (id, sid, keep, opts) => {
      const r = rec(id);
      const sg = r?.suggestions.find((x) => x.id === sid);
      if (!r?.cans || r.cans.status === "signed" || !sg || sg.status !== "pending") return;
      const theme = sg.field.replace(/^evidence:/, "");
      const edited = opts?.edited?.trim();
      const text = edited || sg.value;
      const changed = !!edited && edited !== sg.value;
      const itemId = r.cans.template ? (opts?.itemId ?? relevantItem(domainForTheme(theme, text).id, text)?.id) : undefined;
      const evId = uid("evd");
      patch(id, (x) => {
        const next = decideSg(x, sid, keep ? (changed ? "edited" : "accepted") : "rejected", changed ? text : undefined);
        if (!keep || !next.cans) return next;
        return mirrorCans({ ...next, cans: reopened({ ...next.cans, evidence: [...next.cans.evidence, { id: evId, text, source: sg.source, theme, itemId }], evidenceMeta: { ...next.cans.evidenceMeta, [evId]: { by: me(), at: now(), from: "agent", agent: sg.agent } } }) }, now());
      });
      audit(id, keep ? `Kept evidence under ${theme}${changed ? " (edited)" : ""}` : `Discarded proposed evidence (${theme})`, [sg.source.ref, itemId ? `Tied to ${itemName(rec(id), itemId)}` : ""].filter(Boolean).join(" · "));
      if (!rec(id)?.suggestions.some((x) => x.section === "cans" && x.field.startsWith("evidence:") && x.status === "pending")) closeTasks(id, (t) => t.role === "cans" && t.section === "cans", "Every proposal was kept or discarded by a person");
    },
    addCansEvidence: (id, it) => {
      const evId = uid("evd");
      cansPatch(id, (c) => reopened({ ...c, evidence: [...c.evidence, { id: evId, text: it.text, source: it.source, theme: it.theme, itemId: it.itemId }], evidenceMeta: { ...c.evidenceMeta, [evId]: { by: me(), at: now(), from: "staff" } } }));
      audit(id, `Added evidence under ${it.theme}`, [it.source.ref, it.itemId ? `Tied to ${itemName(rec(id), it.itemId)}` : ""].filter(Boolean).join(" · "));
    },
    removeCansEvidence: (id, evId) => {
      const ev = rec(id)?.cans?.evidence.find((e) => e.id === evId);
      if (!ev) return;
      cansPatch(id, (c) => reopened({ ...c, evidence: c.evidence.filter((e) => e.id !== evId) }));
      audit(id, `Removed evidence from ${ev.theme ?? "Other"}`, ev.text.slice(0, 120));
    },
    setCansEvidenceItem: (id, evId, itemId) => {
      const r = rec(id);
      if (!r?.cans?.evidence.some((e) => e.id === evId)) return;
      cansPatch(id, (c) => reopened({ ...c, evidence: c.evidence.map((e) => (e.id === evId ? { ...e, itemId: itemId ?? undefined } : e)) }));
      audit(id, itemId ? `Tied evidence to ${itemName(r, itemId)}` : "Untied evidence from its item");
    },

    proposeCansSummary: (id, text, agent) => {
      const sid = uid("sg");
      patch(id, (r) => ({
        ...r,
        suggestions: [...r.suggestions.map((x) => (x.section === "cans" && x.field === "narrative" && x.status === "pending" ? { ...x, status: "rejected" as const, decidedBy: "system", decidedAt: now() } : x)),
          { id: sid, section: "cans", field: "narrative", value: text, source: { kind: "staff", ref: "Kept CANS evidence on this record" }, confidence: "medium", agent, at: now(), status: "pending" }],
      }));
      return sid;
    },
    decideCansSummary: (id, sid, decision, edited) => {
      const sg = rec(id)?.suggestions.find((x) => x.id === sid);
      if (!sg || sg.status !== "pending") return;
      patch(id, (r) => {
        const next = decideSg(r, sid, decision, decision === "edited" ? edited : undefined);
        if (decision === "rejected" || !next.cans || next.cans.status === "signed") return next;
        return mirrorCans({ ...next, cans: reopened({ ...next.cans, narrative: decision === "edited" ? edited ?? sg.value : sg.value }) }, now());
      });
      audit(id, decision === "rejected" ? "Rejected the AI-generated evidence summary" : decision === "edited" ? "Edited and accepted the AI-generated evidence summary" : "Accepted the AI-generated evidence summary");
      closeTasks(id, (t) => t.role === "cans" && t.action.startsWith("Draft an evidence summary"), "A person decided on the summary");
    },
    setCansNarrative: (id, text) => {
      cansPatch(id, (c) => reopened({ ...c, narrative: text }));
      audit(id, "Updated the CANS narrative observations", text ? undefined : "Cleared");
    },
    setCansDetails: (id, p) => {
      cansPatch(id, (c) => reopened({ ...c, ...p }));
      if (p.assessor !== undefined) audit(id, "Set the CANS assessor", p.assessor ? staffOf(p.assessor)?.name ?? p.assessor : "Cleared");
      if (p.date !== undefined) audit(id, "Set the planned CANS assessment date", p.date ? longDate(p.date) : "Cleared");
    },
    recordCredentialCheck: (id, credential, status, note) => {
      cansPatch(id, (c) => ({ ...c, assessorCredential: credential, credentialStatus: status, credentialCheck: { by: me(), at: now(), note } }));
      audit(id, `Recorded a credential check: ${status === "verified" ? "license confirmed" : "could not confirm"}`, [credential, note].filter(Boolean).join(" · "));
    },
    validateCansTemplate: (id, fileName) => {
      const result = "Cannot validate: the official DMAS item mapping is not available in this demo";
      set((s) => ({ cansTemplateAttempts: [{ id: uid("tpl"), fileName, at: s.clock, by: meOf(s), recordId: id, result }, ...s.cansTemplateAttempts] }));
      audit(id, "Tried to validate a CANS Lifetime template file", `${fileName}: ${result}. No items were created.`);
      return result;
    },

    markCansReady: (id) => {
      const r = rec(id);
      if (!r?.cans || r.cans.status === "signed" || cansBlockers(r).length) return false;
      cansPatch(id, (c) => ({ ...c, status: "ready_for_review" }));
      audit(id, "Marked the CANS record ready for the clinician's review");
      return true;
    },
    signCans: (id, signerId, rolePlay) => {
      const r = rec(id);
      if (!r?.cans || r.cans.status === "signed" || !canSign(signerId) || cansBlockers(r).length) return false;
      cansPatch(id, (c) => ({ ...c, status: "signed", signedBy: signerId, signedAt: now(), rolePlay: rolePlay || undefined }));
      audit(id, `Signed the CANS record (demo placeholder template)${rolePlay ? " (demo role-play)" : ""}`, "Not an official CANS Lifetime assessment", signerId);
      closeTasks(id, (t) => t.gate?.kind === "cans", "A clinician signed the CANS record");
      return true;
    },
    amendCans: (id, reason) => {
      const c = rec(id)?.cans;
      if (!c || c.status !== "signed" || !reason.trim()) return;
      const v = c.version ?? 1;
      patch(id, (r) => (r.cans ? mirrorCans({
        ...r, cans: {
          ...r.cans, version: v + 1, status: "in_progress", signedBy: undefined, signedAt: undefined, rolePlay: undefined,
          history: [...(r.cans.history ?? []), { version: v, status: "signed", items: r.cans.items, narrative: r.cans.narrative, signedBy: r.cans.signedBy, signedAt: r.cans.signedAt, rolePlay: r.cans.rolePlay, supersededAt: now(), note: reason.trim() }],
        },
      }, now()) : r));
      audit(id, `Started version ${v + 1} of the CANS record`, reason.trim());
    },
  };
};
