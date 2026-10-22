import { PAYERS } from "./seed";
import type { AgentKey, PayerId, Program } from "./types";
import type { ChangeEntry, CustomPayer, DocItem, DocLists, PayerConfig, PayerFacts, PendingChange, Proposal, ReachLine, Rule, RuleId } from "./payerConfig";
import { seedWorkflow, starterWorkflow } from "./payerConfigWorkflows";

/* Seed content for the payer pages: reach, rules, documents, what changed. Workflows are in payerConfigWorkflows.ts. */

const doc = (id: string, title: string, requirement: string): DocItem => ({ id, title, requirement });

/* ---------- documents ---------- */
const RES_DOCS: DocItem[] = [
  doc("res-1", "ASAM multidimensional assessment", "Every dimension, dated within 7 days"),
  doc("res-2", "Psychiatric evaluation or H&P", "Signed by a physician or nurse practitioner"),
  doc("res-3", "Nursing admission note with withdrawal scale", "CIWA-Ar or COWS with dated scores"),
  doc("res-4", "Urine drug screen", "Within 14 days"),
  doc("res-5", "Medication list", "Current and reconciled"),
  doc("res-6", "Treatment plan", "Measurable goals with dates"),
  doc("res-7", "Insurance card and referral", "Front and back"),
  doc("res-8", "Psychosocial history", "Housing, support and prior treatment"),
  doc("res-9", "Therapy note from the last 14 days", "Individual or group"),
];
const IOP_DOCS: DocItem[] = [
  doc("iop-1", "ASAM multidimensional assessment", "Every dimension, dated within 14 days"),
  doc("iop-2", "Diagnostic assessment", "Signed by a licensed clinician"),
  doc("iop-3", "Treatment plan", "Measurable goals with dates"),
  doc("iop-4", "Medication list", "Current and reconciled"),
  doc("iop-5", "Insurance card and referral", "Front and back"),
  doc("iop-6", "Attendance record", "Sessions attended in the last 14 days"),
];
const PHP_DOCS: DocItem[] = [
  doc("php-1", "ASAM multidimensional assessment", "Every dimension, dated within 14 days"),
  doc("php-2", "Psychiatric evaluation or H&P", "Signed by a physician or nurse practitioner"),
  doc("php-3", "Treatment plan", "Measurable goals with dates"),
  doc("php-4", "Medication list", "Current and reconciled"),
  doc("php-5", "Insurance card and referral", "Front and back"),
  doc("php-6", "Attendance record", "Sessions attended in the last 14 days"),
  doc("php-7", "Psychosocial history", "Housing, support and prior treatment"),
];
const WM_DOCS: DocItem[] = [
  doc("wm-1", "ASAM multidimensional assessment", "Dimension 1 and 2 at minimum, dated today"),
  doc("wm-2", "History and physical", "Vital signs and exam, signed by a physician"),
  doc("wm-3", "Nursing admission note with withdrawal scale", "CIWA-Ar or COWS with dated scores"),
  doc("wm-4", "Withdrawal scores for the last 24 hours", "Every scheduled reading"),
  doc("wm-5", "Urine drug screen", "On admission"),
  doc("wm-6", "Medication record", "Current doses and any withdrawal protocol"),
  doc("wm-7", "Physician order for detox", "Signed and dated"),
  doc("wm-8", "Insurance card and referral", "Front and back"),
];

const copy = (items: DocItem[], prefix: string): DocItem[] => items.map((d, i) => ({ ...d, id: `${prefix}-${i + 1}` }));
function docsFor(id: string, extras: Partial<Record<Program, DocItem[]>> = {}): DocLists {
  const lists: DocLists = { RES: copy(RES_DOCS, `${id}-res`), IOP: copy(IOP_DOCS, `${id}-iop`), PHP: copy(PHP_DOCS, `${id}-php`), WM: copy(WM_DOCS, `${id}-wm`) };
  for (const p of Object.keys(extras) as Program[]) lists[p] = [...lists[p], ...(extras[p] ?? [])];
  return lists;
}
const DOC_EXTRAS: Partial<Record<PayerId, Partial<Record<Program, DocItem[]>>>> = {
  lakeshore: { RES: [doc("lake-res-x", "Fax cover sheet", "With the page count")], IOP: [doc("lake-iop-x", "Fax cover sheet", "With the page count")], PHP: [doc("lake-php-x", "Fax cover sheet", "With the page count")], WM: [doc("lake-wm-x", "Fax cover sheet", "With the page count")] },
  harborview: { RES: [doc("harb-res-x", "Medication list with Part D plan", "Current and reconciled")], PHP: [doc("harb-php-x", "Medicare eligibility check", "Dated within 7 days")] },
  evergreen: { RES: [doc("ever-res-x", "Call log with the reviewer", "From the phone request")] },
};

/* ---------- rules ---------- */
const rule = (id: RuleId, lines: string[], used: AgentKey[], confirmed = "10/12"): Rule => ({ id, lines, used, confirmed });
const NOAUTH = ["Individual therapy", "Medication management", "Initial assessment", "Crisis stabilization, first 24 hours"];

function rulesFor(id: PayerId): Rule[] {
  const confirmed = id === "evergreen" ? "10/09" : "10/12";
  const notice: Record<PayerId, string> = { summit: "Notice within 24 hours of admission", cardinal: "Notice within 24 hours of admission", beacon: "Notice within 24 hours of admission", evergreen: "Notice by phone within 24 hours of admission", harborview: "Notice within 72 hours of admission", lakeshore: "Notice by fax within 24 hours of admission" };
  const backdate: Record<PayerId, string[]> = {
    summit: ["Summit does not backdate an authorization", "A retro request is accepted within 72 hours of admission when coverage was pending", "The agents flag any request that could fall outside the window"],
    cardinal: ["Cardinal does not backdate an authorization", "A retro request needs its own form, filed within 72 hours of admission", "The agents flag any request that could fall outside the window"],
    beacon: ["Beacon backdates to the admission date when the request arrives within 2 business days", "After that, a retro request needs proof of pending eligibility"],
    evergreen: ["Evergreen backdates up to 3 days when a call was logged on the day of admission", "The agents save the call log with the request"],
    harborview: ["Harborview does not backdate a Medicare Advantage authorization", "A retro request is accepted when eligibility was pending at admission"],
    lakeshore: ["Lakeshore backdates to the fax receipt date", "The agents save the fax transmission report with every request"],
  };
  const p2p: Record<PayerId, string[]> = {
    summit: ["Peer-to-peer call within 3 business days of a denial", "Written appeal within 60 days", "Expedited appeal decided in 72 hours", "Then external review"],
    cardinal: ["Peer-to-peer call within 2 business days of a denial", "Written appeal within 60 days", "Expedited appeal decided in 72 hours", "Then external review"],
    beacon: ["Peer-to-peer call within 3 business days of a denial", "Written appeal within 90 days", "Then external review"],
    evergreen: ["Peer-to-peer call within 3 business days of a denial", "Written appeal within 45 days", "Then a state hearing request"],
    harborview: ["Peer-to-peer call within 3 business days of a denial", "Reconsideration request within 60 days", "Then external review by an independent reviewer"],
    lakeshore: ["Peer-to-peer call within 3 business days of a denial", "Written appeal within 60 days", "Then external review"],
  };
  return [
    rule("windows", [notice[id], "Recertification filed 72 hours before the unit limit", "A continued-stay review every 7 days after the first 7"], ["cadence", "navigator"], confirmed),
    rule("backdating", backdate[id], ["cadence", "scrubber"], confirmed),
    rule("noauth", id === "evergreen" ? NOAUTH.filter((l) => !l.startsWith("Crisis")) : NOAUTH, ["verify", "criteria"], confirmed),
    rule("p2p", p2p[id], ["advocate", "cadence"], confirmed),
  ];
}

/* ---------- reach, caller script, facts ---------- */
const reach = (portal: string, phone: string, fax: string): ReachLine[] => [
  { id: "portal", title: "Portal", text: portal },
  { id: "phone", title: "Phone", text: phone },
  { id: "fax", title: "Fax", text: fax },
];
const REACH: Record<PayerId, ReachLine[]> = {
  summit: reach("Provider portal, sign-in saved by Navigator", "Provider line, weekdays 8 am to 6 pm", "Not used"),
  cardinal: reach("Provider portal, sign-in saved by Navigator. Down Sundays, 2 to 4 am", "Provider line, weekdays 8 am to 5 pm", "Not used"),
  beacon: reach("Provider portal, sign-in saved by Navigator", "Provider line, weekdays 7 am to 7 pm", "Not used"),
  evergreen: reach("Not used", "Provider line, weekdays 8 am to 5 pm. Hold times are long before 10 am", "Not used"),
  harborview: reach("Provider portal. Attachments over 10 MB go by fax", "Provider line, weekdays 8 am to 4 pm", "Used for large attachments and when the portal is down"),
  lakeshore: reach("Not used", "Provider line, weekdays 8 am to 5 pm", "The main route. Packet adds a cover sheet to every packet"),
};
const CALLER = (name: string) => `Ask for the provider line. Give the member ID and date of birth. Ask whether the request was received, what its status is, and who you are speaking with. Do not agree to any change. Log the call. If ${name} asks for a document, say it will be sent and note which one.`;

const FACTS: Record<PayerId, PayerFacts> = {
  summit: { noticeDue: "24 hours", noticeNote: "after admission", backup: "phone as backup" },
  cardinal: { noticeDue: "24 hours", noticeNote: "after admission", backup: "phone as backup" },
  beacon: { noticeDue: "24 hours", noticeNote: "after admission", backup: "phone as backup" },
  evergreen: { noticeDue: "24 hours", noticeNote: "by phone", backup: "no portal" },
  harborview: { noticeDue: "72 hours", noticeNote: "after admission", backup: "fax for attachments" },
  lakeshore: { noticeDue: "24 hours", noticeNote: "after admission", backup: "phone to confirm" },
};
const PLAN_LINE: Record<PayerId, string> = {
  summit: "Managed care plan under Ohio Medicaid · behavioral health included",
  cardinal: "Managed care plan under Ohio Medicaid · behavioral health included",
  evergreen: "Managed care plan under Ohio Medicaid · behavioral health included",
  beacon: "Commercial PPO · behavioral health included · in network for residential, PHP and IOP",
  harborview: "Medicare Advantage plan · behavioral health included · partial hospital and IOP covered",
  lakeshore: "Behavioral health carve-out · manages benefits for several commercial plans",
};

/* ---------- what changed ---------- */
const chg = (id: string, date: string, title: string, text: string, noticed = false): ChangeEntry => ({ id, date, title, text, ...(noticed ? { noticed } : {}) });
const HISTORY: Record<PayerId, ChangeEntry[]> = {
  summit: [
    chg("sm-1", "10/12", "Rules version 2026.3 saved in Psyflo", "Demo rules, not checked against Summit's policy. No change to the workflow."),
    chg("sm-2", "10/02", "Portal sign-in renewed", "Navigator renewed the saved sign-in. Nothing to do."),
    chg("sm-3", "09/18", "New form for retro requests", "Packet now attaches it automatically."),
  ],
  cardinal: [
    chg("cd-1", "10/17", "Criteria changed (version 2026.3)", "Progress evidence must now include the remaining treatment goals. Effective 10/15.", true),
    chg("cd-2", "10/12", "IOP continued-stay denials up 31% in 7 days", "Most cite incomplete recertification evidence. Historian re-scored 4 open requests."),
    chg("cd-3", "09/30", "Portal maintenance on Sundays, 2 to 4 am", "Navigator pauses checks during the window and resumes after."),
    chg("cd-4", "09/02", "New form for retro requests", "Packet now attaches it automatically."),
  ],
  evergreen: [
    chg("ev-1", "10/09", "Provider line opens at 8 am", "Caller moved its first try to 8:05 am."),
    chg("ev-2", "09/21", "Rules saved in Psyflo", "Demo rules, not checked against Evergreen's policy. No change to the workflow."),
  ],
  beacon: [
    chg("bc-1", "10/14", "Continued-stay requests decided in about a day", "Cadence moved its review reminders a day earlier."),
    chg("bc-2", "09/27", "Rules saved in Psyflo", "Demo rules, not checked against Beacon's policy. No change to the workflow."),
  ],
  harborview: [
    chg("hv-1", "10/18", "Portal form change", "The request form now asks for the expected length of stay and a second contact. The old form closes 10/31.", true),
    chg("hv-2", "10/05", "Medicare eligibility check added", "Verify now runs it before every request."),
    chg("hv-3", "09/11", "Rules saved in Psyflo", "Demo rules, not checked against Harborview's policy. No change to the workflow."),
  ],
  lakeshore: [
    chg("ls-1", "10/10", "New fax number for appeals", "Packet updated the appeal cover sheet."),
    chg("ls-2", "09/24", "Rules saved in Psyflo", "Demo rules, not checked against Lakeshore's policy. No change to the workflow."),
  ],
};

const PENDING: Partial<Record<PayerId, PendingChange>> = {
  cardinal: {
    id: "pc-cardinal", title: "Criteria changed, version 2026.3", effective: "10/15",
    text: "Progress evidence must now include the remaining treatment goals.",
    agents: ["scribe", "integrity"],
    docAdds: [
      { program: "RES", item: doc("cd-new-res", "Remaining treatment goals", "Named in the latest progress note") },
      { program: "IOP", item: doc("cd-new-iop", "Remaining treatment goals", "Named in the latest progress note") },
      { program: "PHP", item: doc("cd-new-php", "Remaining treatment goals", "Named in the latest progress note") },
    ],
  },
  harborview: {
    id: "pc-harborview", title: "Portal form change", effective: "10/18",
    text: "The request form now asks for the expected length of stay and a second contact. The old form closes 10/31.",
    agents: ["packet", "integrity"], docAdds: [],
  },
  /* Evergreen has no unsent draft (R-0975 is already with the payer), so its change takes the "no drafts" path: Acknowledge, then Apply to new drafts. */
  evergreen: {
    id: "pc-evergreen", title: "Reference number on notice calls", effective: "10/22",
    text: "Evergreen's reviewers now give a reference number when notice is given by phone. Caller saves it with the call log.",
    agents: ["caller", "integrity"],
    docAdds: [{ program: "RES", item: doc("ev-new-res", "Notice call reference number", "Given by the reviewer on the call") }],
  },
};

const PROPOSALS: Record<PayerId, Omit<Proposal, "id">[]> = {
  summit: [
    { title: "Ask for a therapy note on continued stays", text: "Summit asked for a therapy note on 6 of its last 9 information requests. Add it to the checklist for continued stays.", stepTitle: "Gather the documents", cond: { kind: "request", value: "a continued-stay request" }, kind: "file", result: "Add a therapy note from the last 14 days" },
    { title: "Phone after 24 hours on residential", text: "Requests that waited more than 24 hours were answered after a call in 8 of the last 11 cases.", stepTitle: "Follow up", cond: { kind: "waiting", value: "24 hours" }, kind: "phone", result: "Caller phones and logs who it spoke to" },
  ],
  cardinal: [
    { title: "Name the remaining goals in recertifications", text: "Cardinal's last 7 IOP recertification denials cite missing treatment goals. Add them to the checklist.", stepTitle: "Gather the documents", cond: { kind: "request", value: "a recertification" }, kind: "file", result: "Add the remaining treatment goals to the progress note" },
    { title: "Phone after 24 hours", text: "Cardinal's portal showed no status for more than a day on 5 of the last 12 requests, and a call got an answer each time.", stepTitle: "Follow up", cond: { kind: "waiting", value: "24 hours" }, kind: "phone", result: "Caller phones and logs who it spoke to" },
  ],
  beacon: [
    { title: "Phone after 24 hours", text: "Beacon usually decides in a day. After 24 hours, a call got an answer in 4 of 4 cases.", stepTitle: "Follow up", cond: { kind: "waiting", value: "24 hours" }, kind: "phone", result: "Caller phones and logs who it spoke to" },
  ],
  evergreen: [
    { title: "Ask for a supervisor after 2 days", text: "Evergreen's reviewers took longer than 2 days on 5 of 9 requests, and a supervisor call sped up 4 of them.", stepTitle: "Follow up", cond: { kind: "waiting", value: "2 business days" }, kind: "phone", result: "Caller asks for a supervisor and logs the call" },
  ],
  harborview: [
    { title: "Fax when the portal is slow", text: "Uploads timed out on 3 of the last 14 requests. Faxing the packet worked each time.", stepTitle: "Send the request", cond: { kind: "portal", value: "asking for a new sign-in" }, kind: "file", result: "Packet faxes the packet and Navigator saves the transmission report" },
  ],
  lakeshore: [
    { title: "Phone to confirm the fax after 2 days", text: "Lakeshore lost 2 of the last 20 faxes. A confirming call after 2 days caught both.", stepTitle: "Follow up", cond: { kind: "waiting", value: "2 business days" }, kind: "phone", result: "Caller confirms the fax arrived and gives the page count" },
  ],
};
export const proposalsFor = (id: string): Omit<Proposal, "id">[] => PROPOSALS[id as PayerId] ?? PROPOSALS.summit.slice(1);

/* ---------- assembly ---------- */
export function seedPayerConfig(): Record<string, PayerConfig> {
  const out: Record<string, PayerConfig> = {};
  for (const p of PAYERS) {
    const pending = PENDING[p.id] ?? null;
    out[p.id] = {
      planLine: PLAN_LINE[p.id],
      rulesVersion: "2026.3",
      reachedBy: p.reachedBy,
      facts: FACTS[p.id],
      reach: REACH[p.id],
      caller: { text: CALLER(p.shortName), confirmed: "10/12" },
      workflow: seedWorkflow(p.id),
      rules: rulesFor(p.id),
      docs: docsFor(p.id, DOC_EXTRAS[p.id]),
      changes: HISTORY[p.id],
      pending: pending ? { ...pending } : null,
      proposals: [],
      dismissed: [],
      unapplied: 0,
    };
  }
  return out;
}

/** What "Add a payer" creates: the six steps for how the payer is reached, standard rules and documents, and benchmark figures. */
export function starterConfig(p: CustomPayer, reachList: string[], on: string): PayerConfig {
  const has = (r: string) => reachList.includes(r);
  return {
    planLine: `${p.type} · ${p.group} · ${p.programs.length} ${p.programs.length === 1 ? "program" : "programs"}`,
    rulesVersion: "benchmark",
    reachedBy: p.reachedBy,
    facts: { noticeDue: "24 hours", noticeNote: "benchmark, after admission", backup: has("Phone") && has("Portal") ? "phone as backup" : "no backup yet" },
    reach: reach(has("Portal") ? "Provider portal. Navigator saves the sign-in once you add it" : "Not used", has("Phone") ? "Provider line. Add the hours" : "Not used", has("Fax") ? "Add the fax number" : "Not used"),
    caller: { text: CALLER(p.shortName), confirmed: on },
    workflow: starterWorkflow(reachList, on),
    rules: [
      rule("windows", ["Notice within 24 hours of admission", "Recertification filed 72 hours before the unit limit", "A continued-stay review every 7 days after the first 7"], ["cadence", "navigator"], on),
      rule("backdating", ["The agents assume no backdating until the first retro request is decided", "They flag any request that could fall outside a 72-hour window"], ["cadence", "scrubber"], on),
      rule("noauth", NOAUTH, ["verify", "criteria"], on),
      rule("p2p", ["Peer-to-peer call within 3 business days of a denial", "Written appeal within 60 days", "Then external review"], ["advocate", "cadence"], on),
    ],
    docs: docsFor(p.id),
    changes: [chg(`${p.id}-1`, on, `${p.name} added`, "Starter workflow, rules and documents were created from the benchmark. Historian refines them as decisions arrive.")],
    pending: null,
    proposals: [],
    dismissed: [],
    unapplied: 0,
  };
}

/* ---------- Documents tab: Try it on a case ---------- */
export interface ChartGap { match: string; say: string }
/** What each sample chart is missing. Matched against the titles in the payer's list for the case's program. */
export const CHART_GAPS: Record<string, ChartGap[]> = {
  "R-1042": [{ match: "Therapy note", say: "a therapy note from the last 14 days" }],
  "I-2207": [{ match: "Attendance", say: "an attendance record for the last 14 days" }, { match: "Remaining treatment goals", say: "the remaining treatment goals in the progress note" }],
  "R-1101": [{ match: "Urine", say: "a urine drug screen from the last 14 days" }, { match: "withdrawal", say: "the nursing note with the withdrawal scale" }],
};
