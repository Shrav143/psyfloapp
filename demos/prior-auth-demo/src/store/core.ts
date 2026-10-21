import type { StateCreator } from "zustand";
import { SEED_NOTIFICATIONS, SEED_REQUESTS } from "@/data/seed";
import type { AgentKey, AppNotification, PayerId, Program, PsyRequest, RequestEvent, RequestType, StageKey, Toast, Tone } from "@/data/types";
import { uid } from "@/lib/format";
import { DAY, HOUR } from "@/lib/time";
import type { AppState } from "./index";

/** The five Dashboard filters. "all" means no filter. */
export interface DashFilters {
  payer: PayerId | "all";
  program: Program | "all";
  type: RequestType | "all";
  stage: StageKey | "all";
  period: "7d" | "30d" | "quarter";
}
export const DEFAULT_FILTERS: DashFilters = { payer: "all", program: "all", type: "all", stage: "all", period: "30d" };

export interface SubmitCasePayload {
  caseId?: string; // reuse the id of a case that was being prepared
  patient: { initials: string; age: number };
  payerId: PayerId;
  program: Program;
  type: RequestType;
  atStake: number;
  chance?: number;
  referralId?: string;
}
export type Reply = "received" | "review" | "info" | "approve" | "partial" | "deny";

export interface CoreSlice {
  /** Demo clock in minutes since 10:42 am on 20 Oct 2026. Only Fast-forward moves it. */
  clock: number;
  requests: PsyRequest[];
  filters: DashFilters;
  notifications: AppNotification[];
  toasts: Toast[];
  askOpen: boolean;
  notifOpen: boolean;

  setFilter: <K extends keyof DashFilters>(key: K, value: DashFilters[K]) => void;
  setFilters: (patch: Partial<DashFilters>) => void;
  clearFilters: () => void;
  advanceClock: (minutes: number) => void;
  /** Put a new request on the Dashboard (for example a denial created from an uploaded letter). */
  addRequest: (request: PsyRequest) => void;
  updateRequest: (id: string, patch: Partial<PsyRequest>) => void;
  addEvent: (id: string, event: Omit<RequestEvent, "id" | "at" | "done"> & { at?: number; done?: boolean }) => void;
  /** Sign and send: puts a request on the Dashboard as Received. Returns its id. */
  submitCase: (p: SubmitCasePayload) => string;
  /** Demo control: make the payer answer. */
  simulateReply: (id: string, reply: Reply) => string | undefined;
  /** The user reviewed Packet's answer to an information request and sent it. */
  answerInfoRequest: (id: string) => void;
  notify: (n: Omit<AppNotification, "id" | "at" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setAskOpen: (open: boolean) => void;
  setNotifOpen: (open: boolean) => void;
}

const ev = (actor: RequestEvent["actor"], text: string, at: number, done = true): RequestEvent => ({ id: uid("ev"), at, actor, text, done });
let denialSeq = 3319;

export const createCoreSlice: StateCreator<AppState, [], [], CoreSlice> = (set, get) => ({
  clock: 0,
  requests: SEED_REQUESTS,
  filters: DEFAULT_FILTERS,
  notifications: SEED_NOTIFICATIONS,
  toasts: [],
  askOpen: false,
  notifOpen: false,

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, period: s.filters.period } })),
  advanceClock: (minutes) => {
    set((s) => ({ clock: s.clock + minutes }));
    get().toast({ title: `Clock moved forward ${minutes >= DAY ? `${Math.round(minutes / DAY)} day` : `${Math.round(minutes / HOUR)} hour`}`, body: "Times in stage and deadlines updated.", tone: "neutral" });
  },
  addRequest: (request) => set((s) => ({ requests: [request, ...s.requests] })),
  updateRequest: (id, patch) => set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
  addEvent: (id, e) =>
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, events: [...r.events, { id: uid("ev"), at: e.at ?? s.clock, done: e.done ?? true, actor: e.actor, text: e.text, detail: e.detail }] } : r)),
    })),

  submitCase: (p) => {
    const { clock, requests } = get();
    const id = p.caseId ?? `${p.program === "RES" ? "R" : p.program === "WM" ? "R" : p.program === "IOP" ? "I" : "P"}-${1700 + Math.floor(Math.random() * 300)}`;
    const base: Partial<PsyRequest> = {
      stage: "received", chip: "Received", tone: "neutral", track: "auth", progress: 1, stageSince: clock, typicalMin: 25,
      agent: "navigator", next: "Navigator checks again in 30 minutes", needsYou: false, chance: p.chance, atStake: p.atStake, referralId: p.referralId,
    };
    const sentEvents = [
      ev("you", "You signed and sent the request", clock - 3),
      ev("navigator", "Navigator sent the request through the payer's portal", clock - 2),
      ev("navigator", "Navigator saved the receipt to the case", clock - 1),
      ev("navigator", "Navigator checks again", clock + 30, false),
    ];
    if (requests.some((r) => r.id === id)) {
      set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...base, events: [...r.events.filter((e) => e.done), ...sentEvents] } : r)) }));
    } else {
      const created: PsyRequest = {
        id, caseId: id, patient: p.patient, payerId: p.payerId, program: p.program, type: p.type, sentVia: "portal", events: sentEvents,
        stage: "received", chip: "Received", tone: "neutral", track: "auth", progress: 1, stageSince: clock, typicalMin: 25,
        atStake: p.atStake, agent: "navigator", next: "Navigator checks again in 30 minutes", chance: p.chance, referralId: p.referralId,
      };
      set((s) => ({ requests: [created, ...s.requests] }));
    }
    get().notify({ agent: "navigator", title: "Sent to the payer", body: `${id} was sent. It now shows as Received on the Dashboard.`, to: `/dashboard?request=${id}`, tone: "good" });
    get().toast({ title: "Sent to the payer", body: `${id} is on the Dashboard as Received.`, tone: "good" });
    return id;
  },

  simulateReply: (id, reply) => {
    const r = get().requests.find((x) => x.id === id);
    if (!r) return undefined;
    const clock = get().clock;
    const keep = r.events.filter((e) => e.done);
    const base = { stageSince: clock, needsYou: false };
    if (reply === "received") {
      set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, ...base, stage: "received", chip: "Received", tone: "neutral", progress: 1, agent: "navigator", next: "Navigator checks again in 30 minutes", events: [...keep, ev("navigator", "Navigator checked: received", clock)] } : x)) }));
    } else if (reply === "review") {
      set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, ...base, stage: "under_review", chip: "Under review", tone: "neutral", progress: 2, typicalMin: x.typicalMin ?? DAY, agent: "navigator", next: "Navigator checks again in 30 minutes", events: [...keep, ev("navigator", "Navigator checked: under review", clock), ev("caller", "Caller will phone the payer if it is still pending", clock + 40, false)] } : x)) }));
    } else if (reply === "info") {
      set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, ...base, needsYou: true, stage: "info_requested", chip: "Info requested", tone: "mid", progress: 2, typicalMin: DAY, agent: "packet", next: "Packet drafted the answer. Waiting for your review", events: [...keep, ev("payer", "The payer asked for more information", clock), ev("packet", "Packet drafted the answer. Waiting for your review", clock + 5)] } : x)) }));
      get().notify({ agent: "packet", title: "Payer asked for info", body: `The payer wants more on ${id}. Packet drafted the answer.`, to: `/dashboard?request=${id}`, tone: "mid" });
    } else if (reply === "approve") {
      set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, ...base, stage: "decided", chip: "Approved", tone: "good", progress: 3, decidedToday: true, outcome: "approved", agent: "cadence", next: "Next review booked. Write-back waits for you", events: [...keep, ev("payer", "The payer approved the request", clock), ev("cadence", "Cadence updated the ledger and booked the next review", clock + 3)] } : x)) }));
      get().notify({ agent: "cadence", title: "Approved", body: `${id} was approved. Write-back waits for you.`, to: `/dashboard?request=${id}`, tone: "good" });
    } else {
      const newId = `D-${denialSeq++}`;
      const outcome = reply === "partial" ? "partly_approved" : "denied";
      set((s) => ({
        requests: s.requests.map((x) =>
          x.id === id
            ? { ...x, ...base, id: newId, caseId: x.caseId, stage: "appeal", type: "Peer-to-peer", chip: "Call booked", tone: "neutral", track: "denial", progress: 0, decidedToday: true, outcome, chance: 61, agent: "advocate", deadlineAt: clock + 3 * DAY, clockSub: "peer-to-peer window", next: "Denied today. Advocate booked a peer-to-peer call", events: [...keep, ev("payer", outcome === "denied" ? "The payer denied the request" : "The payer approved only part of the request", clock), ev("advocate", "Advocate opened the denial and booked a peer-to-peer call", clock + 4)] }
            : x,
        ),
      }));
      get().notify({ agent: "advocate", title: outcome === "denied" ? "Denied" : "Partly approved", body: `${id} became ${newId}. Advocate booked a call.`, to: `/denials?id=${newId}`, tone: "risk" });
      get().toast({ title: outcome === "denied" ? "The payer denied it" : "The payer approved part of it", body: `It is now ${newId} in Denial Intelligence.`, tone: "risk" });
      return newId;
    }
    return id;
  },

  answerInfoRequest: (id) => {
    const clock = get().clock;
    set((s) => ({
      requests: s.requests.map((x) =>
        x.id === id
          ? { ...x, needsYou: false, stage: "under_review", chip: "Under review", tone: "neutral", progress: 2, stageSince: clock, agent: "navigator", next: "Navigator checks again in 30 minutes", events: [...x.events.filter((e) => e.done), ev("you", "You reviewed the answer and sent it", clock), ev("navigator", "Navigator sent the answer through the payer's portal", clock + 2), ev("navigator", "Navigator checks again", clock + 30, false)] }
          : x,
      ),
    }));
    get().toast({ title: "Answer sent", body: `${id} is back under review.`, tone: "good" });
  },

  notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid("n"), at: s.clock, read: false }, ...s.notifications] })),
  markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  toast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: uid("t") }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setAskOpen: (open) => set({ askOpen: open, notifOpen: open ? false : get().notifOpen }),
  setNotifOpen: (open) => set({ notifOpen: open, askOpen: open ? false : get().askOpen }),
});

/** Called by resetDemo() in store/index.ts. */
export const resetCoreCounters = (): void => {
  denialSeq = 3319;
};

export type { AgentKey, Tone };
