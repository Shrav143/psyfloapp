import type { ClinicConfig } from "../../types";
import { checks } from "./checks";
import { docs } from "./docs";
import { forms } from "./forms";
import { history } from "./history";
import { profile } from "./profile";
import { consumers } from "./roster";
import { scribe } from "./scribe";

/* The sample treatment center behind the Psyflo platform demo (residential, PHP, IOP and detox; Ohio-style payers). Its roster is the platform's authorization queue, so a consumer here is a request there.
   Sample data: initials only, no real IDs, no plan's real policy quoted. */
export const platform: ClinicConfig = {
  id: "platform",
  profile,
  today: "2026-10-20",
  user: { name: "Jordan Perez", short: "J. Perez", role: "UR coordinator" },
  forms,
  consumers,
  docs,
  scribe,
  checks,
  history,
};
