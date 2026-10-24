import type { StateCreator, StoreApi } from "zustand";
import type { LogChange } from "@/data/payerConfig";
import { payerProfileOf } from "@/data/payerProfile";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { viewerById } from "@/data/viewers";
import { integrationStatus } from "@/data/workflow/catalog";
import { impactOfRuleChange, ruleInState } from "@/data/workflow/impact";
import { matchWorkflow } from "@/data/workflow/match";
import { changedScopeFields, derivedKeyOf, isDerivedRuleId, payerRulesFrom, routeDerivedSave, SEED_RULE_META, SEED_LIBRARY_RULES, type RuleOverlayLike } from "@/data/workflow/rules";
import { SEED_WORKFLOWS, SEED_WORKFLOW_VERSIONS, snapshotOf } from "@/data/workflow/seeds";
import { blankWorkflow, templateById, workflowFromTemplate } from "@/data/workflow/templates";
import type { CaseFacts, MatchResult, PayerRule, RuleChange, RuleSource, ValidationIssue, Workflow, WorkflowMeta, WorkflowVersion } from "@/data/workflow/types";
import { validateWorkflow } from "@/data/workflow/validate";
import { isoOf } from "@/data/patients";
import { paths } from "@/routes";
import type { AppState } from "./index";

/* The Payer Workflow Studio's store slice (owner: ENGINE): workflows, their versions and the payer rules library.

   A workflow has one LIVE record (published, archived, or a draft that has never been published) in `workflows`. Editing a published workflow does not touch it: the edits go to a draft of
   the next version in `workflowDrafts`, and the published record keeps matching new cases until the draft is published. `workflowVersions` holds a snapshot per saved, published and
   archived version, so a case keeps the version it started with.

   Rules: the saved Payers rules, documents, instructions for Caller and reach lines are READ THROUGH (selectPayerRules) and saved back through the existing Payers actions; the library's own
   rules live in `payerRulesExtra`. `ruleMeta` keeps what the library adds to a rule that is read through (verification, source, version, values the saved rules cannot hold) and `ruleHistory`
   keeps who changed what and why.

   Persistence: the slice is written to localStorage in try/catch under a versioned key and read back when the app starts (see initWorkflowPersistence). Reset demo data restores the seeds. */

export type NewWorkflowMeta = Partial<WorkflowMeta> & Pick<WorkflowMeta, "payerId" | "name">;
export type WorkflowPatch = Partial<Pick<Workflow, "name" | "description" | "state" | "product" | "services" | "providerType" | "requestType" | "effectiveFrom" | "effectiveTo" | "owner" | "nodes" | "edges">>;
export interface PublishResult { ok: boolean; issues: ValidationIssue[]; version?: number }
export type RuleOverlay = RuleOverlayLike;

export interface WorkflowsSlice {
  /** The live record of each workflow: published, archived, or a draft that has never been published. */
  workflows: Workflow[];
  /** A draft of the next version of a published workflow, by workflow id. The published one keeps matching until the draft is published. */
  workflowDrafts: Record<string, Workflow>;
  /** A snapshot per saved draft, published and archived version, so a case can keep the version it started with. */
  workflowVersions: WorkflowVersion[];
  /** Rules the library owns: review cadence, units and duration, clinical criteria, payer-wide agent instructions, and any a person adds. */
  payerRulesExtra: PayerRule[];
  /** Who changed what and why, by rule id. */
  ruleHistory: Record<string, RuleChange[]>;
  /** What the library keeps on top of a rule that is read through: verification, source, version, other values. */
  ruleMeta: Record<string, RuleOverlay>;
  /** Seeded workflows and rules a person deleted, so they are not brought back when the page loads. Reset demo data brings them all back. */
  removedSeeds: string[];

  /** Makes a draft, from a template or blank, and returns its id. The payer, state, product, services, request type and dates are filled in where `meta` leaves them out. */
  createWorkflow: (meta: NewWorkflowMeta, templateId?: string) => string;
  /** A draft copy that keeps a link to the original. Returns the new id. */
  duplicateWorkflow: (id: string) => string | undefined;
  /** Saves edits. A draft is edited in place; a published or archived workflow gets a draft of its next version and stays as it is until that draft is published. */
  saveWorkflowDraft: (id: string, patch: WorkflowPatch, reason: string) => boolean;
  /** Validates, snapshots the version and makes it the published one. Errors block it and come back in `issues`. */
  publishWorkflow: (id: string, reason: string) => PublishResult;
  /** Retires a workflow. It stops matching new cases; cases that follow it keep their version. */
  archiveWorkflow: (id: string, reason?: string) => void;
  /** Makes a new draft from a saved version. Returns the workflow id. */
  restoreWorkflowVersion: (id: string, version: number) => string | undefined;
  /** Discards the draft of a next version, or deletes a workflow that was never published. A published workflow cannot be deleted. */
  deleteDraft: (id: string) => boolean;
  /** Saves a rule from the library. `saveRule` is taken by the older Payers action (the lines of one of the four saved rules), so this one has its own name. A rule read through from Payers
      is saved back through that action; a library rule is saved here. A rule that is new is always unverified. */
  savePayerRule: (rule: PayerRule, reason: string) => void;
  /** A person checked the rule against a source on `date` (ISO). */
  markRuleVerified: (id: string, source: RuleSource, date: string) => void;
  /** Removes a library rule. A rule that is read through from Payers cannot be deleted; archive it instead (save it as superseded). */
  deleteRule: (id: string, reason: string) => boolean;
}

/* ------------------------------------------------------------------ persistence */
export const WORKFLOW_STORAGE_KEY = "psyflo.prior-auth-demo.workflows.v1";

export interface PersistedWorkflows {
  v: 1;
  workflows: Workflow[];
  workflowDrafts: Record<string, Workflow>;
  workflowVersions: WorkflowVersion[];
  payerRulesExtra: PayerRule[];
  ruleHistory: Record<string, RuleChange[]>;
  ruleMeta: Record<string, RuleOverlay>;
  removedSeeds: string[];
}
const KEYS = ["workflows", "workflowDrafts", "workflowVersions", "payerRulesExtra", "ruleHistory", "ruleMeta", "removedSeeds"] as const;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The seeded state: each payer's earlier process as a graph, the five sample workflows, and the library's own demo rules. */
export function seedWorkflowState(): PersistedWorkflows {
  return { v: 1, workflows: clone(SEED_WORKFLOWS), workflowDrafts: {}, workflowVersions: clone(SEED_WORKFLOW_VERSIONS), payerRulesExtra: clone(SEED_LIBRARY_RULES), ruleHistory: {}, ruleMeta: clone(SEED_RULE_META()), removedSeeds: [] };
}

const versionKey = (v: Pick<WorkflowVersion, "workflowId" | "version" | "status">): string => `${v.workflowId}@${v.version}@${v.status}`;

/** What was saved, plus every seed it does not have. A seed is never lost and never doubled: the saved copy of a seed wins, a seed a person deleted stays deleted, and a seed added since the save appears. */
export function mergeWithSeeds(stored: Partial<PersistedWorkflows> | null | undefined): PersistedWorkflows {
  const seed = seedWorkflowState();
  if (!stored || typeof stored !== "object") return seed;
  const removed = Array.isArray(stored.removedSeeds) ? stored.removedSeeds : [];
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const savedWf = new Map<string, Workflow>();
  for (const w of arr<Workflow>(stored.workflows)) if (w && typeof w.id === "string" && !savedWf.has(w.id)) savedWf.set(w.id, w);
  const seedIds = new Set(seed.workflows.map((w) => w.id));
  const workflows = [
    ...seed.workflows.filter((w) => !removed.includes(w.id)).map((w) => savedWf.get(w.id) ?? w),
    ...[...savedWf.values()].filter((w) => !seedIds.has(w.id)),
  ];
  const have = new Set(workflows.map((w) => w.id));
  const drafts: Record<string, Workflow> = {};
  for (const [id, w] of Object.entries(stored.workflowDrafts ?? {})) if (have.has(id) && w && typeof w === "object") drafts[id] = w;

  const versions: WorkflowVersion[] = [];
  const seen = new Set<string>();
  for (const v of [...arr<WorkflowVersion>(stored.workflowVersions), ...seed.workflowVersions]) {
    if (!v || typeof v.workflowId !== "string") continue;
    if (removed.includes(v.workflowId)) continue;
    const k = versionKey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    versions.push(v);
  }

  const savedRules = new Map<string, PayerRule>();
  for (const r of arr<PayerRule>(stored.payerRulesExtra)) if (r && typeof r.id === "string" && !savedRules.has(r.id)) savedRules.set(r.id, r);
  const seedRuleIds = new Set(seed.payerRulesExtra.map((r) => r.id));
  const rules = [
    ...seed.payerRulesExtra.filter((r) => !removed.includes(r.id)).map((r) => savedRules.get(r.id) ?? r),
    ...[...savedRules.values()].filter((r) => !seedRuleIds.has(r.id)),
  ];

  return {
    v: 1,
    workflows,
    workflowDrafts: drafts,
    workflowVersions: versions,
    payerRulesExtra: rules,
    ruleHistory: { ...(stored.ruleHistory ?? {}) },
    ruleMeta: { ...seed.ruleMeta, ...(stored.ruleMeta ?? {}) },
    removedSeeds: removed.filter((x) => typeof x === "string"),
  };
}

let storageOk: boolean | null = null;
const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
function probe(): boolean {
  const st = storage();
  if (!st) return false;
  try {
    st.setItem(`${WORKFLOW_STORAGE_KEY}.probe`, "1");
    st.removeItem(`${WORKFLOW_STORAGE_KEY}.probe`);
    return true;
  } catch {
    return false;
  }
}

/** "saved in this browser" when the workflows are written to browser storage, "memory only" when storage is blocked (a private window, a preview, cleared site data): then changes last until the tab closes. */
export function workflowStorageStatus(): "saved in this browser" | "memory only" {
  if (storageOk === null) storageOk = probe();
  return storageOk ? "saved in this browser" : "memory only";
}

export function loadWorkflowState(): Partial<PersistedWorkflows> | null {
  const st = storage();
  if (!st) return null;
  try {
    const raw = st.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkflows;
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWorkflowState(s: Pick<AppState, (typeof KEYS)[number]>): boolean {
  const st = storage();
  if (!st) {
    storageOk = false;
    return false;
  }
  try {
    const out: PersistedWorkflows = { v: 1, workflows: s.workflows, workflowDrafts: s.workflowDrafts, workflowVersions: s.workflowVersions, payerRulesExtra: s.payerRulesExtra, ruleHistory: s.ruleHistory, ruleMeta: s.ruleMeta, removedSeeds: s.removedSeeds };
    st.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(out));
    storageOk = true;
    return true;
  } catch {
    storageOk = false;
    return false;
  }
}

/** Reads what was saved, merges it with the seeds and puts it in the store, then writes every later change back. Called once from store/index.ts. Returns the unsubscribe. */
export function initWorkflowPersistence(store: StoreApi<AppState>): () => void {
  const saved = loadWorkflowState();
  if (saved) {
    const m = mergeWithSeeds(saved);
    store.setState({ workflows: m.workflows, workflowDrafts: m.workflowDrafts, workflowVersions: m.workflowVersions, payerRulesExtra: m.payerRulesExtra, ruleHistory: m.ruleHistory, ruleMeta: m.ruleMeta, removedSeeds: m.removedSeeds });
  }
  return store.subscribe((s, prev) => {
    if (KEYS.some((k) => s[k] !== prev[k])) saveWorkflowState(s);
  });
}

/* ------------------------------------------------------------------ small helpers */
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "workflow";
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** What changed between two versions of a workflow, in words, for the edit log. */
export function describeChange(prev: Workflow | undefined, next: Workflow): LogChange {
  const name = `${next.name}, version ${next.version}`;
  if (!prev) return { what: `Created ${name}`, before: "", after: `${plural(next.nodes.length, "step")} and ${plural(next.edges.length, "connection")}` };
  const was = new Map(prev.nodes.map((n) => [n.id, n]));
  const is = new Map(next.nodes.map((n) => [n.id, n]));
  const added = next.nodes.filter((n) => !was.has(n.id)).map((n) => n.title);
  const removed = prev.nodes.filter((n) => !is.has(n.id)).map((n) => n.title);
  const edited = next.nodes.filter((n) => was.has(n.id) && JSON.stringify({ ...was.get(n.id)!, x: 0, y: 0 }) !== JSON.stringify({ ...n, x: 0, y: 0 })).map((n) => n.title);
  const moved = next.nodes.filter((n) => was.has(n.id) && (was.get(n.id)!.x !== n.x || was.get(n.id)!.y !== n.y)).length;
  const meta = (["name", "state", "product", "requestType", "effectiveFrom", "effectiveTo", "owner"] as const).filter((k) => prev[k] !== next[k]).map((k) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  if (JSON.stringify(prev.services) !== JSON.stringify(next.services)) meta.push("services");
  const bits = [
    added.length ? `added ${added.slice(0, 3).join(", ")}${added.length > 3 ? ` and ${added.length - 3} more` : ""}` : "",
    removed.length ? `removed ${removed.slice(0, 3).join(", ")}${removed.length > 3 ? ` and ${removed.length - 3} more` : ""}` : "",
    edited.length ? `changed ${edited.slice(0, 3).join(", ")}${edited.length > 3 ? ` and ${edited.length - 3} more` : ""}` : "",
    prev.edges.length !== next.edges.length ? `${plural(Math.abs(next.edges.length - prev.edges.length), "connection")} ${next.edges.length > prev.edges.length ? "added" : "removed"}` : "",
    meta.length ? `details: ${meta.join(", ")}` : "",
    !added.length && !removed.length && !edited.length && moved ? "moved steps" : "",
  ].filter(Boolean);
  return { what: `Saved the draft of ${name}`, before: `${plural(prev.nodes.length, "step")}, ${plural(prev.edges.length, "connection")}`, after: `${plural(next.nodes.length, "step")}, ${plural(next.edges.length, "connection")}${bits.length ? `. ${bits.join("; ")}` : ""}` };
}

/* ------------------------------------------------------------------ the slice */
export const createWorkflowsSlice: StateCreator<AppState, [], [], WorkflowsSlice> = (set, get) => {
  const seeds = seedWorkflowState();
  const who = (): string => viewerById(get().viewerId).name;
  const shortOf = (id: string): string => PAYERS.find((p) => p.id === id)?.shortName ?? get().customPayers.find((p) => p.id === id)?.shortName ?? "The payer";
  const log = (payerId: string, area: "Workflow" | "Rules", reason: string, changes: LogChange[]) => get().logPayerEdit(payerId, area, reason, changes);
  const rulesOf = (payerId: string): PayerRule[] => selectPayerRules(get(), payerId);
  const live = (id: string): Workflow | undefined => get().workflows.find((w) => w.id === id);
  const working = (id: string): Workflow | undefined => get().workflowDrafts[id] ?? live(id);
  const nextVersion = (id: string): number => Math.max(live(id)?.version ?? 0, get().workflowDrafts[id]?.version ?? 0, ...get().workflowVersions.filter((v) => v.workflowId === id).map((v) => v.version)) + 1;
  const uniqueId = (base: string): string => {
    const taken = new Set([...get().workflows.map((w) => w.id), ...Object.keys(get().workflowDrafts)]);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
  };
  const putWorkflow = (w: Workflow) => set((s) => ({ workflows: s.workflows.some((x) => x.id === w.id) ? s.workflows.map((x) => (x.id === w.id ? w : x)) : [...s.workflows, w] }));
  /** One draft snapshot per version: a newer save replaces the earlier one. */
  const putDraftSnapshot = (w: Workflow, reason: string) =>
    set((s) => ({ workflowVersions: [...s.workflowVersions.filter((v) => !(v.workflowId === w.id && v.version === w.version && v.status === "draft")), snapshotOf(w, reason, s.clock, who())] }));
  const addHistory = (id: string, what: string, reason?: string) => set((s) => ({ ruleHistory: { ...s.ruleHistory, [id]: [{ at: s.clock, by: who(), what, ...(reason ? { reason } : {}) }, ...(s.ruleHistory[id] ?? [])] } }));
  const patchMeta = (id: string, fn: (o: RuleOverlay) => RuleOverlay) => set((s) => ({ ruleMeta: { ...s.ruleMeta, [id]: fn(s.ruleMeta[id] ?? {}) } }));
  const notifyRuleChange = (ruleId: string, payerId: string) => {
    const impact = impactOfRuleChange(get(), ruleId);
    if (!impact.workflows.length && !impact.cases.length) return;
    get().notify({ agent: "system", title: `${shortOf(payerId)} rule changed: ${impact.ruleTitle}`, body: `${impact.summary} Review & apply changes before open cases follow it. Nothing changes on its own.`, to: paths.payers(payerId, "history"), tone: "mid" });
  };

  return {
    workflows: seeds.workflows,
    workflowDrafts: seeds.workflowDrafts,
    workflowVersions: seeds.workflowVersions,
    payerRulesExtra: seeds.payerRulesExtra,
    ruleHistory: seeds.ruleHistory,
    ruleMeta: seeds.ruleMeta,
    removedSeeds: seeds.removedSeeds,

    createWorkflow: (input, templateId) => {
      const s = get();
      const profile = payerProfileOf(input.payerId, s.customPayers);
      const tpl = templateId ? templateById(templateId) : undefined;
      const meta: WorkflowMeta = {
        id: uniqueId(input.id ?? `wf-${input.payerId}-${slug(input.name)}`),
        payerId: input.payerId,
        name: input.name.trim() || "Untitled workflow",
        description: input.description,
        state: input.state ?? profile.state,
        product: input.product ?? profile.product,
        services: input.services ?? [],
        providerType: input.providerType,
        requestType: input.requestType ?? tpl?.requestType ?? "any",
        effectiveFrom: input.effectiveFrom ?? isoOf(s.clock),
        effectiveTo: input.effectiveTo,
        owner: input.owner ?? who(),
      };
      const wf = tpl ? workflowFromTemplate(tpl.id, meta, rulesOf(input.payerId)) : blankWorkflow(meta);
      const made: Workflow = { ...wf, updatedAt: s.clock, updatedBy: who() };
      set((st) => ({ workflows: [...st.workflows, made] }));
      putDraftSnapshot(made, tpl ? `Started from the ${tpl.name} template` : "Started from scratch");
      log(made.payerId, "Workflow", tpl ? `Started from the ${tpl.name} template` : "Started from scratch", [describeChange(undefined, made)]);
      return made.id;
    },

    duplicateWorkflow: (id) => {
      const src = working(id);
      if (!src) return undefined;
      const s = get();
      const copy: Workflow = { ...clone(src), id: uniqueId(`${src.id.replace(/-copy(-\d+)?$/, "")}-copy`), name: `${src.name} (copy)`, version: 1, status: "draft", publishedVersion: undefined, migrated: undefined, startsFrom: src.id, effectiveFrom: isoOf(s.clock), effectiveTo: undefined, updatedAt: s.clock, updatedBy: who(), owner: who() };
      set((st) => ({ workflows: [...st.workflows, copy] }));
      putDraftSnapshot(copy, `Copied from ${src.name}`);
      log(copy.payerId, "Workflow", `Copied from ${src.name}`, [describeChange(undefined, copy)]);
      return copy.id;
    },

    saveWorkflowDraft: (id, patch, reason) => {
      const current = live(id);
      const draft = get().workflowDrafts[id];
      if (!current && !draft) return false;
      const base = draft ?? current!;
      const s = get();
      const editsInPlace = !draft && current!.status === "draft";
      const start: Workflow = editsInPlace || draft ? base : { ...clone(base), version: nextVersion(id), status: "draft", publishedVersion: current!.status === "published" ? current!.version : undefined, startsFrom: base.startsFrom };
      const next: Workflow = { ...start, ...clone(patch), id, status: "draft", updatedAt: s.clock, updatedBy: who() };
      if (editsInPlace) putWorkflow(next);
      else set((st) => ({ workflowDrafts: { ...st.workflowDrafts, [id]: next } }));
      putDraftSnapshot(next, reason || "Draft saved");
      log(next.payerId, "Workflow", reason || "Draft saved", [describeChange(base, next)]);
      return true;
    },

    publishWorkflow: (id, reason) => {
      const w = working(id);
      const s = get();
      if (!w) return { ok: false, issues: [{ severity: "error", text: "That workflow is not in the library." }] };
      if (w.status !== "draft") {
        const text = w.status === "archived" ? "This workflow is archived. Restore a version to make a draft first." : "There is nothing to publish: this version is already published. Edit it to make a draft of the next version.";
        return { ok: false, issues: [{ severity: "error", text }] };
      }
      const others = s.workflows.filter((x) => x.id !== id && x.payerId === w.payerId);
      const issues = validateWorkflow(w, rulesOf(w.payerId), integrationStatus(s), others);
      const errors = issues.filter((i) => i.severity === "error");
      if (errors.length) {
        get().toast({ title: `${w.name} cannot be published yet`, body: `${plural(errors.length, "problem")} to fix first. The first one: ${errors[0].text}`, tone: "risk" });
        return { ok: false, issues };
      }
      const published: Workflow = { ...w, status: "published", publishedVersion: undefined, updatedAt: s.clock, updatedBy: who() };
      const prevLive = live(id);
      set((st) => {
        const { [id]: _gone, ...rest } = st.workflowDrafts;
        return {
          workflows: st.workflows.some((x) => x.id === id) ? st.workflows.map((x) => (x.id === id ? published : x)) : [...st.workflows, published],
          workflowDrafts: rest,
          workflowVersions: [...st.workflowVersions.filter((v) => !(v.workflowId === id && v.version === published.version && v.status === "draft")), snapshotOf(published, reason || "Published", st.clock, who())],
        };
      });
      log(published.payerId, "Workflow", reason || "Published", [{ what: `Published ${published.name}, version ${published.version}`, before: prevLive?.status === "published" ? `Version ${prevLive.version} was in force` : "Not published", after: `Version ${published.version} is in force and matches new cases${issues.length ? `. ${plural(issues.length, "warning")}` : ""}` }]);
      get().toast({ title: `${published.name} is published`, body: `Version ${published.version} now matches new cases. Cases already open keep the version they started with.`, tone: "good" });
      return { ok: true, issues, version: published.version };
    },

    archiveWorkflow: (id, reason) => {
      const w = live(id);
      if (!w || w.status === "archived") return;
      const s = get();
      const archived: Workflow = { ...w, status: "archived", updatedAt: s.clock, updatedBy: who() };
      putWorkflow(archived);
      set((st) => ({ workflowVersions: [...st.workflowVersions, snapshotOf(archived, reason || "Archived", st.clock, who())] }));
      log(w.payerId, "Workflow", reason || "Archived", [{ what: `Archived ${w.name}, version ${w.version}`, before: w.status === "published" ? "Published" : "Draft", after: "Archived. It no longer matches new cases; open cases keep their version." }]);
      get().toast({ title: `${w.name} is archived`, body: "It no longer matches new cases. Cases that follow it keep their version.", tone: "neutral" });
    },

    restoreWorkflowVersion: (id, version) => {
      const snaps = get().workflowVersions.filter((v) => v.workflowId === id && v.version === version);
      const snap = snaps.find((v) => v.status === "published") ?? snaps[snaps.length - 1];
      if (!snap) return undefined;
      const s = get();
      const current = live(id);
      const v = nextVersion(id);
      const made: Workflow = {
        ...snap.meta,
        id,
        version: v,
        status: "draft",
        nodes: clone(snap.nodes),
        edges: clone(snap.edges),
        updatedAt: s.clock,
        updatedBy: who(),
        startsFrom: `${snap.meta.name}, version ${version}`,
        publishedVersion: current?.status === "published" ? current.version : undefined,
        migrated: current?.migrated,
      };
      if (!current) set((st) => ({ workflows: [...st.workflows, made] }));
      else set((st) => ({ workflowDrafts: { ...st.workflowDrafts, [id]: made } }));
      putDraftSnapshot(made, `Restored from version ${version}`);
      log(made.payerId, "Workflow", `Restored from version ${version}`, [{ what: `Restored ${made.name}, version ${version}, as a draft`, before: current ? `Version ${current.version} is ${current.status}` : "", after: `Draft version ${v}. Nothing changes for new cases until it is published.` }]);
      get().toast({ title: "Restored as a draft", body: `${made.name} version ${version} is now draft version ${v}. The published version has not changed.`, tone: "good" });
      return id;
    },

    deleteDraft: (id) => {
      const s = get();
      const draft = s.workflowDrafts[id];
      const current = live(id);
      if (draft) {
        set((st) => {
          const { [id]: _gone, ...rest } = st.workflowDrafts;
          return { workflowDrafts: rest, workflowVersions: st.workflowVersions.filter((v) => !(v.workflowId === id && v.version === draft.version && v.status === "draft")) };
        });
        log(draft.payerId, "Workflow", "Draft discarded", [{ what: `Discarded the draft of ${draft.name}, version ${draft.version}`, before: `Draft version ${draft.version}`, after: current ? `Version ${current.version} is unchanged` : "" }]);
        return true;
      }
      if (current && current.status === "draft") {
        set((st) => ({
          workflows: st.workflows.filter((x) => x.id !== id),
          workflowVersions: st.workflowVersions.filter((v) => v.workflowId !== id),
          removedSeeds: seeds.workflows.some((x) => x.id === id) && !st.removedSeeds.includes(id) ? [...st.removedSeeds, id] : st.removedSeeds,
        }));
        log(current.payerId, "Workflow", "Draft deleted", [{ what: `Deleted the draft ${current.name}`, before: `Draft version ${current.version}`, after: "Deleted" }]);
        return true;
      }
      return false;
    },

    savePayerRule: (rule, reason) => {
      const s = get();
      const original = rulesOf(rule.payerId).find((r) => r.id === rule.id);
      const now = who();

      /* A rule read through from the payer's saved configuration: the content goes back through the existing Payers actions. */
      if (isDerivedRuleId(rule.id)) {
        const cfg = s.payerConfig[rule.payerId];
        if (!original || !cfg) return;
        const short = shortOf(rule.payerId);
        const actions = routeDerivedSave(original, rule, cfg, short);
        const fields = changedScopeFields(original, rule);
        const verification = rule.verification !== original.verification;
        const content = actions.length > 0;
        for (const a of actions) {
          if (a.kind === "saveRule") s.saveRule(rule.payerId, derivedKeyOf(rule.id) as "windows" | "backdating" | "noauth" | "p2p", a.lines, reason);
          else if (a.kind === "saveDocs") get().saveDocs(rule.payerId, a.program, a.items, reason, a.changes);
          else if (a.kind === "saveCaller") get().saveCaller(rule.payerId, a.text, reason);
          else if (a.kind === "editReach") get().editPayerDetails(rule.payerId, { reach: a.reach }, reason, a.changes);
        }
        const overlayValues = actions.find((a) => a.kind === "overlay");
        const changed = content || verification || Object.keys(fields).length > 0;
        if (!changed) {
          get().toast({ title: "Nothing changed", tone: "neutral" });
          return;
        }
        patchMeta(rule.id, (o) => ({
          ...o,
          version: (o.version ?? original.version) + 1,
          // A rule a person checked is no longer checked once its content changes.
          verification: verification ? rule.verification : original.verification === "verified" && content ? "needs_review" : o.verification,
          ...(overlayValues && overlayValues.kind === "overlay" ? { values: { ...(o.values ?? {}), ...overlayValues.values } } : {}),
          ...(Object.keys(fields).length ? { fields: { ...(o.fields ?? {}), ...fields } } : {}),
        }));
        const what = verification && rule.verification === "superseded" ? "Archived (superseded)" : content ? "Changed what it says" : "Changed where it applies";
        addHistory(rule.id, what, reason);
        // The existing actions write the "Rules" edit for content they save; anything the library alone holds is written here.
        if (!actions.some((a) => a.kind === "saveRule" || a.kind === "saveDocs" || a.kind === "saveCaller" || a.kind === "editReach")) log(rule.payerId, "Rules", reason, [{ what: `${what}: ${original.title}`, before: original.verification, after: rule.verification }]);
        notifyRuleChange(rule.id, rule.payerId);
        return;
      }

      /* A rule the library owns. */
      const isNew = !original;
      const content = !isNew && (JSON.stringify([original.values, original.instructions ?? "", original.title, original.description]) !== JSON.stringify([rule.values, rule.instructions ?? "", rule.title, rule.description]));
      const verified = isNew ? "unverified" : rule.verification !== original.verification ? rule.verification : original.verification === "verified" && content ? "needs_review" : rule.verification;
      const saved: PayerRule = {
        ...rule,
        origin: "library",
        history: [],
        version: isNew ? 1 : original.version + 1,
        verification: verified,
        ...(isNew ? { source: rule.source.kind === "demo_sample" ? rule.source : { kind: "user_entered", label: rule.source.label || `Entered by ${now}` }, lastVerified: undefined, owner: rule.owner || now } : {}),
      };
      if (!isNew && JSON.stringify(original) === JSON.stringify({ ...saved, version: original.version, history: original.history })) {
        get().toast({ title: "Nothing changed", tone: "neutral" });
        return;
      }
      set((st) => ({ payerRulesExtra: isNew ? [...st.payerRulesExtra, saved] : st.payerRulesExtra.map((r) => (r.id === saved.id ? saved : r)) }));
      const what = isNew ? "Added" : verified === "superseded" && original.verification !== "superseded" ? "Archived (superseded)" : content ? "Changed what it says" : "Changed where it applies";
      addHistory(saved.id, what, reason);
      log(saved.payerId, "Rules", reason, [{ what: `${what}: ${saved.title}`, before: isNew ? "" : `Version ${original.version}, ${original.verification}`, after: `Version ${saved.version}, ${saved.verification}` }]);
      get().toast({ title: isNew ? "Rule added" : "Rule saved", body: isNew ? "It is unverified until a person marks it verified with a source." : "Workflows that use it are listed in History & Changes. Open cases keep their version.", tone: "good" });
      if (!isNew) notifyRuleChange(saved.id, saved.payerId);
    },

    markRuleVerified: (id, source, date) => {
      const rule = ruleInState(get(), id);
      if (!rule) return;
      if (isDerivedRuleId(id)) patchMeta(id, (o) => ({ ...o, verification: "verified", lastVerified: date, source }));
      else set((st) => ({ payerRulesExtra: st.payerRulesExtra.map((r) => (r.id === id ? { ...r, verification: "verified", lastVerified: date, source } : r)) }));
      addHistory(id, `Marked verified against ${source.label}`, date);
      log(rule.payerId, "Rules", `Verified against ${source.label}`, [{ what: `Marked verified: ${rule.title}`, before: rule.verification, after: `verified on ${date}, source ${source.label}` }]);
      get().toast({ title: "Marked verified", body: `${rule.title} now shows ${source.label} as its source, checked ${date}.`, tone: "good" });
    },

    deleteRule: (id, reason) => {
      const rule = get().payerRulesExtra.find((r) => r.id === id);
      if (!rule) return false;
      set((st) => ({
        payerRulesExtra: st.payerRulesExtra.filter((r) => r.id !== id),
        removedSeeds: seeds.payerRulesExtra.some((r) => r.id === id) && !st.removedSeeds.includes(id) ? [...st.removedSeeds, id] : st.removedSeeds,
      }));
      addHistory(id, "Deleted", reason);
      log(rule.payerId, "Rules", reason, [{ what: `Deleted the rule ${rule.title}`, before: `Version ${rule.version}`, after: "Deleted. Workflows that named it need another rule before they can be published." }]);
      notifyRuleChange(id, rule.payerId);
      return true;
    },
  };
};

/* ------------------------------------------------------------------ selectors (cached: safe for useStore, which in React 19 loops on a selector that returns a new array each call)
   Every selector takes the state and its arguments, and also works curried: `useStore(selectPayerWorkflows(payerId))`. */
const NO_WORKFLOWS: Workflow[] = [];
const NO_RULES: PayerRule[] = [];
const NO_VERSIONS: WorkflowVersion[] = [];

type Curried<A extends unknown[], R> = { (s: AppState, ...a: A): R; (...a: A): (s: AppState) => R };
const isState = (v: unknown): v is AppState => typeof v === "object" && v !== null && "workflows" in v && "clock" in v;
function curried<A extends unknown[], R>(fn: (s: AppState, ...a: A) => R): Curried<A, R> {
  const f = (...args: unknown[]): unknown => (isState(args[0]) ? fn(args[0], ...(args.slice(1) as A)) : (s: AppState) => fn(s, ...(args as A)));
  return f as unknown as Curried<A, R>;
}

const byPayerCache = new Map<string, { live: Workflow[]; drafts: Record<string, Workflow>; out: Workflow[] }>();
const RANK = { published: 0, draft: 1, archived: 2 } as const;
/** What a person works on, per payer: published first, then drafts, then archived, each by name. A published workflow that has a draft of its next version shows as that draft (`publishedVersion` says which version is in force). */
export const selectPayerWorkflows = curried((s: AppState, payerId: PayerId): Workflow[] => {
  const hit = byPayerCache.get(payerId);
  if (hit && hit.live === s.workflows && hit.drafts === s.workflowDrafts) return hit.out;
  const out = s.workflows.filter((w) => w.payerId === payerId).map((w) => s.workflowDrafts[w.id] ?? w).sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));
  const keep = out.length ? out : NO_WORKFLOWS;
  byPayerCache.set(payerId, { live: s.workflows, drafts: s.workflowDrafts, out: keep });
  return keep;
});

/** The workflow a person edits: the draft of the next version when there is one, otherwise the saved record. */
export const selectWorkflowById = curried((s: AppState, id: string): Workflow | undefined => s.workflowDrafts[id] ?? s.workflows.find((w) => w.id === id));
/** The record cases see: published, archived, or a draft that was never published. Any draft of a next version is ignored. */
export const selectLiveWorkflow = curried((s: AppState, id: string): Workflow | undefined => s.workflows.find((w) => w.id === id));

let publishedCache: { live: Workflow[]; out: Workflow[] } | null = null;
/** Every published workflow, as new cases are matched against them. */
export const selectPublishedWorkflows = (s: AppState): Workflow[] => {
  if (publishedCache?.live === s.workflows) return publishedCache.out;
  publishedCache = { live: s.workflows, out: s.workflows.filter((w) => w.status === "published") };
  return publishedCache.out;
};

const versionsCache = new Map<string, { all: WorkflowVersion[]; out: WorkflowVersion[] }>();
/** The saved versions of one workflow, newest first. */
export const selectWorkflowVersions = curried((s: AppState, id: string): WorkflowVersion[] => {
  const hit = versionsCache.get(id);
  if (hit && hit.all === s.workflowVersions) return hit.out;
  const mine = s.workflowVersions.filter((v) => v.workflowId === id).sort((a, b) => b.version - a.version || b.savedAt - a.savedAt);
  const out = mine.length ? mine : NO_VERSIONS;
  versionsCache.set(id, { all: s.workflowVersions, out });
  return out;
});

const rulesCache = new Map<string, { cfg: unknown; extra: PayerRule[]; meta: unknown; hist: unknown; custom: unknown; out: PayerRule[] }>();
/** Every rule of a payer, archived ones included: those read through from its saved rules, documents, instructions for Caller and reach lines, then the library's own, in the order of the Rules & Instructions groups. */
export const selectPayerRules = curried((s: AppState, payerId: PayerId): PayerRule[] => {
  const cfg = s.payerConfig[payerId];
  const hit = rulesCache.get(payerId);
  if (hit && hit.cfg === cfg && hit.extra === s.payerRulesExtra && hit.meta === s.ruleMeta && hit.hist === s.ruleHistory && hit.custom === s.customPayers) return hit.out;
  const short = PAYERS.find((p) => p.id === payerId)?.shortName ?? s.customPayers.find((p) => p.id === payerId)?.shortName;
  const built = payerRulesFrom(payerId, cfg, s.payerRulesExtra, s.ruleMeta, s.ruleHistory, payerProfileOf(payerId, s.customPayers), short);
  const out = built.length ? built : NO_RULES;
  rulesCache.set(payerId, { cfg, extra: s.payerRulesExtra, meta: s.ruleMeta, hist: s.ruleHistory, custom: s.customPayers, out });
  return out;
});
export const selectRuleById = curried((s: AppState, id: string): PayerRule | undefined => ruleInState(s, id));

let matchCache: { live: Workflow[]; rules: PayerRule[]; byFacts: Map<string, MatchResult> } | null = null;
/** The workflow a case follows: the published workflows matched by specificity, with the labelled default when none match and a conflict when two are equally specific. Cached per fact sheet. */
export const selectPublishedFor = curried((s: AppState, facts: CaseFacts): MatchResult => {
  const rules = selectPayerRules(s, facts.payerId);
  if (!matchCache || matchCache.live !== s.workflows || matchCache.rules !== rules) matchCache = { live: s.workflows, rules, byFacts: new Map() };
  const key = JSON.stringify(facts);
  let hit = matchCache.byFacts.get(key);
  if (!hit) {
    if (matchCache.byFacts.size >= 64) matchCache.byFacts.clear();
    hit = matchWorkflow(facts, selectPublishedWorkflows(s), rules);
    matchCache.byFacts.set(key, hit);
  }
  return hit;
});
