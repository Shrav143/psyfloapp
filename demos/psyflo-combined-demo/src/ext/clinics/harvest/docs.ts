import type { DocSeed } from "../../types";
import { DLOC_OPTIONS, DX_OPTIONS } from "./forms";

/* The documents as Lauris has them when the demo opens (sample data, initials only).
   "prefilled" keys are what Lauris filled from the record itself (green). Everything else was typed by a person. */

export const docs: DocSeed[] = [
  /* M.R. · today's daily note: nearly empty; the Scribe fills it from the conversation (live). */
  {
    id: "dpn-4471", kind: "dpn", consumerId: "4471", date: "2026-10-29", status: "draft",
    title: "Daily Progress Note – TDT · 10/29/2026",
    values: { date: "10/29/2026", service: "H2016 (school day)" },
    prefilled: ["date", "service"],
  },

  /* D.W. · a note staff already wrote and saved, weak on purpose: "Observed", no duration, goal not linked. Scan & Enhance reads it. */
  {
    id: "dpn-4458", kind: "dpn", consumerId: "4458", date: "2026-10-27", status: "draft",
    title: "Daily Progress Note – TDT · 10/27/2026",
    author: "R. Diaz · saved 10/28/2026",
    values: {
      date: "10/27/2026",
      service: "H2016 (school day)",
      intervention: "Observed D.W. in class during the last period.",
      response: "D.W. left class after the afternoon bell and was found in the stairwell (about 20 minutes).",
      needs: "Will continue to monitor.",
    },
    prefilled: ["date", "service", "intervention", "response", "needs"],
  },

  /* T.W. · new consumer. Lauris filled what it knows from the referral; the rest comes from the call. */
  {
    id: "adm-4492", kind: "admission", consumerId: "4492", date: "2026-10-29", status: "draft",
    title: "Admission Screening · 10/29/2026",
    values: {
      referral: "School counselor",
      initial: "10/13/2026",
      guardian: "Grandmother (legal guardian)",
      school: "Lynchburg City · MS-2 · 6th grade",
    },
    prefilled: ["referral", "initial", "guardian", "school"],
  },
  {
    id: "intake-4492", kind: "intake", consumerId: "4492", date: "2026-10-29", status: "draft",
    title: "Comprehensive Needs Assessment · 10/29/2026",
    values: {
      school: "Lynchburg City · MS-2 · 6th grade",
      /* the clinician's diagnosis, already chosen in Lauris (clinical judgement: Psyflo never types or changes it) */
      dx: DX_OPTIONS[0],
    },
    prefilled: ["school", "dx"],
  },
  {
    id: "cans-4492", kind: "assessment", consumerId: "4492", date: "2026-10-29", status: "draft",
    title: "CANS · 10/29/2026",
    /* The clinician already rated every item in Lauris (clinical judgement, locked for Psyflo). The narrative boxes are empty.
       The Runaway/Elopement rating of 0 is deliberate: the Scan catches the mismatch with the guardian's words but can only name it. */
    values: {
      r_attention: "1 – Watchful waiting",
      r_oppositional: "2 – Action needed",
      r_conduct: "2 – Action needed",
      r_anger: "2 – Action needed",
      r_anxiety: "0 – No evidence",
      r_trauma: "1 – Watchful waiting",
      r_family: "1 – Watchful waiting",
      r_school_behavior: "3 – Immediate or intensive action",
      r_school_attendance: "2 – Action needed",
      r_peers: "2 – Action needed",
      r_danger: "2 – Action needed",
      r_runaway: "0 – No evidence",
    },
    prefilled: ["r_attention", "r_oppositional", "r_conduct", "r_anger", "r_anxiety", "r_trauma", "r_family", "r_school_behavior", "r_school_attendance", "r_peers", "r_danger", "r_runaway"],
  },

  /* M.R. · concurrent SRA (continued stay): partly written by the clinician. Progress, lack of progress and family involvement are dictated. */
  {
    id: "sra-4471", kind: "sra", consumerId: "4471", date: "2026-10-29", status: "draft",
    title: "Continued Stay Request · 10/29/2026",
    values: {
      from: "11/16/2026",
      to: "02/13/2027",
      units: "150",
      hours: "15",
      proc: "H2016",
      admit: "02/03/2026",
      dx: "F90.2 · Attention-deficit/hyperactivity disorder, combined type",
      coord: "Monthly contact with the school counselor (Oct 1, Sep 3, Aug 29) and the pediatrician; IEP review scheduled Nov 4 at Harvest’s request. No medication change. His grandmother participates weekly by phone.",
      g1_obj: "M.R. will use a taught coping strategy before leaving the room in 4 of 5 escalations.",
      g2_obj: "M.R. will wait for a turn without grabbing or shoving in 4 of 5 group activities.",
      g2_progress: "Waited for a turn in 3 of 5 group activities, up from 2 of 5 (23 notes).",
      g2_lack: "No lack of progress. The quiet week of Oct 12–16 is written as maintenance, not “goals met”.",
      g3_obj: "M.R. will stay on task for 20 of 30 minutes in structured lessons on 4 of 5 school days.",
      g3_progress: "On task for 15 of 30 minutes in math on 3 of 5 school days, up from about 10 minutes (23 notes).",
      g3_lack: "He still needs a staff prompt to re-enter a task after a break; the visual timer is being faded in steps.",
      discharge: "Step down to outpatient counseling plus school supports. Warm hand-off in the last two weeks; the school counselor joins the transition meeting.",
      ddate: "June 2027",
      dloc: DLOC_OPTIONS[0],
    },
    prefilled: ["proc", "admit", "dx", "g1_obj", "g2_obj", "g3_obj"],
  },
];
