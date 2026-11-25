import type { IntakeDocument, IntakeRecord, ReferralOut, ReferralOutStatus } from "@/data/intake/types";
import { GENERATED_DOCS } from "@/data/intake/destinations";
import { serviceById } from "@/data/va/services";
import { ago, longDate } from "@/lib/time";

/* Closed-loop referral rules: what must be true before a referral is ready, what the receiving organization can answer at each step,
   when a follow-up is overdue, and the agent's draft messages. Delivery is always simulated. */

export const STEPS = ["Draft", "Ready to send", "Sent", "Received", "Under review", "Decision", "Scheduled", "Completed"] as const;
const STEP_OF: Record<ReferralOutStatus, number> = { draft: 0, ready: 1, sent: 2, received: 3, under_review: 4, accepted: 5, needs_info: 5, declined: 5, scheduled: 6, completed: 7 };
export const stepOf = (s: ReferralOutStatus) => STEP_OF[s];
export const STATUS_TONE: Record<ReferralOutStatus, "neutral" | "mid" | "good" | "risk"> = {
  draft: "neutral", ready: "neutral", sent: "neutral", received: "neutral", under_review: "neutral", accepted: "good", needs_info: "mid", declined: "risk", scheduled: "good", completed: "good",
};
/** Statuses that wait on the receiving organization, where a follow-up can be due. */
export const WAITING: ReferralOutStatus[] = ["sent", "received", "under_review", "needs_info"];
export const isOverdue = (ro: ReferralOut, clock: number) => WAITING.includes(ro.status) && ro.followUpAt !== undefined && ro.followUpAt < clock;

/** The demo replies the receiving organization can give from each status. */
export const REPLIES: Partial<Record<ReferralOutStatus, ReferralOutStatus[]>> = {
  sent: ["received"],
  received: ["under_review", "accepted", "needs_info", "declined"],
  under_review: ["accepted", "needs_info", "declined"],
};

export const isGenerated = (name: string) => GENERATED_DOCS.includes(name);

/** What blocks Ready to send: consent on file and every required document attached (generated ones come with the packet). */
export function readyProblems(ro: ReferralOut): string[] {
  const p: string[] = [];
  if (ro.consent !== "on_file") p.push(ro.consent === "declined" ? "The person declined consent to share records" : "Consent or release of information is not on file");
  for (const d of ro.docs) if (d.required && !d.attached && !d.generated && !isGenerated(d.name)) p.push(`${d.name} is not attached`);
  return p;
}
/** What blocks sending: the ready checks, plus a packet prepared by the agent and reviewed by a person. */
export const sendProblems = (ro: ReferralOut): string[] => [...readyProblems(ro), ...(ro.packet ? [] : ["The packet has not been prepared yet"])];

/** A record document that fits a required slot, by kind or name. A person can change it. */
export function matchDoc(name: string, docs: IntakeDocument[]): IntakeDocument | undefined {
  const n = name.toLowerCase();
  const byKind = (k: IntakeDocument["kind"][]) => docs.find((d) => k.includes(d.kind));
  if (n.includes("discharge")) return byKind(["discharge_summary"]);
  if (n.includes("release") || n.includes("consent")) return byKind(["consent"]) ?? docs.find((d) => /release|consent|roi/i.test(d.name));
  if (n.includes("insurance")) return byKind(["insurance_card"]);
  if (n.includes("clinical notes")) return byKind(["emr_summary", "discharge_summary"]);
  return docs.find((d) => d.name.toLowerCase().includes(n));
}

/** The referral's consent, from the profile's release of information when it is recorded there. */
export function consentFromProfile(r: IntakeRecord): ReferralOut["consent"] {
  const v = r.profile.roi?.value ?? "";
  return v === "On file" ? "on_file" : v === "Declined" ? "declined" : "needed";
}

const who = (r: IntakeRecord) => `${r.initials || "the person"}${r.age !== null ? `, ${r.age}` : ""}`;
const svcName = (ro: ReferralOut) => (ro.serviceId === "external" ? "your program" : serviceById(ro.serviceId).label);

export function packetMessage(r: IntakeRecord, ro: ReferralOut): string {
  const attached = ro.docs.filter((d) => d.attached || d.generated || isGenerated(d.name)).map((d) => d.name.toLowerCase());
  return [
    `Referral for ${who(r)} (initials only), for ${svcName(ro)}.`,
    r.referral.reason?.value ? `Reason: ${r.referral.reason.value}` : "",
    attached.length ? `Attached: ${attached.join(", ")}.` : "",
    `Priority: ${ro.priority}. Please confirm receipt and let us know about intake availability.`,
  ].filter(Boolean).join(" ");
}

export function followUpMessage(r: IntakeRecord, ro: ReferralOut, clock: number): string {
  const sent = ro.timeline.find((e) => /sent/i.test(e.action));
  return `Following up on referral ${ro.id} for ${who(r)}, ${sent ? `sent ${ago(sent.at, clock)}` : "sent earlier"}. Its status with us is "${ro.status.replace("_", " ")}". Could you confirm where it stands and whether you need anything else?${ro.followUpAt !== undefined ? ` We planned to follow up by ${longDate(ro.followUpAt)}.` : ""}`;
}
