import type { DocSeed } from "../../types";

/* The documents as Lauris has them when the demo opens (sample data, initials only). "prefilled" keys are what Lauris filled from the record itself (green).
   Everything else was typed by a person. Three consumers have documents; any other consumer can be given any document from the Psyflo panel. */

export const docs: DocSeed[] = [
  /* J.M. · today's daily note: nearly empty; Scribe fills it from the conversation (live). */
  { id: "dpn-4042", kind: "dpn", consumerId: "4042", date: "2026-10-20", status: "draft", values: { date: "10/20/2026", service: "Individual session" }, prefilled: ["date", "service"] },

  /* J.M. · the admission screening, saved at admission. One gap on purpose: the box that says why residential care. Scan & Enhance reads it and quotes the chart. */
  {
    id: "adm-4042", kind: "admission", consumerId: "4042", date: "2026-10-16", status: "saved", author: "J. Perez · saved 10/16/2026",
    values: {
      date: "10/16/2026", referral: "Self", substances: ["Alcohol"], lastuse: "Drinking daily until admission",
      withdrawal: "CIWA-Ar 14 at 06:10 on 10/17, treated per protocol.", safety: ["None"], housing: "Unstable",
      support: "Lives with a partner who drinks daily.", loc: "Residential 3.5",
    },
    prefilled: ["date", "referral", "substances", "lastuse", "withdrawal", "safety", "housing", "support", "loc"],
  },

  /* J.M. · the ASAM summary, started. Two dimensions are rated; the rest comes from the clinician's dictation (Scribe) or from Scan & Enhance. */
  {
    id: "asm-4042", kind: "assessment", consumerId: "4042", date: "2026-10-19", status: "draft", author: "A. Morgan",
    values: { d1: "3 – High risk", n1: "CIWA-Ar 14 on 10/17, 9 on 10/18, 4 on 10/19.", d3: "3 – High risk", loc: "Residential 3.5" },
    prefilled: ["d1", "n1", "d3", "loc"],
  },

  /* T.R. · a daily note staff already saved, weak on purpose: no minutes, no goal, no craving or safety line, and wording the clinic's standard asks to change. */
  {
    id: "dpn-4207", kind: "dpn", consumerId: "4207", date: "2026-10-19", status: "saved", author: "S. Okafor · saved 10/19/2026",
    values: {
      date: "10/19/2026", service: "Group session", intervention: "Group session on relapse triggers.",
      response: "Engaged in group. Was noncompliant with the sign-in schedule earlier in the week.", plan: "Continue.",
    },
    prefilled: ["date", "service", "intervention", "response", "plan"],
  },

  /* T.R. · a new intake, almost empty: the clinician interviews and Scribe drafts it. */
  { id: "int-4207", kind: "intake", consumerId: "4207", date: "2026-10-20", status: "draft", values: {}, prefilled: [] },

  /* D.L. · a new admission screening, almost empty: Scribe listens to the screening. */
  { id: "adm-4988", kind: "admission", consumerId: "4988", date: "2026-10-20", status: "draft", values: { date: "10/20/2026" }, prefilled: ["date"] },
];
