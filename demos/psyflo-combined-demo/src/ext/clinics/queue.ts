import { SEED_ACCEPT_DENIAL } from "@/data/denials";
import { QUEUE_ITEMS, type Phase } from "@/data/queue";
import { SEED_REQUESTS } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { siteName, siteOf } from "@/data/sites";
import { consumerNo } from "@/ehr/model";
import type { Consumer } from "../types";

/* The platform's own authorization queue, as consumers of the clinic's Lauris: one consumer for every open request, so a request opened in the Psyflo platform is the
   same person here, with the same Lauris number. The people Lauris assigns consumers to are the people of the demo. */

export const STAFF = ["J. Perez", "D. Rivera", "A. Morgan", "S. Okafor"];
export const staffOf = (caseId: string): string => STAFF[(parseInt(caseId.replace(/\D/g, ""), 10) || 0) % STAFF.length];

/** Where the authorization stands, in Lauris's words and its chip color. */
const PHASE: Record<Phase, { text: string; tone: "g" | "y" | "r" | "n" }> = {
  preparing: { text: "Request in progress", tone: "y" },
  ready: { text: "Ready to sign", tone: "g" },
  payer: { text: "With the payer", tone: "n" },
  denial: { text: "Denied", tone: "r" },
};

const fromQueue: Consumer[] = QUEUE_ITEMS.map((i) => {
  const ph = PHASE[i.phase];
  return {
    id: consumerNo(i.id), ini: i.initials, age: i.age, program: i.levelLabel, site: siteName(siteOf(i.id)), payer: i.payerId, clinician: staffOf(i.id),
    note: i.dx, units: null, dx: i.dx, chart: [], docs: [],
    auth: { caseId: i.id, text: `${ph.text} · ${i.type}`, tone: ph.tone },
  };
});

/* A few requests exist only on the Dashboard, such as a denial whose authorization was sent weeks ago. They are consumers here too, so every request the platform can open in Lauris has a consumer. */
const have = new Set(QUEUE_ITEMS.map((i) => i.id));
const taken = new Set(fromQueue.map((c) => c.id));
const extra: Consumer[] = [];
for (const r of [...SEED_REQUESTS, SEED_ACCEPT_DENIAL]) {
  const caseId = r.track === "denial" ? r.caseId : r.id;
  if (!caseId || have.has(caseId) || taken.has(consumerNo(caseId))) continue;
  have.add(caseId);
  taken.add(consumerNo(caseId));
  const denial = r.track === "denial";
  extra.push({
    id: consumerNo(caseId), ini: r.patient.initials, age: r.patient.age, program: PROGRAM_LABEL[r.program], site: siteName(siteOf(caseId)), payer: r.payerId, clinician: staffOf(caseId),
    note: denial ? `Denied · ${r.type}` : r.type, units: null, chart: [], docs: [],
    auth: { caseId, text: denial ? `Denied · ${r.type}` : `${r.chip} · ${r.type}`, tone: denial ? "r" : r.stage === "preparing" ? "y" : "n" },
  });
}

export const consumers: Consumer[] = [...fromQueue, ...extra];
