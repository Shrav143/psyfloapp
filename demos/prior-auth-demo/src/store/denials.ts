import type { StateCreator } from "zustand";
import { APPEAL_LEVELS, APPEAL_WINDOW_DAYS, SEED_ACCEPT_DENIAL, SEED_DENIAL_META, levelOf, siteOfDenial, type CallSlot, type DenialMeta, type DenialWork, type OutcomeKind } from "@/data/denials";
import { SEED_REQUESTS, payerById } from "@/data/seed";
import { siteOf, type SiteId } from "@/data/sites";
import { PROGRAM_LABEL, type PayerId, type CoreProgram, type PsyRequest } from "@/data/types";
import { uid } from "@/lib/format";
import { sitesInView } from "@/lib/scope";
import { DAY, shortDate } from "@/lib/time";
import { paths } from "@/routes";
import type { AppState } from "./index";

/* Denial Intelligence (owner: denials agent).
   `denialMeta` holds what we know about each denial beyond its core request, `denialWork` what the user has done on it.
   Every action also updates the core request, so the Dashboard shows the same chip, clock and history. */

export interface NewDenialInput {
  initials: string;
  age: number;
  payerId: PayerId;
  program: CoreProgram;
  chance: number;
  /** Minutes from now until the peer-to-peer window closes. */
  windowMin: number;
  meta: DenialMeta;
}

/** What the person records when the payer answers a filed appeal. An upheld decision goes on to the next level or is accepted, with the reason for the record. */
export type PayerDecisionInput =
  | { result: "overturned" | "partly"; note: string }
  | { result: "upheld"; note: string; next: "level" }
  | { result: "upheld"; note: string; next: "accept"; reason: string };

export interface DenialsSlice {
  /** The Dashboard's seed plus the one extra open denial where accepting is the better choice (see SEED_ACCEPT_DENIAL). Built here because this slice starts after core. */
  requests: PsyRequest[];
  denialMeta: Record<string, DenialMeta>;
  denialWork: Record<string, DenialWork>;
  /** When (demo minutes) the appeal analysis report was generated for a denial. Absent until the person opens it; Regenerate clears it. */
  denialReportAt: Record<string, number>;
  /** Adds the analysed letter as a new open denial (also on the Dashboard). It belongs to the site in view, Site A when both are in view. Returns its id. */
  addDenial: (input: NewDenialInput) => string;
  bookCall: (id: string, slot: CallSlot) => void;
  setFix: (id: string, fixId: string, on: boolean) => void;
  markReport: (id: string) => void;
  clearReport: (id: string) => void;
  toggleBriefDoc: (id: string, doc: string) => void;
  /** Confirm gate passed: Advocate starts the appeal letter. */
  startAppeal: (id: string) => void;
  saveAppealDraft: (id: string, text: string, evidence: string[]) => void;
  /** Sign-off gate passed: a clinician signed, Navigator files. */
  fileAppeal: (id: string, input: { text: string; evidence: string[]; role: string }) => void;
  acceptDecision: (id: string, reason: string) => void;
  logOutcome: (id: string, kind: OutcomeKind, note: string) => void;
  /** The payer answered a filed appeal. Overturned and partly overturned close the denial; upheld starts the next level or accepts. */
  recordDecision: (id: string, input: PayerDecisionInput) => void;
}

const EMPTY: DenialWork = { fixes: [], ticked: [] };

export const createDenialsSlice: StateCreator<AppState, [], [], DenialsSlice> = (set, get) => {
  const request = (id: string): PsyRequest | undefined => get().requests.find((r) => r.id === id);
  const patchWork = (id: string, patch: Partial<DenialWork>) => set((s) => ({ denialWork: { ...s.denialWork, [id]: { ...(s.denialWork[id] ?? EMPTY), ...patch } } }));
  const payerShort = (r: PsyRequest) => payerById(r.payerId).shortName;
  /** What a request looks like when it leaves "Appeal or call" because the denial is settled. */
  const settled = (clock: number): Partial<PsyRequest> => ({ stage: "decided", progress: 3, stageSince: clock, decidedToday: true, needsYou: false, deadlineAt: undefined, clockNote: undefined, clockSub: undefined, agent: "cadence" });

  /** The daily check and a booked call are over once the answer is in, so their scheduled lines leave the history. */
  const dropScheduled = (id: string) => get().updateRequest(id, { events: (request(id)?.events ?? []).filter((e) => e.done) });

  return {
    requests: [...SEED_REQUESTS, SEED_ACCEPT_DENIAL],
    denialMeta: { ...SEED_DENIAL_META },
    denialWork: {},
    denialReportAt: {},

    addDenial: (input) => {
      const { clock, requests } = get();
      const inView = sitesInView(get());
      const site: SiteId = inView.length === 1 ? inView[0] : "A";
      // The id is chosen so that siteOf(id) is the denial's site: every screen that only has the request (its caseId is its id) then places it the same way.
      let n = 3340;
      while (requests.some((r) => r.id === `D-${n}`) || siteOf(`D-${n}`) !== site) n += 1;
      const id = `D-${n}`;
      const payer = payerById(input.payerId);
      const e = (actor: PsyRequest["events"][number]["actor"], text: string, at: number) => ({ id: uid("ev"), at, actor, text, done: true });
      const created: PsyRequest = {
        id, caseId: id, patient: { initials: input.initials, age: input.age }, payerId: input.payerId, program: input.program, type: "Peer-to-peer",
        stage: "appeal", chip: "Analyzed", tone: "mid", track: "denial", progress: 0, stageSince: clock, deadlineAt: clock + input.windowMin, clockSub: "peer-to-peer window",
        agent: "advocate", next: "Advocate laid out the options. Choose a next step", chance: input.chance, decidedToday: true, outcome: "denied", sentVia: "portal",
        events: [
          e("reader", "Reader read the denial letter and removed identifiers", clock - 3),
          e("advocate", "Advocate checked the notice, the deadline and how the payer applied its own criteria", clock - 2),
          e("historian", `Historian compared ${input.meta.similar} similar ${payer.shortName} decisions`, clock - 1),
        ],
      };
      set((s) => ({ requests: [created, ...s.requests], denialMeta: { ...s.denialMeta, [id]: { ...input.meta, site } } }));
      get().notify({ agent: "advocate", title: "Denial analyzed", body: `${id} (${payer.shortName}, ${PROGRAM_LABEL[input.program]}) is in Denial Intelligence with your options.`, to: paths.denials(id), tone: "mid" });
      get().toast({ title: "The analysis is ready", body: `${id} was added to Open denials.`, tone: "good" });
      return id;
    },

    bookCall: (id, slot) => {
      const r = request(id);
      if (!r) return;
      patchWork(id, { slot });
      get().updateRequest(id, { chip: "Call booked", tone: "neutral", progress: 0, agent: "advocate", needsYou: false, clockNote: `call ${slot.short}`, clockSub: "peer-to-peer window", next: `Call booked ${slot.label}. The brief is ready` });
      get().addEvent(id, { actor: "cadence", text: `Cadence booked the peer-to-peer call for ${slot.label}` });
      get().addEvent(id, { actor: "advocate", text: "Advocate wrote the brief and Integrity checked it against the chart" });
      get().addEvent(id, { actor: "you", text: `Peer-to-peer call with ${payerShort(r)}`, at: slot.startAt, done: false });
      get().toast({ title: "Call booked", body: `${slot.label}. The brief is ready.`, tone: "good" });
    },

    setFix: (id, fixId, on) => {
      const fixes = (get().denialWork[id] ?? EMPTY).fixes.filter((f) => f !== fixId);
      patchWork(id, { fixes: on ? [...fixes, fixId] : fixes });
    },

    markReport: (id) => set((s) => ({ denialReportAt: { ...s.denialReportAt, [id]: s.clock } })),

    clearReport: (id) =>
      set((s) => {
        const { [id]: _gone, ...rest } = s.denialReportAt;
        return { denialReportAt: rest };
      }),

    toggleBriefDoc: (id, doc) => {
      const ticked = (get().denialWork[id] ?? EMPTY).ticked;
      patchWork(id, { ticked: ticked.includes(doc) ? ticked.filter((d) => d !== doc) : [...ticked, doc] });
    },

    startAppeal: (id) => {
      const r = request(id);
      if (!r) return;
      const patch: Partial<PsyRequest> = { chip: "Appeal drafting", tone: "mid", progress: 1, agent: "advocate", next: "Advocate is drafting the appeal" };
      if (r.clockSub !== "to file" && r.clockSub !== "to resubmit") Object.assign(patch, { deadlineAt: r.stageSince + APPEAL_WINDOW_DAYS * DAY, clockSub: "to file", clockNote: undefined });
      get().updateRequest(id, patch);
      get().addEvent(id, { actor: "you", text: "You chose a written appeal" });
      get().addEvent(id, { actor: "advocate", text: "Advocate started the appeal letter" });
    },

    saveAppealDraft: (id, text, evidence) => {
      const first = !get().denialWork[id]?.appealDraft;
      patchWork(id, { appealDraft: { text, evidence, draftedAt: get().clock } });
      if (first) {
        get().updateRequest(id, { next: "Appeal drafted. Waiting for a clinician's signature", needsYou: true });
        get().addEvent(id, { actor: "advocate", text: "Advocate drafted the appeal and Integrity checked every sentence against the chart" });
      }
    },

    fileAppeal: (id, input) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      const decisionAt = clock + 30 * DAY;
      const level = levelOf(r.chip, get().denialWork[id]);
      patchWork(id, { level, appealDraft: { text: input.text, evidence: input.evidence, draftedAt: clock }, appealFiled: { at: clock, role: input.role, decisionBy: shortDate(decisionAt) } });
      get().updateRequest(id, { chip: APPEAL_LEVELS[level].filedChip, tone: "neutral", progress: 1, agent: "navigator", needsYou: false, next: "Waiting on the payer", deadlineAt: undefined, clockNote: `decision ${shortDate(decisionAt)}`, clockSub: `filed ${shortDate(clock)}` });
      get().addEvent(id, { actor: "you", text: `You signed the appeal as ${input.role}`, detail: "Attested that the letter was reviewed against the chart." });
      get().addEvent(id, { actor: "navigator", text: "Navigator filed the appeal through the payer's portal and saved the receipt" });
      get().addEvent(id, { actor: "navigator", text: "Navigator checks for the decision each day", at: clock + DAY, done: false });
      get().notify({ agent: "navigator", title: level ? `${APPEAL_LEVELS[level].name} filed` : "Appeal filed", body: `${id} was filed with ${payerShort(r)}. The decision is expected ${shortDate(decisionAt)}.`, to: paths.dashboard({ request: id }), tone: "good" });
      get().toast({ title: level ? `${APPEAL_LEVELS[level].name} filed` : "Appeal filed", body: `${payerShort(r)} decides by ${shortDate(decisionAt)}. It shows on the Dashboard.`, tone: "good" });
    },

    acceptDecision: (id, reason) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      patchWork(id, { accepted: { reason, at: clock } });
      get().updateRequest(id, { ...settled(clock), chip: "Accepted", tone: "neutral", outcome: "denied", next: "Closed. Logged as an accepted denial" });
      dropScheduled(id);
      get().addEvent(id, { actor: "you", text: "You accepted the decision", detail: `Reason: ${reason}` });
      get().addEvent(id, { actor: "cadence", text: "Cadence logged the accepted denial for Analytics and added a step-down plan to Case Manager" });
      get().recordDenialAccepted({ denialId: id, requestId: r.caseId, payerId: r.payerId });
      get().notify({ agent: "cadence", title: "Denial closed", body: `${id} was accepted. Analytics logs it as an accepted denial and Case Manager has a step-down plan.`, to: paths.manager("cases"), tone: "neutral" });
      get().toast({ title: "Decision accepted", body: "Analytics logs it as an accepted denial. Case Manager has a step-down plan.", tone: "neutral" });
    },

    logOutcome: (id, kind, note) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      const word = kind === "overturned" ? "overturned" : kind === "partly" ? "partly restored" : "upheld";
      patchWork(id, { outcome: { kind, note, at: clock } });
      dropScheduled(id);
      get().addEvent(id, { actor: "you", text: `You logged the call outcome: ${word}`, detail: note || undefined });
      if (kind === "upheld") {
        get().updateRequest(id, { chip: "Appeal drafting", tone: "mid", progress: 1, agent: "advocate", needsYou: false, next: "Call upheld. Advocate is drafting the appeal", clockNote: undefined, clockSub: "to file", deadlineAt: r.stageSince + APPEAL_WINDOW_DAYS * DAY });
        get().addEvent(id, { actor: "advocate", text: "Advocate started a written appeal from the call notes" });
        get().toast({ title: "Outcome logged: upheld", body: "Advocate started the written appeal. Open it from the denial.", tone: "mid" });
      } else {
        const full = kind === "overturned";
        get().updateRequest(id, { ...settled(clock), chip: full ? "Overturned" : "Partly restored", tone: full ? "good" : "mid", outcome: full ? "approved" : "partly_approved", next: full ? "Overturned on the call. Next review booked" : "Partly restored on the call. Next review booked" });
        get().addEvent(id, { actor: "payer", text: full ? `${payerShort(r)} restored the requested days on the call` : `${payerShort(r)} restored part of the requested days on the call` });
        get().addEvent(id, { actor: "cadence", text: "Cadence updated the ledger and booked the next review" });
        get().toast({ title: full ? "Overturned" : "Partly restored", body: "The ledger is updated and the next review is booked.", tone: "good" });
      }
      get().notify({ agent: "advocate", title: `Call outcome: ${word}`, body: `${id} was logged as ${word}.`, to: paths.dashboard({ request: id }), tone: kind === "upheld" ? "risk" : "good" });
    },

    recordDecision: (id, input) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      const level = levelOf(r.chip, get().denialWork[id]);
      const further = input.result === "upheld" && input.next === "level" ? APPEAL_LEVELS[level + 1] : undefined;
      const word = input.result === "overturned" ? "overturned" : input.result === "partly" ? "partly overturned" : "upheld";
      const said = input.result === "overturned" ? "overturned the denial" : input.result === "partly" ? "partly overturned the denial" : "upheld its decision";
      patchWork(id, { decision: { result: input.result, note: input.note, at: clock, nextLevel: further?.name } });
      dropScheduled(id);
      get().addEvent(id, { actor: "you", text: `You recorded the payer's decision: ${word}`, detail: input.note || undefined });
      get().addEvent(id, { actor: "payer", text: `${payerShort(r)} ${said} on the ${APPEAL_LEVELS[level].name.toLowerCase()}` });
      get().recordAppealDecision({ denialId: id, requestId: r.caseId, payerId: r.payerId, result: input.result, nextLevel: further?.name });
      get().notify({ agent: "navigator", title: `Appeal decision: ${word}`, body: `${id}: ${payerShort(r)} ${said}.`, to: paths.dashboard({ request: id }), tone: input.result === "upheld" ? "risk" : "good" });
      if (input.result !== "upheld") {
        const full = input.result === "overturned";
        get().updateRequest(id, { ...settled(clock), chip: full ? "Overturned" : "Partly overturned", tone: full ? "good" : "mid", outcome: full ? "approved" : "partly_approved", next: full ? "Overturned on appeal. Next review booked" : "Partly overturned on appeal. Next review booked" });
        get().addEvent(id, { actor: "cadence", text: "Cadence updated the ledger and booked the next review" });
        get().toast({ title: full ? "Overturned" : "Partly overturned", body: "The ledger is updated and the next review is booked.", tone: "good" });
      } else if (input.next === "accept") {
        get().acceptDecision(id, input.reason);
      } else if (further) {
        patchWork(id, { level: level + 1, appealFiled: undefined, appealDraft: undefined });
        get().updateRequest(id, { chip: "Appeal drafting", tone: "mid", progress: 1, agent: "advocate", needsYou: false, next: `${payerShort(r)} upheld its decision. Advocate is drafting the ${further.name.toLowerCase()}`, deadlineAt: clock + further.days * DAY, clockSub: "to file", clockNote: undefined });
        get().addEvent(id, { actor: "advocate", text: `Advocate started the ${further.name.toLowerCase()} letter` });
        get().toast({ title: "Decision recorded: upheld", body: `Advocate started the ${further.name.toLowerCase()}. Open it from the denial.`, tone: "mid" });
      }
    },
  };
};

/** The denials open at the sites in view: the requests in "Appeal or call" whose site is one of them. A plain function, not a selector: it builds a new list each time, so a component calls it inside useMemo. */
export const openDenialsInView = (s: Pick<AppState, "requests" | "denialMeta" | "viewerId" | "siteScope">): PsyRequest[] => {
  const sites = sitesInView(s);
  return s.requests.filter((r) => r.stage === "appeal" && sites.includes(siteOfDenial(s.denialMeta[r.id], r.caseId)));
};

/** Sidebar badge: open denials at the sites in view. For Both sites it is the Dashboard's 8; the two sites add up to it. */
export const selectDenialBadge = (s: AppState): number => openDenialsInView(s).length;
