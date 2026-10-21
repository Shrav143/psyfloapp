import type { StateCreator } from "zustand";
import { APPEAL_WINDOW_DAYS, SEED_DENIAL_META, type CallSlot, type DenialMeta, type DenialWork, type OutcomeKind } from "@/data/denials";
import { payerById } from "@/data/seed";
import type { PayerId, Program, PsyRequest } from "@/data/types";
import { money, uid } from "@/lib/format";
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
  program: Program;
  atStake: number;
  chance: number;
  /** Minutes from now until the peer-to-peer window closes. */
  windowMin: number;
  meta: DenialMeta;
}

export interface DenialsSlice {
  denialMeta: Record<string, DenialMeta>;
  denialWork: Record<string, DenialWork>;
  /** Adds the analysed letter as a new open denial (also on the Dashboard). Returns its id. */
  addDenial: (input: NewDenialInput) => string;
  bookCall: (id: string, slot: CallSlot) => void;
  setFix: (id: string, fixId: string, on: boolean) => void;
  toggleBriefDoc: (id: string, doc: string) => void;
  /** Confirm gate passed: Advocate starts the appeal letter. */
  startAppeal: (id: string) => void;
  saveAppealDraft: (id: string, text: string, evidence: string[]) => void;
  /** Sign-off gate passed: a clinician signed, Navigator files. */
  fileAppeal: (id: string, input: { text: string; evidence: string[]; role: string }) => void;
  acceptDecision: (id: string, reason: string) => void;
  logOutcome: (id: string, kind: OutcomeKind, note: string) => void;
}

const EMPTY: DenialWork = { fixes: [], ticked: [] };

export const createDenialsSlice: StateCreator<AppState, [], [], DenialsSlice> = (set, get) => {
  const request = (id: string): PsyRequest | undefined => get().requests.find((r) => r.id === id);
  const patchWork = (id: string, patch: Partial<DenialWork>) => set((s) => ({ denialWork: { ...s.denialWork, [id]: { ...(s.denialWork[id] ?? EMPTY), ...patch } } }));
  const payerShort = (r: PsyRequest) => payerById(r.payerId).shortName;
  /** What a request looks like when it leaves "Appeal or call" because the denial is settled. */
  const settled = (clock: number): Partial<PsyRequest> => ({ stage: "decided", progress: 3, stageSince: clock, decidedToday: true, needsYou: false, deadlineAt: undefined, clockNote: undefined, clockSub: undefined, agent: "cadence" });

  return {
    denialMeta: { ...SEED_DENIAL_META },
    denialWork: {},

    addDenial: (input) => {
      const { clock, requests } = get();
      let n = 3340;
      while (requests.some((r) => r.id === `D-${n}`)) n += 1;
      const id = `D-${n}`;
      const payer = payerById(input.payerId);
      const e = (actor: PsyRequest["events"][number]["actor"], text: string, at: number) => ({ id: uid("ev"), at, actor, text, done: true });
      const created: PsyRequest = {
        id, caseId: id, patient: { initials: input.initials, age: input.age }, payerId: input.payerId, program: input.program, type: "Peer-to-peer",
        stage: "appeal", chip: "Analyzed", tone: "mid", track: "denial", progress: 0, stageSince: clock, deadlineAt: clock + input.windowMin, clockSub: "peer-to-peer window",
        atStake: input.atStake, agent: "advocate", next: "Advocate laid out the options. Choose a next step", chance: input.chance, decidedToday: true, outcome: "denied", sentVia: "portal",
        events: [
          e("reader", "Reader read the denial letter and removed identifiers", clock - 3),
          e("advocate", "Advocate checked the notice, the deadline and how the payer applied its own criteria", clock - 2),
          e("historian", `Historian compared ${input.meta.similar} similar ${payer.shortName} decisions`, clock - 1),
        ],
      };
      set((s) => ({ requests: [created, ...s.requests], denialMeta: { ...s.denialMeta, [id]: input.meta } }));
      get().notify({ agent: "advocate", title: "Denial analyzed", body: `${id} (${payer.shortName}, ${money(input.atStake)}) is in Denial Intelligence with your options.`, to: paths.denials(id), tone: "mid" });
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
      patchWork(id, { appealDraft: { text: input.text, evidence: input.evidence, draftedAt: clock }, appealFiled: { at: clock, role: input.role, decisionBy: shortDate(decisionAt) } });
      get().updateRequest(id, { chip: "Appeal filed", tone: "neutral", progress: 1, agent: "navigator", needsYou: false, next: "Waiting on the payer", deadlineAt: undefined, clockNote: `decision ${shortDate(decisionAt)}`, clockSub: `filed ${shortDate(clock)}` });
      get().addEvent(id, { actor: "you", text: `You signed the appeal as ${input.role}`, detail: "Attested that the letter was reviewed against the chart." });
      get().addEvent(id, { actor: "navigator", text: "Navigator filed the appeal through the payer's portal and saved the receipt" });
      get().addEvent(id, { actor: "navigator", text: "Navigator checks for the decision each day", at: clock + DAY, done: false });
      get().notify({ agent: "navigator", title: "Appeal filed", body: `${id} was filed with ${payerShort(r)}. The decision is expected ${shortDate(decisionAt)}.`, to: paths.dashboard({ request: id }), tone: "good" });
      get().toast({ title: "Appeal filed", body: `${payerShort(r)} decides by ${shortDate(decisionAt)}. It shows on the Dashboard.`, tone: "good" });
    },

    acceptDecision: (id, reason) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      patchWork(id, { accepted: { reason, at: clock } });
      get().updateRequest(id, { ...settled(clock), chip: "Accepted", tone: "neutral", outcome: "denied", next: "Closed. Write-off logged" });
      get().addEvent(id, { actor: "you", text: "You accepted the decision", detail: `Reason: ${reason}` });
      get().addEvent(id, { actor: "cadence", text: `Cadence logged the write-off of ${money(r.atStake)} and started the step-down plan in Case Manager` });
      get().notify({ agent: "cadence", title: "Denial closed", body: `${id} was accepted. The write-off is logged and the step-down plan is started.`, to: paths.manager("reviews"), tone: "neutral" });
      get().toast({ title: "Decision accepted", body: "The write-off is logged. Case Manager has the step-down plan.", tone: "neutral" });
    },

    logOutcome: (id, kind, note) => {
      const r = request(id);
      if (!r) return;
      const clock = get().clock;
      const word = kind === "overturned" ? "overturned" : kind === "partly" ? "partly restored" : "upheld";
      patchWork(id, { outcome: { kind, note, at: clock } });
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
  };
};

/** Sidebar badge: open denials, which are the requests in "Appeal or call". */
export const selectDenialBadge = (s: AppState): number => s.requests.filter((r) => r.stage === "appeal").length;
