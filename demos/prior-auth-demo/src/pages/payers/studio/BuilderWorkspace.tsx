import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { PROGRAMS, PROGRAM_LABEL, type Program } from "@/data/types";
import type { NodeKind, PayerRule, RuleGroup, Workflow, WorkflowMeta, WfEdge, WfNode } from "@/data/workflow/types";
import { REQUEST_TYPE_LABEL } from "@/data/workflow/types";
import { useStore } from "@/store";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { ArchiveDialog, LeaveDialog, PublishDialog } from "./BuilderDialogs";
import { CanvasToolbar } from "./CanvasToolbar";
import { NodeConfigurationPanel } from "./NodeConfigurationPanel";
import { NodeLibrary } from "./NodeLibrary";
import { StudioProvider, type StudioCtx, type StudioDoc } from "./StudioContext";
import { VersionHistoryDrawer } from "./VersionHistoryDrawer";
import { WorkflowCanvas, type CanvasHandle } from "./WorkflowCanvas";
import { metaSummary, WorkflowDetails } from "./WorkflowDetails";
import { WorkflowSelector, type NewKind } from "./WorkflowSelector";
import { WorkflowSummary } from "./WorkflowSummary";
import { describeChange, sameGraph } from "./lib/describe";
import { baseFacts, directionOf, layout, match, validate, type Direction } from "./lib/engine";
import { prefersReducedMotion, useAnnouncer, useElementWidth, useLeaveGuard } from "./lib/hooks";
import { duplicateNodes, reconcileEdges, removeNodes, type Graph } from "./lib/model";
import { api, workflowStorageStatus } from "./lib/store";
import { useHistory } from "./lib/useHistory";

/* One workflow open on the canvas. The edits live here, with undo and redo, until Save draft writes them to the store. */

/** The height of the three columns: tall enough to work in, never taller than the window. */
const AREA_H = "clamp(520px, calc(100vh - 150px), 780px)";

type MetaFields = Pick<Workflow, "name" | "description" | "state" | "product" | "services" | "providerType" | "requestType" | "effectiveFrom" | "effectiveTo" | "owner">;
interface Work { meta: MetaFields; nodes: WfNode[]; edges: WfEdge[] }

const metaFieldsOf = (w: WorkflowMeta): MetaFields => ({ name: w.name, description: w.description, state: w.state, product: w.product, services: w.services, providerType: w.providerType, requestType: w.requestType, effectiveFrom: w.effectiveFrom, effectiveTo: w.effectiveTo, owner: w.owner });
const workOf = (w: Workflow): Work => ({ meta: metaFieldsOf(w), nodes: w.nodes, edges: w.edges });
const sameWork = (a: Work, b: Work): boolean => JSON.stringify(a.meta) === JSON.stringify(b.meta) && sameGraph(a, b);

export interface BuilderWorkspaceProps {
  payer: { id: string; name: string };
  stored: Workflow;
  workflows: Workflow[];
  rules: PayerRule[];
  docs: StudioDoc[];
  /** A step to select when the workspace opens (Fix in builder). */
  focusNode?: string;
  onSelectWorkflow: (id: string) => void;
  onNew: (kind: NewKind) => void;
  onTest: (id: string) => void;
  onOpenRules: (group?: RuleGroup, ruleId?: string) => void;
}

export function BuilderWorkspace({ payer, stored, workflows, rules, docs, focusNode, onSelectWorkflow, onNew, onTest, onOpenRules }: BuilderWorkspaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<CanvasHandle>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
  const width = useElementWidth(root);
  const mode: "wide" | "medium" | "stacked" = width >= 1100 ? "wide" : width >= 900 ? "medium" : "stacked";
  const { message, say } = useAnnouncer();
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);

  const storedWork = useMemo(() => workOf(stored), [stored]);
  const history = useHistory<Work>(storedWork);
  const work = history.present;
  const seen = useRef(storedWork);
  useEffect(() => {
    if (storedWork === seen.current) return;
    seen.current = storedWork;
    if (!sameWork(storedWork, history.present)) history.reset(storedWork);
    // history.reset and history.present are read at the moment the store changes; they are not triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedWork]);

  const dirty = !sameWork(storedWork, work);
  const locked = stored.status === "archived";
  const working = useMemo<Workflow>(() => ({ ...stored, ...work.meta, nodes: work.nodes, edges: work.edges }), [stored, work]);
  const graph: Graph = useMemo(() => ({ nodes: work.nodes, edges: work.edges }), [work.nodes, work.edges]);

  /* Checks run on every change, so a step's dot and the list on the right are always current. */
  const issues = useMemo(() => validate(working, rules), [working, rules]);
  const errors = issues.filter((i) => i.severity === "error");

  const [selected, setSelected] = useState<string[]>(focusNode ? [focusNode] : []);
  const primary = selected.length === 1 ? selected[0] : null;
  const node = primary ? (work.nodes.find((n) => n.id === primary) ?? null) : null;
  const [direction, setDirection] = useState<Direction>(() => directionOf(stored.nodes, stored.edges));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snap, setSnap] = useState(true);
  const [minimap, setMinimap] = useState(false);
  const [libOpen, setLibOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [dialog, setDialog] = useState<null | "publish" | "archive" | "history">(null);
  const [attempted, setAttempted] = useState(false);
  const [leave, setLeave] = useState<null | (() => void)>(null);

  useEffect(() => {
    setLibOpen(width >= 1100);
    // Only when the layout mode changes, not on every pixel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ---------------------------------------------------------------- editing */
  const commit = useCallback(
    (g: Graph, note?: string) => {
      if (locked) return;
      const merge = note?.startsWith("nudge:") ? note : undefined;
      history.commit({ ...history.present, nodes: g.nodes, edges: g.edges }, merge);
      if (note) say(merge ? "Moved" : note);
    },
    [history, locked, say],
  );

  const changeNode = useCallback(
    (next: WfNode, merge?: string) => {
      if (locked) return;
      const nodes = work.nodes.map((n) => (n.id === next.id ? next : n));
      history.commit({ ...work, nodes, edges: reconcileEdges({ nodes, edges: work.edges }) }, merge);
    },
    [history, locked, work],
  );

  const changeMeta = (patch: Partial<WorkflowMeta>) => history.commit({ ...work, meta: { ...work.meta, ...patch } }, `meta:${Object.keys(patch).join(",")}`);

  const addByClick = (kind: NodeKind) => {
    const id = canvas.current?.addNode(kind);
    if (id && mode === "medium") setLibOpen(false);
  };

  const deleteSelected = () => {
    if (!selected.length) return;
    const r = removeNodes(graph, selected);
    if (!r.removed.length) return say("Start cannot be deleted.");
    commit(r.graph, r.removed.length === 1 ? "Deleted" : `Deleted ${r.removed.length} steps`);
    setSelected([]);
  };
  const duplicateSelected = () => {
    const r = duplicateNodes(graph, selected);
    if (!r.added.length) return;
    commit(r.graph, r.added.length === 1 ? "Duplicated the step" : `Duplicated ${r.added.length} steps`);
    setSelected(r.added);
  };
  const undo = () => {
    if (history.undo()) say("Undone");
  };
  const redo = () => {
    if (history.redo()) say("Redone");
  };
  const tidy = () => {
    commit({ nodes: layout(work.nodes, work.edges, direction), edges: work.edges }, "Arranged the steps");
    window.setTimeout(() => canvas.current?.fit(), 60);
  };
  const turn = () => {
    const next: Direction = direction === "TB" ? "LR" : "TB";
    setDirection(next);
    commit({ nodes: layout(work.nodes, work.edges, next), edges: work.edges }, next === "TB" ? "Steps now run down the page" : "Steps now run across the page");
    window.setTimeout(() => canvas.current?.fit(), 60);
  };
  const goTo = (id: string) => {
    setSelected([id]);
    setPanelOpen(true);
    canvas.current?.focusNode(id);
  };
  const openEditor = (id: string) => {
    setSelected([id]);
    setPanelOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => heading.current?.focus()));
  };

  /* ---------------------------------------------------------------- saving, publishing */
  const save = (): boolean => {
    if (locked) return false;
    if (!dirty) {
      toast({ title: "Nothing to save", body: "The draft already matches what is saved.", tone: "neutral" });
      return false;
    }
    api.saveDraft(stored.id, { ...work.meta, nodes: work.nodes, edges: work.edges }, describeChange(stored, working));
    say("Draft saved");
    toast({ title: "Draft saved", body: "Saved in this browser. It is not used for cases until it is published.", tone: "good" });
    return true;
  };
  const publish = () => {
    setAttempted(true);
    if (errors.length) {
      setSelected([]);
      setPanelOpen(true);
      say(`Cannot publish: ${errors.length} ${errors.length === 1 ? "thing needs" : "things need"} fixing`);
      return;
    }
    setDialog("publish");
  };
  const confirmPublish = (reason: string) => {
    if (dirty) api.saveDraft(stored.id, { ...work.meta, nodes: work.nodes, edges: work.edges }, describeChange(stored, working));
    const res = api.publish(stored.id, reason);
    setDialog(null);
    if (!res.ok) {
      setAttempted(true);
      setSelected([]);
      setPanelOpen(true);
      say(`Cannot publish: ${res.issues.filter((i) => i.severity === "error").length} things need fixing`);
      return;
    }
    setAttempted(false);
    say("Published");
  };
  const confirmArchive = (reason: string) => {
    api.archive(stored.id, reason);
    setDialog(null);
    say("Archived");
  };
  const duplicate = () => {
    const id = api.duplicate(stored.id);
    if (!id) return;
    say("Duplicated as a new draft");
    onSelectWorkflow(id);
  };

  /* ---------------------------------------------------------------- leaving with unsaved changes */
  useLeaveGuard(dirty && !locked, (proceed) => setLeave(() => proceed), root);
  const guarded = (go: () => void) => (dirty && !locked ? setLeave(() => go) : go());

  /* Shortcuts work anywhere on the page while the builder is open, unless a field has the focus (then the field's own undo applies) or a panel is open on top. */
  const keys = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keys.current = (e) => {
    const el = e.target as HTMLElement | null;
    const typing = !!el?.matches?.("input, textarea, select, [contenteditable='true']");
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || document.querySelector('[aria-modal="true"]')) return;
    const k = e.key.toLowerCase();
    if (k === "s") {
      e.preventDefault();
      save();
    } else if (!typing && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (!typing && k === "y") {
      e.preventDefault();
      redo();
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ---------------------------------------------------------------- what the panels need */
  const guardedRef = useRef(guarded);
  guardedRef.current = guarded;
  const guardedOpen = useCallback((group?: RuleGroup, ruleId?: string) => guardedRef.current(() => onOpenRules(group, ruleId)), [onOpenRules]);
  const ctx = useMemo<StudioCtx>(() => ({ payerId: payer.id, payerName: payer.name, services: work.meta.services, requestType: work.meta.requestType, docs, rules, openRules: guardedOpen }), [payer, work.meta.services, work.meta.requestType, docs, rules, guardedOpen]);

  const conflict = useMemo(() => conflictOf(working, workflows, payer.id), [working, workflows, payer.id]);
  const where = workflowStorageStatus() === "saved in this browser" ? "Saved in this browser" : "Memory only: browser storage is blocked here, so changes last until the tab closes";
  const savedNote = stored.status === "archived" ? "Archived. Read only." : `${where} · last saved ${stamp(stored.updatedAt)} by ${stored.updatedBy}`;
  void clock;

  const summary = (
    <WorkflowSummary workflow={working} issues={issues} rules={rules} attempted={attempted} onGoTo={goTo} onOpenRule={(r) => guardedOpen(r.group, r.id)} />
  );

  const panel = (
    <NodeConfigurationPanel node={node} graph={graph} issues={issues} readOnly={locked} summary={summary} headingRef={heading} onChangeNode={changeNode} onGraph={commit} onDuplicate={duplicateSelected} onDelete={deleteSelected} onClose={() => setSelected([])} className={cn(mode === "stacked" ? "max-h-[640px]" : "h-full")} />
  );

  const library = <NodeLibrary onAdd={addByClick} hasStart={work.nodes.some((n) => n.kind === "start")} className={cn(mode === "stacked" ? "max-h-[420px]" : "h-full")} />;
  const canvasEl = (
    <WorkflowCanvas
      key={stored.id}
      ref={canvas}
      nodes={work.nodes}
      edges={work.edges}
      readOnly={locked}
      selectedId={primary}
      issues={issues}
      snap={snap}
      minimap={minimap}
      direction={direction}
      onChange={commit}
      onSelect={(_, ids) => setSelected(ids)}
      onOpen={openEditor}
      onAnnounce={say}
    />
  );

  const notice: { tone: "mid" | "neutral"; title?: string; text: string } | undefined = conflict
    ? { tone: "mid", title: "Two published workflows are equally specific", text: conflict }
    : locked
      ? { tone: "neutral", text: "This workflow is archived, so it is read only. Duplicate it to start a new draft." }
      : stored.status === "published"
        ? { tone: "neutral", text: `Published version ${stored.version} is in force. Your changes are saved as a draft of version ${stored.version + 1}, and publishing it replaces version ${stored.version}.` }
        : stored.publishedVersion
          ? { tone: "neutral", text: `Published version ${stored.publishedVersion} is still in force. This draft is version ${stored.version} and replaces it when published.` }
          : undefined;

  return (
    <StudioProvider value={ctx}>
      <div ref={root} className="flex min-w-0 flex-col gap-4" data-testid="builder">
        <div role="status" aria-live="polite" data-testid="studio-live" className="sr-only">{message}</div>
        <WorkflowSelector
          workflows={workflows}
          current={stored}
          dirty={dirty}
          savedNote={savedNote}
          locked={locked}
          onSelect={(id) => (id === stored.id ? undefined : guarded(() => onSelectWorkflow(id)))}
          onNew={(k) => guarded(() => onNew(k))}
          onDuplicate={() => guarded(duplicate)}
          onSave={() => void save()}
          onTest={() => {
            if (dirty && !locked) save();
            onTest(stored.id);
          }}
          onPublish={publish}
          onArchive={() => setDialog("archive")}
          onHistory={() => setDialog("history")}
          summary={metaSummary(working)}
          detailsOpen={detailsOpen}
          onDetails={() => setDetailsOpen((o) => !o)}
          notice={notice}
        />
        {detailsOpen ? <WorkflowDetails workflow={working} payerName={payer.name} onChange={changeMeta} disabled={locked} /> : null}

        <div className={cn("grid gap-3", mode === "wide" ? "items-start" : "")} style={mode === "stacked" ? undefined : { gridTemplateColumns: `${libOpen && mode === "wide" ? "250px" : "44px"} minmax(0,1fr) ${panelOpen ? "340px" : "44px"}` }}>
          {mode === "stacked" ? (
            <details className="rounded-[20px] border border-edge bg-white [&[open]>summary]:border-b">
              <summary className="cursor-pointer list-none rounded-[20px] border-line px-4 py-3 text-[14px] font-semibold">Add a step</summary>
              <div className="p-2">{library}</div>
            </details>
          ) : (
            <div className="relative" style={{ height: AREA_H }}>
              {libOpen && mode === "wide" ? (
                <div className="flex h-full flex-col">
                  {library}
                </div>
              ) : (
                <Rail icon={PanelLeftOpen} label={libOpen ? "Hide the list of steps" : "Show the list of steps"} onClick={() => setLibOpen((o) => !o)} text="Steps" />
              )}
              {libOpen && mode === "medium" ? <div className="absolute top-0 left-0 z-30 h-full w-[270px] shadow-[8px_0_32px_rgba(21,27,36,0.12)]">{library}</div> : null}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex items-center gap-2">
              {mode === "wide" && libOpen ? (
                <button type="button" onClick={() => setLibOpen(false)} aria-label="Hide the list of steps" title="Hide the list of steps" className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-edge bg-white text-ink2 hover:bg-tile">
                  <PanelLeftClose size={16} className="ico" aria-hidden="true" />
                </button>
              ) : null}
              <CanvasToolbar canUndo={history.canUndo} canRedo={history.canRedo} hasSelection={selected.length > 0} canDuplicate={selected.some((id) => work.nodes.find((n) => n.id === id)?.kind !== "start") && selected.length > 0} snap={snap} minimap={minimap} direction={direction} disabled={locked} onUndo={undo} onRedo={redo} onLayout={tidy} onDirection={turn} onFit={() => canvas.current?.fit()} onSnap={() => setSnap((s) => !s)} onMinimap={() => setMinimap((m) => !m)} onDuplicate={duplicateSelected} onDelete={deleteSelected} />
            </div>
            <div style={{ height: mode === "stacked" ? 520 : `calc(${AREA_H} - 46px)` }}>{canvasEl}</div>
            {mode === "stacked" && node ? (
              <p className="m-0 flex flex-wrap items-center gap-2 rounded-xl bg-sage-bg px-3.5 py-2 text-[13px] text-good-ink">
                <span className="font-semibold">{node.title}</span> is selected.
                <button type="button" onClick={() => panelBox.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" })} className="font-semibold underline underline-offset-2">Open its settings</button>
              </p>
            ) : null}
          </div>

          {panelOpen ? (
            <div ref={panelBox} style={mode === "stacked" ? undefined : { height: AREA_H }} className="flex min-h-0 scroll-mt-20 flex-col">{panel}</div>
          ) : (
            <div className="relative" style={{ height: 120 }}>
              <Rail icon={PanelLeftOpen} label="Show the step settings" onClick={() => setPanelOpen(true)} text="Settings" flip />
            </div>
          )}
        </div>

        {panelOpen && mode !== "stacked" ? (
          <div className="-mt-1 flex justify-end">
            <button type="button" onClick={() => setPanelOpen(false)} className="text-xs font-medium text-muted hover:text-ink hover:underline">Hide the settings panel for more room</button>
          </div>
        ) : null}

        <p className="m-0 text-xs text-muted">{work.nodes.length} steps, {issues.length ? `${errors.length} to fix and ${issues.length - errors.length} to check` : "no problems found"}. Steps marked Demo simulation or Not configured do not reach a real system.</p>
      </div>

      {dialog === "publish" ? <PublishDialog workflow={working} nextVersion={stored.status === "published" ? stored.version + 1 : stored.version} inForce={stored.status === "published" ? stored.version : stored.publishedVersion} warnings={issues.filter((i) => i.severity === "warning")} unsaved={dirty} onConfirm={confirmPublish} onClose={() => setDialog(null)} /> : null}
      {dialog === "archive" ? <ArchiveDialog workflow={stored} onConfirm={confirmArchive} onClose={() => setDialog(null)} /> : null}
      {dialog === "history" ? <VersionHistoryDrawer workflow={stored} onClose={() => setDialog(null)} onRestored={(id) => { setDialog(null); onSelectWorkflow(id); }} /> : null}
      {leave ? (
        <LeaveDialog
          name={work.meta.name}
          onStay={() => setLeave(null)}
          onDiscard={() => {
            const go = leave;
            history.reset(storedWork);
            setLeave(null);
            go();
          }}
          onSave={() => {
            const go = leave;
            save();
            setLeave(null);
            go();
          }}
        />
      ) : null}
    </StudioProvider>
  );
}

function Rail({ icon: Icon, label, onClick, text, flip }: { icon: typeof PanelLeftOpen; label: string; onClick: () => void; text: string; flip?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-full max-h-[260px] w-11 flex-col items-center gap-3 rounded-[16px] border border-edge bg-white py-3 text-ink2 hover:bg-tile">
      <Icon size={17} className={cn("ico", flip && "scale-x-[-1]")} aria-hidden="true" />
      <span className="text-[12px] font-medium [text-orientation:mixed] [writing-mode:vertical-rl]">{text}</span>
    </button>
  );
}

/** Published workflows that are as specific as this one for the same service and request type. They are named together; none is picked silently. */
function conflictOf(w: Workflow, all: Workflow[], payerId: string): string | null {
  if (w.status === "archived") return null;
  const published = all.filter((x) => x.status === "published" && x.id !== w.id);
  const pool = w.status === "published" ? all.filter((x) => x.status === "published") : [...published, w];
  const services: Program[] = w.services.length ? w.services : PROGRAMS;
  const types = w.requestType === "any" ? (Object.keys(REQUEST_TYPE_LABEL) as (keyof typeof REQUEST_TYPE_LABEL)[]) : [w.requestType];
  for (const s of services) {
    for (const t of types) {
      const facts = { ...baseFacts(payerId, s, t), state: w.state, product: w.product ?? baseFacts(payerId, s, t).product, today: w.effectiveFrom > "2026-10-20" ? w.effectiveFrom : "2026-10-20" };
      const m = match(facts, pool);
      const hit = m.conflict?.find((c) => c.id === w.id);
      if (hit && m.conflict) {
        const others = m.conflict.filter((c) => c.id !== w.id);
        return `${w.name} and ${others.map((o) => o.name).join(" and ")} both match ${PROGRAM_LABEL[s]}, ${REQUEST_TYPE_LABEL[t].toLowerCase()}. New Case flags it and picks neither until one is changed.`;
      }
    }
  }
  return null;
}

