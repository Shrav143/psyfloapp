import type { ReferralSpec } from "./referralBuild";
import { SRC, dx } from "./referralSpecs";

/** What Reader reads from documents someone drops, or from the sample button. Each index is one invented referral. */
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
