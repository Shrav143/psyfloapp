import type { AgentKey, PayerId } from "./types";
import type { Branch, Condition, StepKind, Workflow, WorkflowStep } from "./payerConfig";

/* The workflow each payer's agents follow. Summit is written out as in the mockup; the others differ in how the payer is reached. */

let seq = 0;
const br = (cond: Condition, kind: StepKind, text: string): Branch => ({ id: `br-${++seq}`, cond, kind, text });
const st = (title: string, kind: StepKind, agents: AgentKey[], text: string, typical: string, branches: Branch[] = []): WorkflowStep => ({ id: `st-${++seq}`, title, kind, agents, text, typical, branches });
const c = (kind: Condition["kind"], value: string): Condition => ({ kind, value });

const checkCoverage = () => st("Check coverage", "check", ["verify"], "Eligibility and benefits for the program, before any request goes out.", "15 seconds");
const decision = (peer: string) =>
  st("Decision and next review", "check", ["cadence", "advocate"], "Usually the first 7 days. The agents act on the answer.", "ongoing", [
    br(c("answer", "approves"), "check", "Cadence books the next review 72 hours before the unit limit. Write-back waits for a person"),
    br(c("answer", "denies or partly approves"), "check", `Advocate opens it in Denial Intelligence. ${peer}`),
  ]);
const infoAsk = () => br(c("answer", "asks for information"), "file", "Packet drafts the answer. The case returns to Authorizations as Needs your input");
const docsStep = (resDocs: string, otherDocs: string) =>
  st("Gather the documents", "check", ["reader", "criteria"], "The list for the program, read from the chart. The assessment is attached.", "20 seconds", [
    br(c("program", "Residential 3.5"), "file", resDocs),
    br(c("program", "IOP or PHP"), "file", otherDocs),
    br(c("request", "a retro-authorization"), "file", "Add the retro-request form and proof of pending eligibility"),
  ]);

const BUILD: Record<PayerId, () => { version: number; editedOn: string; steps: WorkflowStep[] }> = {
  summit: () => ({
    version: 7, editedOn: "10/12",
    steps: [
      checkCoverage(),
      docsStep("Nine documents, including the ASAM assessment and a withdrawal scale", "Six documents. No withdrawal scale needed"),
      st("Give notice", "portal", ["navigator"], "Within 24 hours of admission, through the provider portal.", "same day", [br(c("portal", "down"), "phone", "Caller phones the provider line, gives notice and logs the call")]),
      st("Send the request", "portal", ["navigator"], "Clinical summary, assessment and treatment plan. The confirmation number is saved to the case.", "2 minutes"),
      st("Follow up", "portal", ["navigator", "caller"], "Navigator checks the portal every 30 minutes and saves each result.", "1.5 days", [br(c("waiting", "2 business days"), "phone", "Caller phones, follows the script below and logs who it spoke to"), infoAsk()]),
      decision("Peer-to-peer within 3 business days"),
    ],
  }),
  cardinal: () => ({
    version: 5, editedOn: "09/30",
    steps: [
      checkCoverage(),
      docsStep("Ten documents, including the ASAM assessment and the latest progress note", "Seven documents. Recertification needs an attendance record"),
      st("Give notice", "portal", ["navigator"], "Within 24 hours of admission, through the provider portal. The portal is down on Sundays, 2 to 4 am.", "same day", [br(c("portal", "down"), "phone", "Caller phones the provider line, gives notice and logs the call")]),
      st("Send the request", "portal", ["navigator"], "Clinical summary, assessment and treatment plan. Cardinal's form asks for the expected length of stay.", "3 minutes"),
      st("Follow up", "portal", ["navigator", "caller"], "Navigator checks the portal every 30 minutes. Cardinal usually decides in 2 days.", "2 days", [br(c("waiting", "2 business days"), "phone", "Caller phones, follows the script below and logs who it spoke to"), infoAsk()]),
      decision("Peer-to-peer within 2 business days, because the window is short"),
    ],
  }),
  beacon: () => ({
    version: 4, editedOn: "10/02",
    steps: [
      checkCoverage(),
      docsStep("Eight documents, including the ASAM assessment", "Six documents"),
      st("Give notice", "portal", ["navigator"], "Within 24 hours of admission, through the provider portal.", "same day", [br(c("portal", "down"), "phone", "Caller phones the provider line, gives notice and logs the call")]),
      st("Send the request", "portal", ["navigator"], "Clinical summary, assessment and treatment plan. The confirmation number is saved to the case.", "2 minutes"),
      st("Follow up", "portal", ["navigator"], "Navigator checks the portal every 30 minutes. Beacon usually decides in a day.", "1 day", [br(c("waiting", "24 hours"), "phone", "Caller phones and logs who it spoke to"), infoAsk()]),
      decision("Peer-to-peer within 3 business days"),
    ],
  }),
  evergreen: () => ({
    version: 3, editedOn: "10/09",
    steps: [
      checkCoverage(),
      docsStep("Nine documents, including the ASAM assessment and a withdrawal scale", "Six documents"),
      st("Give notice", "phone", ["caller"], "Caller phones the provider line within 24 hours of admission, gives notice and logs the call.", "20 minutes", [br(c("waiting", "24 hours"), "phone", "Caller tries again at the start of the next hour and asks for a supervisor")]),
      st("Send the request", "phone", ["caller", "packet"], "Caller reads the clinical summary to the reviewer. Packet sends the supporting pages by secure message.", "25 minutes"),
      st("Follow up", "phone", ["caller"], "Caller phones each morning and saves the call log with who it spoke to.", "2 days", [br(c("waiting", "3 business days"), "phone", "Caller asks for a supervisor and logs the call"), infoAsk()]),
      decision("Peer-to-peer within 3 business days"),
    ],
  }),
  harborview: () => ({
    version: 6, editedOn: "10/05",
    steps: [
      checkCoverage(),
      docsStep("Eleven documents, including the ASAM assessment and a medication list", "Seven documents"),
      st("Give notice", "portal", ["navigator"], "Within 72 hours of admission, through the provider portal.", "same day", [br(c("portal", "down"), "file", "Packet faxes the notice and Navigator saves the transmission report")]),
      st("Send the request", "portal", ["navigator", "packet"], "Packet fills the portal form. Attachments over 10 MB go by fax.", "5 minutes", [br(c("portal", "slow"), "file", "Packet faxes the packet and Navigator saves the transmission report")]),
      st("Follow up", "portal", ["navigator", "caller"], "Navigator checks the portal every 30 minutes. Harborview usually decides in 3 days.", "3 days", [br(c("waiting", "3 business days"), "phone", "Caller phones, follows the script below and logs who it spoke to"), infoAsk()]),
      decision("Peer-to-peer within 3 business days, then external review"),
    ],
  }),
  lakeshore: () => ({
    version: 4, editedOn: "10/10",
    steps: [
      checkCoverage(),
      docsStep("Ten documents, including the ASAM assessment and a fax cover sheet", "Seven documents, including a fax cover sheet"),
      st("Give notice", "file", ["packet", "navigator"], "Packet prepares the notice form and Navigator sends it by fax within 24 hours. The fax receipt is saved.", "same day"),
      st("Send the request", "file", ["packet", "navigator"], "Packet builds the packet with a cover sheet. Navigator sends it by fax and saves the transmission report.", "10 minutes", [br(c("waiting", "24 hours"), "phone", "Caller confirms the fax arrived and gives the page count")]),
      st("Follow up", "phone", ["caller"], "Caller phones the provider line to ask whether the request was received, and logs the call.", "2 days", [infoAsk()]),
      decision("Peer-to-peer within 3 business days"),
    ],
  }),
};

export function seedWorkflow(id: PayerId): Workflow {
  return BUILD[id]();
}

/** A new payer starts with the same six steps, written for how it is reached. */
export function starterWorkflow(reach: string[]): Workflow {
  const portal = reach.includes("Portal");
  const phone = reach.includes("Phone");
  const how: StepKind = portal ? "portal" : phone ? "phone" : "file";
  const via = portal ? "through the provider portal" : phone ? "by phone" : "by fax";
  return {
    version: 1,
    editedOn: "10/20",
    steps: [
      checkCoverage(),
      docsStep("The list for residential, read from the chart", "The list for IOP or PHP"),
      st("Give notice", how, [portal ? "navigator" : phone ? "caller" : "packet"], `Within 24 hours of admission, ${via}.`, "same day"),
      st("Send the request", how, ["navigator", "packet"], `Clinical summary, assessment and treatment plan, sent ${via}.`, "5 minutes"),
      st("Follow up", how, ["navigator", "caller"], "Navigator checks for a status each day and saves each result.", "benchmark: 2 days", [infoAsk()]),
      decision("Peer-to-peer within 3 business days"),
    ],
  };
}
