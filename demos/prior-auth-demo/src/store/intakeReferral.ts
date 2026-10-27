import type { StateCreator } from "zustand";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { staffOf } from "@/data/intake/seed";
import type { IntakeDocument, Suggestion } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { serviceById, type VaServiceId } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { meOf } from "./intake";
import type { AppState } from "./index";

/* Intake: queue and referral (New Intake, extraction, triage). Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions,
   tasks, audit, triage, safety) are in intake.ts. Every action a person takes writes an audit event. */

export interface IntakeReferralSlice {
  setIntakeService: (id: string, serviceId: VaServiceId) => void;
  /** Planned service start, demo minutes. */
  setIntakeServiceDate: (id: string, date: number) => void;
  setIntakeUrgency: (id: string, urgency: Urgency) => void;
  setIntakePriority: (id: string, on: boolean) => void;
  /** Attach a document (every import in the demo is simulated). */
  addIntakeDocument: (id: string, doc: IntakeDocument, note?: string) => void;
  /** An agent's output: new pending suggestions. Nothing is written to a field until a person decides. */
  addIntakeSuggestions: (id: string, suggestions: Suggestion[]) => void;
  /** A person accepts several suggestions after reviewing the list. Each acceptance is recorded with the reviewer. */
  acceptSuggestions: (id: string, suggestionIds: string[]) => void;
  /** A person reviewed the drafted request and sent it (simulated). Creates the task that waits for the reply. */
  requestIntakeInfo: (id: string, req: { to: string; channel: string; items: string[]; message: string; needsInfo: boolean }) => void;
  /** The referrer answered. */
  markIntakeInfoReply: (id: string, taskId: string) => void;
  /** A clinician closes a safety alert as reviewed, after signing. Records the signer as the reviewer. */
  closeSafetyReview: (id: string, signerId: string, note: string) => void;
}

export const createIntakeReferralSlice: StateCreator<AppState, [], [], IntakeReferralSlice> = (_set, get) => {
  const rec = (id: string) => get().intakes.find((r) => r.id === id);
  return {
    setIntakeService: (id, serviceId) => {
      const r = rec(id);
      if (!r || r.serviceId === serviceId) return;
      get().patchIntake(id, (x) => ({ ...x, serviceId }));
      get().addIntakeAudit(id, { actor: meOf(get()), action: "Changed the requested service", detail: `${serviceById(r.serviceId).short} to ${serviceById(serviceId).short}`, section: "referral" });
    },
    setIntakeServiceDate: (id, date) => {
      const r = rec(id);
      if (!r || r.serviceDate === date) return;
      get().patchIntake(id, (x) => ({ ...x, serviceDate: date }));
      get().addIntakeAudit(id, { actor: meOf(get()), action: "Changed the planned start", detail: `${longDate(r.serviceDate)} to ${longDate(date)}`, section: "referral" });
    },
    setIntakeUrgency: (id, urgency) => {
      const r = rec(id);
      if (!r || r.urgency === urgency) return;
      get().patchIntake(id, (x) => ({ ...x, urgency }));
      get().addIntakeAudit(id, { actor: meOf(get()), action: `Urgency: ${urgency}`, detail: `Was ${r.urgency}`, section: "referral" });
    },
    setIntakePriority: (id, on) => {
      get().patchIntake(id, (x) => ({ ...x, priority: on }));
      get().addIntakeAudit(id, { actor: meOf(get()), action: on ? "Marked high priority" : "Removed high priority", section: "referral" });
    },
    addIntakeDocument: (id, doc, note) => {
      get().patchIntake(id, (x) => ({ ...x, documents: [...x.documents, doc] }));
      get().addIntakeAudit(id, { actor: meOf(get()), action: `Added a document: ${doc.name}`, detail: note ?? (doc.simulated ? "Simulated import" : undefined), section: "referral" });
    },
    addIntakeSuggestions: (id, suggestions) => {
      if (!suggestions.length) return;
      get().patchIntake(id, (x) => ({ ...x, suggestions: [...x.suggestions, ...suggestions] }));
    },
    acceptSuggestions: (id, ids) => {
      const r = rec(id);
      if (!r) return;
      const take = ids.filter((sid) => r.suggestions.some((s) => s.id === sid && s.status === "pending"));
      for (const sid of take) get().decideSuggestion(id, sid, "accepted");
      if (take.length) get().addIntakeAudit(id, { actor: meOf(get()), action: `Accepted ${take.length} high-confidence suggestions after reviewing the list`, detail: "Conflicts and safety-related items were left for one-by-one review", section: "referral" });
    },
    requestIntakeInfo: (id, req) => {
      const s = get();
      const me = meOf(s);
      s.addIntakeAudit(id, { actor: me, action: "Sent a request for missing information to the referrer (simulated)", detail: `To ${req.to} by ${req.channel}: ${req.items.join("; ") || "see message"}`, section: "referral" });
      s.addIntakeTask(id, {
        role: "coordination", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${req.to}`, approval: "approved",
        result: `Asked for ${req.items.length ? req.items.join(", ").toLowerCase() : "more information"}. Sent by ${staffOf(me)?.name ?? "staff"} (simulated ${req.channel.toLowerCase()}); follow up in 2 business days.`,
      });
      if (req.needsInfo) {
        const r = rec(id);
        if (r && r.triage !== "needs_info") s.setTriage(id, "needs_info", `Waiting on the referrer: ${req.items.join(", ") || "more information"}`);
      }
      s.toast({ title: `Request sent to ${req.to} (simulated)`, body: "Navigator tracks the reply. Nothing left the demo.", tone: "good" });
    },
    markIntakeInfoReply: (id, taskId) => {
      const s = get();
      s.updateIntakeTask(id, taskId, { status: "done", result: "The referrer replied. Add what they sent with Add a document or edit the fields." });
      s.addIntakeAudit(id, { actor: meOf(s), action: "Recorded the referrer's reply", section: "referral" });
    },
    closeSafetyReview: (id, signerId, note) => {
      const s = get();
      s.resolveSafety(id, "documented", note);
      s.patchIntake(id, (x) => (x.safety ? { ...x, safety: { ...x.safety, acknowledgedBy: signerId } } : x));
    },
  };
};
