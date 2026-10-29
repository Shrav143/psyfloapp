import type { StateCreator } from "zustand";
import { CONSENT_LABEL, type ConsentEntry, type ConsentType } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { vaPlanOf } from "@/data/va/plans";
import type { AppState } from "./index";
import { meOf } from "./intake";

/* The consent and disclosure ledger of an intake (data/assess/types ConsentEntry). A person records a consent as on file, declined or revoked; readiness
   (data/assess/readiness.ts) reads the ledger, so recording a payment or Part 2 consent here is what clears the consent item. Organization protocol,
   not legal advice. */

export interface IntakeConsentSlice {
  /** Records one consent on the ledger: creates the entry when there is none of that type, otherwise changes its status. Writes an audit event. */
  setConsentStatus: (id: string, type: ConsentType, status: ConsentEntry["status"]) => void;
}

const PURPOSE: Record<ConsentType, string> = {
  treatment: "Treatment", payment: "Authorization requests and payment", operations: "Health care operations",
  part2_disclosure: "Substance use treatment records for payment (organization protocol, not legal advice)", recording: "Recording (AI Scribe, voice)", release: "Release of information",
};
const recipientOf = (r: IntakeRecord, type: ConsentType): string => (type === "payment" || type === "part2_disclosure" ? (r.payerId ? vaPlanOf(r.payerId)?.name ?? "The plan" : "The plan") : "This clinic");

export const createIntakeConsentSlice: StateCreator<AppState, [], [], IntakeConsentSlice> = (_set, get) => ({
  setConsentStatus: (id, type, status) => {
    const me = meOf(get());
    const at = get().clock;
    get().patchIntake(id, (r) => {
      const ledger = r.consents ?? [];
      const prev = ledger.find((c) => c.type === type);
      const entry: ConsentEntry = { id: prev?.id ?? `con-${id}-${type}`, type, recipient: prev?.recipient ?? recipientOf(r, type), purpose: prev?.purpose ?? PURPOSE[type], status, ...(status === "on_file" ? { at, by: me } : {}) };
      return { ...r, consents: prev ? ledger.map((c) => (c === prev ? entry : c)) : [...ledger, entry] };
    });
    get().addIntakeAudit(id, { actor: me, action: `Consent recorded: ${CONSENT_LABEL[type]} is ${status === "on_file" ? "on file" : status}`, section: "profile" });
  },
});
