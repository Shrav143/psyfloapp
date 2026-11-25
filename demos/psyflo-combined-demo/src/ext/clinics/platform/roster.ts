import { R1042_EVIDENCE as E } from "@/data/caseDetailR1042";
import { SEED_ACCEPT_DENIAL } from "@/data/denials";
import { QUEUE_ITEMS, type Phase } from "@/data/queue";
import { SEED_REQUESTS } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { siteName, siteOf } from "@/data/sites";
import { consumerNo } from "@/ehr/model";
import type { ChartRecord, Consumer } from "../../types";

/* The roster of the sample treatment center is the platform's own authorization queue: one consumer for every open request, so a request opened in the Psyflo platform is the
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

/* J.M. (R-1042) is the case the platform demo is built around. His chart records are the stored words that case rests on (the platform's own evidence), so a fix that quotes one types the same sentence the case holds. */
const rec = (id: string, label: string, date: string, kind: ChartRecord["kind"], text: string): ChartRecord => ({ id, label, date, kind, text });
export const jm: ChartRecord[] = [
  rec("psy1", E.PSY1.label, "2026-10-16", "assessment", E.PSY1.quote),
  rec("psy3", E.PSY3.label, "2026-10-16", "assessment", E.PSY3.quote),
  rec("psy5", E.PSY5.label, "2026-10-17", "assessment", E.PSY5.quote),
  rec("nurse", E.NURSE.label, "2026-10-19", "note", E.NURSE.quote),
  rec("soc2", E.SOC2.label, "2026-10-17", "assessment", E.SOC2.quote),
  rec("soc4", E.SOC4.label, "2026-10-17", "assessment", E.SOC4.quote),
  rec("meds", E.MEDS.label, "2026-10-16", "note", E.MEDS.quote),
  rec("plan2", E.PLAN2.label, "2026-10-17", "plan", E.PLAN2.quote),
];

/** Documents the demo has for a few consumers. Everyone else has the authorization form and can be given any document from the panel. */
const DOCS: Record<string, string[]> = {
  R1042: ["dpn-4042", "adm-4042", "asm-4042"],
  I2207: ["dpn-4207", "int-4207"],
  R0988: ["adm-4988"],
};
const CHARTS: Record<string, ChartRecord[]> = { R1042: jm };

const fromQueue: Consumer[] = QUEUE_ITEMS.map((i) => {
  const k = i.id.replace("-", "");
  const ph = PHASE[i.phase];
  return {
    id: consumerNo(i.id), ini: i.initials, age: i.age, program: i.levelLabel, site: siteName(siteOf(i.id)), payer: i.payerId, clinician: staffOf(i.id),
    note: i.dx, units: null, dx: i.dx, chart: CHARTS[k] ?? [], docs: DOCS[k] ?? [],
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
