import type { StateCreator } from "zustand";
import { cssrsReviewReasons } from "@/data/assess/schemas/mh";
import type { AuditEvent, IntakeDocument, IntakeRecord, LevelOfNeedReview, ReferralOut, ReferralOutStatus, ServiceRecommendation, SourceRef } from "@/data/intake/types";
import { REFERRAL_OUT_LABEL } from "@/data/intake/types";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { staffOf } from "@/data/intake/seed";
import { longDate } from "@/lib/time";
import { mirrorLon } from "@/pages/intake/cans/cansState";
import { meOf } from "./intake";
import type { AppState } from "./index";
import { createIntakeCansPriorSlice, type IntakeCansPriorSlice } from "./intakeCansPrior";
import { createIntakeCansWorkSlice, type IntakeCansWorkSlice } from "./intakeCansWork";

/* Intake: Level of Need, care pathway and referral coordination, and the CANS Lifetime slices (intakeCansWork: the record, its items and evidence;
   intakeCansPrior: assessments found for the person). Generic actions (fields, suggestions, tasks, audit) are in intake.ts. Agents only ever add
   suggestions, evidence proposals, options or drafts through these actions; keeping evidence, selecting a pathway, recording a disposition and sending
   a referral are a person's actions, each audited. */

export type { CansTemplateAttempt, CansTemplateState, EvidenceProposal } from "./intakeCansWork";

type LonFields = Pick<LevelOfNeedReview, "functionalNeeds" | "serviceNeeds" | "recommendations" | "reviewNote" | "missing" | "reviewer">;
type NewPathway = Omit<ServiceRecommendation, "id" | "status" | "suggestedBy" | "evidence"> & { evidence?: SourceRef[] };
type NewReferral = Omit<ReferralOut, "id" | "createdAt" | "status" | "timeline">;
/** quiet: timeline only (the agent runner already audits the agent's action). resolve: closes the referral's "needs you" coordination tasks. */
interface Log { action: string; detail?: string; actor?: string; ai?: boolean; quiet?: boolean; resolve?: string }

export interface IntakeCansSlice extends IntakeCansWorkSlice, IntakeCansPriorSlice {
  referralOutCounter: number;

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

export const createIntakeCansSlice: StateCreator<AppState, [], [], IntakeCansSlice> = (set, get, api) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => get().patchIntake(id, fn);
  const me = () => meOf(get());
  const now = () => get().clock;
  const audit = (id: string, action: string, detail?: string, section: "cans" | "pathway" = "cans", actor = me(), ai = false) => get().addIntakeAudit(id, { actor, action, detail, section, ai });
  /** Changes the Level of Need review and keeps `instruments.lon` in step. */
  const lonPatch = (id: string, fn: (l: LevelOfNeedReview) => LevelOfNeedReview) => patch(id, (r) => (r.lon ? mirrorLon({ ...r, lon: fn(r.lon) }, now()) : r));
  /** Close an agent's "needs you" task once a person has decided what it waited on. */
  const closeTasks = (id: string, match: (t: IntakeRecord["tasks"][number]) => boolean, result?: string) => {
    for (const t of rec(id)?.tasks ?? []) if (t.status === "needs_you" && match(t)) get().updateIntakeTask(id, t.id, { status: "done", approval: "approved", result: result ?? t.result });
  };

  /* A C-SSRS result a clinician records that is positive, or risk wording in what they wrote, goes to the safety alert flow: a banner on the workspace
     that a clinician must review. It watches the instrument instance, so it works wherever the module is edited. Psyflo never decides safety. */
  api.subscribe((s, prev) => {
    if (s.intakes === prev.intakes) return;
    for (const r of s.intakes) {
      const cur = r.instruments?.cssrs;
      const before = prev.intakes.find((x) => x.id === r.id)?.instruments?.cssrs;
      if (!cur || cur === before || r.safety?.status === "open") continue;
      const known = new Set(before ? cssrsReviewReasons(before.fields, before.score) : []);
      const reason = cssrsReviewReasons(cur.fields, cur.score).find((x) => !known.has(x));
      if (!reason) continue;
      s.raiseSafety(r.id, { raisedBy: meOf(s), text: `${reason} A clinician reviews it now. Psyflo does not decide whether a person is safe.`, source: { kind: "form", ref: "C-SSRS module (result entered by the clinician)" } });
    }
  });

  return {
    ...createIntakeCansWorkSlice(set, get, api),
    ...createIntakeCansPriorSlice(set, get, api),
    referralOutCounter: 5101,

    startLonReview: (id) => {
      if (rec(id)?.lon) return;
      patch(id, (r) => mirrorLon({ ...r, lon: { status: "in_review", modelVersion: null, functionalNeeds: "", serviceNeeds: "", recommendations: "", reviewNote: "", missing: [], startedBy: me(), startedAt: now() } }, now()));
      audit(id, "Started a Level of Need review", "No validated model is configured; no level is calculated");
    },
    saveLonReview: (id, p) => {
      lonPatch(id, (l) => ({ ...l, ...p, updatedBy: me(), updatedAt: now() }));
      const onlyReviewer = p.reviewer !== undefined && Object.keys(p).length === 1;
      audit(id, onlyReviewer ? "Assigned the Level of Need reviewer" : "Saved the Level of Need review", onlyReviewer && p.reviewer ? staffOf(p.reviewer)?.name : undefined);
    },
    dispositionLon: (id, disposition, signerId, rolePlay) => {
      lonPatch(id, (l) => ({ ...l, status: "dispositioned", disposition, decidedBy: signerId, decidedAt: now(), rolePlay }));
      audit(id, "Level of Need review disposition recorded", disposition, "cans", signerId);
    },
    reopenLon: (id) => {
      lonPatch(id, (l) => ({ ...l, status: "in_review" }));
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
