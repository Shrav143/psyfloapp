import { useMemo } from "react";
import { siteOf, siteName, type SiteId } from "@/data/sites";
import { viewerById, type Viewer, type ViewerId } from "@/data/viewers";
import { useStore } from "@/store";
import type { SiteScope } from "@/store/session";

/** The sites the current view shows: the chosen site, or every site the viewer may see. */
export function effectiveSites(viewer: Viewer, scope: SiteScope): SiteId[] {
  if (scope === "both") return viewer.sites;
  return viewer.sites.includes(scope) ? [scope] : viewer.sites;
}

export interface Scope {
  viewer: Viewer;
  /** "both", "A" or "B": what the switcher shows. */
  scope: SiteScope;
  /** The sites this view includes. */
  sites: SiteId[];
  /** True when the viewer may see only one site, so there is nothing to switch. */
  restricted: boolean;
  /** "Both sites", "Site A" or "Site B". */
  label: string;
  /** True when a record of this case id is inside the view. Pass the case id (a denial's `caseId`, a referral's `RF-` id). */
  has: (caseId: string) => boolean;
  /** Keeps the rows whose case id is inside the view. */
  filter: <T>(rows: readonly T[], idOf: (row: T) => string) => T[];
}

/** The one place every screen asks "what may this person see, and what is selected". Pure data in, so it is cheap to call in a render. */
export function useScope(): Scope {
  const viewerId = useStore((s) => s.viewerId);
  const scope = useStore((s) => s.siteScope);
  return useMemo(() => {
    const viewer = viewerById(viewerId);
    const sites = effectiveSites(viewer, scope);
    const has = (id: string): boolean => sites.includes(siteOf(id));
    return {
      viewer,
      scope,
      sites,
      restricted: viewer.sites.length < 2,
      label: sites.length === 2 ? "Both sites" : siteName(sites[0]),
      has,
      filter: (rows, idOf) => (sites.length === 2 ? [...rows] : rows.filter((r) => has(idOf(r)))),
    };
  }, [viewerId, scope]);
}

/** Non-hook form for store code and selectors: the sites currently in view. */
export function sitesInView(s: { viewerId: ViewerId; siteScope: SiteScope }): SiteId[] {
  return effectiveSites(viewerById(s.viewerId), s.siteScope);
}
