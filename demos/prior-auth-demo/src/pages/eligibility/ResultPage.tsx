import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FolderOpen, PauseCircle, Phone, RefreshCw, ScanText, SearchX, ShieldPlus } from "lucide-react";
import { Banner, Button, Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { needsCaller, type EbPatient } from "@/data/eligibility";
import type { DocItem, Rule } from "@/data/payerConfig";
import { planInfo } from "@/data/payerConfigPlan";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";
import { ago, clockTime, stamp, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectPayerDocs, selectPayerRules } from "@/store/payerConfig";
import { buildResult } from "./checks";
import { patientLabel } from "./chips";
import { BackLinks, useOrigin } from "./origin";
import { autoState, DUE_AT, NOT_RECHECKED, RE_CHECKED } from "./recheck";
import { ResultDetails } from "./ResultDetails";
import { ResultSummary, type Fact } from "./ResultSummary";

/** Start authorization opens New case with the payer, member and program already filled in. */
function startAuthorizationPath(p: EbPatient): string {
  const q = new URLSearchParams({ payer: p.payerId, program: p.program, member: p.memberMasked });
  if (p.initials) q.set("initials", p.initials);
  if (p.age) q.set("age", String(p.age));
  return `${paths.newCase()}?${q.toString()}`;
}

/* A stable empty list for a payer with no saved configuration, so the selectors below never return a new array on each render. */
const NO_RULES: Rule[] = [];
const NO_DOCS: DocItem[] = [];

/** One result: the verdict, eligibility, benefits and what the service needs first; the seven checks and the agents' answers behind a click. */
export default function ResultPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const patient = useStore((s) => s.ebPatients.find((p) => p.id === id));
  const hasRequest = useStore((s) => s.requests.some((r) => r.id === id));
  const busy = useStore((s) => s.ebRechecking.includes(id));
  const recheck = useStore((s) => s.ebRecheck);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);
  const paused = useStore((s) => s.agentPaused.verify);
  const payerId = patient?.payerId ?? "";
  const program = patient?.program ?? "RES";
  const rules = useStore((s) => (s.payerConfig[payerId] ? selectPayerRules(s, payerId) : NO_RULES));
  const docs = useStore((s) => (s.payerConfig[payerId] ? selectPayerDocs(s, payerId, program) : NO_DOCS));
  const origin = useOrigin();
  const result = useMemo(() => (patient ? buildResult(patient) : null), [patient]);

  if (!patient || !result) {
    return (
      <Page>
        <PageHeader title="Coverage check" sub="That check is not in the list." />
        <Card>
          <EmptyState icon={SearchX} title="We could not find that check" action={<Button variant="primary" onClick={() => nav(paths.eligibility())}>Back to Eligibility &amp; Benefits</Button>}>
            It may have been cleared when the demo data was reset.
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const payer = payerById(patient.payerId);
  const v = result.verdict;
  const auto = autoState(patient, clock, paused);
  const live = clock - patient.checkedAt <= 60;
  const checkedClock = clockTime(toDate(patient.checkedAt));
  /* The time checked is on the demo clock. A re-check still to come is said here too, because it is the one thing a person may wait for. */
  const checkedText = auto?.kind === "done" ? RE_CHECKED(auto.at) : live ? `${checkedClock}, live` : `${stamp(patient.checkedAt)}, ${ago(patient.checkedAt, clock)}`;
  const timeChecked = auto && auto.kind !== "done" ? `${checkedText}. ${DUE_AT(auto.at)}` : checkedText;
  const next = auto && auto.kind !== "done" ? [auto.kind === "paused" ? `${DUE_AT(auto.at)}, waiting for Verify to be resumed` : `${DUE_AT(auto.at)}, done by Verify on its own`, ...result.next] : result.next;
  const state = patient.eligibility.state;
  const plan = planInfo(payer);

  const facts: Fact[] = [
    { label: "Payer", value: `${payer.name} (${payer.group})` },
    ...(plan ? [{ label: "Plan type and routing", value: `${plan.label}. ${plan.routing}` }] : []),
    { label: "Member", value: patient.memberMasked },
    { label: "Date of service", value: patient.dos },
    { label: "Time checked", value: timeChecked },
    { label: "Source", value: needsCaller(patient.payerId) ? "Simulated check, confirmed by phone" : "Simulated check against the payer portal" },
  ];

  const actions = (
    <>
      {v === "auth_first" ? (
        <Button variant="primary" icon={ShieldPlus} onClick={() => nav(startAuthorizationPath(patient))}>
          Start authorization
        </Button>
      ) : null}
      {hasRequest ? (
        <Button variant={v === "auth_first" ? "outline" : "primary"} icon={FolderOpen} onClick={() => nav(paths.case(id))}>
          Open case
        </Button>
      ) : !id.startsWith("V-") ? (
        <Button icon={FolderOpen} onClick={() => nav(paths.manager("cases"))}>
          Open in Case Manager
        </Button>
      ) : null}
      {state === "lapsed" ? (
        <Button icon={ScanText} onClick={() => toast({ title: "Retro-eligibility requested", body: `Navigator will ask Ohio Medicaid to restore coverage from ${patient.eligibility.on}. You will be told when it answers.`, tone: "neutral" })}>
          Request retro-eligibility
        </Button>
      ) : null}
      {state === "ended" || state === "not_found" ? (
        <Button icon={Phone} onClick={() => toast({ title: "Caller will phone the payer", body: `Caller will ask ${payer.shortName} about this member and log the call to the case.`, tone: "neutral" })}>
          Ask Caller to phone the payer
        </Button>
      ) : null}
      <Button icon={RefreshCw} loading={busy} onClick={() => recheck(id)}>
        Check again
      </Button>
    </>
  );

  return (
    <Page>
      <BackLinks back={origin.back} />
      <PageHeader title={result.headline} sub={`${patient.id} · ${patientLabel(patient)} · ${patient.levelLabel ?? PROGRAM_LABEL[patient.program]}`} />
      <ResultSummary verdict={v} result={result} actions={actions} payer={payer} program={patient.program} rules={rules} docs={docs} facts={facts} />
      {auto?.kind === "paused" ? (
        <Banner tone="mid" icon={PauseCircle} title={NOT_RECHECKED}>
          The re-check was due {stamp(auto.at)}. It runs as soon as Verify is resumed.
        </Banner>
      ) : null}
      <ResultDetails result={result} nextLines={next} />
    </Page>
  );
}
