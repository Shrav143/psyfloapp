import { DECLINE_REASON, REDIRECT_REASON } from "@/data/intake/decision";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import { draftNotice } from "@/data/intake/notices";
import { partTwoApplies, programIdOf } from "@/data/intake/referralFacts";
import { staffOf } from "@/data/intake/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { meOf } from "./intake";
import type { AppState } from "./index";
import { capacityOf, isReferralDraftId, signatureOf, waitlistCount, type ReferralTools } from "./intakeReferralKit";
import type { IntakeReferralSlice } from "./intakeReferral";

type DecisionKeys = "acceptIntakeReferral" | "redirectIntakeReferral" | "declineIntakeReferral" | "closeIntakeReferral" | "reopenIntakeReferral" | "requestIntakeMissingInfo" | "editIntakeNotice" | "sendIntakeNotice" | "discardIntakeNotice" | "removeIntakeFromWaitlist";

/* The decisions a person makes about a referral: accept (with the demo capacity and the waitlist), redirect, decline, close, reopen, ask for missing information,
   and approve the notices to the referrer. Each writes an audit event; a notice is a draft until a person approves it. */
export function createDecisionActions(set: (fn: (s: AppState) => Partial<AppState>) => void, get: () => AppState, t: ReferralTools): Pick<IntakeReferralSlice, DecisionKeys> {
  const { rec, patch, audit, addNotice, real, openRisk } = t;
  return {
    acceptIntakeReferral: (id, o) => {
      const s = get();
      const r0 = rec(id);
      if (!r0) return null;
      const programId = programIdOf(r0.serviceId);
      const cap = capacityOf(s, programId);
      const full = !!cap && cap.open <= 0;
      if (full && !o?.waitlist) return null;
      const rid = real(id);
      if (!rid) return null;
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const waitlisted = full && !!o?.waitlist;
      const position = programId ? waitlistCount(get(), programId) + 1 : 1;
      const label = serviceById(r.serviceId).short;
      const notice = addNotice(rid, "accepted", draftNotice(r, "accepted", { signedBy: signatureOf(me), message: waitlisted ? "The program has no open place right now, so the person is on the waitlist (demo configuration)." : undefined }));
      patch(rid, (x) => ({
        ...x, triage: "accepted", triageNote: waitlisted ? `On the waitlist for ${label}, position ${position}` : undefined,
        referralDecision: { kind: "accepted", at: s.clock, by: me, note: o?.note?.trim() || undefined, noticeId: notice },
        ...(waitlisted && programId ? { waitlist: { programId, label, since: s.clock, by: me, position, note: "No open place at the time of acceptance (demo configuration)" } } : {}),
      }));
      if (cap && !waitlisted && programId) set((st) => ({ capacityOpen: { ...st.capacityOpen, [programId]: Math.max(0, (st.capacityOpen[programId] ?? cap.open) - 1) } }));
      audit(rid, { actor: me, action: waitlisted ? "Accepted for assessment and added to the waitlist" : "Accepted for assessment", detail: [cap ? `${label}: ${waitlisted ? `no open ${cap.unit}` : `${cap.open - 1} of ${cap.total} ${cap.unit}s open after this`} (demo configuration)` : null, o?.note?.trim()].filter(Boolean).join(" · ") || undefined });
      get().toast({ title: waitlisted ? `${rid} is on the waitlist` : `${rid} accepted for assessment`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "good" });
      return { id: rid, outcome: waitlisted ? "waitlisted" : "accepted" };
    },
    redirectIntakeReferral: (id, o) => {
      const r0 = rec(id);
      if (!r0 || openRisk(r0)) return null;
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const reason = REDIRECT_REASON[o.reasonCode];
      const notice = addNotice(rid, "redirected", draftNotice(r, "redirected", { signedBy: signatureOf(me), reasonCode: o.reasonCode, destination: o.destination.org, message: o.reasonCode === "other" ? o.note : undefined }));
      patch(rid, (x) => ({ ...x, triage: "redirected", triageNote: `${reason}. Sent to ${o.destination.org}.`, referralDecision: { kind: "redirected", at: s.clock, by: me, reasonCode: o.reasonCode, reason, note: o.note?.trim() || undefined, destination: o.destination, noticeId: notice } }));
      audit(rid, { actor: me, action: "Redirected the referral", detail: `${reason} · to ${o.destination.org}${o.note?.trim() ? ` · ${o.note.trim()}` : ""}` });
      get().toast({ title: `${rid} redirected`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "neutral" });
      return rid;
    },
    declineIntakeReferral: (id, o) => {
      const r0 = rec(id);
      if (!r0 || openRisk(r0)) return null;
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const r = rec(rid) as IntakeRecord;
      const reason = DECLINE_REASON[o.reasonCode];
      const notice = addNotice(rid, "declined", draftNotice(r, "declined", { signedBy: signatureOf(me), reasonCode: o.reasonCode, message: o.reasonCode === "other" ? o.note : undefined }));
      patch(rid, (x) => ({ ...x, triage: "declined", triageNote: `${reason}.${o.note?.trim() ? ` ${o.note.trim()}` : ""}`, referralDecision: { kind: "declined", at: s.clock, by: me, reasonCode: o.reasonCode, reason, note: o.note?.trim() || undefined, noticeId: notice } }));
      audit(rid, { actor: me, action: "Declined the referral", detail: `${reason}${o.note?.trim() ? ` · ${o.note.trim()}` : ""}` });
      get().toast({ title: `${rid} declined`, body: "A notice to the referrer is drafted. It is not sent until you approve it.", tone: "neutral" });
      return rid;
    },
    closeIntakeReferral: (id, reason) => {
      const s = get();
      const me = meOf(s);
      patch(id, (r) => ({ ...r, triage: "closed", triageNote: reason.trim(), referralDecision: { kind: "closed", at: s.clock, by: me, reason: reason.trim() } }));
      audit(id, { actor: me, action: "Closed the referral", detail: reason.trim() });
    },
    reopenIntakeReferral: (id, reason) => {
      const s = get();
      const r = rec(id);
      if (!r) return;
      const was = r.triage;
      patch(id, (x) => ({ ...x, triage: "new", triageNote: undefined, referralDecision: undefined, waitlist: undefined }));
      audit(id, { actor: meOf(s), action: "Reopened the referral", detail: `Was ${was}. ${reason.trim()}` });
    },
    requestIntakeMissingInfo: (id, o) => {
      const rid = real(id);
      if (!rid) return null;
      const s = get();
      const me = meOf(s);
      const nid = addNotice(rid, "missing_info", { to: o.to, channel: o.channel, subject: o.subject, body: o.body }, o.items);
      const r = rec(rid) as IntakeRecord;
      if (r.triage === "new") patch(rid, (x) => ({ ...x, triage: "needs_info", triageNote: `Waiting on the referrer: ${o.items.join(", ") || "more information"}` }));
      audit(rid, { actor: me, action: "Drafted a request for missing information", detail: `To ${o.to}: ${o.items.join("; ") || "see message"}` });
      if (o.send) get().sendIntakeNotice(rid, nid, o.send.basis);
      else {
        get().addIntakeTask(rid, { role: "coordination", action: "Approve and send the request for missing information", status: "needs_you", section: "referral", approval: "required", result: "The draft waits for a person to approve it" });
        get().toast({ title: "Request drafted", body: "It is not sent until you approve it.", tone: "neutral" });
      }
      return rid;
    },
    editIntakeNotice: (id, noticeId, p) => patch(id, (r) => ({ ...r, referralNotices: (r.referralNotices ?? []).map((x) => (x.id === noticeId && x.status === "draft" ? { ...x, ...p } : x)) })),
    sendIntakeNotice: (id, noticeId, basis) => {
      const s = get();
      const r = rec(id);
      const notice = r?.referralNotices?.find((x) => x.id === noticeId);
      if (!r || !notice || notice.status !== "draft") return false;
      const roi = r.profile.roi?.value === "On file";
      if (basis === "release_on_file" && !roi) return false;
      if (basis === "protocol_attested" && partTwoApplies(r)) return false;
      const me = meOf(s);
      patch(id, (x) => ({ ...x, referralNotices: (x.referralNotices ?? []).map((n2) => (n2.id === noticeId ? { ...n2, status: "sent", sentAt: s.clock, approvedBy: me, basis } : n2)) }));
      audit(id, { actor: me, action: `Approved and sent (simulated): ${notice.subject}`, detail: `To ${notice.to} by ${notice.channel.toLowerCase()}. ${basis === "release_on_file" ? "Release of information on file." : "Organization protocol attested, not legal advice."}` });
      if (notice.kind === "missing_info" && !isReferralDraftId(id)) {
        const pending = r.tasks.find((t) => t.action === "Approve and send the request for missing information" && t.status === "needs_you");
        if (pending) s.updateIntakeTask(id, pending.id, { status: "done", result: "Approved and sent (simulated)" });
        s.addIntakeTask(id, { role: "coordination", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: `Message to ${notice.to}`, approval: "approved", result: `Asked for ${notice.items?.join(", ").toLowerCase() || "more information"}. Sent by ${staffOf(me)?.name ?? "staff"} (simulated ${notice.channel.toLowerCase()}); follow up in 2 business days.` });
      }
      s.toast({ title: `Sent to ${notice.to} (simulated)`, body: "Nothing left the demo.", tone: "good" });
      return true;
    },
    discardIntakeNotice: (id, noticeId) => {
      patch(id, (r) => ({ ...r, referralNotices: (r.referralNotices ?? []).map((x) => (x.id === noticeId && x.status === "draft" ? { ...x, status: "discarded" } : x)) }));
      audit(id, { actor: meOf(get()), action: "Discarded a draft notice" });
    },
    removeIntakeFromWaitlist: (id) => {
      patch(id, (r) => ({ ...r, waitlist: undefined, triageNote: undefined }));
      audit(id, { actor: meOf(get()), action: "Removed from the waitlist" });
    },
  };
}
