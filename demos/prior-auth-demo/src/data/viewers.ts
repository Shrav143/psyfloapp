import type { SiteId } from "./sites";

/* Who is looking. A viewer can see only the sites listed, on every screen. "Viewing as" in the Demo menu switches viewer. */
export type ViewerId = "jordan" | "rivera" | "okafor" | "morgan";
export interface Viewer {
  id: ViewerId;
  name: string;
  initials: string;
  role: string;
  /** The sites this person may see. One site means the other site's records do not exist for them. */
  sites: SiteId[];
  clinician: boolean;
}
export const VIEWERS: Viewer[] = [
  { id: "jordan", name: "Jordan Perez", initials: "JP", role: "UR coordinator", sites: ["A", "B"], clinician: false },
  { id: "morgan", name: "Alex Morgan", initials: "AM", role: "Clinic owner", sites: ["A", "B"], clinician: false },
  { id: "rivera", name: "Dr. Rivera", initials: "DR", role: "Clinician, Site A", sites: ["A"], clinician: true },
  { id: "okafor", name: "Sam Okafor", initials: "SO", role: "Billing, Site B", sites: ["B"], clinician: false },
];
export const DEFAULT_VIEWER: ViewerId = "jordan";
export const viewerById = (id: ViewerId): Viewer => VIEWERS.find((v) => v.id === id) ?? VIEWERS[0];
