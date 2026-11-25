import type { StateCreator } from "zustand";
import type { SiteId } from "@/data/sites";
import { DEFAULT_VIEWER, viewerById, type Viewer, type ViewerId } from "@/data/viewers";
import type { AppState } from "./index";

/* Who is signed in and which site they are looking at. A viewer who may see both sites can choose Both sites, Site A or Site B;
   a viewer limited to one site always sees that site. Every list, count, chart and answer reads `useScope()` (lib/scope.ts). */

export type SiteScope = "both" | SiteId;

export interface SessionSlice {
  viewerId: ViewerId;
  siteScope: SiteScope;
  setViewer: (id: ViewerId) => void;
  setSiteScope: (scope: SiteScope) => void;
}

/** The scope a viewer starts with: their only site, or both. */
const startScope = (v: Viewer): SiteScope => (v.sites.length === 1 ? v.sites[0] : "both");

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
  viewerId: DEFAULT_VIEWER,
  siteScope: "both",
  setViewer: (id) => {
    const v = viewerById(id);
    set({ viewerId: id, siteScope: startScope(v) });
    get().toast({ title: `Now viewing as ${v.name}`, body: v.sites.length === 1 ? `${v.role}. Only Site ${v.sites[0]} is visible; the other site's records are not available.` : `${v.role}. Both sites are visible.`, tone: "neutral" });
  },
  setSiteScope: (scope) => {
    const v = viewerById(get().viewerId);
    if (scope !== "both" && !v.sites.includes(scope)) return;
    if (scope === "both" && v.sites.length < 2) return;
    set({ siteScope: scope });
  },
});
