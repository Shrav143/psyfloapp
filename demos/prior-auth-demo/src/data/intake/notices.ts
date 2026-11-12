import { serviceById } from "../va/services";
import type { DeclineReasonCode, NoticeChannel, NoticeKind, RedirectReasonCode } from "./decision";
import { DECLINE_REASON, REDIRECT_REASON } from "./decision";
import type { IntakeRecord } from "./types";

/* Drafts of the messages a referral sends back to the referrer. Each is a draft for a person to read, edit and approve; none is sent by itself.
   They carry the minimum: who, which service, the outcome and what happens next. No diagnosis, no clinical detail, no free-text notes. */

export interface NoticeDraft {
  to: string;
  channel: NoticeChannel;
  subject: string;
  body: string;
}

const CRISIS = "If anyone is in immediate danger, call 911. The 988 Suicide and Crisis Lifeline is available by call or text.";

/** The person the message goes to: the referring clinician when named, else the referring organization. */
export const noticeRecipient = (r: Pick<IntakeRecord, "referral" | "sourceOrg">): string => r.referral.referringClinician?.value || r.sourceOrg;

const who = (r: Pick<IntakeRecord, "initials" | "age">) => `${r.initials || "the person"}${r.age !== null ? `, ${r.age}` : ""}`;
const sign = (signedBy: string) => `${signedBy || "Intake team"}\nPsyflo demo clinic intake (fictional)`;
export const noticeChannelFor = (r: Pick<IntakeRecord, "method">): NoticeChannel => (r.method === "fax" ? "Fax" : r.method === "phone" ? "Phone call" : "Secure message");

export function draftNotice(
  r: Pick<IntakeRecord, "initials" | "age" | "serviceId" | "referral" | "sourceOrg" | "method" | "assignedTo">,
  kind: NoticeKind,
  o: { /** "Taylor Brooks, Intake coordinator" */ signedBy: string; items?: string[]; reasonCode?: DeclineReasonCode | RedirectReasonCode; destination?: string; message?: string },
): NoticeDraft {
  const to = noticeRecipient(r);
  const service = serviceById(r.serviceId).short;
  const head = `Hello ${to},\n\n`;
  const tail = `\n\n${sign(o.signedBy)}`;
  const extra = o.message?.trim() && o.reasonCode !== "other" ? `\n\n${o.message.trim()}` : "";
  const channel = noticeChannelFor(r);
  switch (kind) {
    case "missing_info": {
      const items = o.items?.length ? o.items.map((i) => `- ${i}`).join("\n") : "- (add what you need)";
      return { to, channel, subject: `More information needed for ${who(r)}`, body: `${head}Thank you for referring ${who(r)} for ${service}. To finish reviewing the referral we still need:\n${items}\n\nYou can reply to this message or call our intake line at (804) 555-0100.${tail}` };
    }
    case "accepted":
      return { to, channel, subject: `Referral accepted for ${who(r)}`, body: `${head}Thank you for referring ${who(r)} for ${service}. We accepted the referral for assessment. Our team will contact the person to arrange the next step.\n\nThis message has no clinical details.${extra}${tail}` };
    case "redirected": {
      const why = o.reasonCode === "other" && o.message?.trim() ? o.message.trim() : o.reasonCode ? REDIRECT_REASON[o.reasonCode as RedirectReasonCode] : "";
      return {
        to, channel, subject: `Referral redirected for ${who(r)}`,
        body: `${head}Thank you for referring ${who(r)} for ${service}. We are not able to take this referral here${why ? `: ${why.charAt(0).toLowerCase()}${why.slice(1)}` : ""}.${o.destination ? ` We suggest ${o.destination}.` : ""}\n\n${CRISIS}${extra}${tail}`,
      };
    }
    case "declined": {
      const why = o.reasonCode === "other" && o.message?.trim() ? o.message.trim() : o.reasonCode ? DECLINE_REASON[o.reasonCode as DeclineReasonCode] : "";
      return { to, channel, subject: `Referral not accepted for ${who(r)}`, body: `${head}Thank you for referring ${who(r)} for ${service}. We are not able to accept this referral${why ? `: ${why.charAt(0).toLowerCase()}${why.slice(1)}` : ""}.\n\n${CRISIS}${extra}${tail}` };
    }
  }
}
