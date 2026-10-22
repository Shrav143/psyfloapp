import { buildPatientBook, type PatientBook } from "@/data/patients";
import type { AppState } from "./index";

/* The patient book (data/patients.ts) read from the store. It is derived, never stored, so there is one record per person
   and "Reset demo data" needs nothing. The result is cached on the three inputs, so a selector returns the same object until one changes. */
let last: { ledger: AppState["ledger"]; requests: AppState["requests"]; clock: number; book: PatientBook } | null = null;

export function selectPatientBook(s: Pick<AppState, "ledger" | "requests" | "clock">): PatientBook {
  if (last && last.ledger === s.ledger && last.requests === s.requests && last.clock === s.clock) return last.book;
  const book = buildPatientBook(s.ledger, s.requests, s.clock);
  last = { ledger: s.ledger, requests: s.requests, clock: s.clock, book };
  return book;
}
