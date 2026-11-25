import type { ClinicConfig } from "../types";

/* A tiny config for developing screens before the real content exists. It is not a clinic. To use it locally:
     echo 'export { fixture as harvest } from "./fixture";' > src/clinics/harvest.ts      (and the same for cccsn.ts)
   and restore the real files with `git checkout src/clinics/harvest.ts src/clinics/cccsn.ts` before you commit. */
export const fixture: ClinicConfig = {
  id: "harvest",
  today: "2026-10-29",
  user: { name: "Jordan Perez, LPC", short: "J. Perez", role: "Clinician" },
  profile: {
    name: "Fixture Clinic", sub: "Sample program · Sample state", short: "Fixture",
    programs: [{ name: "Day program", code: "X0001", sites: ["Site A", "Site B"], note: "Sample." }],
    payers: [{ id: "p1", name: "Sample Health Plan", channel: "Portal", criteria: "Sample criteria written by the clinic." }],
    accreditations: ["Sample accreditation (to confirm)"],
    verbiage: [{ rule: "Say what staff did, not that staff watched.", example: "Worked with …, not Observed …" }],
    documentRules: [{ doc: "dpn", rule: "A note names the plan goal, the intervention, the minutes and the response." }],
    retention: { transcripts: "Rolling, 14 days", documents: "Retained when saved" },
    checks: { pauseAt: "severe", onSave: true },
  },
  forms: {
    dpn: {
      kind: "dpn", title: "Daily Progress Note", short: "Daily progress note", laurisName: "Daily Progress Note",
      sections: [{ id: "s1", title: "Note", fields: [
        { key: "date", label: "Service date", kind: "date" },
        { key: "goal", label: "Treatment goal", kind: "select", options: ["Goal 1 – sample", "Goal 2 – sample"] },
        { key: "ints", label: "Interventions used", kind: "checks", options: ["Movement", "Coping skills"] },
        { key: "intervention", label: "Intervention performed", kind: "textarea" },
        { key: "duration", label: "Duration", kind: "text" },
        { key: "response", label: "Response", kind: "textarea" },
        { key: "needs", label: "Continuing needs", kind: "textarea" },
        { key: "sig", label: "Signature", kind: "text", lock: true },
      ] }],
    },
    sra: {
      kind: "sra", title: "Continued Stay Request", short: "Continued stay request", laurisName: "Continued Stay Request",
      sections: [{ id: "s1", title: "Request", fields: [
        { key: "lack", label: "Lack of progress", kind: "textarea" },
        { key: "discharge", label: "Discharge plan", kind: "textarea" },
      ] }],
    },
  },
  consumers: [{
    id: "1001", ini: "A.B.", age: 9, program: "Day program", site: "Site A", payer: "p1", clinician: "J. Perez", units: { left: 12, ends: "11/20/2026" }, dx: "Sample dx",
    docs: ["dpn-1001", "sra-1001"],
    chart: [
      { id: "plan1", label: "Plan · Goal 1", date: "2026-08-11", kind: "plan", text: "Goal 1: use a taught coping strategy before leaving the room in 4 of 5 escalations." },
      { id: "note1", label: "Daily note Oct 27", date: "2026-10-27", kind: "note", text: "Two escalations at lunch; strategy used on his own in 1 of 2." },
    ],
  }],
  docs: [
    { id: "dpn-1001", kind: "dpn", consumerId: "1001", date: "2026-10-29", values: { date: "10/29/2026" }, prefilled: ["date"], status: "draft" },
    { id: "sra-1001", kind: "sra", consumerId: "1001", date: "2026-10-29", values: { discharge: "Step down when goals are met." }, status: "draft" },
  ],
  scribe: [{
    docId: "dpn-1001", mode: "live", who: "A.B. and staff", consentScript: "I would like to record this session to write my note. Is that all right?", length: "4:12",
    lines: [
      { t: "0:03", who: "Clinician", text: "What did we work on?" },
      { t: "0:08", who: "Staff", text: "Played basketball for frustration tolerance, 1:10 to 1:40." },
      { t: "0:15", who: "Clinician", text: "How did it go?" },
      { t: "0:18", who: "Staff", text: "He got frustrated when he lost and walked off the court." },
      { t: "0:27", who: "Staff", text: "We walked together and he came back after about six minutes." },
    ],
    context: ["plan1", "note1"],
    draft: {
      goal: { value: "Goal 1 – sample", from: "chart", chart: "plan1" },
      ints: { value: ["Movement"], from: "session", lines: [1] },
      intervention: { value: "Basketball for frustration tolerance.", from: "session", lines: [1] },
      duration: { value: "30 min (1:10–1:40 pm)", from: "session", lines: [1] },
      response: { value: "Frustrated when he lost and walked off the court; came back after a walk with staff, about 6 minutes.", from: "session", lines: [3, 4] },
      needs: { value: "", from: "none", note: "Nothing was said about continuing needs." },
    },
  }],
  checks: [
    { id: "dpn-needs", title: "Continuing needs are stated", module: "Completeness", docs: ["dpn"], severity: "medium", run: ({ doc }) => (String(doc.values.needs ?? "").trim() ? [] : [{
      severity: "medium", fieldKey: "needs", title: "Continuing needs are blank", why: "A note that says nothing about what comes next reads as unfinished.", rule: "Clinic standard · progress note",
      fix: { kind: "ask", prompt: "What does A.B. still need?", placeholder: "In your words", mode: "replace", frame: (a) => `Continuing need: ${a}` } }]) },
    { id: "dpn-observed", title: "No \"observed\" wording", module: "Wording", docs: ["dpn"], severity: "severe", run: ({ doc }) => (/\bobserved\b/i.test(String(doc.values.intervention ?? "")) ? [{
      severity: "severe", fieldKey: "intervention", title: "\"Observed\" describes watching, not treatment", why: "An auditor can void the unit.", rule: "Clinic standard · wording",
      fix: { kind: "ask", prompt: "What did staff do?", frame: (a) => a, mode: "replace" } }] : []) },
    { id: "sra-lack", title: "Lack of progress is explained", module: "Medical necessity", docs: ["sra"], severity: "severe", run: ({ doc, chart }) => (String(doc.values.lack ?? "").trim() ? [] : [{
      severity: "severe", fieldKey: "lack", title: "The lack-of-progress box is empty", why: "A request that states no lack of progress is denied.", rule: "Sample plan · continued stay",
      fix: { kind: "text", text: chart("note1")!.text, source: chart("note1")!.label, mode: "replace" } }]) },
  ],
  history: [{ id: "h1", type: "session", doc: "dpn", consumerId: "1001", date: "2026-10-27", by: "J. Perez", status: "Typed into Lauris and saved", docId: "dpn-1001" }],
};
