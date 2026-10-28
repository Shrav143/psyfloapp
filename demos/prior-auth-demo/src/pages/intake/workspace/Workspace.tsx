import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { IntakeRecord } from "@/data/intake/types";
import { paths } from "@/routes";
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
  const nav = useNavigate();
  const wide = useMediaQuery("(min-width: 1280px)");
  const medium = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState(() => readPref(ASSISTANT_KEY) !== "closed");
  const [drawer, setDrawer] = useState(false);
  const [printRun, setPrintRun] = useState(0);
  const [printing, setPrinting] = useState(false);
  const center = useRef<HTMLDivElement>(null);
  const panel = params.get("panel");
  useDerivedFields(record);

  const key = `${navIdOf(target)}|${target.tab ?? ""}`;
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
  /* Until the configuration dialog is wired in, configuring opens the wizard for this intake. */
  const configure = useCallback(() => nav(paths.configure(record.id)), [nav, record.id]);
  const done = useCallback(() => setPrinting(false), []);
  const columns = wide ? `208px minmax(0,1fr) ${open ? "300px" : "40px"}` : medium ? "208px minmax(0,1fr)" : "minmax(0,1fr)";
  const rows = medium ? "minmax(0,1fr)" : "auto minmax(0,1fr)";
  const mode = useMemo(() => (wide ? "column" : "drawer"), [wide]);

  return (
    <WorkspaceModelContext.Provider value={model}>
      <div className="flex h-[calc(100dvh-142px)] min-h-[560px] flex-col gap-3" data-workspace data-layout={wide ? "wide" : medium ? "medium" : "narrow"}>
        <WorkspaceHeader
          model={model}
          go={go}
          onConfigure={configure}
          onPrint={() => { setPrinting(true); setPrintRun((n) => n + 1); }}
          openPanel={setPanel}
          hideNext={target.section === "overview"}
          assistant={{ open: wide ? open : drawer, wide, toggle, needs: model.needs.length }}
        />
        <div className="grid min-h-0 flex-1 gap-4" style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}>
          <LeftNav recordId={record.id} items={model.nav} target={target} compact={!medium} />
          <div ref={center} className="min-h-0 min-w-0 overflow-y-auto pr-1" data-center data-section={target.section} data-module={target.module ?? ""} data-tab={target.tab ?? ""}>
            {record.safety ? <div id="safety-alert" tabIndex={-1} className="mb-4 outline-none"><SafetyBanner record={record} /></div> : null}
            <SectionView record={record} target={target} model={model} go={go} onConfigure={configure} />
          </div>
          {wide ? <AssistantColumn record={record} target={target} mode="column" open={open} onOpen={toggle} onClose={toggle} needs={model.needs.length} /> : null}
        </div>
        {!wide ? <AssistantColumn record={record} target={target} mode={mode} open={drawer} onOpen={() => setDrawer(true)} onClose={() => setDrawer(false)} needs={model.needs.length} /> : null}
        {panel === "scribe" ? <ScribePanel record={record} onClose={() => setPanel(null)} /> : null}
        {panel === "voice" ? <VoicePanel record={record} onClose={() => setPanel(null)} /> : null}
        {printing ? <PrintSummary model={model} runId={printRun} onDone={done} /> : null}
      </div>
    </WorkspaceModelContext.Provider>
  );
}
