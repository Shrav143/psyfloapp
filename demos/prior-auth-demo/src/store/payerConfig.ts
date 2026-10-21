import type { StateCreator } from "zustand";
import { AGENTS } from "@/data/agents";
import { conditionText, RULE_TITLE, USER_NAME, type AddPayerFields, type CustomPayer, type DocItem, type EditArea, type EditLogEntry, type LogChange, type PayerConfig, type RuleId, type WorkflowStep } from "@/data/payerConfig";
import { proposalsFor, seedPayerConfig, starterConfig } from "@/data/payerConfigSeed";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type Program } from "@/data/types";
import { uid } from "@/lib/format";
import { shortDate, stamp } from "@/lib/time";
import { paths } from "@/routes";
import { createEmrSlice, type EmrSlice } from "./emr";
import type { AppState } from "./index";

/* Payers workflow, rules, documents, changes (owner: denials agent). One PayerConfig per payer id, plus the edit log.
   Saving an edit applies to new drafts at once; open drafts follow when the user clicks Update drafts. */

export type PayerDetailsPatch = Partial<Pick<PayerConfig, "planLine" | "reachedBy" | "reach">> & { noticeDue?: string; backup?: string };

export interface PayerConfigSlice extends EmrSlice {
  customPayers: CustomPayer[];
  payerConfig: Record<string, PayerConfig>;
  payerEdits: EditLogEntry[];
  addPayer: (input: AddPayerFields) => string;
  editPayerDetails: (id: string, patch: PayerDetailsPatch, reason: string, changes: LogChange[]) => void;
  saveWorkflow: (id: string, steps: WorkflowStep[], reason: string, changes: LogChange[]) => void;
  saveCaller: (id: string, text: string, reason: string) => void;
  saveRule: (id: string, rule: RuleId, lines: string[], reason: string) => void;
  saveDocs: (id: string, program: Program, items: DocItem[], reason: string, changes: LogChange[]) => void;
  /** Historian finished "Re-learn from decisions". Returns false when it found nothing new. */
  addProposal: (id: string) => boolean;
  acceptProposal: (id: string, proposalId: string) => void;
  dismissProposal: (id: string, proposalId: string) => void;
  /** Gate 1: a person saw the change. Records who and when. */
  acknowledgeChange: (id: string) => void;
  /** Gate 2: the redraft is done. Needs the change to be acknowledged first. */
  updateDrafts: (id: string) => void;
  /** Redraft open drafts after workflow, rule or document edits. */
  updateOpenDrafts: (id: string) => void;
}

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);
const joinReach = (r: string[]): string => (r.length <= 1 ? (r[0] ?? "Phone") : `${r.slice(0, -1).join(", ")} and ${r[r.length - 1].toLowerCase()}`);

export const createPayerConfigSlice: StateCreator<AppState, [], [], PayerConfigSlice> = (set, get, api) => {
  const patchConfig = (id: string, fn: (c: PayerConfig) => PayerConfig) => set((s) => (s.payerConfig[id] ? { payerConfig: { ...s.payerConfig, [id]: fn(s.payerConfig[id]) } } : {}));
  const shortOf = (id: string): string => PAYERS.find((p) => p.id === id)?.shortName ?? get().customPayers.find((p) => p.id === id)?.shortName ?? "The payer";
  const logEdits = (id: string, area: EditArea, reason: string, changes: LogChange[], user = USER_NAME) =>
    set((s) => ({ payerEdits: [...changes.map((c) => ({ id: uid("pe"), payerId: id, at: s.clock, user, area, what: c.what, before: c.before, after: c.after, reason })), ...s.payerEdits] }));
  /** An edit was saved: new drafts use it now, and open drafts wait for Update drafts. */
  const edited = (id: string, extra?: (c: PayerConfig) => Partial<PayerConfig>) => patchConfig(id, (c) => ({ ...c, unapplied: c.unapplied + 1, ...extra?.(c) }));

  /** Put a redrafted case back in front of a person. Drafts get a new signature request; a sent request gets an addendum, never a rewrite. */
  const redraft = (ids: string[], why: string, agent: AgentKey) => {
    const { requests, updateRequest, addEvent } = get();
    const name = AGENTS[agent].name;
    for (const rid of ids) {
      const r = requests.find((x) => x.id === rid);
      if (!r) continue;
      if (r.stage === "preparing" || r.stage === "info_requested") {
        updateRequest(rid, { needsYou: true, agent, next: `Redrafted after ${why}. Waiting for a new signature` });
        addEvent(rid, { actor: agent, text: `${name} redrafted the case after ${why}`, detail: "It returns to Case Manager for a new signature." });
      } else {
        addEvent(rid, { actor: agent, text: `${name} prepared an addendum after ${why}`, detail: "It returns to Case Manager for a new signature before anything is sent." });
      }
    }
  };

  return {
    ...createEmrSlice(set, get, api),
    customPayers: [],
    payerConfig: seedPayerConfig(),
    payerEdits: [],

    addPayer: (input) => {
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "payer";
      const id = `custom-${slug}`;
      const payer: CustomPayer = { id, name: input.name, shortName: input.name.split(" ")[0], type: input.type, group: input.group, reachedBy: joinReach(input.reach), programs: input.programs };
      set((s) => ({ customPayers: [...s.customPayers, payer], payerConfig: { ...s.payerConfig, [id]: starterConfig(payer, input.reach) } }));
      logEdits(id, "Payer details", "Payer added", [{ what: "Added a payer", before: "", after: `${input.name}, ${input.type}, reached by ${payer.reachedBy}` }]);
      get().toast({ title: `${input.name} was added`, body: "Starter workflow, rules and documents are ready. Figures are benchmark estimates.", tone: "good" });
      return id;
    },

    editPayerDetails: (id, patch, reason, changes) => {
      const { noticeDue, backup, ...top } = patch;
      patchConfig(id, (c) => ({ ...c, ...top, facts: { ...c.facts, ...(noticeDue !== undefined ? { noticeDue } : {}), ...(backup !== undefined ? { backup } : {}) } }));
      logEdits(id, "Payer details", reason, changes);
      get().toast({ title: "Payer details saved", body: "The edit is in the log with your reason.", tone: "good" });
    },

    saveWorkflow: (id, steps, reason, changes) => {
      const clock = get().clock;
      edited(id, (c) => ({ workflow: { version: c.workflow.version + 1, editedOn: shortDate(clock), steps } }));
      logEdits(id, "Workflow", reason, changes);
      const v = get().payerConfig[id]?.workflow.version;
      get().toast({ title: `Workflow saved as version ${v}`, body: `${changes.length} ${changes.length === 1 ? "change" : "changes"} logged. New drafts use it now. Open drafts follow when you update them.`, tone: "good" });
    },

    saveCaller: (id, text, reason) => {
      const old = get().payerConfig[id]?.caller.text ?? "";
      patchConfig(id, (c) => ({ ...c, caller: { text, confirmed: shortDate(get().clock) } }));
      logEdits(id, "Caller instructions", reason, [{ what: "Instructions for Caller", before: old, after: text }]);
      get().toast({ title: "Instructions for Caller saved", body: "Phone steps use them from the next call. The edit is logged.", tone: "good" });
    },

    saveRule: (id, rule, lines, reason) => {
      const old = get().payerConfig[id]?.rules.find((r) => r.id === rule)?.lines ?? [];
      const on = shortDate(get().clock);
      edited(id, (c) => ({ rules: c.rules.map((r) => (r.id === rule ? { ...r, lines, confirmed: on } : r)) }));
      logEdits(id, "Rules", reason, [{ what: RULE_TITLE[rule], before: old.join("; "), after: lines.join("; ") }]);
      get().toast({ title: `${RULE_TITLE[rule]} saved`, body: "New drafts use it now. Open drafts follow when you click Update drafts.", tone: "good" });
    },

    saveDocs: (id, program, items, reason, changes) => {
      edited(id, (c) => ({ docs: { ...c.docs, [program]: items } }));
      logEdits(id, "Documents", reason, changes);
      get().toast({ title: `${PROGRAM_LABEL[program]} list saved`, body: "Reader uses it on the intake screen from now on. Open drafts follow when you update them.", tone: "good" });
    },

    addProposal: (id) => {
      const cfg = get().payerConfig[id];
      if (!cfg) return false;
      const has = (p: { stepTitle: string; cond: { kind: string; value: string } }) =>
        cfg.proposals.some((x) => x.stepTitle === p.stepTitle && x.cond.value === p.cond.value) || cfg.workflow.steps.some((s) => s.title === p.stepTitle && s.branches.some((b) => b.cond.kind === p.cond.kind && b.cond.value === p.cond.value));
      const next = proposalsFor(id).find((p) => !has(p) && !cfg.dismissed.includes(p.title));
      if (!next) return false;
      patchConfig(id, (c) => ({ ...c, proposals: [...c.proposals, { ...next, id: uid("pp") }] }));
      return true;
    },

    acceptProposal: (id, proposalId) => {
      const cfg = get().payerConfig[id];
      const p = cfg?.proposals.find((x) => x.id === proposalId);
      if (!cfg || !p) return;
      const target = cfg.workflow.steps.find((s) => s.title === p.stepTitle) ?? cfg.workflow.steps[cfg.workflow.steps.length - 1];
      const clock = get().clock;
      edited(id, (c) => ({
        proposals: c.proposals.filter((x) => x.id !== proposalId),
        workflow: { version: c.workflow.version + 1, editedOn: shortDate(clock), steps: c.workflow.steps.map((s) => (s.id === target.id ? { ...s, branches: [...s.branches, { id: uid("br"), cond: p.cond, kind: p.kind, text: p.result }] } : s)) },
      }));
      logEdits(id, "Workflow", `Accepted Historian's proposal: ${p.title}`, [{ what: `Added a branch under “${target.title}”`, before: "", after: `If ${conditionText(p.cond)}: ${p.result}` }]);
      get().toast({ title: "Proposal accepted", body: `Added under “${target.title}” and logged as version ${get().payerConfig[id]?.workflow.version}.`, tone: "good" });
    },

    dismissProposal: (id, proposalId) => {
      patchConfig(id, (c) => ({ ...c, proposals: c.proposals.filter((x) => x.id !== proposalId), dismissed: [...c.dismissed, ...c.proposals.filter((x) => x.id === proposalId).map((x) => x.title)] }));
      get().toast({ title: "Proposal dismissed", body: "The workflow did not change.", tone: "neutral" });
    },

    acknowledgeChange: (id) => {
      const clock = get().clock;
      patchConfig(id, (c) => (c.pending ? { ...c, pending: { ...c.pending, acknowledged: { by: USER_NAME, at: clock } } } : c));
      get().toast({ title: "Change acknowledged", body: `Recorded for ${USER_NAME}, ${stamp(clock)}. Drafts are not changed until you update them.`, tone: "good" });
    },

    updateDrafts: (id) => {
      const cfg = get().payerConfig[id];
      const pending = cfg?.pending;
      if (!cfg || !pending?.acknowledged) return;
      const clock = get().clock;
      const name = shortOf(id);
      redraft(pending.affects, `${name}'s change (${lowerFirst(pending.title)})`, pending.agents[0]);
      patchConfig(id, (c) => ({
        ...c,
        pending: null,
        checkedOn: shortDate(clock),
        docs: pending.docAdds.reduce((d, a) => ({ ...d, [a.program]: d[a.program].some((x) => x.title === a.item.title) ? d[a.program] : [...d[a.program], a.item] }), c.docs),
        changes: [{ id: uid("ch"), date: shortDate(clock), title: `${pending.title}: acknowledged and applied`, text: `Acknowledged by ${pending.acknowledged?.by}, ${stamp(pending.acknowledged?.at ?? clock)}. ${pending.agents.map((a) => AGENTS[a].name).join(" and ")} updated ${pending.affects.length} ${pending.affects.length === 1 ? "draft" : "drafts"}, and each returned to Case Manager for a new signature.` }, ...c.changes],
      }));
      if (pending.docAdds.length) logEdits(id, "Documents", `After ${lowerFirst(pending.title)}`, pending.docAdds.map((a) => ({ what: `Added to the ${PROGRAM_LABEL[a.program]} list`, before: "", after: `${a.item.title}. ${a.item.requirement}` })));
      get().notify({ agent: pending.agents[0], title: "Drafts updated", body: `${pending.affects.length} ${pending.affects.length === 1 ? "draft was" : "drafts were"} redrafted after ${name}'s change. Each needs a new signature in Case Manager.`, to: paths.manager(), tone: "mid" });
      get().toast({ title: `${pending.affects.length} ${pending.affects.length === 1 ? "draft" : "drafts"} updated`, body: `${name} is up to date. Each draft returned to Case Manager for a new signature.`, tone: "good" });
    },

    updateOpenDrafts: (id) => {
      const ids = get().requests.filter((r) => r.payerId === id && r.stage === "preparing").map((r) => r.id);
      const name = shortOf(id);
      redraft(ids, `your edits to ${name}'s workflow, rules and documents`, "scribe");
      patchConfig(id, (c) => ({ ...c, unapplied: 0 }));
      if (ids.length) get().notify({ agent: "scribe", title: "Drafts updated", body: `${ids.length} ${ids.length === 1 ? "draft was" : "drafts were"} redrafted after your edits to ${name}. Each needs a new signature.`, to: paths.manager(), tone: "mid" });
      get().toast({ title: ids.length ? `${ids.length} ${ids.length === 1 ? "draft" : "drafts"} updated` : "No open drafts to update", body: ids.length ? "Each returned to Case Manager for a new signature." : `New drafts for ${name} already use your edits.`, tone: ids.length ? "good" : "neutral" });
    },
  };
};

/** Sidebar badge: payers with a change waiting for a person. */
export const selectPayersBadge = (s: AppState): number => Object.values(s.payerConfig).filter((c) => c.pending).length;

/** The document list for one payer and program. Reader reads this on the intake screen, so the warning there and the checker here always match. */
export const selectPayerDocs = (s: AppState, payerId: string, program: Program): DocItem[] => s.payerConfig[payerId]?.docs[program] ?? [];

