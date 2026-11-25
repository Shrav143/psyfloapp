import type { StateCreator, StoreApi } from "zustand";
import { AGENTS } from "@/data/agents";
import { conditionText, customToSummary, LEGACY_RULE_GROUP, openDrafts, payerWithName, reachedByOf, RULE_TITLE, type AddPayerFields, type CustomPayer, type DocItem, type EditArea, type EditLogEntry, type LogChange, type OpenDraft, type PayerConfig, type Rule, type RuleId } from "@/data/payerConfig";
import { proposalsFor, seedPayerConfig, starterConfig } from "@/data/payerConfigSeed";
import { PAYERS, syncCustomPayers } from "@/data/seed";
import { siteOf } from "@/data/sites";
import { migratedId } from "@/data/workflow/migrate";
import { proposalToBranch } from "@/data/payerConfigProposal";
import { PROGRAM_LABEL, type AgentKey, type Program } from "@/data/types";
import { viewerById } from "@/data/viewers";
import { uid } from "@/lib/format";
import { sitesInView } from "@/lib/scope";
import { shortDate, stamp } from "@/lib/time";
import { paths, type PayerTabId } from "@/routes";
import type { RuleGroup } from "@/data/workflow/types";
import { createEmrSlice, type EmrSlice } from "./emr";
import type { AppState } from "./index";

/* Payers workflow, rules, documents, changes (owner: denials agent). One PayerConfig per payer id, plus the edit log.
   Saving an edit applies to new drafts at once; open drafts follow when the user clicks Update drafts. Requests already sent keep what they were sent with.
   Which drafts are open is read live from the Dashboard requests and New Case drafts (openDrafts), never from a stored list. */

export type PayerDetailsPatch = Partial<Pick<PayerConfig, "planLine" | "reachedBy" | "reach">> & { noticeDue?: string; backup?: string };

export interface PayerConfigSlice extends EmrSlice {
  customPayers: CustomPayer[];
  payerConfig: Record<string, PayerConfig>;
  payerEdits: EditLogEntry[];
  addPayer: (input: AddPayerFields) => string;
  /** Write lines to a payer's edit audit (any area). The Workflow Studio and the rules library use it so every save shows in History & Changes. */
  logPayerEdit: (id: string, area: EditArea, reason: string, changes: LogChange[]) => void;
  editPayerDetails: (id: string, patch: PayerDetailsPatch, reason: string, changes: LogChange[]) => void;
  saveCaller: (id: string, text: string, reason: string) => void;
  saveRule: (id: string, rule: RuleId, lines: string[], reason: string) => void;
  saveDocs: (id: string, program: Program, items: DocItem[], reason: string, changes: LogChange[]) => void;
  /** Historian finished "Re-learn from decisions". Returns false when it found nothing new. */
  addProposal: (id: string) => boolean;
  acceptProposal: (id: string, proposalId: string) => void;
  dismissProposal: (id: string, proposalId: string) => void;
  /** Gate 1: a person saw the change. Records who and when. */
  acknowledgeChange: (id: string) => void;
  /** Gate 2: redraft the payer's open drafts and close the change. Needs the change to be acknowledged first. Records payerChangeUpdates for the drafts it redrafted. */
  updateDrafts: (id: string) => void;
  /** Redraft the payer's open drafts after workflow, rule or document edits (change id `edits-<payerId>`). */
  updateOpenDrafts: (id: string) => void;
}

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

export const createPayerConfigSlice: StateCreator<AppState, [], [], PayerConfigSlice> = (set, get, api) => {
  const patchConfig = (id: string, fn: (c: PayerConfig) => PayerConfig) => set((s) => (s.payerConfig[id] ? { payerConfig: { ...s.payerConfig, [id]: fn(s.payerConfig[id]) } } : {}));
  const shortOf = (id: string): string => PAYERS.find((p) => p.id === id)?.shortName ?? get().customPayers.find((p) => p.id === id)?.shortName ?? "The payer";
  /** The person signed in right now, read when an edit is saved, so the edit log and "Acknowledged by" name whoever is viewing. */
  const who = (): string => viewerById(get().viewerId).name;
  /** The payer's unsent drafts at the sites in view. An update redrafts exactly these, so a viewer never changes, or counts, a draft at a site they are not looking at. */
  const openNow = (id: string): OpenDraft[] => {
    const view = sitesInView(get());
    return openDrafts(get().requests, get().caseDrafts, id, (caseId) => view.includes(siteOf(caseId)));
  };
  /** A bell notification for a saved edit, linking to the tab it was made on. */
  const told = (id: string, tab: PayerTabId, group: RuleGroup | undefined, title: string, body: string) =>
    get().notify({ agent: "system", title: `${shortOf(id)} ${title}`, body, to: paths.payers(id, tab, group), tone: "neutral" });
  const logEdits = (id: string, area: EditArea, reason: string, changes: LogChange[], user = who()) =>
    set((s) => ({ payerEdits: [...changes.map((c) => ({ id: uid("pe"), payerId: id, at: s.clock, user, area, what: c.what, before: c.before, after: c.after, reason })), ...s.payerEdits] }));
  /** An edit was saved: new drafts use it now, and open drafts wait for Update drafts. */
  const edited = (id: string, extra?: (c: PayerConfig) => Partial<PayerConfig>) => patchConfig(id, (c) => ({ ...c, unapplied: c.unapplied + 1, ...extra?.(c) }));

  /** Put each open draft back in front of a person and record it for Case Manager and New Case. Only unsent drafts come here: a request the payer already has is never rewritten. */
  const redraft = (drafts: OpenDraft[], why: string, agent: AgentKey, changeId: string, payerId: string) => {
    const { updateRequest, addEvent } = get();
    const name = AGENTS[agent].name;
    for (const d of drafts) {
      if (!d.onDashboard) continue;
      updateRequest(d.id, { needsYou: true, agent, next: `Redrafted after ${why}. Waiting for a new signature` });
      addEvent(d.id, { actor: agent, text: `${name} redrafted the case after ${why}`, detail: "It returns to Case Manager for a new signature." });
    }
    if (drafts.length) get().recordPayerChangeUpdate({ changeId, payerId, draftIds: drafts.map((d) => d.id) });
  };

  return {
    ...createEmrSlice(set, get, api),
    customPayers: [],
    payerConfig: seedPayerConfig(),
    payerEdits: [],

    addPayer: (input) => {
      const name = input.name.trim().replace(/\s+/g, " ");
      // The form blocks a name that is already in use. This keeps a second call from replacing that payer's saved configuration.
      const same = payerWithName(name, get().customPayers);
      if (same) return same.id;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "payer";
      let id = `custom-${slug}`;
      for (let n = 2; get().payerConfig[id]; n += 1) id = `custom-${slug}-${n}`;
      const first = name.split(" ")[0];
      const clash = PAYERS.some((p) => p.shortName.toLowerCase() === first.toLowerCase()) || get().customPayers.some((p) => p.shortName.toLowerCase() === first.toLowerCase());
      const profile = { ...(input.org?.trim() ? { org: input.org.trim() } : {}), ...(input.state?.trim() ? { state: input.state.trim() } : {}), ...(input.product?.trim() ? { product: input.product.trim() } : {}) };
      const payer: CustomPayer = { id, name, shortName: clash ? name : first, type: input.type, group: input.group, reachedBy: reachedByOf(input.reach), programs: input.programs, ...profile };
      const on = shortDate(get().clock);
      set((s) => ({ customPayers: [...s.customPayers, payer], payerConfig: { ...s.payerConfig, [id]: starterConfig(payer, input.reach, on) } }));
      const where = [payer.org, payer.product, payer.state].filter(Boolean).join(", ");
      logEdits(id, "Payer details", "Payer added", [{ what: "Added a payer", before: "", after: `${name}, ${input.type}, reached by ${payer.reachedBy}${where ? `. ${where}` : ""}` }]);
      get().toast({ title: `${name} was added`, body: "Starter workflow, rules and documents are ready. Figures are benchmark estimates.", tone: "good" });
      return id;
    },

    logPayerEdit: (id, area, reason, changes) => logEdits(id, area, reason, changes),

    editPayerDetails: (id, patch, reason, changes) => {
      const { noticeDue, backup, ...top } = patch;
      patchConfig(id, (c) => ({ ...c, ...top, facts: { ...c.facts, ...(noticeDue !== undefined ? { noticeDue } : {}), ...(backup !== undefined ? { backup } : {}) } }));
      // A payer added with "Add a payer" is also read from customPayers by pickers elsewhere, so keep its route in step.
      const reachedBy = top.reachedBy;
      if (reachedBy) set((s) => ({ customPayers: s.customPayers.map((p) => (p.id === id ? { ...p, reachedBy } : p)) }));
      logEdits(id, "Payer details", reason, changes);
      told(id, "history", undefined, "details edited", `${who()} changed ${changes.map((c) => c.what.toLowerCase()).join(", ")}. The edit is in the log with the reason.`);
      get().toast({ title: "Payer details saved", body: "The edit is in the log with your reason.", tone: "good" });
    },

    saveCaller: (id, text, reason) => {
      const old = get().payerConfig[id]?.caller.text ?? "";
      patchConfig(id, (c) => ({ ...c, caller: { text, confirmed: shortDate(get().clock) } }));
      logEdits(id, "Caller instructions", reason, [{ what: "Instructions for Caller", before: old, after: text }]);
      told(id, "rules", "agent_instructions", "caller instructions edited", `${who()} saved a new script. Caller follows it on its next call.`);
      get().toast({ title: "Instructions for Caller saved", body: "Caller follows them on its next call. The edit is logged.", tone: "good" });
    },

    saveRule: (id, rule, lines, reason) => {
      const old = get().payerConfig[id]?.rules.find((r) => r.id === rule)?.lines ?? [];
      const on = shortDate(get().clock);
      edited(id, (c) => ({ rules: c.rules.map((r) => (r.id === rule ? { ...r, lines, confirmed: on, source: `Edited in Psyflo by ${who()}` } : r)) }));
      logEdits(id, "Rules", reason, [{ what: RULE_TITLE[rule], before: old.join("; "), after: lines.join("; ") }]);
      told(id, "rules", LEGACY_RULE_GROUP[rule], "rule edited", `${who()} changed “${RULE_TITLE[rule]}”. New drafts use it at once. Click Update drafts to redraft open ones.`);
      get().toast({ title: `${RULE_TITLE[rule]} saved`, body: "New drafts use it at once. Click Update drafts to redraft open ones.", tone: "good" });
    },

    saveDocs: (id, program, items, reason, changes) => {
      edited(id, (c) => ({ docs: { ...c.docs, [program]: items } }));
      logEdits(id, "Documents", reason, changes);
      told(id, "rules", "clinical_documentation", "document list edited", `${who()} changed the ${PROGRAM_LABEL[program]} list. New drafts use it at once. Click Update drafts to redraft open ones.`);
      get().toast({ title: `${PROGRAM_LABEL[program]} list saved`, body: "New drafts use it at once. Click Update drafts to redraft open ones.", tone: "good" });
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
      const v = get().payerConfig[id]?.workflow.version;
      /* The same branch goes into a DRAFT of the migrated workflow, so the Workflow Builder has it too. The published workflow does not change until a person publishes the draft. */
      const migrated = get().workflowDrafts[migratedId(id)] ?? get().workflows.find((w) => w.id === migratedId(id));
      const graph = migrated && migrated.status !== "archived" ? proposalToBranch(migrated, p, p.id) : null;
      const drafted = !!graph && get().saveWorkflowDraft(migratedId(id), graph, `Accepted Historian's proposal: ${p.title}`);
      told(id, "history", undefined, "workflow edited", `${who()} accepted Historian's proposal and saved version ${v} of the earlier process view${drafted ? " and a draft of the migrated workflow" : ""}. New drafts use it at once. Click Update drafts to redraft open ones.`);
      get().toast({ title: "Proposal accepted", body: `Added under “${target.title}” to the earlier process view (version ${v})${drafted ? " and to a draft of the migrated workflow. Publish the draft in the Workflow Builder to use it" : ""}.`, tone: "good" });
    },

    dismissProposal: (id, proposalId) => {
      patchConfig(id, (c) => ({ ...c, proposals: c.proposals.filter((x) => x.id !== proposalId), dismissed: [...c.dismissed, ...c.proposals.filter((x) => x.id === proposalId).map((x) => x.title)] }));
      get().toast({ title: "Proposal dismissed", body: "The workflow did not change.", tone: "neutral" });
    },

    acknowledgeChange: (id) => {
      const clock = get().clock;
      patchConfig(id, (c) => (c.pending ? { ...c, pending: { ...c.pending, acknowledged: { by: who(), at: clock } } } : c));
      get().toast({ title: "Change acknowledged", body: `Recorded for ${who()}, ${stamp(clock)}. Drafts are not changed until you update them.`, tone: "good" });
    },

    updateDrafts: (id) => {
      const cfg = get().payerConfig[id];
      const pending = cfg?.pending;
      if (!cfg || !pending?.acknowledged) return;
      const clock = get().clock;
      const name = shortOf(id);
      const drafts = openNow(id);
      const n = drafts.length;
      redraft(drafts, `${name}'s change (${lowerFirst(pending.title)})`, pending.agents[0], pending.id, id);
      const who = `Acknowledged by ${pending.acknowledged.by}, ${stamp(pending.acknowledged.at)}.`;
      patchConfig(id, (c) => ({
        ...c,
        pending: null,
        docs: pending.docAdds.reduce((d, a) => ({ ...d, [a.program]: d[a.program].some((x) => x.title === a.item.title) ? d[a.program] : [...d[a.program], a.item] }), c.docs),
        changes: [{ id: uid("ch"), date: shortDate(clock), title: `${pending.title}: acknowledged and applied`, text: n ? `${who} ${pending.agents.map((a) => AGENTS[a].name).join(" and ")} updated ${n} ${n === 1 ? "draft" : "drafts"}, and ${n === 1 ? "it" : "each"} returned to Case Manager for a new signature.` : `${who} No open drafts needed an update. New drafts use the change.` }, ...c.changes],
      }));
      if (pending.docAdds.length) logEdits(id, "Documents", `After ${lowerFirst(pending.title)}`, pending.docAdds.map((a) => ({ what: `Added to the ${PROGRAM_LABEL[a.program]} list`, before: "", after: `${a.item.title}. ${a.item.requirement}` })));
      if (n) get().notify({ agent: pending.agents[0], title: "Drafts updated", body: `${n} ${n === 1 ? "draft was" : "drafts were"} redrafted after ${name}'s change. Each needs a new signature in Case Manager.`, to: paths.manager(), tone: "mid" });
      get().toast(n ? { title: `${n} ${n === 1 ? "draft" : "drafts"} updated`, body: `The change is applied for ${name}. Each draft returned to Case Manager for a new signature.`, tone: "good" } : { title: "No open drafts to update", body: `The change is applied for ${name}. New drafts use it from now on.`, tone: "neutral" });
    },

    updateOpenDrafts: (id) => {
      const drafts = openNow(id);
      const n = drafts.length;
      const name = shortOf(id);
      redraft(drafts, `your edits to ${name}'s workflow, rules and documents`, "scribe", `edits-${id}`, id);
      patchConfig(id, (c) => ({ ...c, unapplied: 0 }));
      if (n) get().notify({ agent: "scribe", title: "Drafts updated", body: `${n} ${n === 1 ? "draft was" : "drafts were"} redrafted after your edits to ${name}. Each needs a new signature.`, to: paths.manager(), tone: "mid" });
      get().toast({ title: n ? `${n} ${n === 1 ? "draft" : "drafts"} updated` : "No open drafts to update", body: n ? "Each returned to Case Manager for a new signature." : `New drafts for ${name} already use your edits.`, tone: n ? "good" : "neutral" });
    },
  };
};

/* ------------------------------------------------------------------ persistence
   The payers added, each payer's saved configuration (rules, documents, details) and the edit log are kept in this browser, next to the workflows (store/workflows.ts),
   so a reload shows the same payer pages the workflows were saved with. Storage is guarded: a blocked store (a private window, a preview) just means changes last until the tab closes.
   Reset demo data puts the seeds back, and the next write replaces what was saved. */
export const PAYERS_STORAGE_KEY = "psyflo.prior-auth-demo.payers.v1";
interface PersistedPayers { v: 1; customPayers: CustomPayer[]; payerConfig: Record<string, PayerConfig>; payerEdits: EditLogEntry[] }

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

function loadPayers(): PersistedPayers | null {
  const st = storage();
  if (!st) return null;
  try {
    const parsed = JSON.parse(st.getItem(PAYERS_STORAGE_KEY) ?? "null") as PersistedPayers | null;
    return parsed && parsed.v === 1 && Array.isArray(parsed.customPayers) && Array.isArray(parsed.payerEdits) && parsed.payerConfig && typeof parsed.payerConfig === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Puts back what was saved (the six payers' saved copy wins over their seed, a payer added joins every picker again) and writes every later change. Called once from store/index.ts. Returns the unsubscribe. */
export function initPayerConfigPersistence(store: StoreApi<AppState>): () => void {
  const saved = loadPayers();
  if (saved) {
    const seeds = seedPayerConfig();
    // What a payer's saved page holds (rules, documents, details) comes back. The change waiting, the changes already applied and the edits not yet applied to drafts start over,
    // because the requests and drafts they act on live in memory and start over too.
    const restored: Record<string, PayerConfig> = { ...seeds };
    for (const [id, cfg] of Object.entries(saved.payerConfig)) {
      const seed = seeds[id];
      restored[id] = seed ? { ...cfg, pending: seed.pending, changes: seed.changes, proposals: seed.proposals, dismissed: seed.dismissed, unapplied: 0 } : { ...cfg, unapplied: 0 };
    }
    store.setState({ customPayers: saved.customPayers, payerConfig: restored, payerEdits: saved.payerEdits });
    syncCustomPayers(saved.customPayers.map(customToSummary));
  }
  return store.subscribe((s, prev) => {
    if (s.customPayers === prev.customPayers && s.payerConfig === prev.payerConfig && s.payerEdits === prev.payerEdits) return;
    try {
      const out: PersistedPayers = { v: 1, customPayers: s.customPayers, payerConfig: s.payerConfig, payerEdits: s.payerEdits };
      storage()?.setItem(PAYERS_STORAGE_KEY, JSON.stringify(out));
    } catch {
      /* Storage is full or blocked: the changes stay in memory. */
    }
  });
}

/** Sidebar badge: payers with a change waiting for a person. */
export const selectPayersBadge = (s: AppState): number => Object.values(s.payerConfig).filter((c) => c.pending).length;

/** The document list for one payer and program, as saved on Payers › Documents. New Case reads it for its document checks. */
export const selectPayerDocs = (s: AppState, payerId: string, program: Program): DocItem[] => s.payerConfig[payerId]?.docs[program] ?? [];


/* More of what other modules read from a payer's saved configuration (selectPayerDocs is above). Edits on Payers apply to new drafts at once. */

/** The payer's rules as saved on Payers › Rules (submission windows, backdating, no authorization needed, peer-to-peer and appeals). */
export const selectPayerRules = (s: AppState, payerId: string): Rule[] => s.payerConfig[payerId]?.rules ?? [];
/** Payers added with "Add a payer", so pickers elsewhere can offer them. */
export const selectCustomPayers = (s: AppState): CustomPayer[] => s.customPayers;
