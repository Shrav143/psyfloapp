import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, AudioLines, CircleCheck, CircleDashed, CircleDot, Mic, MinusCircle, SearchX } from "lucide-react";
import { Button, Card, CardBody, Chip, Crumbs, EmptyState, Page, Pill } from "@/components/ui";
import { SECTION_LABEL, SECTION_ORDER, TRIAGE_LABEL, type IntakeRecord, type IntakeSectionId, type TriageStatus } from "@/data/intake/types";
import { staffOf } from "@/data/intake/seed";
import { payerById } from "@/data/seed";
import { siteName } from "@/data/sites";
import { PERIOD_LABEL, periodOf } from "@/data/va/policy";
import { serviceById } from "@/data/va/services";
import { cn } from "@/lib/cn";
import { useScope } from "@/lib/scope";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { Tone } from "@/data/types";
import { AssistantPanel } from "./assistant/AssistantPanel";
import { sectionState, type SectionState } from "./lib/status";
import { useIntakeNow } from "./lib/policyNow";
import { SafetyBanner } from "./queue/SafetyBanner";
import { ScribePanel } from "./scribe/ScribePanel";
import { AssessmentSection } from "./sections/AssessmentSection";
import { CansSection } from "./sections/CansSection";
import { CoverageSection } from "./sections/CoverageSection";
import { PathwaySection } from "./sections/PathwaySection";
import { ProfileSection } from "./sections/ProfileSection";
import { ReferralSection } from "./sections/ReferralSection";
import { ReviewSection } from "./sections/ReviewSection";
import { VoicePanel } from "./voice/VoicePanel";

export const TRIAGE_TONE: Record<TriageStatus, Tone> = { new: "mid", needs_info: "mid", ready_screening: "neutral", clinical_review: "risk", accepted: "good", redirected: "neutral", declined: "neutral", closed: "neutral" };

const SECTION_VIEW: Record<IntakeSectionId, (p: { record: IntakeRecord }) => React.ReactNode> = {
  referral: ReferralSection, profile: ProfileSection, coverage: CoverageSection, assessment: AssessmentSection, cans: CansSection, pathway: PathwaySection, review: ReviewSection,
};
const STATE_ICON: Record<SectionState, { icon: typeof CircleCheck; cls: string; label: string }> = {
  done: { icon: CircleCheck, cls: "text-good", label: "Complete" },
  attention: { icon: CircleDot, cls: "text-mid", label: "Needs attention" },
  todo: { icon: CircleDashed, cls: "text-faint", label: "Not started" },
  na: { icon: MinusCircle, cls: "text-faint", label: "Not applicable" },
};

/** One intake record: the workflow sections on the left, the active section in the middle, the Psyflo AI Assistant on the right.
    ?section= picks the section; ?panel=scribe or ?panel=voice opens the AI Scribe or the Voice Intake Assistant over it. */
export default function IntakeRecordPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const record = useStore((s) => s.intakes.find((r) => r.id === id));
  const scope = useScope();
  const now = useIntakeNow();
  const section = (SECTION_ORDER as string[]).includes(params.get("section") ?? "") ? (params.get("section") as IntakeSectionId) : "referral";
  const panel = params.get("panel");
  const setQ = (k: string, v: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  if (!record) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="Intake not found" action={<Button onClick={() => nav(paths.intake())}>Back to Intake</Button>}>
          There is no intake {id} in this demo.
        </EmptyState>
      </Page>
    );
  }
  if (!scope.sites.includes(record.site)) {
    return (
      <Page>
        <Card className="mx-auto mt-10 max-w-[560px]">
          <CardBody className="py-10 text-center">
            <h2 className="text-[18px] font-semibold">This intake is not available at {scope.label}</h2>
            <p className="mt-2 text-[14px] text-ink2">It belongs to another site. Access follows the sites you may see (minimum necessary).</p>
            <Button className="mt-4" onClick={() => nav(paths.intake())}>Back to Intake</Button>
          </CardBody>
        </Card>
      </Page>
    );
  }

  const svc = serviceById(record.serviceId);
  const period = periodOf(record.serviceId, record.serviceDate, now, !!record.legacy);
  const payer = record.payerId ? payerById(record.payerId) : null;
  const staff = staffOf(record.assignedTo);
  const View = SECTION_VIEW[section];

  return (
    <Page>
      <Crumbs items={[{ label: "Authorizations", to: paths.authorizations() }, { label: "Intake", to: paths.intake() }, { label: record.id }]} />
      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold leading-tight tracking-tight">{record.id}</h1>
              <span className="text-[16px] text-ink2">· {record.initials || "No patient yet"}{record.age !== null ? `, ${record.age}` : ""}</span>
              <Pill tone={TRIAGE_TONE[record.triage]}>{TRIAGE_LABEL[record.triage]}</Pill>
              {record.priority ? <Pill tone="risk" dot>High priority</Pill> : null}
              {record.urgency !== "routine" ? <Pill tone={record.urgency === "emergent" ? "risk" : "mid"}>{record.urgency === "emergent" ? "Emergent" : "Urgent"}</Pill> : null}
              <Chip>Synthetic record</Chip>
            </div>
            <p className="mt-1 text-[14px] text-ink2">{record.title}</p>
            <p className="mt-1 text-[13px] text-muted">
              {[svc.label + (svc.code ? ` (${svc.code})` : ""), payer?.name ?? "No payer yet", siteName(record.site), `Planned start ${shortDate(record.serviceDate)}`, staff ? `Assigned to ${staff.name}` : null].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={period === "transition" ? "mid" : period === "preparation" ? "neutral" : "good"}>{PERIOD_LABEL[period]}</Pill>
              {record.legacy ? <span className="text-[12px] text-muted">Current {serviceById(record.legacy.serviceId).short} authorization {record.legacy.authorizationId} ends {shortDate(record.legacy.authEnds)}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button icon={Mic} variant="primary" onClick={() => setQ("panel", "scribe")}>Start AI Scribe</Button>
            <Button icon={AudioLines} onClick={() => setQ("panel", "voice")}>Voice Intake Assistant</Button>
            <Link to={paths.intake()} className="inline-flex items-center gap-1.5 px-2 text-[13px] font-semibold text-forest hover:underline">
              <ArrowLeft size={15} className="ico" />
              Back to Intake
            </Link>
          </div>
        </CardBody>
      </Card>
      <SafetyBanner record={record} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 min-[1280px]:grid-cols-[208px_minmax(0,1fr)_300px]">
        <nav aria-label="Intake sections" className="min-w-0 min-[1280px]:sticky min-[1280px]:top-4 min-[1280px]:self-start">
          <ol className="flex gap-1.5 overflow-x-auto pb-1 min-[1280px]:flex-col min-[1280px]:overflow-visible">
            {SECTION_ORDER.map((s, i) => {
              const st = STATE_ICON[sectionState(record, s)];
              const on = s === section;
              return (
                <li key={s} className="shrink-0">
                  <button type="button" aria-current={on ? "step" : undefined} onClick={() => setQ("section", s)} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap", on ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
                    <span className={cn("w-4 text-[11px] tabular-nums", on ? "text-white/80" : "text-muted")}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{SECTION_LABEL[s]}</span>
                    <st.icon size={15} className={cn("ico", on ? "text-white" : st.cls)} aria-label={st.label} />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="min-w-0">
          <View record={record} />
        </div>
        <aside aria-label="Psyflo AI Assistant" className="min-w-0 min-[1280px]:sticky min-[1280px]:top-4 min-[1280px]:self-start">
          <AssistantPanel record={record} />
        </aside>
      </div>
      {panel === "scribe" ? <ScribePanel record={record} onClose={() => setQ("panel", null)} /> : null}
      {panel === "voice" ? <VoicePanel record={record} onClose={() => setQ("panel", null)} /> : null}
    </Page>
  );
}
