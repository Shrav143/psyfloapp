/* What FLO and the notifications are allowed to read. A viewer limited to one site must never be told about, counted, or linked to the other site's cases,
   so every answer is worked out from a copy of the store that holds only the cases in view. Payers, agents and Settings are clinic-wide and stay whole. */
import { siteOf } from "@/data/sites";
import type { AppNotification, PsyRequest } from "@/data/types";
import { sitesInView } from "@/lib/scope";
import type { AppState } from "@/store";

/** The store as the viewer may see it: requests, queue, ledger, reviews, drafts, coverage checks and notifications of the sites in view only. */
export function scopedState(s: AppState): AppState {
  const sites = sitesInView(s);
  if (sites.length === 2) return s;
  const has = (id: string): boolean => sites.includes(siteOf(id));
  return {
    ...s,
    requests: s.requests.filter((r) => has(r.caseId)),
    queueItems: s.queueItems.filter((i) => has(i.id)),
    ledger: s.ledger.filter((c) => has(c.caseId)),
    reviews: s.reviews.filter((r) => has(r.ledgerId)),
    caseDrafts: s.caseDrafts.filter((d) => sites.includes(d.site)),
    ebPatients: s.ebPatients.filter((p) => has(p.id)),
    notifications: visibleNotifications(s.notifications, s.requests, has),
  };
}

const DRAFT_PATH = /draft-([a-z])(\d+)/i;
const CASE_ID = /\b([RIPD]-\d{3,4}(?:-[a-z])?)\b/i;

/** The case a notification is about: the one in its link, else the one its words name. A notification about a payer or a rule names no case. */
export function notificationCase(n: AppNotification, requests: readonly PsyRequest[]): string | undefined {
  const draft = DRAFT_PATH.exec(n.to ?? "");
  if (draft) return `${draft[1].toUpperCase()}-${draft[2]}`;
  const named = CASE_ID.exec(n.to ?? "")?.[1] ?? CASE_ID.exec(`${n.title} ${n.body}`)?.[1];
  if (!named) return undefined;
  const id = named.toUpperCase();
  // A denial made from a request has its own id; its site is its case's site.
  return requests.find((r) => r.id === id)?.caseId ?? id;
}

/** The notifications about cases in view, and the ones that belong to no case. */
export function visibleNotifications(list: AppNotification[], requests: readonly PsyRequest[], has: (caseId: string) => boolean): AppNotification[] {
  return list.filter((n) => {
    const id = notificationCase(n, requests);
    return id === undefined || has(id);
  });
}
