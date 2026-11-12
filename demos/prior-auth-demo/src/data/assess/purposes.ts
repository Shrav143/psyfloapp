import type { PurposeDef, PurposeId } from "./types";

/* The eight reasons an intake is done. A purpose reshapes the program's plan (what is required, what is carried forward) and says whether an
   existing treatment episode is needed first. The words are the product's; the effects are configuration, not clinical rules. */

export const PURPOSES: PurposeDef[] = [
  {
    id: "initial", label: "Initial assessment", description: "For a new patient entering treatment.",
    needsEpisode: false, requestKind: "initial", demote: [], demoteTo: "optional", demoteReason: "", add: [],
  },
  {
    id: "screening", label: "Referral screening", description: "For evaluating whether a referral is appropriate.",
    needsEpisode: false, requestKind: null, demote: "all", demoteTo: "optional",
    demoteReason: "A screening checks fit and urgency. The full program assessment is completed if the referral is accepted.",
    add: [
      { id: "safety", level: "required", reason: "Every screening checks safety and urgency first." },
      { id: "loc-review", level: "recommended", reason: "A preliminary level-of-care view helps decide whether to accept or redirect." },
    ],
  },
  {
    id: "transfer", label: "Transfer assessment", description: "For a patient transferring from another provider.",
    needsEpisode: false, requestKind: "initial", demote: [], demoteTo: "optional", demoteReason: "",
    add: [{ id: "treatment-history", level: "required", reason: "A transfer reviews the sending provider's records and what was already assessed." }],
  },
  {
    id: "readmission", label: "Readmission", description: "For a previously treated patient returning to care.",
    needsEpisode: false, requestKind: "initial", demote: [], demoteTo: "optional", demoteReason: "",
    add: [{ id: "treatment-history", level: "required", reason: "A readmission reviews what happened since the last discharge." }],
  },
  {
    id: "loc_change", label: "Change in level of care", description: "For step-up or step-down evaluation.",
    needsEpisode: true, requestKind: "modify", demote: ["sud", "mh", "community", "children"], demoteTo: "recommended",
    demoteReason: "Carried forward from the current episode. Update what has changed.",
    add: [
      { id: "loc-review", level: "required", reason: "A change in level of care is decided on a level-of-care review." },
      { id: "safety", level: "required", reason: "Safety is reviewed at every change in level of care." },
    ],
  },
  {
    id: "continued_stay", label: "Continued-stay assessment", description: "For determining whether ongoing treatment remains clinically appropriate.",
    needsEpisode: true, requestKind: "concurrent", demote: ["sud", "mh", "community", "children"], demoteTo: "optional",
    demoteReason: "Update only what has changed since the last assessment.",
    add: [
      { id: "continued-stay", level: "required", reason: "A continued-stay review documents progress, remaining needs and why this level of care still fits." },
      { id: "loc-review", level: "required", reason: "A continued-stay review reconfirms the level of care." },
      { id: "safety", level: "required", reason: "Safety is reviewed at every continued-stay review." },
    ],
  },
  {
    id: "reassessment", label: "Comprehensive reassessment", description: "For updating an existing clinical assessment.",
    needsEpisode: true, requestKind: "reauth", demote: [], demoteTo: "optional", demoteReason: "",
    add: [{ id: "treatment-history", level: "recommended", reason: "A reassessment records treatment since the last assessment." }],
  },
  {
    id: "discharge", label: "Discharge / transition assessment", description: "For discharge planning or transition to another service.",
    needsEpisode: true, requestKind: null, demote: "all", demoteTo: "optional",
    demoteReason: "Not needed for discharge planning. Use it if the person's needs changed.",
    add: [
      { id: "discharge-planning", level: "required", reason: "A discharge or transition assessment plans the next level of care and supports." },
      { id: "safety", level: "required", reason: "Safety and relapse or crisis risk are reviewed before discharge." },
      { id: "referral-coordination", level: "recommended", reason: "A transition needs a referral and a handoff to the receiving provider." },
    ],
  },
];

export const PURPOSE_IDS = PURPOSES.map((x) => x.id);
export const purposeById = (id: PurposeId): PurposeDef => PURPOSES.find((x) => x.id === id) as PurposeDef;
