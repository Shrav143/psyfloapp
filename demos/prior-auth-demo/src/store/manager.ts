import type { StateCreator } from "zustand";
import { SEED_LEDGER, type LedgerCase } from "@/data/manager";
import { buildReviews, draftedFrom, inWeek, isClean, nextReviewAfter, reviewIntervalDays, reviewStamp, type Review } from "@/data/managerReviews";
import { siteOf } from "@/data/sites";
import { plural } from "@/lib/format";
import { sitesInView } from "@/lib/scope";
import type { AppState } from "./index";
import { selectPayerRules } from "./payerConfig";

/* Case Manager ledger and reviews. Seeds are rebuilt from the data files each time the store is created,
   so "Reset demo data" restores them. Actions always replace objects, never mutate them. */
export interface ManagerSlice {
  ledger: LedgerCase[];
  reviews: Review[];
  /** Sign-off gate: a licensed clinician signs one review. `text` carries any edits made in the drawer. Cadence books the next review. */
  signReview: (id: string, signedBy: string, text?: string) => void;
  /** Answer gate: the clinician adds what the review was missing. A note is required. */
  updateReview: (id: string, note: string) => void;
  /** Keeps edits to the draft text when the drawer closes without signing. */
  saveReviewDraft: (id: string, text: string) => void;
  /** Signs every draft whose four checks passed. Returns how many were signed. */
  signAllClean: (signedBy: string) => number;
  /** Cadence drafts the reviews this week that have no draft yet (or just the ids given). Returns how many; 0 when Cadence is paused in Settings. */
  draftDueReviews: (ids?: string[]) => number;
}

const replace = (list: Review[], id: string, patch: (r: Review) => Review): Review[] => list.map((r) => (r.id === id ? patch(r) : r));

/** True for a review whose case is at a site the viewer has in view. A one-site viewer never signs or drafts the other site's reviews, even with "all". */
const inView = (s: Pick<AppState, "viewerId" | "siteScope">): ((r: Review) => boolean) => {
  const sites = sitesInView(s);
  return (r) => sites.includes(siteOf(r.caseId));
};

export const createManagerSlice: StateCreator<AppState, [], [], ManagerSlice> = (set, get) => {
  /** Marks the review signed and books the one after it. The interval comes from the payer's own rule when it names one, else from the level of care. */
  const signed = (list: Review[], r: Review, by: string, text: string | undefined, clock: number): Review[] => {
    const lines = selectPayerRules(get(), r.payerId).find((x) => x.id === "windows")?.lines ?? [];
    const next = nextReviewAfter(r, reviewIntervalDays(r.program, lines), clock);
    return [...replace(list, r.id, (x) => ({ ...x, status: "signed", signedBy: by, signedAt: clock, draft: text ?? x.draft, nextAt: next.dueAt })), next];
  };

  return {
    ledger: SEED_LEDGER,
    reviews: buildReviews(SEED_LEDGER),

    signReview: (id, signedBy, text) => {
      const r = get().reviews.find((x) => x.id === id);
      if (!r || r.status !== "drafted") return;
      set((s) => ({ reviews: signed(s.reviews, r, signedBy, text, s.clock) }));
      const next = get().reviews.find((x) => x.id === id)?.nextAt;
      get().toast({ title: "Review signed", body: `${r.ledgerId} was signed by ${signedBy}. Cadence booked the next review for ${next === undefined ? "later" : reviewStamp(next)}.`, tone: "good" });
    },

    updateReview: (id, note) => {
      const text = note.trim();
      const r = get().reviews.find((x) => x.id === id);
      if (!r || r.status !== "needs_update" || !text) return;
      set((s) => ({
        reviews: replace(s.reviews, id, (x) => ({
          ...x,
          status: "drafted",
          missing: undefined,
          note: text,
          draft: `${x.draft}\n\nClinician update\n${text}`,
          checks: x.checks.map((c) => ({ label: c.label, passed: true })),
        })),
      }));
      get().toast({ title: "Review updated", body: `Integrity checked ${r.ledgerId} again. It is a draft now and ready to sign.`, tone: "good" });
    },

    saveReviewDraft: (id, text) => set((s) => ({ reviews: replace(s.reviews, id, (x) => (x.status === "drafted" && x.draft !== text ? { ...x, draft: text } : x)) })),

    signAllClean: (signedBy) => {
      const visible = inView(get());
      const clean = get().reviews.filter((r) => isClean(r) && visible(r));
      if (!clean.length) {
        get().toast({ title: "No clean drafts to sign", body: "Every draft left has a check that needs a look. Open each one to sign it.", tone: "neutral" });
        return 0;
      }
      set((s) => ({ reviews: clean.reduce((list, r) => signed(list, r, signedBy, undefined, s.clock), s.reviews) }));
      get().toast({ title: `${plural(clean.length, "review")} signed`, body: `${signedBy} signed every draft whose four checks passed. Cadence booked the next review for each. The others wait for a closer look.`, tone: "good" });
      return clean.length;
    },

    draftDueReviews: (ids) => {
      if (get().agentPaused.cadence) {
        get().toast({ title: "Cadence is paused in Settings", body: "It drafts no reviews until you resume it there.", tone: "mid" });
        return 0;
      }
      const visible = inView(get());
      const todo = get().reviews.filter((r) => r.status === "due" && inWeek(r) && visible(r) && (!ids || ids.includes(r.id)));
      if (!todo.length) {
        get().toast({ title: "Nothing to draft", body: "Every review due this week already has a draft or a question for you.", tone: "neutral" });
        return 0;
      }
      const cases = new Map(get().ledger.map((c) => [c.id, c]));
      set((s) => ({ reviews: s.reviews.map((r) => { const c = todo.some((t) => t.id === r.id) ? cases.get(r.ledgerId) : undefined; return c ? { ...r, ...draftedFrom(c, r) } : r; }) }));
      get().toast({ title: `Cadence drafted ${plural(todo.length, "review")}`, body: `${todo.length === 1 ? "It is" : "They are"} marked Drafted in the list. Integrity checked ${todo.length === 1 ? "it" : "each one"} and all four checks passed.`, tone: "good" });
      return todo.length;
    },
  };
};

/** Sidebar badge: reviews that need a clinician's update, at the sites in view. */
export const selectManagerBadge = (s: AppState): number => {
  const visible = inView(s);
  return s.reviews.filter((r) => r.status === "needs_update" && visible(r)).length;
};
