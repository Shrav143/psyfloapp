import { PAYERS } from "@/data/seed";
import type { ClinicConfig } from "../types";
import { cccsn } from "./cccsn";
import { consumers as queue } from "./queue";

/* The one clinic of the demo: Community Counseling Center of Southern Nevada (placeholder name), adult substance use treatment with ASAM Levels 1 and 2.1.
   Its Lauris lists its own clients first (they have documents Psyflo can scribe and scan), then the people behind the platform's authorization requests (each has an authorization form,
   where the extension adds the platform's recommendations). Any client can be given any document from the panel. The platform's payers are added to the clinic's payer list so every row has one. */
export const clinic: ClinicConfig = {
  ...cccsn,
  profile: {
    ...cccsn.profile,
    payers: [...cccsn.profile.payers, ...PAYERS.map((p) => ({ id: p.id as string, name: p.name, channel: p.reachedBy, criteria: "This plan's rules and workflow are in Payers in the Psyflo platform." }))],
  },
  consumers: [...cccsn.consumers, ...queue],
};
