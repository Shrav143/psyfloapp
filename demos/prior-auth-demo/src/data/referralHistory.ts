import { DAY, HOUR } from "@/lib/time";
import type { PayerId, Program, Urgency } from "./types";
import { DECLINE_LABEL } from "./referralLabels";
import type { Channel, DeclineReason, SourceDef, StaffId } from "./referralTypes";
import type { ReferralSpec } from "./referralBuild";
import { hash } from "./referralInsight";
import { SRC, dx } from "./referralSpecs";

/* Older, closed referrals. They give the funnel, the source bars and the weekly chart real volume.
   Everything is derived from the index, so the demo looks the same every time. */

const rnd = (i: number, salt: string): number => (hash(`${i}:${salt}`) % 10000) / 10000;
function pick<T>(items: [T, number][], r: number): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let acc = 0;
  for (const [v, w] of items) {
    acc += w;
    if (r * total < acc) return v;
  }
  return items[items.length - 1][0];
}

const SOURCE_MIX: [SourceDef, number][] = [
  [SRC.mercyEd, 16], [SRC.stBrigid, 14], [SRC.okafor, 9], [SRC.lindqvist, 5], [SRC.riverbend, 8], [SRC.northfield, 7],
  [SRC.drugCourt, 8], [SRC.probation, 5], [SRC.crisis, 8], [SRC.westlake, 2], [SRC.selfWeb, 8],
];
const PAYER_MIX: [PayerId, number][] = [["summit", 30], ["cardinal", 20], ["beacon", 18], ["harborview", 12], ["lakeshore", 10], ["evergreen", 10]];
const PROGRAM_MIX: [Program, number][] = [["RES", 36], ["IOP", 28], ["PHP", 20], ["WM", 16]];
const DECLINE_MIX: [DeclineReason, number][] = [["criteria", 24], ["coverage", 20], ["no_bed", 20], ["higher_care", 14], ["withdrew", 12], ["age", 5], ["area", 5]];
const STAFF_IDS: StaffId[] = ["jp", "tb", "ml"];

const CHANNELS: Record<string, Channel[]> = {
  ed: ["fax", "eReferral"], hospital: ["eReferral", "fax"], court: ["fax", "email"], primary: ["fax", "eReferral"],
  clinic: ["eReferral", "fax"], crisis: ["phone"], school: ["fax", "email"], self: ["portal"],
};
const REASONS: Record<string, string[]> = {
  ed: ["Seen in the emergency department after heavy use and medically cleared. Has not been able to stop with outpatient help.", "Brought in by family after a fall while intoxicated. Withdrawal treated and stable."],
  hospital: ["Inpatient stay for a related medical problem. Ready to leave the hospital and asks for treatment that fits his recovery goals.", "Detoxified during a hospital stay. Needs a structured program before going home."],
  court: ["Court-ordered assessment after a positive screen. The court team asks for treatment that can report attendance.", "Probation condition requires treatment. Screens positive twice this month."],
  primary: ["Seen in clinic with rising use despite counseling at the practice. Asks for a structured program.", "Use is affecting work and sleep. A taper at the clinic did not hold."],
  clinic: ["Stepping up from weekly counseling after two lapses. Needs more structure than outpatient care gives.", "Completed a course of therapy and still using. Referred to a higher level of care."],
  crisis: ["Follow-up after a crisis line call. Asked for treatment on the follow-up call.", "Caller agreed to a referral after a hard night. Willing to start this week."],
  school: ["Referred by the school counselor after repeated incidents. A parent supports treatment."],
  self: ["Found the program online and asks for an assessment. Wants to start as soon as possible.", "Referred himself after a conversation with a friend in recovery."],
};
const SUBSTANCES = ["Alcohol, daily. Last drink three days ago.", "Opioids, daily for two years. Last use two days ago.", "Cocaine several times a week. Last use five days ago.", "Methamphetamine on most days. Last use four days ago.", "Alcohol and cannabis. Last use yesterday."];
const DX_MIX: string[][] = [["F10.20"], ["F11.20"], ["F14.20"], ["F15.20"], ["F10.20", "F33.1"], ["F11.20", "F43.10"], ["F12.20"]];
const FIRST = "ABCDEGHJKLMNPRSTVW";
const LAST = "BCDFGHJKLMNPRSTVWY";

export function historySpecs(count = 56): ReferralSpec[] {
  const out: ReferralSpec[] = [];
  for (let i = 0; i < count; i++) {
    const source = pick(SOURCE_MIX, rnd(i, "src"));
    const program = pick(PROGRAM_MIX, rnd(i, "prog"));
    const kind = source.kind;
    const urgency: Urgency = rnd(i, "urg") < (kind === "ed" ? 0.8 : kind === "hospital" || kind === "crisis" ? 0.5 : 0.15) ? (rnd(i, "em") < 0.15 ? "emergent" : "urgent") : "routine";
    const admitted = rnd(i, "out") < 0.68;
    const declineReason = pick(DECLINE_MIX, rnd(i, "dec"));
    const channels = CHANNELS[kind];
    const decideAfter = 30 + Math.floor(rnd(i, "dt") ** 1.5 * 520);
    const dxPick = DX_MIX[Math.floor(rnd(i, "dx") * DX_MIX.length)];
    const reasons = REASONS[kind];
    const owner = STAFF_IDS[Math.floor(rnd(i, "own") * 3)];
    out.push({
      id: `RF-${1982 + i}`,
      ago: Math.round(55 * DAY - i * ((45 * DAY) / (count - 1))) + Math.floor(rnd(i, "jit") * 540) - 270,
      channel: channels[Math.floor(rnd(i, "ch") * channels.length)],
      source,
      initials: `${FIRST[(i * 7) % FIRST.length]}.${LAST[(i * 11 + 3) % LAST.length]}.`,
      age: !admitted && declineReason === "age" ? 17 : 19 + Math.floor(rnd(i, "age") * 42),
      sex: rnd(i, "sex") < 0.5 ? "F" : "M",
      payer: pick(PAYER_MIX, rnd(i, "pay")),
      last4: String(1000 + Math.floor(rnd(i, "mid") * 9000)),
      program,
      urgency,
      status: admitted ? "admitted" : "declined",
      owner,
      opened: true,
      decideAfter,
      admitAfter: decideAfter + HOUR * 6 + Math.floor(rnd(i, "adm") * DAY),
      coverageRun: true,
      lapsed: !admitted && declineReason === "coverage",
      decline: admitted ? undefined : { reason: declineReason, note: `${DECLINE_LABEL[declineReason]}. The referrer was told the same day.`, courtesy: rnd(i, "cour") < 0.7 },
      plan: {
        reason: reasons[Math.floor(rnd(i, "rs") * reasons.length)],
        substances: SUBSTANCES[Math.floor(rnd(i, "sub") * SUBSTANCES.length)],
        meds: ["None reported"],
        risk: "No thoughts of self-harm. Housing is stable.",
        dx: dx(...(program === "WM" ? [kind === "ed" ? "F10.239" : "F11.23"] : dxPick)),
        pages: rnd(i, "pg") < 0.6 ? 2 : 1,
      },
    });
  }
  return out;
}

/** Referrals the New referral window can "read" when someone drops a file or uses the sample. */
export const SAMPLE_SPECS: ReferralSpec[] = [
  {
    id: "RF-NEW", ago: 0, channel: "portal", source: SRC.lindqvist, initials: "N.B.", age: 39, sex: "F", payer: "beacon", last4: "6408", program: "IOP", urgency: "routine", status: "new",
    plan: { reason: "Daily alcohol use for three years with two failed tapers. Asks for an intensive outpatient program in the evenings.", substances: "Alcohol, about five drinks daily. Last drink yesterday.", meds: ["Naltrexone 50 mg daily"], risk: "No thoughts of self-harm. Lives with her partner.", dx: dx("F10.20"), signed: false },
  },
  {
    id: "RF-NEW", ago: 0, channel: "portal", source: SRC.probation, initials: "V.C.", age: 30, sex: "M", payer: "summit", last4: "1175", program: "RES", urgency: "urgent", status: "new",
    plan: { reason: "Court-ordered assessment after a relapse on opioids. The probation officer asks for residential treatment within a week.", substances: "Fentanyl, daily for a year. Last use two days ago.", meds: ["None reported"], risk: "No thoughts of self-harm. Housing at risk.", dx: dx("F11.20") },
  },
  {
    id: "RF-NEW", ago: 0, channel: "portal", source: SRC.mercyEd, initials: "Y.L.", age: 47, sex: "F", payer: "harborview", last4: "9034", program: "PHP", urgency: "routine", status: "new",
    plan: { reason: "Seen in the emergency department for a panic attack linked to heavy drinking. Asks for a day program.", substances: "Alcohol, daily for five years. Last drink two days ago.", meds: ["Buspirone 10 mg twice daily"], risk: "No thoughts of self-harm. Lives with her sister.", dx: dx("F10.2", "F41.1"), phone: "", pages: 1 },
  },
];
