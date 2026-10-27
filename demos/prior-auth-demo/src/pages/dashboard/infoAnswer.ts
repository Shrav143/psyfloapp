import { payerById } from "@/data/seed";
import { forProgram } from "@/data/programTables";
import { PROGRAM_LABEL, type PsyRequest, type CoreProgram } from "@/data/types";

export interface InfoAnswer {
  asked: string[];
  paragraphs: string[];
  attachments: string[];
}

interface Profile {
  asked: string[];
  evidence: (who: string) => string[];
  closing: string;
  attachments: string[];
}

/* Invented chart facts for the demo. Every statement names where in the chart it comes from. */
const PROFILE: Record<CoreProgram, Profile> = {
  RES: {
    asked: [
      "The last 14 days of individual and group therapy notes",
      "Current ASAM dimension ratings, with dates",
      "Medication changes and the medication record for the past 7 days",
      "The step-down plan and the first aftercare appointment",
    ],
    evidence: (who) => [
      `Therapy notes. ${who} attended 12 of 14 scheduled groups and all 7 individual sessions between 10/06 and 10/19. The notes record craving ratings of 6 or higher on 4 of the last 7 days, and a conflict with a peer on 10/17 that needed staff help to settle.`,
      "ASAM ratings, updated 10/19. Withdrawal risk 1. Biomedical conditions 2. Emotional and behavioral conditions 3. Readiness to change 2. Relapse potential 3. Recovery environment 3. Dimensions 3, 5 and 6 are the reason a lower level of care does not yet fit.",
      "Medications. Naltrexone was continued. Sertraline was raised from 50 mg to 100 mg on 10/16 and the record shows no missed doses. Sleep complaints fell from 5 nights to 2 nights a week since the change.",
    ],
    closing: "The chart supports continued care at Residential 3.5. The step-down plan names an IOP start date and a first appointment with the outpatient prescriber, both booked.",
    attachments: ["Group and individual therapy notes, 10/06 to 10/19 (9 pages)", "ASAM dimension ratings, 10/19 (2 pages)", "Medication record, 10/13 to 10/19 (3 pages)", "Step-down plan with booked appointments (1 page)"],
  },
  PHP: {
    asked: ["Daily attendance for the last 10 program days", "The most recent psychiatric progress note", "Scores on the depression and anxiety scales, with dates", "The plan for stepping down to IOP"],
    evidence: (who) => [
      `Attendance. ${who} attended 9 of 10 program days and left early once for a medical visit that is documented. Group participation notes are in the chart for each day.`,
      "Psychiatric progress note, 10/18. Mood is improving but sleep and concentration still limit daily function. The prescriber changed one medication on 10/14 and wants two more weeks to judge the effect before a lower level of care.",
      "Scores. Depression scale 17 on 10/04, 14 on 10/11 and 12 on 10/18. Anxiety scale 13, 11 and 10 on the same dates. The trend is down, and both scores remain in the moderate range.",
    ],
    closing: "The chart supports continued PHP for 10 more program days. Step-down to IOP is planned for the first week of November, with the first IOP group already scheduled.",
    attachments: ["Attendance record, last 10 program days (1 page)", "Psychiatric progress note, 10/18 (2 pages)", "Depression and anxiety scale scores (1 page)", "Step-down plan to IOP (1 page)"],
  },
  IOP: {
    asked: ["Attendance for the last 4 weeks", "Urine screen results since the last review", "Depression and anxiety scale scores, with dates", "Work or school schedule that limits more hours"],
    evidence: (who) => [
      `Attendance. ${who} attended 11 of 12 scheduled sessions over the last 4 weeks. The one missed session is documented as a work conflict and was made up the following day.`,
      "Urine screens. Three screens since 09/22, all negative. A fourth is due this week. Self-report matches the results.",
      "Scores. Depression scale 11 on 09/22 and 8 on 10/13. Anxiety scale 9 and 7. Both are improving, and the goals in the treatment plan are updated for the next 30 days.",
    ],
    closing: "The chart supports continued IOP for the units requested. The plan tapers from three to two sessions a week once the next two screens are negative.",
    attachments: ["Session attendance, last 4 weeks (1 page)", "Urine screen results (1 page)", "Scale scores and treatment plan update (2 pages)"],
  },
  WM: {
    asked: ["Withdrawal scale scores for the last 72 hours", "Vital signs and any symptom-triggered medication", "The plan for the next level of care"],
    evidence: (who) => [
      `Withdrawal scores. ${who} scored 14, 11 and 9 on the clinical withdrawal scale at 24, 48 and 72 hours. The score has not yet stayed below 8 for a full day.`,
      "Vital signs and medication. Heart rate settled from 112 to 94. Two symptom-triggered doses were given in the last 24 hours, both logged with the time and the score that led to them.",
    ],
    closing: "The chart supports continued detox care for 2 more days. Residential placement is requested and a bed is held for the day the score stays below 8.",
    attachments: ["Withdrawal scale scores, 72 hours (1 page)", "Vital signs and medication log (2 pages)", "Residential bed hold confirmation (1 page)"],
  },
};

/* A Virginia service has no chart summary in the demo's data: the answer lists what the chart holds and invents no clinical facts. */
const GENERIC: Profile = {
  asked: ["The assessment that supports the service", "The individualized service plan"],
  evidence: (who) => [`The chart holds ${who}'s assessment and individualized service plan for this service. The demo has no clinical summary for it, so none is written here.`],
  closing: "The attached records are what the chart holds for this request.",
  attachments: ["Assessment (demo sample)", "Individualized service plan (demo sample)"],
};

/** Packet's drafted answer to a payer's request for information. */
export function buildInfoAnswer(r: PsyRequest): InfoAnswer {
  const p = forProgram(PROFILE, r.program, GENERIC);
  const payer = payerById(r.payerId);
  const who = `${r.patient.initials} (age ${r.patient.age})`;
  return {
    asked: p.asked,
    paragraphs: [
      `This answers ${payer.name}'s request for more information on ${r.id}, a ${r.type.toLowerCase()} for ${PROGRAM_LABEL[r.program]}. Each item below follows the order of the payer's request, and every statement points to an entry in the chart.`,
      ...p.evidence(who),
      p.closing,
    ],
    attachments: p.attachments,
  };
}
