import { useStore } from "@/store";
import { runAgent } from "../../lib/agents";
import { followUpMessage, isGenerated, packetMessage, readyProblems } from "./referralModel";

/* The Referral Coordination Agent's two jobs in the demo. Both only draft: the packet waits for a person's approval to send, and so does a
   follow-up message. Nothing leaves the clinic without a person, and delivery is simulated either way. */

const find = (recordId: string, roId: string) => {
  const r = useStore.getState().intakes.find((x) => x.id === recordId);
  return { r, ro: r?.referralsOut.find((x) => x.id === roId) };
};

export function preparePacket(recordId: string, roId: string) {
  runAgent(recordId, {
    role: "coordination", action: `Prepare the referral packet for ${roId}`, section: "pathway", source: roId, approval: "required", ms: 1400,
    work: () => {
      const { r, ro } = find(recordId, roId);
      if (!r || !ro) return "The referral was not found.";
      const docs = ro.docs.map((d) => (d.generated || isGenerated(d.name) ? { ...d, attached: true, generated: true } : d));
      const missing = readyProblems({ ...ro, docs });
      const message = packetMessage(r, { ...ro, docs });
      useStore.getState().updateReferralOut(recordId, roId, { docs, packet: { preparedAt: useStore.getState().clock, message, missing } }, {
        action: "Prepared the referral packet and a draft cover message", detail: missing.length ? `Still missing: ${missing.join("; ")}` : "Nothing missing", actor: "navigator", ai: true, quiet: true,
      });
      return missing.length ? `Packet drafted; ${missing.length} item${missing.length === 1 ? "" : "s"} still missing. A person approves before anything is sent.` : "Packet ready for a person to review and approve. Nothing was sent.";
    },
  });
}

export function draftFollowUp(recordId: string, roId: string) {
  runAgent(recordId, {
    role: "coordination", action: `Draft a follow-up for ${roId}`, section: "pathway", source: roId, approval: "required", ms: 1100,
    work: () => {
      const { r, ro } = find(recordId, roId);
      if (!r || !ro) return "The referral was not found.";
      const s = useStore.getState();
      s.updateReferralOut(recordId, roId, { followUpDraft: { text: followUpMessage(r, ro, s.clock), at: s.clock } }, { action: "Drafted a follow-up message", actor: "navigator", ai: true, quiet: true });
      return "Follow-up drafted. Sending it needs a person.";
    },
  });
}
