import type { ClinicConfig } from "../../types";
import { checks } from "./checks";
import { docs } from "./docs";
import { forms } from "./forms";
import { history } from "./history";
import { profile } from "./profile";
import { consumers } from "./roster";
import { scribe } from "./scribe";

/* Harvest Outreach: therapeutic day treatment (TDT) in Virginia schools. The ORIGINAL content (TDT, Virginia DMAS forms,
   daily progress notes, CNA). Sample data: initials only, no real IDs, no plan's real policy quoted. */
export const harvest: ClinicConfig = {
  id: "harvest",
  profile,
  today: "2026-10-29",
  user: { name: "Jordan Perez, LPC", short: "J. Perez", role: "Assistant Clinical Support Supervisor" },
  forms,
  consumers,
  docs,
  scribe,
  checks,
  history,
};
