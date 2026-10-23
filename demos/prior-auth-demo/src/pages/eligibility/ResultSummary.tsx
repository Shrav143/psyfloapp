import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Label, Pill } from "@/components/ui";
import { VERDICT_LABEL, type Verdict } from "@/data/eligibility";
import type { DocItem, Rule } from "@/data/payerConfig";
import { PROGRAM_LABEL, type PayerSummary, type Program, type Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import type { CheckResult } from "./checks";

const BAND: Record<Verdict, string> = {
  cleared: "border-good-edge bg-good-bg text-good-ink",
  auth_first: "border-mid-edge bg-mid-bg text-mid-ink",
  fix: "border-risk-edge bg-risk-bg text-risk-ink",
  unchecked: "border-tile-edge bg-tile text-ink2",
};

function Part({ label, chip, tone, unknown, children }: { label: string; chip: string; tone: Tone; unknown?: boolean; children: ReactNode }) {
  return (
    <section aria-label={label} className="bg-white px-7 py-5">
      <Label>{label}</Label>
      <div className="mt-2">
        <Pill tone={unknown ? "neutral" : tone} dot>
          {chip}
        </Pill>
      </div>
      <div className="mt-2 flex flex-col gap-1 text-sm text-ink2">{children}</div>
    </section>
  );
}

const quiet = "text-[13px] text-muted";

export interface Fact {
  label: string;
  value: string;
}

/** The first thing on a result: the verdict with its actions, then eligibility, benefits and what this service needs, then one facts line and one plain note.
    `need` carries the payer's saved rules, read from Payers, so the line follows an edit made there. */
export function ResultSummary({ verdict, result, actions, payer, program, rules, docs, facts, warnings }: { verdict: Verdict; result: CheckResult; actions: ReactNode; payer: PayerSummary; program: Program; rules: Rule[]; docs: DocItem[]; facts: Fact[]; warnings?: ReactNode }) {
  const { coverage, benefits, auth } = result.summary;
  const notice = rules.find((r) => r.id === "windows")?.lines[0];
  return (
    <section aria-label="Result" className="overflow-hidden rounded-[20px] border border-edge bg-white">
      <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-4 border-b px-7 py-5", BAND[verdict])} role="status">
        <div className="min-w-[260px] flex-1">
          <div className="text-[11px] font-medium tracking-[0.1em] uppercase">Verdict</div>
          <div className="mt-0.5 font-serif text-[24px] font-semibold leading-tight">{VERDICT_LABEL[verdict]}</div>
          <p className="mt-1 max-w-[720px] text-[14px]">{result.reason}</p>
        </div>
        <div className="flex max-w-full flex-wrap gap-2.5">{actions}</div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-px bg-line">
        <Part label="Eligibility" chip={coverage.chip} tone={coverage.tone}>
          <p>{coverage.line}</p>
        </Part>
        <Part label="Benefits" chip={benefits.chip} tone={benefits.tone} unknown={benefits.unknown}>
          <p>{benefits.line}</p>
          {benefits.limit ? <p className={quiet}>{benefits.limit}</p> : null}
          {benefits.pays ? <p className={quiet}>Patient pays: {benefits.pays}</p> : null}
        </Part>
        <Part label="What this service needs" chip={auth.chip} tone={auth.tone} unknown={auth.unknown}>
          <p>{auth.line}</p>
          {!auth.unknown && notice ? (
            <p className={quiet}>
              {payer.shortName}'s saved rules (demo data): {notice}. {docs.length} {docs.length === 1 ? "document" : "documents"} on the {PROGRAM_LABEL[program]} list.{" "}
              <Link to={paths.payers(payer.id, "rules")} className="font-semibold text-forest hover:underline">
                Open {payer.shortName}'s rules
              </Link>
            </p>
          ) : null}
        </Part>
      </div>
      {warnings ? <div className="border-t border-line px-7 py-4">{warnings}</div> : null}
      <div className="flex flex-col gap-1.5 border-t border-line px-7 py-4">
        <dl aria-label="About this check" className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          {facts.map((f) => (
            <div key={f.label} className="flex gap-1.5">
              <dt className="text-faint">{f.label}</dt>
              <dd className="text-ink2">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted">Active coverage does not mean this service is covered. Check the benefits and the authorization requirement.</p>
      </div>
    </section>
  );
}
