import type { StateCreator } from "zustand";
import { EMPTY_WORK } from "@/data/caseModel";
import { resolveCase } from "@/data/caseDetail";
import {
  chanceBounds, currentChance, draftState, DUE_FOR, freshRun, needsPerson, nextCaseCode, planTypeOf, QUESTIONS, queueItemOf, RUN_STEPS, SCRIBE_STEP,
  type AuthKind, type CaseDraft, type DocSlotId, type DocumentedReason, type DraftDocument, type WorkflowChoice, type WorkflowLogEntry,
} from "@/data/cases";
import { authorizationsOf, episodesOf, isoOf, patientById } from "@/data/patients";
import { payerById } from "@/data/seed";
import type { SiteId } from "@/data/sites";
import { chanceFor } from "@/data/programTables";
import { isCoreProgram, PROGRAM_LABEL, type AgentKey } from "@/data/types";
import { verify } from "@/data/verification";
import { viewerById } from "@/data/viewers";
import type { AppliedWorkflow } from "@/data/workflow/types";
import { uid } from "@/lib/format";
import { DAY } from "@/lib/time";
import { authType, defaultTypeFor } from "@/pages/newcase/authType";
import { draftForRequest, mergeRequestDraft, requestDraft, requestState } from "@/pages/newcase/fromRequest";
import { payerContextOf } from "@/pages/newcase/payerContext";
import { unmetCount } from "@/pages/newcase/payerRules";
import { verificationKey, wantOf } from "@/pages/newcase/verificationFor";
import { pendingFor, planQuestions } from "@/pages/newcase/questions";
import { NEW_CASE_STEPS, stepIndex } from "@/pages/newcase/steps";
import { blankDraft, SEED_DRAFTS } from "@/pages/newcase/seedDrafts";
import type { AppState } from "./index";
import { selectPatientBook } from "./patients";

/* New Case drafts and Case Manager (owner: new-case agent).
   A draft is everything about one case being prepared: the intake, the documents, the agents' run, the answers, the summary.
   The pages never keep this in component state, so Back, Save as draft and "Resume" all work, and Reset demo data restores it. */
export interface CasesSlice {
  caseDrafts: CaseDraft[];
  /** IDs of requests sent today. Four were sent before the demo starts; Sign and send adds to it. */
  caseSentToday: string[];
  caseSeq: number;
  createCaseDraft: (init?: Partial<CaseDraft>) => string;
  patchCaseDraft: (id: string, patch: Partial<CaseDraft>) => void;
  putCaseDocs: (id: string, docs: DraftDocument[]) => void;
  dropCaseDoc: (id: string, slot: DocSlotId) => void;
  /** "Mark not available": the document is handled with a reason. The payer's list still asks for it, so the review warns when it is required. */
  markCaseDocUnavailable: (id: string, slot: DocSlotId, reason: string) => void;
  clearCaseDocUnavailable: (id: string, slot: DocSlotId) => void;
  finishCaseDoc: (id: string, slot: DocSlotId) => void;
  /** Save as draft: the case appears in Case Manager with its own ID. */
  saveCaseDraft: (id: string) => void;
  /** Gives the draft its case ID now (the verification record is keyed by it) without saving the draft. Returns the ID, or null while the level of care is not chosen. */
  ensureCaseId: (id: string) => string | null;
  /** The Authorization type under the page heading. The request type recorded follows it. */
  setCaseKind: (id: string, kind: AuthKind) => void;
  /** A new patient's case belongs to one site. A case that already has its ID cannot change site: the ID places it, and the verification is keyed by it. */
  setCaseSite: (id: string, site: SiteId) => void;
  /** Picks an existing patient (and optionally the treatment episode and authorization) from the patient book. The patient's own details fill the case; no second patient is ever made. */
  chooseCasePatient: (id: string, pick: { patientId: string; episodeId?: string; authorizationId?: string }) => void;
  /** Lets go of the patient, so the person can search again. */
  clearCasePatient: (id: string) => void;
  /** The person went on past a warning and said why. One reason per kind of warning; it is written to the request's history when it is signed. */
  documentReason: (id: string, reason: DocumentedReason) => void;
  clearDocumentedReason: (id: string, kind: DocumentedReason["kind"]) => void;
  /** Removes a draft that was never saved ("Return to Case Manager" from a case that needs no authorization). */
  discardCaseDraft: (id: string) => void;
  /** Start the agents (after the confirm). Sets the chance bounds, the clock for the request and which questions the agents may ask. */
  startCaseRun: (id: string) => void;
  advanceCaseRun: (id: string, seconds: number) => void;
  /** The agent at this step stops and asks the next planned question. */
  askCaseQuestion: (id: string) => void;
  answerCaseQuestion: (id: string, a: { choice: string; answer: string; note?: string }) => void;
  /** An agent could not finish its step. The run holds until the person retries or skips it. */
  failCaseStep: (id: string, agent: AgentKey) => void;
  retryCaseStep: (id: string) => void;
  /** "Skip and note": the step counts as done, the review warns about it and the request's history says so. */
  skipCaseStep: (id: string) => void;
  /** Send back to Scribe: Scribe, Integrity, Packet and Scrubber run again with the note. */
  rerunFromScribe: (id: string, note: string) => void;
  /** Sign and send. `signedBy` is who the person signed as ("Dr. Rivera, clinician"); the request's history says so. Returns the request ID that now shows on the Dashboard. */
  signCaseDraft: (id: string, signedBy?: string, workflowEntries?: Omit<WorkflowLogEntry, "posted">[]) => string | undefined;
  /** The draft for a request that exists on the case page: made from the request's own data when there is none, brought up to date when there is.
      It is moved to the step that fits: Review & submit when the request is ready, Clinical documentation at the agents' section when they still have work to do. Returns its ID. */
  draftFromRequest: (requestId: string) => string;
  /** The payer's saved list or rules changed: count again what the case does not meet, so the approval chance follows. */
  refreshCaseUnmet: (id: string) => void;
  /** The payer workflow on a case: which one it follows (`applied`), that its version is now pinned (`pin`), a person's choice between equals (`choice`, null clears it) and what the workflow did (`entries`).
      Entries already known by their `key` are ignored. Once the request exists they go straight to its History; before that they wait on the draft and are written when it is signed. */
  recordCaseWorkflow: (id: string, patch: { applied?: AppliedWorkflow; forKey?: string; pin?: boolean; choice?: WorkflowChoice | null; entries?: Omit<WorkflowLogEntry, "posted">[] }) => void;
}

/** The line History shows when the person went on past a warning. */
const DOCUMENTED_TEXT: Record<DocumentedReason["kind"], string> = {
  duplicate: "You sent this request knowing a matching one exists",
  coverage: "You went on without confirmed coverage and said why",
  no_auth: "You sent this request although the payer needs no authorization, and said why",
  unavailable: "You went on without a verification and said why",
};
/** The same warnings as a short line of the workflow's trace. */
const OVERRIDE_TEXT: Record<DocumentedReason["kind"], string> = {
  duplicate: "continued with a matching request, reason documented",
  coverage: "continued without confirmed coverage, reason documented",
  no_auth: "continued although no authorization is required, reason documented",
  unavailable: "continued without a verification, reason documented",
};
const INTAKE_KEYS: (keyof CaseDraft)[] = ["patient", "payerId", "memberId", "program", "type", "startDate", "endDate", "change", "retroReason", "reason", "diagnoses", "documents", "unavailable"];

/** The sites the viewer is looking at: the chosen one, or every site they may see. The first is where a new case starts. */
const sitesOf = (s: AppState): SiteId[] => (s.siteScope === "both" ? viewerById(s.viewerId).sites : [s.siteScope]);
/** Changing the intake after the agents have worked means their work is stale, so the run starts over (the portal stays reached, so Verify does not fail twice). */
const staleReset = (d: CaseDraft): Partial<CaseDraft> => ({ run: { ...freshRun(), retried: d.run.retried }, answers: [], questions: [], narrative: null, suggestions: [], revision: 0, sendBackNote: undefined, recordsChanged: true });

export const createCasesSlice: StateCreator<AppState, [], [], CasesSlice> = (set, get) => {
  /** Every change goes through here, so the count of what the payer asks for and the case does not meet is always current. */
  const settle = (d: CaseDraft): CaseDraft => {
    const unmet = unmetCount(d, payerContextOf(get(), d), get().clock);
    return unmet === d.unmet ? d : { ...d, unmet };
  };
  const update = (id: string, fn: (d: CaseDraft) => CaseDraft) => set((s) => ({ caseDrafts: s.caseDrafts.map((d) => (d.id === id ? settle(fn(d)) : d)) }));
  const find = (id: string) => get().caseDrafts.find((d) => d.id === id);
  /** An edit of the medical records. When the agents already ran, their work is stale: the run starts over and the person is told. */
  const change = (id: string, make: (d: CaseDraft) => Partial<CaseDraft>) => {
    const d = find(id);
    if (!d) return;
    const patch = make(d);
    const stale = d.run.done > 0 && INTAKE_KEYS.some((k) => k in patch);
    update(id, (x) => ({ ...x, ...patch, ...(stale ? staleReset(x) : {}) }));
    if (stale) get().toast({ title: "Records changed after the agents ran", body: "Their work was cleared. The agents check again when you continue.", tone: "mid" });
  };

  /** The draft for a request that exists on the case page: made from the request's own data when there is none, brought up to date when there is. */
  const draftFromRequestId = (requestId: string): string => {
    const st = get();
    const detail = resolveCase(requestId, st.requests);
    const existing = draftForRequest(st.caseDrafts, requestId, detail?.requestId);
    /* A request the app cannot describe still opens a draft, at Clinical documentation, never a blank one at Intake. */
    if (!detail) return existing?.id ?? get().createCaseDraft({ caseId: requestId, phase: "records", started: true });
    const work = st.queueCases[detail.requestId] ?? EMPTY_WORK;
    const target = requestDraft(detail, work, st.clock, payerContextOf(st, detail));
    if (!existing) {
      const id = uid("draft");
      set((s) => ({ caseDrafts: [...s.caseDrafts, settle({ ...target, id, updatedAt: s.clock })] }));
      return id;
    }
    update(existing.id, (d) => mergeRequestDraft(d, target, requestState(detail, work)));
    return existing.id;
  };

  return {
    caseDrafts: SEED_DRAFTS,
    caseSentToday: ["I-2231", "R-1088", "P-1611", "P-1637"],
    caseSeq: 1701,

    createCaseDraft: (init) => {
      const id = uid("draft");
      set((s) => ({ caseDrafts: [...s.caseDrafts, settle(blankDraft({ site: sitesOf(s)[0], ...init, id, updatedAt: s.clock }))] }));
      return id;
    },
    patchCaseDraft: (id, patch) => change(id, () => patch),
    putCaseDocs: (id, docs) =>
      change(id, (d) => {
        const unavailable = { ...d.unavailable };
        for (const n of docs) delete unavailable[n.slot];
        return { documents: [...d.documents.filter((x) => !docs.some((n) => n.slot === x.slot)), ...docs], unavailable };
      }),
    dropCaseDoc: (id, slot) => change(id, (d) => ({ documents: d.documents.filter((x) => x.slot !== slot) })),
    markCaseDocUnavailable: (id, slot, reason) => change(id, (d) => ({ documents: d.documents.filter((x) => x.slot !== slot), unavailable: { ...d.unavailable, [slot]: reason.trim() } })),
    clearCaseDocUnavailable: (id, slot) =>
      change(id, (d) => {
        const unavailable = { ...d.unavailable };
        delete unavailable[slot];
        return { unavailable };
      }),
    finishCaseDoc: (id, slot) => update(id, (d) => ({ ...d, documents: d.documents.map((x) => (x.slot === slot ? { ...x, status: "done" } : x)) })),

    ensureCaseId: (id) => {
      const d = find(id);
      if (!d) return null;
      if (d.caseId) return d.caseId;
      if (!d.program) return null;
      const next = nextCaseCode(d.program, get().caseSeq, d.site);
      set({ caseSeq: next.seq });
      update(id, (x) => ({ ...x, caseId: x.caseId ?? next.code }));
      return find(id)?.caseId ?? null;
    },

    saveCaseDraft: (id) => {
      const d = find(id);
      if (!d || d.saved) return;
      get().ensureCaseId(id);
      /* A draft with no level of care yet still gets an ID: it falls under R, at its own site. */
      if (!find(id)?.caseId) {
        const next = nextCaseCode(null, get().caseSeq, d.site);
        set({ caseSeq: next.seq });
        update(id, (x) => ({ ...x, caseId: next.code }));
      }
      update(id, (x) => ({ ...x, saved: true }));
    },

    setCaseKind: (id, kind) => {
      const d = find(id);
      if (!d || d.kind === kind || d.sent) return;
      const def = authType(kind);
      const patch: Partial<CaseDraft> = { kind, type: defaultTypeFor(kind, d.type), what: undefined, documented: (d.documented ?? []).filter((r) => r.kind !== "duplicate") };
      if (kind !== "modify") patch.change = undefined;
      if (kind !== "retro") patch.retroReason = undefined;
      /* A review, renewal or modification follows an existing authorization, so a patient typed in by hand would be a second record: start that search from nothing.
         Initial and retroactive requests keep the patient. A new stay has no authorization or episode yet. */
      if (def.existing && !d.patientId) {
        Object.assign(patch, { patient: { initials: "", age: null }, payerId: null, planType: "", memberId: "", program: null, levelLabel: undefined, referralId: undefined, referrer: undefined, started: false });
      }
      if (!def.existing) Object.assign(patch, { episodeId: null, authorizationId: null });
      change(id, () => patch);
    },

    setCaseSite: (id, site) => {
      const d = find(id);
      if (!d || d.caseId || d.sent || d.site === site || d.patientId) return;
      update(id, (x) => ({ ...x, site }));
    },

    chooseCasePatient: (id, pick) => {
      const d = find(id);
      if (!d) return;
      const book = selectPatientBook(get());
      const p = patientById(book, pick.patientId);
      /* A patient at a site the viewer cannot see does not exist for them, even by a link. */
      if (!p || !sitesOf(get()).includes(p.site)) return;
      const eps = episodesOf(book, p.id);
      const ep = eps.find((e) => e.id === pick.episodeId) ?? (authType(d.kind).existing && eps.length === 1 ? eps[0] : undefined);
      const auth = (ep ? authorizationsOf(book, ep.id) : []).find((a) => a.id === pick.authorizationId) ?? (ep ? authorizationsOf(book, ep.id)[0] : undefined);
      const payerId = ep?.payerId ?? p.payerId;
      const today = get().clock;
      /* A review or a renewal covers the next stretch of care, which starts the day after the approved window ends. Care that has already run out starts today. */
      const after = auth?.approvedTo != null && auth.approvedTo >= today && d.kind !== "modify" ? isoOf(auth.approvedTo + DAY) : isoOf(today);
      const patch: Partial<CaseDraft> = {
        patientId: p.id, episodeId: ep?.id ?? null, authorizationId: auth?.id ?? null, started: true,
        patient: { initials: p.initials, age: p.age }, payerId, planType: planTypeOf(payerId), memberId: p.memberMasked,
        program: ep?.program ?? d.program, levelLabel: ep && ep.levelLabel !== PROGRAM_LABEL[ep.program] ? ep.levelLabel : undefined, site: p.site,
        basis: auth && authType(d.kind).existing ? { label: auth.label, unit: auth.unit, authorized: auth.authorized, used: auth.used, left: auth.left, from: auth.approvedFrom === null ? null : isoOf(auth.approvedFrom), to: auth.approvedTo === null ? null : isoOf(auth.approvedTo) } : undefined,
        ...(authType(d.kind).existing || !d.startDate ? { startDate: after } : {}),
        caseId: d.caseId && d.site !== p.site ? null : d.caseId,
      };
      change(id, () => patch);
    },

    clearCasePatient: (id) => change(id, () => ({ basis: undefined, patientId: null, episodeId: null, authorizationId: null, started: false, patient: { initials: "", age: null }, payerId: null, planType: "", memberId: "", program: null, levelLabel: undefined, verificationId: null })),

    documentReason: (id, reason) => {
      update(id, (d) => ({ ...d, documented: [...(d.documented ?? []).filter((r) => r.kind !== reason.kind), reason] }));
      /* Going on past a warning is an override of what the workflow would do next, so it is part of the workflow's trace. */
      const d = find(id);
      if (d?.appliedWorkflow) get().recordCaseWorkflow(id, { entries: [{ key: `override:${reason.kind}:${reason.reason}`, at: get().clock, actor: "you", text: `Override: ${OVERRIDE_TEXT[reason.kind]}`, detail: `At ${NEW_CASE_STEPS[stepIndex(d)]}, ${d.appliedWorkflow.name} v${d.appliedWorkflow.version}. Your reason: ${reason.reason}` }] });
    },
    clearDocumentedReason: (id, kind) => update(id, (d) => ({ ...d, documented: (d.documented ?? []).filter((r) => r.kind !== kind) })),
    discardCaseDraft: (id) => set((s) => ({ caseDrafts: s.caseDrafts.filter((d) => !(d.id === id && !d.saved)) })),

    startCaseRun: (id) => {
      get().saveCaseDraft(id);
      const clock = get().clock;
      update(id, (d) => {
        const bounds = chanceBounds(d.payerId);
        const due = d.type ? DUE_FOR[d.type] : undefined;
        return {
          ...d,
          step: 1,
          startChance: bounds.start,
          finalChance: bounds.final,
          questions: planQuestions(d),
          dueKind: d.dueKind ?? due?.kind ?? null,
          dueAt: d.dueAt ?? (due ? clock + due.in : null),
          ...(d.run.done === 0 ? { run: { ...freshRun(), retried: d.run.retried } } : {}),
        };
      });
    },

    advanceCaseRun: (id, seconds) =>
      update(id, (d) => {
        const done = d.run.done + 1;
        return { ...d, recordsChanged: done >= RUN_STEPS.length ? false : d.recordsChanged, run: { ...d.run, done, asked: false, elapsed: [...d.run.elapsed, seconds] } };
      }),
    askCaseQuestion: (id) =>
      update(id, (d) => {
        const step = RUN_STEPS[d.run.done];
        const next = step ? pendingFor(d, step.agent)[0] : undefined;
        return next ? { ...d, run: { ...d.run, asked: true, question: next } } : d;
      }),

    answerCaseQuestion: (id, a) => {
      const d = find(id);
      if (!d?.run.question) return;
      const def = QUESTIONS[d.run.question];
      const payer = d.payerId ? payerById(d.payerId).shortName : "the payer";
      update(id, (x) => ({
        ...x,
        run: { ...x.run, asked: true, question: null },
        answers: [...x.answers, { key: def.key, agent: def.agent, question: def.text(payer), choice: a.choice, answer: a.answer, note: a.note }],
        narrative: null,
      }));
    },

    failCaseStep: (id, agent) => update(id, (d) => ({ ...d, run: { ...d.run, failed: agent } })),
    retryCaseStep: (id) => update(id, (d) => ({ ...d, run: { ...d.run, failed: null, retried: true } })),
    skipCaseStep: (id) =>
      update(id, (d) => {
        const agent = d.run.failed;
        if (!agent) return d;
        return { ...d, run: { ...d.run, failed: null, done: d.run.done + 1, asked: false, elapsed: [...d.run.elapsed, 1], skipped: [...d.run.skipped, agent] } };
      }),

    rerunFromScribe: (id, note) =>
      update(id, (d) => ({
        ...d,
        step: 1,
        run: { ...d.run, done: SCRIBE_STEP, asked: true, question: null, failed: null, elapsed: d.run.elapsed.slice(0, SCRIBE_STEP) },
        narrative: null,
        revision: d.revision + 1,
        sendBackNote: note.trim() || undefined,
      })),

    signCaseDraft: (id, signedBy, workflowEntries = []) => {
      const d = find(id);
      if (!d || !d.payerId || !d.program || !d.type || draftState(d) !== "ready") return undefined;
      const known = new Set(get().requests.find((r) => r.id === d.caseId)?.events.map((e) => e.id));
      const requestId = get().submitCase({
        caseId: d.caseId ?? undefined,
        patient: { initials: d.patient.initials, age: d.patient.age ?? 0 },
        payerId: d.payerId,
        program: d.program,
        type: d.type,
        chance: chanceFor(d.program, currentChance(d)) ?? undefined,
        referralId: d.referralId,
      });
      /* The events happened just now, in order: at the demo's current minute, so History puts them after what was done on the case page before signing.
         The person signs as the clinician they chose, and the line says so. */
      const sent = get().requests.find((r) => r.id === requestId);
      if (sent) {
        const mapped = sent.events.map((e) => {
          if (!e.done || known.has(e.id)) return e;
          const text = e.text === "You signed and sent the request" && signedBy ? `You signed as ${signedBy} and sent the request` : e.text;
          return { ...e, at: get().clock, text };
        });
        /* What the payer workflow did before the signature happened first, so History reads in order. */
        const before = [...(d.workflowLog ?? []).filter((e) => !e.posted), ...workflowEntries].map((e) => ({ id: uid("ev"), at: e.at, actor: e.actor, text: e.text, detail: e.detail, done: true }));
        const firstNew = mapped.findIndex((e) => !known.has(e.id));
        get().updateRequest(requestId, { events: firstNew < 0 ? [...mapped, ...before] : [...mapped.slice(0, firstNew), ...before, ...mapped.slice(firstNew)] });
      }
      if (d.run.skipped.includes("verify")) get().addEvent(requestId, { actor: "verify", text: `Verify could not reach ${payerById(d.payerId).shortName}'s portal before signing`, detail: "Coverage was not confirmed. You skipped it and noted it." });
      /* The Authorizations queue lists it too: it is with the payer now. */
      const sentRequest = get().requests.find((r) => r.id === requestId);
      const sentProgram = sentRequest?.program;
      if (sentRequest && isCoreProgram(sentProgram) && !get().queueItems.some((i) => i.id === requestId)) set((s) => ({ queueItems: [...s.queueItems, queueItemOf(sentRequest, sentProgram, s.clock, d.levelLabel)] }));
      /* The request joins its patient, episode, authorization and verification. A new patient is the request itself; an existing one is never copied. */
      const verified = d.verificationId ?? (get().verifications[requestId] ? requestId : null);
      get().updateRequest(requestId, { patientId: d.patientId ?? requestId, episodeId: d.episodeId ?? `EP-${requestId}`, authorizationId: d.authorizationId ?? `AU-${requestId}`, verificationId: verified ?? undefined });
      for (const r of d.documented ?? []) get().addEvent(requestId, { actor: "you", text: DOCUMENTED_TEXT[r.kind], detail: `${r.about}. Your reason: ${r.reason}` });
      if (d.change) get().addEvent(requestId, { actor: "you", text: "You asked for a change to the authorization", detail: `${d.change.detail || "No detail added"}. This is a request, not an approval. Nothing changes until the payer approves it.` });
      set((s) => ({
        caseDrafts: s.caseDrafts.map((x) => (x.id === id ? { ...x, sent: true, caseId: requestId, workflowPinned: x.appliedWorkflow ? true : x.workflowPinned, workflowLog: x.appliedWorkflow ? [...(x.workflowLog ?? []), ...workflowEntries].map((e) => ({ ...e, posted: true })) : x.workflowLog } : x)),
        caseSentToday: [...s.caseSentToday, requestId],
      }));
      return requestId;
    },

    draftFromRequest: (requestId) => {
      const id = draftFromRequestId(requestId);
      /* The request was opened on the case page, which already checked coverage: its draft finds that check, or makes it, so Eligibility & Benefits is never "not checked" for a request that is on the way to the payer. */
      const d = find(id);
      const key = d ? verificationKey(d) : null;
      const want = d && key ? wantOf(d, key) : null;
      if (d && want && !get().verifications[want.caseId]) get().saveVerification(verify({ ...want, initials: d.patient.initials || null, age: d.patient.age, memberId: d.memberId, site: d.site }, get()));
      return id;
    },

    refreshCaseUnmet: (id) => update(id, (d) => d),

    recordCaseWorkflow: (id, p) => {
      const d = find(id);
      if (!d) return;
      const known = new Set((d.workflowLog ?? []).map((e) => e.key));
      const fresh = (p.entries ?? []).filter((e, i, all) => !known.has(e.key) && all.findIndex((x) => x.key === e.key) === i);
      const request = d.caseId ? get().requests.find((r) => r.id === d.caseId || r.caseId === d.caseId) : undefined;
      update(id, (x) => ({
        ...x,
        ...(p.applied ? { appliedWorkflow: p.applied, workflowFor: p.forKey ?? x.workflowFor } : {}),
        ...(p.pin ? { workflowPinned: true } : {}),
        ...(p.choice !== undefined ? { workflowChoice: p.choice ?? undefined } : {}),
        ...(fresh.length ? { workflowLog: [...(x.workflowLog ?? []), ...fresh.map((e) => ({ ...e, posted: !!request }))] } : {}),
      }));
      if (request) for (const e of fresh) get().addEvent(request.id, { actor: e.actor, text: e.text, detail: e.detail, at: e.at });
    },
  };
};

/** Sidebar badge: drafts that need a person. In the seed, two questions and one signature make 3. */
export const selectActiveBadge = (s: AppState): number => {
  const sites = sitesOf(s);
  return s.caseDrafts.filter((d) => d.saved && !d.sent && needsPerson(d) && sites.includes(d.site)).length;
};
