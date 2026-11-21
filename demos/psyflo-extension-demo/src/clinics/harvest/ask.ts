import { shortDate } from "../../engine";
import type { AskSource, AskTopic } from "../../types";
import { payers } from "./profile";
import { consumers } from "./roster";

/* Ask Psyflo topics for Harvest Outreach. Every answer is written ahead of time for the demo, as decision support.
   Sources: chart (a stored record of the open consumer), clinic (Harvest's own sample rule, written for this demo),
   reference (a public title only: the demo does not quote it). {ini} is replaced by the open consumer's initials. */

const clinic = (label: string, detail = "Harvest’s own sample rule, in the Clinic profile. Written by Harvest for this demo; not a plan’s policy."): AskSource => ({ kind: "clinic", label, detail });
const chart = (id: string, label: string, detail: string): AskSource => ({ kind: "chart", label, detail, chart: id });
const REF_DETAIL = "Title only; the demo does not quote it.";

/* The escalation count is computed from M.R.'s stored daily notes, never typed by hand. */
const mr = consumers.find((c) => c.id === "4471");
const counted = (mr?.chart ?? [])
  .filter((r) => r.kind === "note" && /Today: \d+ escalations?/.test(r.text))
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((r) => ({ rec: r, n: Number(/Today: (\d+) escalations?/.exec(r.text)?.[1] ?? 0), line: /Today: [^.]*\./.exec(r.text)?.[0] ?? "" }));
export const ESCALATION_TOTAL = counted.reduce((s, x) => s + x.n, 0);
export const ESCALATION_NOTES = counted.map((x) => x.rec.id);
const latest = counted[counted.length - 1];
const earliest = counted[0];

const sentara = payers.find((p) => p.id === "sentara");
const anthem = payers.find((p) => p.id === "anthem");

export const ask: AskTopic[] = [
  {
    id: "continued-stay",
    q: "What does a continued stay request need to show?",
    keywords: ["continued stay", "continued-stay", "concurrent", "sra", "need to show", "what does a continued"],
    docs: ["sra"],
    answer: [
      "In Harvest’s sample wording, a continued stay request for {ini} shows four things: progress with the daily notes’ own counts, where progress fell short, what changed in the plan and when, and what step-down would look like.",
      "Counts come from the notes, written “x of y”, for example a taught strategy used first in 3 of 5 escalations, up from 1 of 6. A line that says only “doing better” gives a reviewer nothing to check.",
      "The lack-of-progress box is for the escalations that still ended badly, with dates. The plan change gets its date in the same box. Family involvement gets a count too: calls joined out of calls held.",
      "This is Harvest’s checklist for the demo, not a plan’s policy. If the plan’s own request says something different, the plan’s wording wins.",
    ],
    sources: [
      clinic("Harvest sample wording · continued stay request"),
      chart("notes-30d", "Daily notes, last 30 days (21)", "The counts used in the example: 3 of 5, up from 1 of 6."),
    ],
  },
  {
    id: "risk-of-removal",
    q: "How do I word the risk of removal from the school placement?",
    keywords: ["risk of removal", "removal", "alternative placement", "restrictive", "removed from"],
    docs: ["admission", "intake"],
    answer: [
      "Harvest’s sample wording says what the school did, how often, and what follows without daily on-site help. It uses dates and counts from the school’s own record and does not guess what the school will decide.",
      "A sample sentence: “The school has raised alternative placement twice this school year, last on Oct 15. Without daily on-site intervention {ini} is at risk of removal from the current setting to a more restrictive school placement.” Change it to match what the record says.",
      "The school counselor’s report on file says alternative placement was raised twice this school year, last on Oct 15.",
    ],
    sources: [
      clinic("Harvest sample wording · risk of removal"),
      chart("counselor-oct15", "School counselor report Oct 15", "Alternative placement raised twice this school year, last on Oct 15."),
    ],
  },
  {
    id: "dpn-billable",
    q: "What makes a daily note billable?",
    keywords: ["billable", "billing", "what makes a daily note", "units"],
    docs: ["dpn"],
    answer: [
      "In Harvest’s sample standard, a billable daily note says what staff did, for how long, and how the child responded, and it names the ISP objective it works on.",
      "Units follow direct time (the Track Time total for the day), so the note states the minutes or the clock range. Interventions come from the approved ISP picklist, spelled as Lauris spells them.",
      "Watching is not an intervention. A note that says “Observed” can lose the unit in an audit, so say what staff did.",
      "This is the clinic’s own checklist. Whether a unit is paid is the plan’s decision.",
    ],
    sources: [clinic("Harvest standard · daily note")],
  },
  {
    id: "escalations-last-notes",
    q: "How many escalations are in {ini}’s last notes?",
    keywords: ["how many escalations", "escalations", "escalation", "last notes", "last two notes", "last notes say"],
    docs: ["sra"],
    answer: [
      `From the daily notes on file for {ini} that give a count (${counted.map((x) => shortDate(x.rec.date)).join(", ")}): ${ESCALATION_TOTAL} escalations in ${counted.length} notes. By note: ${counted.map((x) => `${shortDate(x.rec.date)}: ${x.n}`).join(" · ")}.`,
      latest && earliest ? `The latest note (${shortDate(latest.rec.date)}) says: “${latest.line}” The earliest (${shortDate(earliest.rec.date)}) says: “${earliest.line}”` : "",
      "These are the notes in this chart, not every note since Aug 18. The 30-day summary counts the whole period: a taught strategy used first in 3 of 5 escalations. For the request, quote the summary and cite these notes as examples.",
    ].filter(Boolean),
    sources: [
      ...counted.map((x) => chart(x.rec.id, x.rec.label, x.line)),
      chart("notes-30d", "Daily notes, last 30 days (21)", "3 of 5 escalations with a taught strategy used first, over the whole period."),
    ],
  },
  {
    id: "prior-services",
    q: "What does the intake say about prior services for {ini}?",
    keywords: ["prior services", "prior service", "outpatient", "piedmont", "previous interventions"],
    docs: ["intake"],
    answer: [
      "The referral contact note of Oct 14 records one outpatient episode: Piedmont Counseling, March to June 2025, 6 visits. The guardian said the family lost their ride and it stopped, and that it had not changed anything.",
      "The intake box for prior services should say how the episode ended and whether behavior changed. Those words are the guardian’s to confirm and yours to write; Psyflo does not choose the outcome for you.",
      "A reviewer who reads only “ended: transportation” may see the family’s choice, not a service that did not help. Harvest’s sample wording asks for who ended it and what changed.",
    ],
    sources: [
      chart("call-oct14", "Referral contact Oct 14", "Piedmont Counseling, March to June 2025, 6 visits; the guardian’s words on how it ended."),
      clinic("Harvest sample wording · prior services"),
    ],
  },
  {
    id: "cans-2-vs-3",
    q: "What do CANS ratings of 2 and 3 mean?",
    keywords: ["cans", "ratings", "rating of", "2 vs 3", "action needed", "watchful"],
    docs: ["assessment"],
    answer: [
      "This is Harvest’s own cheat sheet, not the CANS manual. A 0 means no evidence. A 1 means watch and check again. A 2 means action is needed: the item belongs in the plan. A 3 means immediate or intensive action: something is done now, such as a safety step.",
      "The difference between a 2 and a 3 is how soon and how much. A useful question is whether the item needs a plan step this period (2) or action today (3).",
      "The rating is the clinician’s judgement. Psyflo reads ratings and flags a mismatch with the narrative, but it never suggests or changes one. For the exact definitions, use the manual.",
    ],
    sources: [
      clinic("Harvest cheat sheet · CANS ratings", "Written by Harvest for this demo. It is the clinic’s own summary, not text from the manual."),
      { kind: "reference", label: "Child and Adolescent Needs and Strengths (CANS) manual", detail: REF_DETAIL },
    ],
  },
  {
    id: "why-observed",
    q: "Why does “Observed” fail in a daily note?",
    keywords: ["observed", "observe", "observing", "watching", "void the unit"],
    docs: ["dpn", "sra"],
    answer: [
      "In Harvest’s sample wording, “Observed” describes watching, not treatment. An auditor who reads it may see no intervention for that day and can void the unit.",
      "Say what staff did instead. The clinic’s example: “Worked with the client during math using a visual timer and prompted re-entry twice.”",
      "If an old note already says “Observed”, the original stays as it was written. Add a dated addendum with the corrected wording.",
    ],
    sources: [clinic("Harvest standard · wording")],
  },
  {
    id: "payers-sentara-anthem",
    q: "What do Sentara and Anthem need to see?",
    keywords: ["sentara", "anthem", "payer", "payers", "need to see", "humana", "aetna", "unitedhealthcare"],
    answer: [
      "These are Harvest’s sample notes on each plan, not the plans’ policies. Check the plan’s own request before relying on them.",
      sentara ? `${sentara.name}: ${sentara.criteria}` : "",
      anthem ? `${anthem.name}: ${anthem.criteria}` : "",
      "Harvest-reported: Sentara peer-to-peer slots have been offered 1–2 months out, often after units run out. Requests for more information are answered within 24 hours, and each request states its own deadline.",
      "The other plans are in the Clinic profile.",
    ].filter(Boolean),
    sources: [clinic("Clinic profile · Payers", "Harvest’s sample wording for each plan, in the Clinic profile. Not a plan’s policy; the Harvest-reported lines come from a site visit on Oct 29.")],
  },
  {
    id: "peer-to-peer",
    q: "How do I prepare for a peer-to-peer call?",
    keywords: ["peer-to-peer", "peer to peer", "p2p", "reviewer call"],
    docs: ["sra"],
    answer: [
      "In Harvest’s sample prep, bring four things: the count of escalations from the notes, what changed in the plan and its date, the family’s words about daily life, and what less than daily on-site help would not cover.",
      "Expect the question “can this be handled with less?” Answer it with the notes’ counts, not with a general statement, and ask the reviewer what would change the decision.",
      "Harvest has found peer-to-peer slots offered 1–2 months out, often after units run out (Harvest-reported). Ask for the earliest slot when you book.",
    ],
    sources: [clinic("Harvest sample wording · peer-to-peer", "Harvest’s own sample prep, written for this demo. The slot timing is Harvest-reported, from a site visit on Oct 29.")],
  },
  {
    id: "trauma-box",
    q: "Why not leave the trauma box blank?",
    keywords: ["trauma", "trauma-informed", "section iii", "hard event"],
    docs: ["admission", "intake"],
    answer: [
      "In Harvest’s sample wording, a blank trauma box reads as “not assessed”. It is the one box Psyflo never drafts, because what goes there is the clinician’s judgement and the family’s to share.",
      "“None reported by the family” is an answer. So is “the family chose not to say more today”. Write what the family said, in their words and kept short; details are theirs to share when they choose.",
      "For a framework, SAMHSA’s guidance on trauma-informed approaches is a public reference.",
    ],
    sources: [
      clinic("Harvest sample wording · trauma-informed care"),
      { kind: "reference", label: "SAMHSA’s Concept of Trauma and Guidance for a Trauma-Informed Approach", detail: REF_DETAIL },
    ],
  },
  {
    id: "goal-link",
    q: "How do I link a daily note to the plan?",
    keywords: ["golden thread", "link a daily note", "link to the plan", "objective number", "isp objective", "link a note"],
    docs: ["dpn"],
    answer: [
      "In Harvest’s sample standard, every daily note names the ISP objective by its number and uses its words. For {ini} that is: “Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations.”",
      "Then name the intervention from the approved picklist and say how the child responded in the objective’s terms: used a strategy first, or needed a prompt.",
    ],
    sources: [
      chart("isp-g1", "ISP 2.0 · Goal 1", "Obj. 1 – use a taught coping strategy before leaving the room in 4 of 5 escalations."),
      clinic("Harvest standard · daily note"),
    ],
  },
  {
    id: "step-down",
    q: "What are step-down criteria?",
    keywords: ["step-down", "stepdown", "step down", "discharge plan"],
    docs: ["sra"],
    answer: [
      "Harvest’s standard text in the plan reads: “Step-down to outpatient counseling plus school supports when the objectives are met 4 of 5 times for 8 consecutive weeks, or when the individual no longer meets the eligibility criteria.”",
      "The request should say what has to be true for {ini} to step down, in the clinician’s words. The ISP review of Aug 11 has no step-down criteria written, so the request may be the only place a reviewer finds them.",
    ],
    sources: [
      clinic("Harvest standard text · ISP discharge criteria", "Harvest’s own standard wording for the plan’s discharge criteria, in the Clinic profile."),
      chart("isp-review", "ISP review Aug 11", "No discharge or step-down criteria are written in the plan."),
    ],
  },
  {
    id: "elopement-risk-box",
    q: "When do I tick leaving the building as a risk?",
    keywords: ["elopement", "leaving the building", "runaway", "risk box", "tick leaving"],
    docs: ["admission", "intake"],
    answer: [
      "Harvest’s sample rule: consider ticking it when the record or the guardian describes the child leaving the building in the current school year. The screener decides. Psyflo only points out when the text says one thing and the boxes say another.",
      "For {ini}, the school incident record of Oct 6 says he left the building and went to the parking lot (about 20 minutes, high intensity), and 1 day of in-school suspension followed.",
    ],
    sources: [
      clinic("Harvest sample wording · risk screen"),
      chart("incident-oct6", "School incident Oct 6", "Left the building to the parking lot, about 20 minutes, high intensity; 1 day of in-school suspension."),
    ],
  },
  {
    id: "interventions-picklist",
    q: "Which interventions can I name in a daily note?",
    keywords: ["picklist", "interventions", "which interventions", "intervention names", "approved list"],
    docs: ["dpn"],
    answer: [
      "Harvest’s sample standard: only names from the approved ISP picklist, spelled as Lauris spells them, such as Clinical 2.1 Movement, QMHP 1.2 Coping skills practice and QMHP 1.9 Solving peer conflict.",
      "Tick the box and use the same name in the text, so the two agree. The plan’s own interventions are listed with each goal in the ISP.",
    ],
    sources: [clinic("Harvest standard · approved intervention picklist")],
  },
];
