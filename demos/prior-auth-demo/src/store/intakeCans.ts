import type { StateCreator } from "zustand";
import type { AgentKey } from "@/data/types";
import type { AuditEvent, CansAssessment, IntakeDocument, IntakeRecord, LevelOfNeedReview, ReferralOut, ReferralOutStatus, ServiceRecommendation, SourceRef, Suggestion } from "@/data/intake/types";
import { REFERRAL_OUT_LABEL } from "@/data/intake/types";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { staffOf } from "@/data/intake/seed";
import { longDate } from "@/lib/time";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* Intake: CANS Lifetime, Level of Need, care pathway and referral coordination. Section-specific actions on IntakeRecord go here; generic ones
   (fields, suggestions, tasks, audit) are in intake.ts. Agents only ever add suggestions, evidence proposals, options or drafts through these
   actions; keeping evidence, selecting a pathway, recording a disposition and sending a referral are a person's actions, each audited. */

/** One statement the CANS Evidence Agent proposes, or a person adds by hand. `theme` is a Psyflo theme, never a CANS domain. */
export interface EvidenceProposal { text: string; theme: string; source: SourceRef }
/** A template file an administrator tried to validate. Validation always fails in the demo: the official mapping is not available. */
export interface CansTemplateAttempt { id: string; fileName: string; at: number; by: string; recordId: string; result: string }

type LonFields = Pick<LevelOfNeedReview, "functionalNeeds" | "serviceNeeds" | "recommendations" | "missing" | "reviewer">;
type NewPathway = Omit<ServiceRecommendation, "id" | "status" | "suggestedBy" | "evidence"> & { evidence?: SourceRef[] };
type NewReferral = Omit<ReferralOut, "id" | "createdAt" | "status" | "timeline">;
/** quiet: timeline only (the agent runner already audits the agent's action). resolve: closes the referral's "needs you" coordination tasks. */
interface Log { action: string; detail?: string; actor?: string; ai?: boolean; quiet?: boolean; resolve?: string }

export interface IntakeCansSlice {
  cansTemplateAttempts: CansTemplateAttempt[];
  referralOutCounter: number;

  /** Staff open a CANS Lifetime preparation record (no items: the official mapping is not configured). */
  startCans: (id: string) => void;
  /** The CANS Evidence Agent's proposals. Returns the new suggestion ids. */
  proposeCansEvidence: (id: string, items: EvidenceProposal[], agent: AgentKey) => string[];
  decideCansEvidence: (id: string, suggestionId: string, keep: boolean) => void;
  addCansEvidence: (id: string, item: EvidenceProposal) => void;
  removeCansEvidence: (id: string, evidenceId: string) => void;
  /** The agent's evidence summary, as a suggestion for the narrative. Returns its id. */
  proposeCansSummary: (id: string, text: string, agent: AgentKey) => string;
  decideCansSummary: (id: string, suggestionId: string, decision: "accepted" | "edited" | "rejected", edited?: string) => void;
  setCansNarrative: (id: string, text: string) => void;
  setCansDetails: (id: string, patch: Partial<Pick<CansAssessment, "assessor" | "date">>) => void;
  recordCredentialCheck: (id: string, credential: string, status: "verified" | "unverified", note?: string) => void;
  validateCansTemplate: (id: string, fileName: string) => string;

  startLonReview: (id: string) => void;
  saveLonReview: (id: string, patch: Partial<LonFields>) => void;
  /** A qualified clinician records the disposition: free text, never a level. */
  dispositionLon: (id: string, disposition: string, signerId: string, rolePlay: boolean) => void;
  reopenLon: (id: string) => void;

  addPathway: (id: string, p: NewPathway) => string;
  /** The Care Pathway Agent's refresh: replaces options that are still suggestions and adds new suggestions. Reviewed options are never touched. */
  applyPathwayRefresh: (id: string, updates: ServiceRecommendation[], added: Omit<ServiceRecommendation, "id">[]) => void;
  setPathwayStatus: (id: string, pwId: string, status: "under_review" | "not_selected", note?: string) => void;
  selectPathway: (id: string, pwId: string, signerId: string, rolePlay: boolean) => void;
  /** Staff make an option the record's requested service and planned start. */
  setRequestedService: (id: string, serviceId: VaServiceId, serviceDate: number, pwId?: string) => void;

  createReferralOut: (id: string, init: NewReferral) => string;
  /** Any change to a referral: written to its timeline and to the record's audit. */
  updateReferralOut: (id: string, roId: string, patch: Partial<ReferralOut>, log: Log) => void;
  setReferralStatus: (id: string, roId: string, status: ReferralOutStatus, log?: Partial<Log> & { patch?: Partial<ReferralOut> }) => void;
  /** Staff upload a file for a document slot (simulated: only the name is kept). It joins the record's documents and is attached. */
  uploadReferralDoc: (id: string, roId: string, slot: string, fileName: string) => void;
}

let n = 0;
const uidC = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
const NEW_CANS = (by: string, at: number): CansAssessment => ({
  status: "in_progress", templateVersion: "awaiting-dmas-mapping", credentialStatus: "not_checked", domains: [], items: [], evidence: [], narrative: "", reassessDue: null,
  evidenceMeta: {}, startedBy: by, startedAt: at,
});

export const createIntakeCansSlice: StateCreator<AppState, [], [], IntakeCansSlice> = (set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => get().patchIntake(id, fn);
  const me = () => meOf(get());
  const now = () => get().clock;
  const audit = (id: string, action: string, detail?: string, section: "cans" | "pathway" = "cans", actor = me(), ai = false) => get().addIntakeAudit(id, { actor, action, detail, section, ai });
  const cansPatch = (id: string, fn: (c: CansAssessment) => CansAssessment) => patch(id, (r) => (r.cans ? { ...r, cans: fn(r.cans) } : r));
  /** Close an agent's "needs you" task once a person has decided what it waited on. */
  const closeTasks = (id: string, match: (t: IntakeRecord["tasks"][number]) => boolean, result?: string) => {
    for (const t of rec(id)?.tasks ?? []) if (t.status === "needs_you" && match(t)) get().updateIntakeTask(id, t.id, { status: "done", approval: "approved", result: result ?? t.result });
  };
  const decideSg = (r: IntakeRecord, sid: string, status: Suggestion["status"], edited?: string): IntakeRecord => ({
    ...r, suggestions: r.suggestions.map((x) => (x.id === sid ? { ...x, status, decidedBy: me(), decidedAt: now(), editedValue: edited } : x)),
  });

  return {
    cansTemplateAttempts: [],
    referralOutCounter: 5101,

    startCans: (id) => {
      if (rec(id)?.cans) return;
      patch(id, (r) => ({ ...r, cans: NEW_CANS(me(), now()) }));
      audit(id, "Started a CANS Lifetime preparation record", "Template awaiting-dmas-mapping: no items configured");
    },
    proposeCansEvidence: (id, items, agent) => {
      const ids = items.map(() => uidC("sg"));
      patch(id, (r) => ({
        ...r,
        suggestions: [...r.suggestions, ...items.map((it, i): Suggestion => ({ id: ids[i], section: "cans", field: `evidence:${it.theme}`, value: it.text, source: it.source, confidence: it.source.kind === "staff" ? "high" : "medium", agent, at: now(), status: "pending" }))],
      }));
      return ids;
    },
    decideCansEvidence: (id, sid, keep) => {
      const r = rec(id);
      const sg = r?.suggestions.find((x) => x.id === sid);
      if (!r?.cans || !sg || sg.status !== "pending") return;
      const theme = sg.field.replace(/^evidence:/, "");
      const evId = uidC("evd");
      patch(id, (x) => {
        const next = decideSg(x, sid, keep ? "accepted" : "rejected");
        if (!keep || !next.cans) return next;
        return { ...next, cans: { ...next.cans, evidence: [...next.cans.evidence, { id: evId, text: sg.value, source: sg.source, theme }], evidenceMeta: { ...next.cans.evidenceMeta, [evId]: { by: me(), at: now(), from: "agent", agent: sg.agent } } } };
      });
      audit(id, keep ? `Kept evidence under ${theme}` : `Discarded proposed evidence (${theme})`, sg.source.ref);
      if (!rec(id)?.suggestions.some((x) => x.section === "cans" && x.field.startsWith("evidence:") && x.status === "pending")) closeTasks(id, (t) => t.role === "cans" && t.section === "cans", "Every proposal was kept or discarded by a person");
    },
    addCansEvidence: (id, it) => {
      const evId = uidC("evd");
      cansPatch(id, (c) => ({ ...c, evidence: [...c.evidence, { id: evId, text: it.text, source: it.source, theme: it.theme }], evidenceMeta: { ...c.evidenceMeta, [evId]: { by: me(), at: now(), from: "staff" } } }));
      audit(id, `Added evidence under ${it.theme}`, it.source.ref);
    },
    removeCansEvidence: (id, evId) => {
      const ev = rec(id)?.cans?.evidence.find((e) => e.id === evId);
      if (!ev) return;
      cansPatch(id, (c) => ({ ...c, evidence: c.evidence.filter((e) => e.id !== evId) }));
      audit(id, `Removed evidence from ${ev.theme ?? "Other"}`, ev.text.slice(0, 120));
    },
    proposeCansSummary: (id, text, agent) => {
      const sid = uidC("sg");
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
        if (decision === "rejected" || !next.cans) return next;
        return { ...next, cans: { ...next.cans, narrative: decision === "edited" ? edited ?? sg.value : sg.value } };
      });
      audit(id, decision === "rejected" ? "Rejected the AI-generated evidence summary" : decision === "edited" ? "Edited and accepted the AI-generated evidence summary" : "Accepted the AI-generated evidence summary");
      closeTasks(id, (t) => t.role === "cans" && t.action.startsWith("Draft an evidence summary"), "A person decided on the summary");
    },
    setCansNarrative: (id, text) => {
      cansPatch(id, (c) => ({ ...c, narrative: text }));
      audit(id, "Updated the CANS narrative observations", text ? undefined : "Cleared");
    },
    setCansDetails: (id, p) => {
      cansPatch(id, (c) => ({ ...c, ...p }));
      if (p.assessor !== undefined) audit(id, "Set the CANS assessor", p.assessor ? staffOf(p.assessor)?.name ?? p.assessor : "Cleared");
      if (p.date !== undefined) audit(id, "Set the planned CANS assessment date", p.date ? longDate(p.date) : "Cleared");
    },
    recordCredentialCheck: (id, credential, status, note) => {
      cansPatch(id, (c) => ({ ...c, assessorCredential: credential, credentialStatus: status, credentialCheck: { by: me(), at: now(), note } }));
      audit(id, `Recorded a credential check: ${status === "verified" ? "license confirmed" : "could not confirm"}`, [credential, note].filter(Boolean).join(" · "));
    },
    validateCansTemplate: (id, fileName) => {
      const result = "Cannot validate: the official DMAS item mapping is not available in this demo";
      set((s) => ({ cansTemplateAttempts: [{ id: uidC("tpl"), fileName, at: s.clock, by: meOf(s), recordId: id, result }, ...s.cansTemplateAttempts] }));
      audit(id, "Tried to validate a CANS Lifetime template file", `${fileName}: ${result}. No items were created.`);
      return result;
    },

    startLonReview: (id) => {
      if (rec(id)?.lon) return;
      patch(id, (r) => ({ ...r, lon: { status: "in_review", modelVersion: null, functionalNeeds: "", serviceNeeds: "", recommendations: "", missing: [], startedBy: me(), startedAt: now() } }));
      audit(id, "Started a Level of Need review", "No validated model is configured; no level is calculated");
    },
    saveLonReview: (id, p) => {
      patch(id, (r) => (r.lon ? { ...r, lon: { ...r.lon, ...p, updatedBy: me(), updatedAt: now() } } : r));
      const onlyReviewer = p.reviewer !== undefined && Object.keys(p).length === 1;
      audit(id, onlyReviewer ? "Assigned the Level of Need reviewer" : "Saved the Level of Need review", onlyReviewer && p.reviewer ? staffOf(p.reviewer)?.name : undefined);
    },
    dispositionLon: (id, disposition, signerId, rolePlay) => {
      patch(id, (r) => (r.lon ? { ...r, lon: { ...r.lon, status: "dispositioned", disposition, decidedBy: signerId, decidedAt: now(), rolePlay } } : r));
      audit(id, "Level of Need review disposition recorded", disposition, "cans", signerId);
    },
    reopenLon: (id) => {
      patch(id, (r) => (r.lon ? { ...r, lon: { ...r.lon, status: "in_review" } } : r));
      audit(id, "Reopened the Level of Need review");
    },

    addPathway: (id, p) => {
      const pwId = uidC("pw");
      patch(id, (r) => ({ ...r, pathways: [...r.pathways, { evidence: [], ...p, id: pwId, status: "suggested", suggestedBy: me(), addedAt: now() }] }));
      audit(id, "Added a care pathway option by hand", p.serviceId === "external" ? p.externalLabel : serviceById(p.serviceId).label, "pathway");
      return pwId;
    },
    applyPathwayRefresh: (id, updates, added) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      patch(id, (r) => ({
        ...r,
        pathways: [...r.pathways.map((p) => (p.status === "suggested" && byId.has(p.id) ? (byId.get(p.id) as ServiceRecommendation) : p)), ...added.map((a) => ({ ...a, id: uidC("pw") }))],
      }));
    },
    setPathwayStatus: (id, pwId, status, note) => {
      const pw = rec(id)?.pathways.find((p) => p.id === pwId);
      if (!pw) return;
      patch(id, (r) => ({ ...r, pathways: r.pathways.map((p) => (p.id === pwId ? { ...p, status, decidedBy: me(), decidedAt: now(), note: status === "not_selected" ? note : p.note, rolePlay: undefined } : p)) }));
      const name = pw.serviceId === "external" ? pw.externalLabel ?? "External referral" : serviceById(pw.serviceId).short;
      audit(id, status === "under_review" ? `Started clinical review of ${name}` : `Marked ${name} not selected`, note, "pathway");
    },
    selectPathway: (id, pwId, signerId, rolePlay) => {
      const pw = rec(id)?.pathways.find((p) => p.id === pwId);
      if (!pw) return;
      patch(id, (r) => ({ ...r, pathways: r.pathways.map((p) => (p.id === pwId ? { ...p, status: "selected", decidedBy: signerId, decidedAt: now(), rolePlay } : p)) }));
      audit(id, `Selected the pathway ${pw.serviceId === "external" ? pw.externalLabel ?? "External referral" : serviceById(pw.serviceId).short}`, "After clinical review. The agent's options are not a placement decision.", "pathway", signerId);
      closeTasks(id, (t) => t.role === "pathway", "A clinician selected a pathway");
    },
    setRequestedService: (id, serviceId, serviceDate, pwId) => {
      const r = rec(id);
      if (!r) return;
      const from = serviceById(r.serviceId).short;
      patch(id, (x) => ({ ...x, serviceId, serviceDate }));
      audit(id, `Changed the requested service from ${from} to ${serviceById(serviceId).short}`, `Planned start ${longDate(serviceDate)}${pwId ? " · from a care pathway" : ""}`, "pathway");
    },

    createReferralOut: (id, init) => {
      const roId = `RO-${get().referralOutCounter + 1}`;
      const ev: AuditEvent = { id: uidC("ev"), at: now(), actor: me(), action: "Created the referral as a draft", detail: init.destination.org };
      set((s) => ({ referralOutCounter: s.referralOutCounter + 1 }));
      patch(id, (r) => ({ ...r, referralsOut: [...r.referralsOut, { ...init, id: roId, createdAt: now(), status: "draft", timeline: [ev] }] }));
      audit(id, `Created referral ${roId} (draft)`, init.destination.org, "pathway");
      return roId;
    },
    updateReferralOut: (id, roId, p, log) => {
      const actor = log.actor ?? me();
      const ev: AuditEvent = { id: uidC("ev"), at: now(), actor, action: log.action, detail: log.detail, ai: log.ai };
      patch(id, (r) => ({ ...r, referralsOut: r.referralsOut.map((x) => (x.id === roId ? { ...x, ...p, timeline: [...x.timeline, ev] } : x)) }));
      if (!log.quiet) audit(id, `${roId}: ${log.action}`, log.detail, "pathway", actor === "destination" ? me() : actor, log.ai);
      if (log.resolve) closeTasks(id, (t) => t.role === "coordination" && t.source === roId, log.resolve);
    },
    setReferralStatus: (id, roId, status, log) => {
      const ro = rec(id)?.referralsOut.find((x) => x.id === roId);
      if (!ro) return;
      get().updateReferralOut(id, roId, { ...log?.patch, status }, {
        action: log?.action ?? `Status: ${REFERRAL_OUT_LABEL[status]}`, detail: log?.detail, actor: log?.actor, ai: log?.ai,
        resolve: status === "sent" ? "A person approved and sent the referral (simulated)" : log?.resolve,
      });
    },
    uploadReferralDoc: (id, roId, slot, fileName) => {
      const docId = uidC("doc");
      const kind: IntakeDocument["kind"] = /release|consent/i.test(slot) ? "consent" : /insurance/i.test(slot) ? "insurance_card" : "other";
      const docu: IntakeDocument = {
        id: docId, name: fileName, kind, receivedAt: now(), simulated: true,
        pages: [[{ kind: "letterhead", org: "Uploaded file (simulated)", sub: `For ${roId}: ${slot}` }, { kind: "p", text: "The demo keeps the file name only. No file contents are stored." }]],
      };
      const ro = rec(id)?.referralsOut.find((x) => x.id === roId);
      if (!ro) return;
      patch(id, (r) => ({ ...r, documents: [...r.documents, docu] }));
      get().updateReferralOut(id, roId, { docs: ro.docs.map((d) => (d.name === slot ? { ...d, attached: true, docId } : d)) }, { action: `Uploaded and attached ${slot}`, detail: `${fileName} (simulated upload)` });
    },
  };
};
