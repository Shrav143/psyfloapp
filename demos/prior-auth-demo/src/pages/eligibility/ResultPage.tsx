import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, ChevronDown, FolderOpen, Phone, RefreshCw, ScanText, SearchX, ShieldPlus } from "lucide-react";
import { AgentBadge, Button, Card, CardHeader, EmptyState, Page, PageHeader, Pill } from "@/components/ui";
import { VERDICT_LABEL, type EbPatient, type Verdict } from "@/data/eligibility";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { clockTime, toDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { buildResult, type AgentLine } from "./checks";
import { patientLabel } from "./chips";
import { PaymentChecks } from "./PaymentChecks";

const BANNER: Record<Verdict, { box: string; tone: Tone }> = {
  cleared: { box: "border-good-edge bg-good-bg text-good-ink", tone: "good" },
  auth_first: { box: "border-mid-edge bg-mid-bg text-mid-ink", tone: "mid" },
  fix: { box: "border-risk-edge bg-risk-bg text-risk-ink", tone: "risk" },
};

const secs = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

function AgentsChecked({ agents }: { agents: AgentLine[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card>
      <CardHeader title="What the agents checked" />
      <ul>
        {agents.map((a, i) => (
          <li key={a.label} className="border-b border-line last:border-b-0">
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-6 py-2.5 text-left hover:bg-[#FBF8F3]">
              <AgentBadge agent={a.agent} size={30} />
              <span className="flex-1">{a.label}</span>
              <span className="text-xs text-muted">{secs(a.secs)}</span>
              <ChevronDown size={15} className={cn("ico text-faint transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i ? <div className="psy-fade-up mx-6 mb-3 rounded-lg bg-tile px-3 py-2 text-[13px] text-ink2">{a.answer}</div> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Start authorization opens New case with the payer, member and program already filled in. */
function startAuthorizationPath(p: EbPatient): string {
  const q = new URLSearchParams({ payer: p.payerId, program: p.program, member: p.memberMasked });
  if (p.initials) q.set("initials", p.initials);
  if (p.age) q.set("age", String(p.age));
  return `${paths.newCase()}?${q.toString()}`;
}

/** One verdict and the seven checks behind it. */
export default function ResultPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const patient = useStore((s) => s.ebPatients.find((p) => p.id === id));
  const hasRequest = useStore((s) => s.requests.some((r) => r.id === id));
  const busy = useStore((s) => s.ebRechecking.includes(id));
  const recheck = useStore((s) => s.ebRecheck);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clock);
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
  const live = clock - patient.checkedAt <= 60;
  const stampText = live ? `Checked live at ${clockTime(toDate(patient.checkedAt))}` : `Last checked ${clockTime(toDate(patient.checkedAt))}, ${Math.round((clock - patient.checkedAt) / 1440)} d ago`;
  const state = patient.eligibility.state;

  return (
    <Page>
      <Link to={paths.eligibility()} className="-mb-1.5 flex w-fit items-center gap-1.5 text-muted hover:text-ink">
        <ArrowLeft size={14} className="ico" />
        Eligibility &amp; Benefits
      </Link>
      <PageHeader title={result.headline} sub={`${patient.id} · ${patientLabel(patient)} · ${payer.name} · ${patient.levelLabel ?? PROGRAM_LABEL[patient.program]} · Date of service ${patient.dos}`} />
      <div className={cn("flex items-center gap-5 rounded-[20px] border px-7 py-5", BANNER[v].box)} role="status">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium tracking-[0.1em] uppercase">Verdict</div>
          <div className="mt-0.5 font-serif text-[28px] font-semibold leading-tight">{VERDICT_LABEL[v]}</div>
          <p className="mt-1 max-w-[720px] text-[14.5px]">{result.reason}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2.5">
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
            <Button icon={FolderOpen} onClick={() => nav(paths.manager("ledger"))}>
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
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <Card>
          <CardHeader title="Payment checks" subtitle="Every line has to pass for the clinic to be reimbursed" right={<Pill tone="neutral" dot>{stampText}</Pill>} />
          <PaymentChecks result={result} />
        </Card>
        <div className="flex flex-col gap-4">
          <AgentsChecked agents={result.agents} />
          <Card>
            <CardHeader title="Next checks" />
            <ul className="flex flex-col gap-2.5 px-6 py-[18px]">
              {result.next.map((n) => (
                <li key={n} className="flex items-center gap-2.5 text-sm">
                  <CalendarClock size={16} className="ico text-muted" />
                  {n}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}
