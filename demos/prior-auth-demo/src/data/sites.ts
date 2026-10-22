/* Sites. A clinic can run more than one, and staff at one site must not see the other site's patients (minimum necessary access).
   Every record that belongs to a patient has a site, and the site is a function of the case id, so the same case is at the same site
   on every screen: the queue, the Dashboard, Case Manager, Eligibility, Denial Intelligence, Analytics and the referral list. */

export type SiteId = "A" | "B";
export const SITE_IDS: SiteId[] = ["A", "B"];
export const SITES: { id: SiteId; name: string; sub: string }[] = [
  { id: "A", name: "Site A", sub: "Main campus" },
  { id: "B", name: "Site B", sub: "Second campus" },
];
export const siteName = (id: SiteId): string => SITES.find((s) => s.id === id)?.name ?? `Site ${id}`;
/** "Site A", "Site B" or "Both sites" for the sites a record, system or view covers. */
export const sitesLabel = (ids: readonly SiteId[]): string => (ids.length > 1 ? "Both sites" : ids.length === 1 ? siteName(ids[0]) : "No site");
/** True when any of `ids` is inside `view`: a system that serves both sites is in the Site A view and in the Site B view. */
export const touchesView = (ids: readonly SiteId[], view: readonly SiteId[]): boolean => ids.some((id) => view.includes(id));

/** The demo's headline cases are placed by hand so each site has a good story; every other id is placed by a stable hash (about 55% Site A). */
const PLACED: Record<string, SiteId> = {
  "R-1042": "A", "R-1101": "A", "R-0997": "A", "D-3318": "A", "R-0988": "A", "P-1499": "A", "R-1117": "A", "I-2144": "A", "R-0921": "A", "I-2275": "A", "R-0912": "A",
  "I-2207": "B", "I-2141": "B", "D-3297": "B", "I-2127": "B", "D-3306": "B", "I-2231": "B", "I-2193": "B", "R-0975": "B", "R-1118": "B", "P-1544": "B", "D-3290": "B",
  /* Three of the eight open referrals are at Site B, so each site has an Incoming referrals list in New case (by the hash all eight fell at Site A). */
  "RF-2045": "B", "RF-2048": "B", "RF-2053": "B",
};

/** Reduce any id that names a case to the case id: "R-0902-b" is R-0902, and "draft-r1042" is R-1042. */
export function caseKey(id: string): string {
  const d = id.match(/^draft-([a-z])(\d+)$/i);
  if (d) return `${d[1].toUpperCase()}-${d[2]}`;
  return id.replace(/-[a-z]$/, "");
}

const hash = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h % 100;
};

/** The site of a case, from its case id (for a denial pass its `caseId`; for a referral its `RF-` id). Stable across screens and sessions. */
export function siteOf(id: string): SiteId {
  const k = caseKey(id);
  return PLACED[k] ?? PLACED[id] ?? (hash(k) < 55 ? "A" : "B");
}
