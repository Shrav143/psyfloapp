import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FilePlus2, FolderOpen, PanelRightOpen, PauseCircle, Phone, RefreshCw, ScanText, SearchX, Settings, ShieldPlus } from "lucide-react";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { SiteTag } from "@/components/layout/SiteTag";
import { Banner, Button, Card, EmptyState, Page } from "@/components/ui";
import { needsCaller } from "@/data/eligibility";
import type { DocItem, Rule } from "@/data/payerConfig";
import { planInfo } from "@/data/payerConfigPlan";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { dosRangeText, type VerificationException } from "@/data/verification";
import { ago, clockTime, stamp, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { verificationInView } from "@/store/eligibility";
import { selectPayerDocs, selectPayerRules } from "@/store/payerConfig";
import { buildResult } from "./checks";
import { patientLabel } from "./chips";
import { exceptionLines } from "./exceptions";
import { BackLinks, useOrigin } from "./origin";
import { autoState, DUE_AT, NOT_RECHECKED, RE_CHECKED } from "./recheck";
import { checksSummary } from "./ResultDetails";
import { ResultSummary, type Fact } from "./ResultSummary";
import { VerificationDetailsPanel } from "./VerificationDetailsPanel";
import { ExceptionList } from "./VerificationSummary";

/* A stable empty list for a payer with no saved configuration, so the selectors below never return a new array on each render. */
const NO_RULES: Rule[] = [];
const NO_DOCS: DocItem[] = [];
/** Warnings the result's own rows already say (coverage and its dates, the plan it is with, the benefit, the authorization rule). Listed once, in the row. */
const SAID_IN_ROWS: VerificationException[] = ["coverage_inactive", "payer_changed", "member_id_mismatch", "benefit_unconfirmed", "service_not_covered", "requirement_unknown"];

/** One result: the verdict with the fact behind it and the actions, then eligibility, benefits and what the service needs as rows.
    Payment checks, how it was checked and History are in the details panel. */
export default function ResultPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const rec = useStore((s) => s.verifications[id]);
  const inView = useStore((s) => (s.verifications[id] ? verificationInView(s, s.verifications[id]) : false));
  const hasRequest = useStore((s) => s.requests.some((r) => r.id === id));
  const busy = useStore((s) => s.ebRechecking.includes(id));
  const refresh = useStore((s) => s.refreshVerification);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused.verify);
  const [panel, setPanel] = useState(false);
  const patient = rec?.row;
  const payerId = patient?.payerId ?? "";
  const program = patient?.program ?? "RES";
  const rules = useStore((s) => (s.payerConfig[payerId] ? selectPayerRules(s, payerId) : NO_RULES));
  const docs = useStore((s) => (s.payerConfig[payerId] ? selectPayerDocs(s, payerId, program) : NO_DOCS));
  const origin = useOrigin();
  const result = useMemo(() => (patient ? buildResult(patient) : null), [patient]);

  if (!rec || !patient || !result) {
    return (
      <Page>
        <BackLinks back={null} />
        <Card>
          <EmptyState icon={SearchX} title="We could not find that check" action={<Button variant="primary" onClick={() => nav(paths.eligibility())}>Back to Eligibility &amp; Benefits</Button>}>
            It may have been cleared when the demo data was reset.
          </EmptyState>
        </Card>
      </Page>
    );
  }
  if (!inView) return <OutOfSite id={id} what="coverage check" />;

  const payer = payerById(patient.payerId);
  const v = result.verdict;
  const state = patient.eligibility.state;
  const auto = autoState(patient, clock, paused);
  const live = clock - patient.checkedAt <= 60;
  const checkedClock = clockTime(toDate(patient.checkedAt));
  /* The time checked is on the demo clock. A re-check still to come is said here too, because it is the one thing a person may wait for. */
  const checkedText = auto?.kind === "done" ? RE_CHECKED(auto.at) : live ? `${checkedClock}, live` : `${stamp(patient.checkedAt)}, ${ago(patient.checkedAt, clock)}`;
  const timeChecked = state === "unavailable" ? "Not checked" : auto && auto.kind !== "done" ? `${checkedText}. ${DUE_AT(auto.at)}` : checkedText;
  const plan = planInfo(payer);
  const facts: Fact[] = [
    { label: "Member", value: patient.memberMasked },
    { label: "Dates of service", value: dosRangeText(patient) },
    { label: "Time checked", value: timeChecked },
    { label: "Source", value: needsCaller(patient.payerId) ? "Simulated check, confirmed by phone" : "Simulated check against the payer portal" },
  ];
  const said = new Set<VerificationException>([...SAID_IN_ROWS, ...(result.fact.id === "bill" ? (["provider_unresolved"] as const) : []), ...(state === "unavailable" ? (["service_unavailable"] as const) : [])]);
  const warn = exceptionLines(rec).some((l) => !said.has(l.code));
  /* The agents' follow-ups are simulated: a toast says who does what. */
  const ask = (title: string, body: string) => () => toast({ title, body, tone: "neutral" });

  const actions = (
    <>
      {v === "auth_first" ? (
        <Button size="sm" variant="primary" icon={ShieldPlus} onClick={() => nav(paths.newCase({ verification: id, type: "initial" }))}>
          Start authorization
        </Button>
      ) : null}
      <Button size="sm" icon={FilePlus2} onClick={() => nav(paths.newCase({ verification: id }))}>
        Create authorization from verification
      </Button>
      {state === "lapsed" ? (
        <Button size="sm" icon={ScanText} onClick={ask("Retro-eligibility requested", `Navigator will ask Virginia Medicaid to restore coverage from ${patient.eligibility.on}. You will be told when it answers.`)}>
          Request retro-eligibility
        </Button>
      ) : null}
      {state === "ended" || state === "not_found" ? (
        <Button size="sm" icon={Phone} onClick={ask("Caller will phone the payer", `Caller will ask ${payer.shortName} about this member and log the call to the case.`)}>
          Ask Caller to phone the payer
        </Button>
      ) : null}
      {patient.benefits === "needs_confirmation" && state !== "unavailable" ? (
        <Button size="sm" icon={Phone} onClick={ask("Caller will confirm the benefit", `Caller will confirm the ${PROGRAM_LABEL[patient.program]} benefit with ${payer.shortName} and log the call.`)}>
          Ask Caller to confirm the benefit
        </Button>
      ) : null}
      {patient.networkUnresolved && state !== "unavailable" ? (
        <Button size="sm" icon={ScanText} onClick={ask("Navigator will check the enrollment", `Navigator will check the clinic's enrollment record with ${payer.shortName}.`)}>
          Ask Navigator to check enrollment
        </Button>
      ) : null}
      {state === "unavailable" ? (
        <Button size="sm" icon={Settings} onClick={() => nav(paths.settings())}>
          Open Settings
        </Button>
      ) : null}
      {hasRequest ? (
        <Button size="sm" icon={FolderOpen} onClick={() => nav(paths.case(id))}>
          Open case
        </Button>
      ) : !id.startsWith("V-") ? (
        <Button size="sm" icon={FolderOpen} onClick={() => nav(paths.authorizations())}>
          Open in Authorizations
        </Button>
      ) : null}
      <Button size="sm" icon={RefreshCw} loading={busy} onClick={() => refresh(id)}>
        Re-check
      </Button>
    </>
  );

  return (
    <Page>
      <BackLinks back={origin.back} />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-serif text-[24px] font-semibold leading-[1.2] tracking-tight">{patient.id}</h1>
        <span className="text-[14px] text-ink2">{patientLabel(patient)}</span>
        <span className="text-[13px] text-muted">
          {patient.levelLabel ?? PROGRAM_LABEL[patient.program]} · {payer.name} ({payer.group})
        </span>
        <SiteTag />
      </div>
      <ResultSummary
        result={result}
        actions={actions}
        payer={payer}
        program={patient.program}
        rules={rules}
        docs={docs}
        plan={plan ? `${plan.label}. ${plan.routing}` : null}
        facts={facts}
        warnings={warn ? <ExceptionList record={rec} omit={said} /> : undefined}
      />
      {auto?.kind === "paused" ? (
        <Banner
          tone="mid"
          icon={PauseCircle}
          title={NOT_RECHECKED}
          action={
            <Link to={paths.settings()} className="text-[13px] font-semibold underline underline-offset-[3px]">
              Open Settings
            </Link>
          }
        >
          Due {stamp(auto.at)}
        </Banner>
      ) : null}
      <section aria-label="More about this check" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[20px] border border-edge bg-white px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <h2 className="font-serif text-[18px] font-semibold leading-tight">Verification details</h2>
          <span className="text-[13px] text-muted">Payment checks: {checksSummary(result)}</span>
        </div>
        <Button size="sm" icon={PanelRightOpen} onClick={() => setPanel(true)}>
          View full verification details
        </Button>
      </section>
      <VerificationDetailsPanel record={rec} open={panel} onClose={() => setPanel(false)} />
    </Page>
  );
}
