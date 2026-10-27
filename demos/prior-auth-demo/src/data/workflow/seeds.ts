import { seedPayerConfig } from "../payerConfigSeed";
import { payerProfileOf } from "../payerProfile";
import { PAYERS } from "../seed";
import type { Program } from "../types";
import { createNode, outputsOf } from "./catalog";
import { autoLayout } from "./layout";
import { migratePayerWorkflow } from "./migrate";
import { RULES_OWNER, SEED_RULES } from "./rules";
import { workflowFromTemplate } from "./templates";
import type { ConfigValue, Handle, NodeKind, PromptConfig, RequestType, WfNode, Workflow, WorkflowVersion } from "./types";

/* The workflows a fresh demo starts with: each payer's earlier Process tab as a graph (published, "<short name> process (migrated)"), and five editable samples built from the
   starter templates. Their rules are the library's demo samples: unverified, never presented as a payer's policy. Document prerequisites name the payer's real document ids. */

const cfgs = seedPayerConfig();
const BUILT_IN = PAYERS.slice(0, 6).map((p) => p.id);
const docIds = (payer: string, program: Program, n: number[]): string[] => n.map((i) => `${payer}-${program.toLowerCase()}-${i}`);

/* ---------------------------------------------------------------- small editing helpers (a sample is a template with a few changes) */
const node = (wf: Workflow, id: string): WfNode => {
  const n = wf.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`seed: no node ${id} in ${wf.id}`);
  return n;
};
const set = (wf: Workflow, id: string, over: Partial<WfNode> & { config?: Record<string, ConfigValue> }): void => {
  const n = node(wf, id);
  const { config, ...rest } = over;
  Object.assign(n, rest);
  if (config) n.config = { ...n.config, ...config };
};
const put = (wf: Workflow, kind: NodeKind, id: string, over: Partial<WfNode> & { config?: Record<string, ConfigValue> } = {}): void => {
  const { config, ...rest } = over;
  const n = createNode(kind, id, { x: 0, y: 0 }, rest);
  if (config) n.config = { ...n.config, ...config };
  wf.nodes.push(n);
};
const drop = (wf: Workflow, from: string, handle: Handle): void => {
  wf.edges = wf.edges.filter((e) => !(e.from === from && e.handle === handle));
};
const join = (wf: Workflow, from: string, handle: Handle, to: string): void => {
  const f = node(wf, from);
  const outs = outputsOf(f);
  const label = outs.length > 1 ? outs.find((o) => o.handle === handle)?.label : undefined;
  const taken = new Set(wf.edges.map((e) => e.id));
  let n = wf.edges.length + 1;
  while (taken.has(`e${n}`)) n += 1;
  wf.edges.push({ id: `e${n}`, from, to, handle, ...(label ? { label } : {}) });
};
const prompt = (agent: PromptConfig["agent"], text: string, expectedOutput: string, inputs: string[], humanReview: boolean): ConfigValue => ({ agent, prompt: text, inputs, expectedOutput, humanReview, onFailure: "manual_review" }) as unknown as ConfigValue;

interface Sample { id: string; payerId: string; name: string; description: string; template: string; requestType: RequestType; services: Program[]; status: "published" | "draft"; tweak: (wf: Workflow) => void }

const SAMPLES: Sample[] = [
  {
    id: "wf-summit-initial-res", payerId: "summit", name: "Sentara Initial Authorization, Residential SUD", template: "starter-initial", requestType: "initial", services: ["RES"], status: "published",
    description: "Demo sample for an initial Residential 3.5 request to Sentara: coverage and benefits, an in-network check, notice within the submission window, Sentara's nine documents, clinical criteria, an approval before anything is sent, and the payer's answer. Its rules are unverified demo samples, not Sentara's policy.",
    tweak: (wf) => {
      set(wf, "collect", { config: { required: docIds("summit", "RES", [1, 2, 3, 4, 5, 6, 7, 8, 9]) }, instructions: "Sentara asks for nine documents for Residential 3.5, including the ASAM assessment, a withdrawal scale and the treatment plan. If one is missing, the process waits and says which." });
      put(wf, "if_else", "network", { title: "Is the provider in network?", purpose: "Out of network goes to a manager before anything else.", config: { when: { join: "and", items: [{ fact: "in_network", op: "equals", value: "no" }] } } });
      put(wf, "act_escalate", "escalate", { title: "Ask a manager about the network", config: { to: "manager", reason: "The provider is not in network for this plan." }, instructions: "A manager decides whether to go on, ask Sentara about enrollment, or stop." });
      drop(wf, "benefits", "ok");
      join(wf, "benefits", "ok", "network");
      join(wf, "network", "no", "authreq");
      join(wf, "network", "yes", "escalate");
      join(wf, "escalate", "next", "end_mr");
      set(wf, "necessity", { config: { prompt: prompt("placement", "Compare {{clinical_documents}} with {{payer_rules}} for Residential 3.5 at {{payer_name}}. Sentara asks for every ASAM dimension dated within 7 days, a treatment plan with measurable goals and a withdrawal scale. List each criterion, whether the chart supports it and the document that shows it. Say what the chart does not show. Do not invent clinical evidence.", "Each criterion with supported or not supported, and its source document", ["clinical_documents", "payer_rules"], true) } });
      set(wf, "call", { config: { script: cfgs.summit.caller.text, transmit: false } });
    },
  },
  {
    id: "wf-cardinal-concurrent-res", payerId: "cardinal", name: "Anthem Concurrent Review, Residential SUD", template: "starter-concurrent", requestType: "concurrent", services: ["RES"], status: "published",
    description: "Demo sample for a continued-stay review of a Residential 3.5 stay at Anthem: the current authorization, units left, the review cadence, progress notes, an approval, and a follow-up when Anthem has not answered in two business days. Its rules are unverified demo samples, not Anthem's policy.",
    tweak: (wf) => {
      set(wf, "collect", { config: { required: ["cardinal-res-5", "cardinal-res-6", "cardinal-res-9"] }, instructions: "Anthem asks for the medication list, the treatment plan and a therapy note from the last 14 days. Anthem's rules version 2026.3 also wants the remaining treatment goals in the progress note." });
      set(wf, "summary", { config: { prompt: prompt("scribe", "Summarize {{patient_name}}'s progress since the last review from {{clinical_documents}} for {{payer_name}}. Name the remaining treatment goals, because Anthem's rules version 2026.3 ask for them, or say the chart does not name them. Cite the document for each sentence.", "A progress summary that names the remaining treatment goals, with sources", ["clinical_documents", "existing_authorization"], false) } });
      put(wf, "time_condition", "wait", { title: "Two business days without an answer?", config: { since: "waiting", days: 2 }, purpose: "In the demo's sample data Anthem decides in about two days." });
      put(wf, "act_followup", "followup", { title: "Follow up by phone", config: { afterDays: 0, dayType: "business", how: "phone" }, instructions: "Caller phones Anthem's provider line, follows the script and logs who it spoke to." });
      join(wf, "response", "none", "wait");
      join(wf, "wait", "ready", "followup");
      join(wf, "followup", "next", "response");
      set(wf, "call", { config: { script: cfgs.cardinal.caller.text, transmit: false } });
    },
  },
  {
    id: "wf-beacon-initial-iop", payerId: "beacon", name: "Medicaid FFS Initial Authorization, IOP", template: "starter-initial", requestType: "initial", services: ["IOP"], status: "published",
    description: "Demo sample for an initial IOP request under Virginia Medicaid fee-for-service, reviewed by Acentra Health in Atrezzo Next Generation. IOP needs a service authorization; the process ends early only when the eligibility check finds none is needed. Otherwise it collects the IOP documents and goes on. Its rules are unverified demo samples, not DMAS or Acentra policy.",
    tweak: (wf) => {
      set(wf, "collect", { config: { required: docIds("beacon", "IOP", [1, 2, 3, 4, 5]) }, instructions: "The fee-for-service sample list asks for the ASAM assessment, a diagnostic assessment, the treatment plan, the medication list and the insurance card with the referral." });
      put(wf, "decision", "benefit", { title: "How are the benefits for IOP?", purpose: "Limited benefits tell billing before the request goes on.", config: { branches: [{ id: "limited", label: "Benefits are limited", when: { join: "and", items: [{ fact: "benefit", op: "equals", value: "limited" }] } }] } });
      put(wf, "act_notify", "tell_billing", { title: "Tell billing the benefits are limited", config: { to: "billing", message: "The plan's IOP benefit is limited. Check the visit limit before the request is sent." } });
      drop(wf, "benefits", "ok");
      join(wf, "benefits", "ok", "benefit");
      join(wf, "benefit", "limited", "tell_billing");
      join(wf, "benefit", "else", "authreq");
      join(wf, "tell_billing", "next", "authreq");
    },
  },
  {
    id: "wf-summit-retro-res", payerId: "summit", name: "Sentara Retroactive Authorization, Example Service", template: "starter-retro", requestType: "retro", services: ["RES"], status: "published",
    description: "Demo sample for a retroactive Residential 3.5 request to Sentara (the example service): eligibility for the past dates, Sentara's backdating rule, the historical documents, a missing-information check and a manager's review before anything is sent. Its rules are unverified demo samples, not Sentara's policy.",
    tweak: (wf) => {
      set(wf, "collect", { config: { required: docIds("summit", "RES", [1, 2, 3, 6, 7]) }, instructions: "For the dates already past: the ASAM assessment, the psychiatric evaluation, the nursing note with the withdrawal scale, the treatment plan and the insurance card with the referral." });
      set(wf, "review", { config: { prompt: prompt("reader", "Review {{clinical_documents}} for the dates of service starting {{requested_start_date}}. For each document say which dates it covers and whether it shows the service was delivered. Say what is missing for the dates asked for. Use only what the documents say.", "A list of documents with the dates each one covers, and any gap in the dates", ["clinical_documents", "requested_start_date"], false) } });
      put(wf, "ag_missing_info", "gaps", { title: "Look for gaps the payer will ask about", config: { prompt: prompt("scrubber", "Compare {{clinical_documents}} with what {{payer_name}} asks for in {{payer_rules}} for a retroactive {{service_type}} request. List every missing or unclear item and why the payer will ask. Do not fill gaps from memory.", "A list of missing or unclear items with the reason for each", ["clinical_documents", "payer_rules"], false) } });
      drop(wf, "review", "next");
      join(wf, "review", "next", "gaps");
      join(wf, "gaps", "next", "packet");
      set(wf, "call", { config: { script: "Phone the provider line. Ask whether coverage was pending on the admission date and whether a retroactive request is accepted. Do not agree to any change. Log who you spoke to and what they said.", transmit: false } });
    },
  },
  {
    id: "wf-cardinal-modify", payerId: "cardinal", name: "Anthem Modification of Existing Approval", template: "starter-modification", requestType: "modify", services: [], status: "draft",
    description: "Demo sample, still a draft: a change to an Anthem approval (more days or units, revised dates, a different level of care). It checks the existing authorization, the limits and the documents, asks a manager about large changes, and needs a clinician's review before anything is sent. Its rules are unverified demo samples, not Anthem's policy.",
    tweak: (wf) => {
      set(wf, "collect", { config: { required: ["cardinal-res-6", "cardinal-res-9"] }, instructions: "The treatment plan and a therapy note from the last 14 days show why the change is needed." });
      put(wf, "decision", "size", { title: "How large is the change?", purpose: "More than 14 days or units goes to a manager first.", config: { branches: [{ id: "large", label: "More than 14 days or units", when: { join: "and", items: [{ fact: "requested_units", op: "gt", value: 14 }] } }] } });
      put(wf, "act_escalate", "big", { title: "Ask a manager about a large change", config: { to: "manager", reason: "The change asks for more than 14 days or units." } });
      drop(wf, "units", "ok");
      join(wf, "units", "ok", "size");
      join(wf, "size", "large", "big");
      join(wf, "size", "else", "collect");
      join(wf, "big", "next", "collect");
    },
  },
];

function build(s: Sample): Workflow {
  const profile = payerProfileOf(s.payerId);
  const wf = workflowFromTemplate(s.template, {
    id: s.id, payerId: s.payerId, name: s.name, description: s.description, state: profile.state, product: profile.product, services: s.services, requestType: s.requestType,
    effectiveFrom: "2026-01-01", owner: RULES_OWNER,
  }, SEED_RULES);
  s.tweak(wf);
  wf.nodes = autoLayout(wf.nodes, wf.edges);
  wf.status = s.status;
  wf.updatedBy = RULES_OWNER;
  return wf;
}

/** Each built-in payer's earlier Process tab, as a published graph. */
export const MIGRATED_WORKFLOWS: Workflow[] = BUILT_IN.map((id) => migratePayerWorkflow(id, cfgs[id]));
/** The five editable samples from the brief: four published and one draft. */
export const SAMPLE_WORKFLOWS: Workflow[] = SAMPLES.map(build);
export const SEED_WORKFLOWS: Workflow[] = [...MIGRATED_WORKFLOWS, ...SAMPLE_WORKFLOWS];

const metaOf = (w: Workflow): WorkflowVersion["meta"] => ({ id: w.id, payerId: w.payerId, name: w.name, description: w.description, state: w.state, product: w.product, services: w.services, providerType: w.providerType, requestType: w.requestType, effectiveFrom: w.effectiveFrom, effectiveTo: w.effectiveTo, owner: w.owner });

/** The snapshot a published workflow is saved with. */
export const snapshotOf = (w: Workflow, reason: string, savedAt: number, savedBy: string): WorkflowVersion => ({
  workflowId: w.id,
  version: w.version,
  savedAt,
  savedBy,
  reason,
  status: w.status,
  meta: metaOf(w),
  nodes: JSON.parse(JSON.stringify(w.nodes)),
  edges: JSON.parse(JSON.stringify(w.edges)),
});

/** One snapshot for every published seed, so a case can keep the version it started with. */
export const SEED_WORKFLOW_VERSIONS: WorkflowVersion[] = SEED_WORKFLOWS.filter((w) => w.status === "published").map((w) => snapshotOf(w, w.migrated ? "Made from the Process tab" : "Sample workflow from the starter template", w.updatedAt, w.updatedBy));
export const SEED_WORKFLOW_IDS: string[] = SEED_WORKFLOWS.map((w) => w.id);
