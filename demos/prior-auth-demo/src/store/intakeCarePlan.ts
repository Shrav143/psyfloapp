import type { StateCreator } from "zustand";
import { blankCarePlan, programForSelection, requestedServiceOf, selectedServiceOf, serviceShort, planGaps } from "@/data/assess/carePlan";
import { programById } from "@/data/assess/programs";
import { canSign } from "@/data/assess/roles";
import type { CarePlan, CareSetting } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { authType } from "@/pages/newcase/authType";
import { episodeLink, kindOfIntake } from "@/pages/newcase/fromIntake";
import type { AppState } from "./index";
import { meOf } from "./intake";
import { selectPatientBook } from "./patients";

/* Care planning: the clinician's service selection, the care plan, its approval and versions, and the preparation of an authorization from the intake.
   Psyflo ranks nothing and selects nothing: every decision here needs a qualified clinician's signature (the sign-off dialog), and nothing is sent to a payer. */

export type CarePlanText = "interventions" | "frequency" | "duration" | "coordination" | "transition" | "caregiver";

export interface IntakeCarePlanSlice {
  /** Starts the care plan (a draft) when the clinician first opens Care planning. */
  startCarePlan: (id: string) => void;
  setCarePlanText: (id: string, field: CarePlanText, value: string) => void;
  /** The staff member responsible for delivering the plan. */
  setCareStaff: (id: string, staffId: string) => void;
  addCareGoal: (id: string, text: string) => void;
  setCareGoal: (id: string, goalId: string, text: string) => void;
  removeCareGoal: (id: string, goalId: string) => void;
  /** "Considered by the clinician": marks an option under review, or takes it back. A selected option stays selected. */
  setOptionConsidered: (id: string, pwId: string, considered: boolean) => void;
  /** A qualified clinician selects the service. `reason` is needed when it differs from what the referral asked for or replaces an earlier selection. The completed assessment is kept. Returns false when it cannot be done. */
  selectService: (id: string, pwId: string, o: { signerId: string; rolePlay: boolean; reason: string }) => boolean;
  /** The summary a clinician reads. `ai` is true while the text is the AI suggested draft; a person's edit makes it theirs and clears any confirmation. */
  setCareSummary: (id: string, text: string, ai: boolean) => void;
  confirmCareSummary: (id: string, signerId: string, rolePlay: boolean) => boolean;
  /** A qualified clinician approves the plan. Returns false while the plan lacks what it needs. */
  approveCarePlan: (id: string, signerId: string, rolePlay: boolean) => boolean;
  /** Reopens an approved plan as the next version and keeps the approved one. */
  reviseCarePlan: (id: string, reason: string) => boolean;
  /** Links the intake to the treatment episode its authorization belongs to (a continued stay, a reauthorization, a modification). */
  linkIntakeEpisode: (id: string, patientId: string, episodeId: string) => void;
  /** Creates the linked authorization draft, or reopens the one that exists, and returns its id. Needs an approved care plan and a selected service; nothing is submitted. */
  prepareAuthorization: (id: string) => string | null;
}

let n = 0;
const uidG = (): string => `goal-${Date.now().toString(36)}-${++n}`;

export const createIntakeCarePlanSlice: StateCreator<AppState, [], [], IntakeCarePlanSlice> = (_set, get) => {
  const rec = (id: string): IntakeRecord | undefined => get().intakes.find((r) => r.id === id);
  const me = () => meOf(get());
  const name = (id: string) => staffOf(id)?.name ?? id;
  const audit = (id: string, action: string, detail?: string, actor = me()) => get().addIntakeAudit(id, { actor, action, detail, section: "pathway" });
  const ensure = (id: string): boolean => {
    const r = rec(id);
    if (!r) return false;
    if (!r.carePlan) get().patchIntake(id, (x) => ({ ...x, carePlan: blankCarePlan(x) }));
    return true;
  };
  const edit = (id: string, fn: (c: CarePlan) => CarePlan) => {
    if (!ensure(id)) return;
    get().patchIntake(id, (x) => (x.carePlan ? { ...x, carePlan: fn(x.carePlan) } : x));
  };
  const open = (id: string): boolean => rec(id)?.carePlan?.status !== "approved";
  const log = (c: CarePlan, who: string, what: string): CarePlan => ({ ...c, history: [...c.history, { at: get().clock, who, what }] });

  return {
    startCarePlan: (id) => {
      if (!rec(id)?.carePlan && ensure(id)) audit(id, "Started the care plan");
    },
    setCarePlanText: (id, field, value) => {
      if (open(id)) edit(id, (c) => ({ ...c, [field]: value }));
    },
    setCareStaff: (id, staffId) => {
      if (open(id)) edit(id, (c) => ({ ...c, responsibleStaff: staffId || undefined }));
    },
    addCareGoal: (id, text) => {
      if (open(id) && text.trim()) edit(id, (c) => ({ ...c, goals: [...c.goals, { id: uidG(), text: text.trim() }] }));
    },
    setCareGoal: (id, goalId, text) => {
      if (open(id)) edit(id, (c) => ({ ...c, goals: c.goals.map((g) => (g.id === goalId ? { ...g, text } : g)) }));
    },
    removeCareGoal: (id, goalId) => {
      if (open(id)) edit(id, (c) => ({ ...c, goals: c.goals.filter((g) => g.id !== goalId) }));
    },

    setOptionConsidered: (id, pwId, considered) => {
      const pw = rec(id)?.pathways.find((p) => p.id === pwId);
      if (!pw || !open(id) || pw.status === "selected") return;
      const next = considered ? "under_review" : "suggested";
      if (pw.status === next) return;
      get().patchIntake(id, (r) => ({ ...r, pathways: r.pathways.map((p) => (p.id === pwId ? { ...p, status: next, decidedBy: considered ? me() : undefined, decidedAt: considered ? get().clock : undefined } : p)) }));
      const label = pw.serviceId === "external" ? pw.externalLabel ?? "External program" : serviceShort(pw.serviceId);
      audit(id, considered ? `Considered ${label}` : `Took back "considered" for ${label}`, "Options are for clinical review. They are not a placement decision.");
    },

    selectService: (id, pwId, o) => {
      const r = rec(id);
      const pw = r?.pathways.find((p) => p.id === pwId);
      if (!r || !pw || !canSign(o.signerId) || !open(id)) return false;
      const prev = selectedServiceOf(r);
      const requested = requestedServiceOf(r);
      const differs = pw.serviceId !== requested;
      const changing = prev !== null && prev !== pw.serviceId;
      if ((differs || changing) && !o.reason.trim()) return false;
      if (prev === pw.serviceId && pw.status === "selected") return true;
      ensure(id);
      const at = get().clock;
      const config = r.config;
      const program = pw.serviceId !== "external" && config ? programForSelection(pw.serviceId, config.population, config.programId) : null;
      get().patchIntake(id, (x) => ({
        ...x,
        /* One selection at a time: the earlier one goes back under review. */
        pathways: x.pathways.map((p) => (p.id === pwId ? { ...p, status: "selected", decidedBy: o.signerId, decidedAt: at, rolePlay: o.rolePlay, note: o.reason.trim() || p.note } : p.status === "selected" ? { ...p, status: "under_review" } : p)),
        carePlan: x.carePlan ? {
          ...x.carePlan, selectedServiceId: pw.serviceId, selectedProgramId: program, selectedBy: o.signerId, selectedAt: at,
          rationale: o.reason.trim() || x.carePlan.rationale, changeReason: differs ? o.reason.trim() : undefined,
          selections: [...(x.carePlan.selections ?? []), { at, who: o.signerId, from: prev, to: pw.serviceId, reason: o.reason.trim(), rolePlay: o.rolePlay }],
          history: [...x.carePlan.history, { at, who: o.signerId, what: `Selected ${serviceShort(pw.serviceId, pw.externalLabel)}${differs ? ` (the referral asked for ${serviceShort(requested)})` : ""}${o.rolePlay ? " as demo role-play" : ""}` }],
        } : x.carePlan,
      }));
      audit(id, `Selected the service ${serviceShort(pw.serviceId, pw.externalLabel)}${o.rolePlay ? " (demo role-play)" : ""}`, differs ? `The referral asked for ${serviceShort(requested)}. Reason: ${o.reason.trim()}` : "As requested by the referral. After clinical review; the options are not a placement decision.", o.signerId);
      /* A different service updates the intake's program, and the completed assessment is kept (the configuration carries finished work forward). */
      if (config && program && program !== config.programId) {
        const def = programById(program);
        const setting: CareSetting = def.settings.includes(config.setting) ? config.setting : def.defaultSetting;
        get().configureIntake(id, { purposeId: config.purposeId, programId: program, population: config.population, setting });
      }
      get().closeClearedTasks(id, get().clock);
      return true;
    },

    setCareSummary: (id, text, ai) => {
      if (!open(id)) return;
      const at = get().clock;
      edit(id, (c) => ({ ...c, summary: { text, ai, draftedAt: c.summary?.draftedAt ?? at } }));
    },
    confirmCareSummary: (id, signerId, rolePlay) => {
      const r = rec(id);
      const s = r?.carePlan?.summary;
      if (!r || !s || !s.text.trim() || !canSign(signerId)) return false;
      edit(id, (c) => (c.summary ? log({ ...c, summary: { ...c.summary, confirmedBy: signerId, confirmedAt: get().clock, rolePlay } }, signerId, `Confirmed the clinical summary${rolePlay ? " as demo role-play" : ""}`) : c));
      audit(id, `Confirmed the clinical summary${rolePlay ? " (demo role-play)" : ""}`, s.ai ? "Started as an AI suggested draft; a clinician reviewed it." : undefined, signerId);
      return true;
    },

    approveCarePlan: (id, signerId, rolePlay) => {
      const r = rec(id);
      if (!r?.carePlan || r.carePlan.status === "approved" || !canSign(signerId) || planGaps(r).length) return false;
      const at = get().clock;
      edit(id, (c) => log({ ...c, status: "approved", approvedBy: signerId, approvedAt: at, rolePlay }, signerId, `Approved care plan version ${c.version ?? 1}${rolePlay ? " as demo role-play" : ""}`));
      audit(id, `Approved the care plan, version ${r.carePlan.version ?? 1}${rolePlay ? " (demo role-play)" : ""}`, `Service: ${serviceShort(selectedServiceOf(r))}. Approval is a clinician's; it is not a payer decision.`, signerId);
      get().closeClearedTasks(id, at);
      return true;
    },

    reviseCarePlan: (id, reason) => {
      const r = rec(id);
      const c = r?.carePlan;
      if (!r || !c || c.status !== "approved" || !reason.trim()) return false;
      const at = get().clock;
      edit(id, (x) => log({
        ...x, status: "draft", version: (x.version ?? 1) + 1, approvedBy: undefined, approvedAt: undefined, rolePlay: undefined,
        versions: [...(x.versions ?? []), { version: x.version ?? 1, approvedBy: x.approvedBy, approvedAt: x.approvedAt, rolePlay: x.rolePlay, supersededAt: at, reason: reason.trim(), selectedServiceId: x.selectedServiceId ?? null, goals: x.goals.map((g) => g.text), interventions: x.interventions, frequency: x.frequency, duration: x.duration ?? "" }],
      }, me(), `Reopened the care plan as version ${(c.version ?? 1) + 1}: ${reason.trim()}`));
      audit(id, `Reopened the care plan as version ${(c.version ?? 1) + 1}`, `${reason.trim()}. Version ${c.version ?? 1} is kept.`);
      return true;
    },

    linkIntakeEpisode: (id, patientId, episodeId) => {
      if (!rec(id)) return;
      get().patchIntake(id, (r) => ({ ...r, patientId, episodeId }));
      audit(id, "Linked the treatment episode", `${episodeId}. A review, renewal or change of this episode reuses it; no new episode is made.`);
    },

    prepareAuthorization: (id) => {
      const s = get();
      const r = rec(id);
      if (!r) return null;
      const stop = (title: string, body?: string) => {
        s.toast({ title, body, tone: "mid" });
        return null;
      };
      if (r.carePlan?.status !== "approved") return stop("The care plan needs a clinician's approval first", "Prepare Authorization opens once a clinician has approved the plan.");
      const sel = selectedServiceOf(r);
      if (!sel) return stop("A clinician selects the service first");
      if (sel === "external") return stop("An external program needs a referral, not an authorization", "Create the referral under Referrals out. Nothing here is sent to a payer.");
      const kind = kindOfIntake(r);
      if (!kind) return stop("This intake purpose leads to no authorization", "A screening or a discharge assessment needs care coordination, not a payer request.");
      if (authType(kind).existing && !episodeLink(r, selectPatientBook(s))?.episodeId) return stop("Link the treatment episode first", `${authType(kind).label} reviews an episode that already exists. Choose it, and the request reuses it.`);
      const draft = s.startCaseFromIntake(id, kind);
      if (draft) {
        const open = s.caseDrafts.find((d) => d.id === draft);
        const program = serviceById(sel).program;
        if (open && open.program !== program && !open.sent) s.patchCaseDraft(draft, { program });
      }
      return draft;
    },
  };
};
