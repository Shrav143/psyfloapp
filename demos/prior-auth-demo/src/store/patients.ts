import { authorizationsIn, buildPatientBook, episodesIn, patientsIn, type AuthorizationRecord, type Patient, type PatientBook, type TreatmentEpisode } from "@/data/patients";
import { sitesInView } from "@/lib/scope";
import type { AppState } from "./index";

/* The patient book (data/patients.ts) read from the store. It is derived, never stored, so there is one record per person
   and "Reset demo data" needs nothing. Each result is cached on what it depends on, so a selector returns the same object until an input changes. */
type BookInput = Pick<AppState, "ledger" | "requests" | "clock">;
let bookCache: { ledger: AppState["ledger"]; requests: AppState["requests"]; clock: number; book: PatientBook } | null = null;

/** Every patient, episode and authorization the demo knows, for every site. Use the `select…` functions below for what a viewer may see. */
export function selectPatientBook(s: BookInput): PatientBook {
  if (bookCache && bookCache.ledger === s.ledger && bookCache.requests === s.requests && bookCache.clock === s.clock) return bookCache.book;
  const book = buildPatientBook(s.ledger, s.requests, s.clock);
  bookCache = { ledger: s.ledger, requests: s.requests, clock: s.clock, book };
  return book;
}

let viewCache: { book: PatientBook; key: string; out: PatientBook } | null = null;

/** The book for the sites in view only: a viewer who sees one site never gets the other site's patients, episodes or authorizations. */
export function selectPatientBookInView(s: Pick<AppState, "ledger" | "requests" | "clock" | "viewerId" | "siteScope">): PatientBook {
  const book = selectPatientBook(s);
  const sites = sitesInView(s);
  const key = sites.join("");
  if (viewCache && viewCache.book === book && viewCache.key === key) return viewCache.out;
  const out = { patients: patientsIn(book, sites), episodes: episodesIn(book, sites), authorizations: authorizationsIn(book, sites) };
  viewCache = { book, key, out };
  return out;
}

export const selectPatients = (s: AppState): Patient[] => selectPatientBookInView(s).patients;
export const selectEpisodes = (s: AppState): TreatmentEpisode[] => selectPatientBookInView(s).episodes;
export const selectAuthorizations = (s: AppState): AuthorizationRecord[] => selectPatientBookInView(s).authorizations;
