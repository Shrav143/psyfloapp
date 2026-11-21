import type { ClinicConfig } from "../../types";
import { ask } from "./ask";
import { checks } from "./checks";
import { docs } from "./docs";
import { forms } from "./forms";
import { history } from "./history";
import { profile } from "./profile";
import { consumers } from "./roster";
import { scribe } from "./scribe";

/* Community Counseling Center of Southern Nevada (placeholder name): adult substance use treatment, ASAM Levels 1 and 2.1.
   Smaller than Harvest's config on purpose: the same extension, only the content changes. */
export const cccsn: ClinicConfig = {
  id: "cccsn",
  profile,
  today: "2026-10-29",
  user: { name: "Jordan Perez, LCADC", short: "J. Perez", role: "Clinical director" },
  forms,
  consumers,
  docs,
  scribe,
  checks,
  ask,
  history,
};
