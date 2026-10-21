import type { StateCreator } from "zustand";
import { SEED_LEDGER, type LedgerCase } from "@/data/manager";
import { buildReviews, isClean, type Review } from "@/data/managerReviews";
import type { AppState } from "./index";

/* Case Manager ledger and reviews. Seeds are rebuilt from the data files each time the store is created,
   so "Reset demo data" restores them. Actions always replace objects, never mutate them. */
export interface ManagerSlice {
  ledger: LedgerCase[];
  reviews: Review[];
  /** Sign-off gate: a licensed clinician signs one review. `text` carries any edits made in the drawer. */
  signReview: (id: string, signedBy: string, text?: string) => void;
  /** Answer gate: the clinician adds what the review was missing. A note is required. */
  updateReview: (id: string, note: string) => void;
  /** Keeps edits to the draft text when the drawer closes without signing. */
  saveReviewDraft: (id: string, text: string) => void;
  /** Signs every draft whose four checks passed. Returns how many were signed. */
  signAllClean: (signedBy: string) => number;
}

const replace = (list: Review[], id: string, patch: (r: Review) => Review): Review[] => list.map((r) => (r.id === id ? patch(r) : r));

export const createManagerSlice: StateCreator<AppState, [], [], ManagerSlice> = (set, get) => ({
  ledger: SEED_LEDGER,
  reviews: buildReviews(SEED_LEDGER),

  signReview: (id, signedBy, text) => {
    const r = get().reviews.find((x) => x.id === id);
    if (!r || r.status !== "drafted") return;
    set((s) => ({ reviews: replace(s.reviews, id, (x) => ({ ...x, status: "signed", signedBy, signedAt: s.clock, draft: text ?? x.draft })) }));
    get().toast({ title: "Review signed", body: `${r.ledgerId} was signed by ${signedBy}. Cadence books the next review.`, tone: "good" });
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
    const clean = get().reviews.filter(isClean);
    if (!clean.length) {
      get().toast({ title: "No clean drafts to sign", body: "Every draft left has a check that needs a look. Open each one to sign it.", tone: "neutral" });
      return 0;
    }
    const ids = new Set(clean.map((r) => r.id));
    set((s) => ({ reviews: s.reviews.map((r) => (ids.has(r.id) ? { ...r, status: "signed", signedBy, signedAt: s.clock } : r)) }));
    get().toast({ title: `${clean.length} reviews signed`, body: `${signedBy} signed every draft whose four checks passed. The others wait for a closer look.`, tone: "good" });
    return clean.length;
  },
});

/** Sidebar badge: reviews that need a clinician's update. */
export const selectManagerBadge = (s: AppState): number => s.reviews.filter((r) => r.status === "needs_update").length;
