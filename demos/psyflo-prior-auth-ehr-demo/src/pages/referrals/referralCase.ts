import type { CaseDraft } from "@/data/cases";
import type { Referral } from "@/data/referrals";
import type { PsyRequest } from "@/data/types";
import { paths } from "@/routes";

/** The case a referral already started: the request it became once sent, or the draft still being prepared. */
export type ReferralCase = { kind: "request"; id: string } | { kind: "draft"; id: string };

export function caseOf(r: Referral, requests: PsyRequest[], drafts: CaseDraft[]): ReferralCase | null {
  const sent = requests.find((x) => x.referralId === r.id) ?? (r.requestId ? requests.find((x) => x.id === r.requestId) : undefined);
  if (sent) return { kind: "request", id: sent.id };
  const draft = drafts.find((d) => d.referralId === r.id && !d.sent);
  return draft ? { kind: "draft", id: draft.id } : null;
}

export const caseTo = (c: ReferralCase): string => (c.kind === "request" ? paths.case(c.id) : paths.newCase({ draft: c.id }));
