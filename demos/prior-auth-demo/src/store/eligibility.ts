import type { StateCreator } from "zustand";
import { needsCaller, SEED_EB_PATIENTS, VERDICT_LABEL, VERDICT_TONE, verdictOf, type EbPatient } from "@/data/eligibility";
import { siteOf, type SiteId } from "@/data/sites";
import type { PayerId, Program } from "@/data/types";
import { recordFromEb, seedVerifications, siteOfVerification, verify, type VerificationRecord } from "@/data/verification";
import { sitesInView } from "@/lib/scope";
import { clockTime, toDate } from "@/lib/time";
import { paths } from "@/routes";
import type { AppState } from "./index";

/* Eligibility and Benefits, and the verification record New Authorization shares with it.
   `verifications` is the one source of truth: a record per case (or per V-xxxx check made on the Verify form). `ebPatients` is the same
   rows in a list, kept in step by `commit` so the list, FLO and the badge read what New Authorization wrote. */
export interface VerifyFormInput {
  payerId: PayerId;
  program: Program;
  memberId: string;
  dos: string;
  caseId?: string;
  initials?: string | null;
  age?: number | null;
}

export interface EligibilitySlice {
  ebPatients: EbPatient[];
  /** Every verification, by id. Read it through `selectVerifications` and `selectVerificationFor`, which follow the sites in view. */
  verifications: Record<string, VerificationRecord>;
  /** IDs with a refresh in flight (a row or a summary shows a spinner). */
  ebRechecking: string[];
  ebSeq: number;
  /** New Authorization, or a check made anywhere else, stores its record here. The Eligibility list and result show it at once. */
  saveVerification: (rec: VerificationRecord) => void;
  /** Runs the check again on the demo clock, replaces the record and says what happened in a toast. While Verify is paused the last result stays, with a warning. */
  refreshVerification: (id: string) => void;
  /** Re-check one row: the same as `refreshVerification`. */
  ebRecheck: (id: string) => void;
  /** Verify re-checks, on its own, every row whose re-check time has passed. Does nothing while Verify is paused in Settings.
      `at` is the time it ran: the scheduled time when the clock jumped over it, or now when Verify was resumed. */
  ebRunDue: (at: "scheduled" | "now") => void;
  /** The Verify page calls this when the live check finishes. Updates a known patient or adds a check at no case yet (V-xxxx, at the site in view). Returns the ID to show. */
  ebApplyCheck: (input: VerifyFormInput) => string;
}

const RECHECK_MS = 1100;
const SAMPLE_TAIL = "4821";

/** The site a check at no case yet is filed under: the one in view, or Site A when both are. */
const newSite = (s: AppState): SiteId => {
  const sites = sitesInView(s);
  return sites.length === 1 ? sites[0] : "A";
};

export const createEligibilitySlice: StateCreator<AppState, [], [], EligibilitySlice> = (set, get, api) => {
  /* The demo clock only moves from the Demo menu, so the slice listens for it: re-checks happen wherever the person is.
     Resuming Verify catches up with whatever came due while it was paused. */
  api.subscribe((s, prev) => {
    if (s.clock > prev.clock) s.ebRunDue("scheduled");
    else if (prev.agentPaused.verify && !s.agentPaused.verify) s.ebRunDue("now");
  });

  /** Put records in, and rebuild the rows list from them. */
  const commit = (recs: VerificationRecord[]) =>
    set((s) => {
      const verifications = { ...s.verifications };
      for (const r of recs) verifications[r.id] = r;
      return { verifications, ebPatients: Object.values(verifications).map((r) => r.row) };
    });

  return {
    ebPatients: SEED_EB_PATIENTS,
    verifications: seedVerifications(),
    ebRechecking: [],
    ebSeq: 1001,

    saveVerification: (rec) => commit([rec]),

    refreshVerification: (id) => {
      const rec = get().verifications[id];
      if (!rec || get().ebRechecking.includes(id)) return;
      set((s) => ({ ebRechecking: [...s.ebRechecking, id] }));
      setTimeout(() => {
        const s = get();
        const cur = s.verifications[id];
        const next = cur
          ? verify({ caseId: cur.caseId, payerId: cur.payerId, program: cur.program, dosFrom: cur.dosFrom, dosTo: cur.dosTo, initials: cur.initials, age: cur.age, memberId: cur.memberMasked, site: cur.site }, s)
          : null;
        set((st) => ({ ebRechecking: st.ebRechecking.filter((x) => x !== id) }));
        if (!next) return;
        commit([next]);
        if (next.exceptions.includes("service_unavailable")) {
          get().toast({ title: `Could not re-check ${id}`, body: "Verify is paused in Settings, so nothing was asked. The last result is still shown.", tone: "mid" });
          return;
        }
        const v = verdictOf(next.row);
        const phone = needsCaller(next.payerId) ? "The plan's system did not answer, so Caller phoned. " : "";
        get().toast({ title: `${id} re-checked`, body: `${phone}${verdictOf(cur.row) === v ? "Still" : "Now"} ${VERDICT_LABEL[v]}.`, tone: VERDICT_TONE[v] });
      }, RECHECK_MS);
    },

    ebRecheck: (id) => get().refreshVerification(id),

    ebRunDue: (at) => {
      const { ebPatients, clock, agentPaused } = get();
      if (agentPaused.verify) return;
      const due = ebPatients.filter((p) => p.recheckDue && p.recheckAt !== undefined && p.recheckAt <= clock);
      if (!due.length) return;
      const ranAt = (p: EbPatient): number => (at === "now" ? clock : (p.recheckAt ?? clock));
      commit(due.map((p) => recordFromEb({ ...p, checkedAt: ranAt(p), autoAt: ranAt(p), recheckDue: false, recheckAt: undefined }, get())));
      /* One notice per site, so a notice never names a patient at a site the viewer cannot see. */
      for (const site of ["A", "B"] as const) {
        const group = due.filter((p) => siteOfVerification({ caseId: p.id, site: p.site }) === site);
        const one = group.length === 1 ? group[0] : null;
        if (one) {
          const v = verdictOf(one);
          get().notify({ agent: "verify", title: "Re-checked automatically", body: `${one.id} is still ${VERDICT_LABEL[v]}. Verify re-checked it at ${clockTime(toDate(ranAt(one)))}.`, to: paths.eligibilityResult(one.id), tone: VERDICT_TONE[v] });
        } else if (group.length) {
          get().notify({ agent: "verify", title: `Re-checked ${group.length} patients automatically`, body: `${group.map((p) => p.id).join(", ")} came due. None of the verdicts changed.`, to: paths.eligibility(), tone: "neutral" });
        }
      }
    },

    ebApplyCheck: (input) => {
      const s = get();
      const sample = input.payerId === "summit" && input.program === "RES" && input.memberId.replace(/\D/g, "").endsWith(SAMPLE_TAIL);
      const known = s.ebPatients.find((p) => p.id === input.caseId) ?? (sample ? s.ebPatients.find((p) => p.id === "R-1042") : undefined);
      let id = known?.id;
      let seq = s.ebSeq;
      const site = newSite(s);
      if (!id) {
        /* A check at no case yet is filed under the site in view. Its id is picked so that the id alone also resolves to that site,
           and every screen that scopes by id agrees with the record. */
        while (siteOf(`V-${seq}`) !== site) seq += 1;
        id = `V-${seq}`;
        seq += 1;
      }
      const rec = verify({ caseId: id, payerId: input.payerId, program: input.program, dosFrom: input.dos, dosTo: input.dos, memberId: input.memberId, initials: input.initials, age: input.age, site: known ? undefined : site }, s);
      commit([rec]);
      if (seq !== s.ebSeq) set({ ebSeq: seq });
      return id;
    },
  };
};

/* ------------------------------------------------------------------ selectors */
/* The scoped list is cached on the things it depends on, so a component can use it as a selector without a new array on every render. */
let cache: { records: Record<string, VerificationRecord>; viewerId: string; scope: string; out: VerificationRecord[] } | null = null;

/** Every verification inside the sites in view. A viewer who sees one site never gets the other site's records. */
export function selectVerifications(s: AppState): VerificationRecord[] {
  if (cache && cache.records === s.verifications && cache.viewerId === s.viewerId && cache.scope === s.siteScope) return cache.out;
  const sites = sitesInView(s);
  const out = Object.values(s.verifications).filter((r) => sites.includes(siteOfVerification(r)));
  cache = { records: s.verifications, viewerId: s.viewerId, scope: s.siteScope, out };
  return out;
}

let rowsCache: { from: VerificationRecord[]; out: EbPatient[] } | null = null;
/** The standalone rows inside the sites in view (what the list, the counts and FLO read). Cached on the scoped records, so it is safe as a selector. */
export function selectEbRows(s: AppState): EbPatient[] {
  const from = selectVerifications(s);
  if (rowsCache?.from === from) return rowsCache.out;
  rowsCache = { from, out: from.map((r) => r.row) };
  return rowsCache.out;
}

/** The verification for one case, or undefined when there is none or the case is outside the sites in view. With `program`, only a record for that program. */
export function selectVerificationFor(s: AppState, caseId: string, program?: Program): VerificationRecord | undefined {
  const rec = s.verifications[caseId];
  if (!rec || (program && rec.program !== program)) return undefined;
  return sitesInView(s).includes(siteOfVerification(rec)) ? rec : undefined;
}

/** True when the record sits inside the sites in view. */
export const verificationInView = (s: AppState, rec: VerificationRecord): boolean => sitesInView(s).includes(siteOfVerification(rec));

/** Sidebar badge: patients who need an authorization first or a fix before billing, or whose check did not run (4 + 5 = 9 in the seed), inside the sites in view. */
export const selectEbBadge = (s: AppState): number => selectVerifications(s).filter((r) => verdictOf(r.row) !== "cleared").length;
