import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, AudioLines, ChevronUp, Mic, MoreHorizontal, PanelRight, Printer, RotateCcw, Settings2, ShieldAlert, UserRoundCog, XCircle } from "lucide-react";
import { Button, Card, Chip, Pill } from "@/components/ui";
import type { WorkspaceTarget } from "@/data/assess/nav";
import { programById } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import { effectiveStatus, STATUS_TONE } from "@/data/assess/status";
import type { Population } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import { TRIAGE_LABEL, type IntakeRecord } from "@/data/intake/types";
import { siteName } from "@/data/sites";
import { vaPlanOf } from "@/data/va/plans";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { SaveIndicator } from "@/store/persistUi";
import { reopenIntake } from "./actions";
import { ActionMenu, type MenuItem } from "./ActionMenu";
import { CloseDialog, ReassignDialog } from "./HeaderDialogs";
import { ProgressStrip } from "./ProgressStrip";
import { readPref, writePref } from "./storage";
import type { WorkspaceModel } from "./useWorkspaceModel";

const DETAILS_KEY = "psyflo.workspace.details";
const SHORT_POPULATION: Record<Population, string> = { adult: "Adult", adolescent: "Adolescent", child: "Child" };
const populationOf = (r: IntakeRecord): string => (r.config ? SHORT_POPULATION[r.config.population] : r.age === null ? "Age not entered" : r.age < 12 ? SHORT_POPULATION.child : r.age < 18 ? SHORT_POPULATION.adolescent : SHORT_POPULATION.adult);

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 font-medium text-ink">{children}</span>
    </span>
  );
}

export interface WorkspaceHeaderProps {
  model: WorkspaceModel;
  go: (t: WorkspaceTarget) => void;
  onConfigure: () => void;
  onPrint: () => void;
  openPanel: (p: "scribe" | "voice") => void;
  /** The overview already says what happens next. */
  hideNext?: boolean;
  assistant: { open: boolean; wide: boolean; toggle: () => void; needs: number };
}

/** The patient header: who, status, where the work is and what happens next, with progress indicators under it. The details can be folded away. */
export function WorkspaceHeader({ model, go, onConfigure, onPrint, openPanel, hideNext, assistant }: WorkspaceHeaderProps) {
  const { record: r, next, cells } = model;
  const nav = useNavigate();
  const [details, setDetails] = useState(() => readPref(DETAILS_KEY) !== "hidden");
  const [dialog, setDialog] = useState<"reassign" | "close" | null>(null);
  const status = effectiveStatus(r);
  const staff = staffOf(r.assignedTo);
  const payer = r.payerId ? vaPlanOf(r.payerId) : undefined;
  const member = r.coverage.medicaidId?.value;
  const cfg = r.config;
  const program = cfg ? programById(cfg.programId).label : serviceById(r.serviceId).short;
  const requested = cfg && cfg.requestedProgramId !== cfg.programId ? programById(cfg.requestedProgramId).label : null;
  const alert = r.safety;

  const toggleDetails = () => {
    writePref(DETAILS_KEY, details ? "hidden" : "shown");
    setDetails(!details);
  };
  const showAlert = () => {
    const el = document.getElementById("safety-alert");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  };
  const doNext = () => (next.configure ? onConfigure() : next.href ? nav(next.href) : next.to ? go(next.to) : undefined);

  const menu: MenuItem[] = [
    { id: "print", label: "Print summary", icon: Printer, onSelect: onPrint, hint: "Opens the print dialog for the overview", group: "This intake" },
    { id: "reassign", label: "Reassign", icon: UserRoundCog, onSelect: () => setDialog("reassign"), group: "This intake" },
    r.triage === "closed"
      ? { id: "reopen", label: "Reopen intake", icon: RotateCcw, onSelect: () => reopenIntake(r.id), group: "This intake" }
      : { id: "close", label: "Close intake", icon: XCircle, onSelect: () => setDialog("close"), danger: true, group: "This intake" },
    { id: "scribe", label: "Start AI Scribe", icon: Mic, onSelect: () => openPanel("scribe"), hint: "Simulated audio", group: "Capture" },
    { id: "voice", label: "Voice Intake Assistant", icon: AudioLines, onSelect: () => openPanel("voice"), hint: "Simulated call", group: "Capture" },
  ];
  const assistantLabel = assistant.wide && assistant.open ? "Collapse the AI Assistant" : "Open the AI Assistant";

  return (
    <Card data-workspace-header className="@container shrink-0">
      <div className="flex flex-col gap-2 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link to={paths.referralQueue()} aria-label="Back to Referrals & Intake" title="Back to Referrals & Intake" className="grid h-7 w-7 place-items-center rounded-lg text-ink2 hover:bg-tile">
              <ArrowLeft size={16} className="ico" />
            </Link>
            <h1 className="text-[24px] leading-tight font-semibold tracking-tight">{r.initials || "No patient yet"}{r.age !== null ? `, ${r.age}` : ""}</h1>
            <span className="text-[14px] text-muted">{populationOf(r)} · {r.id}</span>
            <span data-status={status}><Pill tone={STATUS_TONE[status]}>{TRIAGE_LABEL[status]}</Pill></span>
            {alert ? (
              <button type="button" onClick={showAlert} data-alert-marker className="inline-flex items-center gap-1.5 rounded-full bg-risk-bg px-[11px] py-[3px] text-xs font-semibold text-risk-ink hover:underline">
                <ShieldAlert size={13} className="ico" aria-hidden="true" />
                {alert.status === "open" ? "Safety alert open" : alert.status === "escalated" ? "Safety alert escalated" : "Safety alert reviewed"}
              </button>
            ) : null}
            {r.priority ? <Pill tone="risk" dot>High priority</Pill> : null}
            {r.urgency !== "routine" ? <Pill tone={r.urgency === "emergent" ? "risk" : "mid"}>{r.urgency === "emergent" ? "Emergent" : "Urgent"}</Pill> : null}
            {details ? null : <Chip>Synthetic record</Chip>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {details ? null : <SaveIndicator />}
            <Button size="sm" icon={PanelRight} onClick={assistant.toggle} aria-pressed={assistant.wide ? assistant.open : undefined} aria-label={assistantLabel} data-assistant-toggle>
              <span className="hidden @4xl:inline">AI Assistant</span>{assistant.needs ? <span className="rounded-full bg-mid-bg px-1.5 text-[11px] font-semibold text-mid-ink">{assistant.needs}</span> : null}
            </Button>
            <Button size="sm" icon={Settings2} onClick={onConfigure} data-configure aria-label={cfg ? "Change configuration" : "Configure intake"} title={cfg ? "Change configuration" : "Configure intake"}><span className="hidden @4xl:inline">{cfg ? "Change configuration" : "Configure intake"}</span></Button>
            <ActionMenu label="Actions" icon={MoreHorizontal} items={menu} />
            <button type="button" onClick={toggleDetails} aria-expanded={details} aria-label={details ? "Hide details" : "Show details"} title={details ? "Hide details" : "Show details"} className="grid h-8 w-8 place-items-center rounded-[10px] text-muted hover:bg-tile hover:text-ink">
              <ChevronUp size={16} className={cn("ico transition-transform", !details && "rotate-180")} />
            </button>
          </div>
        </div>

        {details ? (
          <div className="flex flex-wrap gap-x-5 gap-y-0.5" data-header-facts>
            <Fact label="Payer">{payer?.name ?? "No plan yet"}{member ? <span className="font-normal text-muted"> · {member}</span> : null}</Fact>
            <Fact label="Program">{program}{requested ? <span className="font-normal text-muted"> · Requested: {requested}</span> : null}{!cfg ? <span className="font-normal text-muted"> · Not configured</span> : null}</Fact>
            <Fact label="Purpose">{cfg ? purposeById(cfg.purposeId).label : "Not set"}</Fact>
            <Fact label="Assigned">{staff?.name ?? "Unassigned"}</Fact>
            <Fact label="Site">{siteName(r.site)}</Fact>
            <Fact label="Source">{r.sourceOrg}</Fact>
            <span className="inline-flex items-center gap-3"><Chip>Synthetic record</Chip><SaveIndicator /></span>
          </div>
        ) : null}

        {hideNext ? null : (
          <div className="flex min-w-0 items-center gap-2 text-[13px]" data-next-action>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", next.tone === "risk" ? "bg-risk" : next.tone === "mid" ? "bg-mid" : next.tone === "good" ? "bg-good" : "bg-forest")} aria-hidden="true" />
            <span className="text-muted">Next</span>
            <span className="min-w-0 font-medium">{next.text}</span>
            {next.to || next.configure || next.href ? (
              <button type="button" onClick={doNext} className="inline-flex shrink-0 items-center gap-1 font-semibold text-forest hover:underline">
                {next.label}
                <ArrowRight size={13} className="ico" />
              </button>
            ) : null}
          </div>
        )}
        {details ? <ProgressStrip recordId={r.id} cells={cells} /> : null}
      </div>
      {dialog === "reassign" ? <ReassignDialog record={r} onClose={() => setDialog(null)} /> : null}
      {dialog === "close" ? <CloseDialog record={r} onClose={() => setDialog(null)} /> : null}
    </Card>
  );
}
