import { blockedInHosted } from "@/lib/hosted";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MODULE_IDS } from "@/data/assess/modules";
import { WORKSPACE_LABEL, type WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { useResume } from "@/store/persistUi";
import { ConfigureDialog } from "../configure/ConfigureDialog";
import { useIntakeNow } from "../lib/policyNow";
import { useDerivedFields } from "../profile/sync";
import { SafetyBanner } from "../queue/SafetyBanner";
import { ScribePanel } from "../scribe/ScribePanel";
import { VoicePanel } from "../voice/VoicePanel";
import { AssistantColumn } from "./AssistantColumn";
import { LeftNav } from "./LeftNav";
import { navIdOf } from "./nav";
import { PrintSummary } from "./PrintSummary";
import { SectionView } from "./SectionView";
import { readPref, writePref } from "./storage";
import { useFillViewport } from "./useFillViewport";
import { useMediaQuery } from "./useMediaQuery";
import { useWorkspaceModel, WorkspaceModelContext } from "./useWorkspaceModel";
import { useWorkspaceTarget } from "./useWorkspaceTarget";
import { WorkspaceHeader } from "./WorkspaceHeader";

const ASSISTANT_KEY = "psyflo.workspace.assistant";

/** The patient-centered workspace of one intake. From 1280 px: the sections on the left, the open section in the middle, the AI Assistant on the right
    (collapsible). From 1024 px the assistant is a drawer; below that the sections are a menu. Only the middle scrolls: the header and both side columns stay. */
export function Workspace({ record }: { record: IntakeRecord }) {
  const model = useWorkspaceModel(record);
  const { target, go } = useWorkspaceTarget(record.id);
  const [params, setParams] = useSearchParams();
  const wide = useMediaQuery("(min-width: 1280px)");
  const medium = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState(() => readPref(ASSISTANT_KEY) !== "closed");
  const [drawer, setDrawer] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [printRun, setPrintRun] = useState(0);
  const [printing, setPrinting] = useState(false);
  const center = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const height = useFillViewport(root);
  const panel = params.get("panel");
  useDerivedFields(record);
  useResume(record, target);
  /* A task that waited on a person closes once the decision is made, whether or not the assistant is open (it is a drawer below 1280 px). */
  const now = useIntakeNow();
  const closeCleared = useStore((s) => s.closeClearedTasks);
  useEffect(() => {
    closeCleared(record.id, now);
  }, [record, now, closeCleared]);

  /* An address can name a module that does not exist; the sections below it are never told about it. */
  const known: WorkspaceTarget = target.module && !MODULE_IDS.includes(target.module) ? { section: "instrument" } : target;
  const key = `${navIdOf(target)}|${target.tab ?? ""}`;
  const regionLabel = model.nav.find((i) => i.id === navIdOf(target))?.label ?? WORKSPACE_LABEL[target.section];
  useEffect(() => {
    center.current?.scrollTo({ top: 0 });
  }, [key]);

  const toggle = () => {
    if (!wide) return setDrawer(true);
    writePref(ASSISTANT_KEY, open ? "closed" : "open");
    setOpen(!open);
  };
  const setPanel = (p: "scribe" | "voice" | null) =>
    setParams((cur) => {
      const n = new URLSearchParams(cur);
      if (p) n.set("panel", p);
      else n.delete("panel");
      return n;
    });
  const configure = useCallback(() => setConfiguring(true), []);
  const done = useCallback(() => setPrinting(false), []);
  const columns = wide ? `208px minmax(0,1fr) ${open ? "300px" : "40px"}` : medium ? "208px minmax(0,1fr)" : "minmax(0,1fr)";
  const rows = medium ? "minmax(0,1fr)" : "auto minmax(0,1fr)";
  const mode = useMemo(() => (wide ? "column" : "drawer"), [wide]);

  return (
    <WorkspaceModelContext.Provider value={model}>
      <div ref={root} style={height ? { height } : undefined} className="flex h-[calc(100dvh-142px)] min-h-[560px] flex-col gap-3" data-workspace data-layout={wide ? "wide" : medium ? "medium" : "narrow"}>
        <WorkspaceHeader
          model={model}
          go={go}
          onConfigure={configure}
          onPrint={() => { if (blockedInHosted("Print summary")) return; setPrinting(true); setPrintRun((n) => n + 1); }}
          openPanel={setPanel}
          hideNext={target.section === "overview"}
          assistant={{ open: wide ? open : drawer, wide, toggle, needs: model.needs.length }}
        />
        <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}>
          <LeftNav recordId={record.id} items={model.nav} target={target} compact={!medium} />
          <div ref={center} role="region" aria-label={regionLabel} className="min-h-0 min-w-0 overflow-y-auto pr-1" data-center data-section={target.section} data-module={target.module ?? ""} data-tab={target.tab ?? ""}>
            {record.safety ? <div id="safety-alert" tabIndex={-1} className="mb-4 rounded-[20px] outline-none focus:ring-2 focus:ring-risk"><SafetyBanner record={record} /></div> : null}
            <SectionView record={record} target={target} model={model} go={go} onConfigure={configure} />
          </div>
          {wide ? <AssistantColumn record={record} target={known} mode="column" open={open} onOpen={toggle} onClose={toggle} needs={model.needs.length} /> : null}
        </div>
        {!wide ? <AssistantColumn record={record} target={known} mode={mode} open={drawer} onOpen={() => setDrawer(true)} onClose={() => setDrawer(false)} needs={model.needs.length} /> : null}
        {panel === "scribe" ? <ScribePanel record={record} onClose={() => setPanel(null)} /> : null}
        {panel === "voice" ? <VoicePanel record={record} onClose={() => setPanel(null)} /> : null}
        <ConfigureDialog open={configuring} onClose={() => setConfiguring(false)} record={record} />
        {printing ? <PrintSummary model={model} runId={printRun} onDone={done} /> : null}
      </div>
    </WorkspaceModelContext.Provider>
  );
}
