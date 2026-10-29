import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pill } from "@/components/ui";
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

export interface Fact {
  label: string;
  value: string;
}

function Row({ label, chip, tone, unknown, children }: { label: string; chip?: string; tone?: Tone; unknown?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-b border-line px-5 py-2.5 last:border-b-0 max-[1100px]:grid-cols-[140px_minmax(0,1fr)] max-[640px]:grid-cols-1">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-ink2">
        {chip ? (
          <Pill tone={unknown ? "neutral" : (tone ?? "neutral")} dot>
            {chip}
          </Pill>
        ) : null}
        {children}
      </dd>
    </div>
  );
}

/** The result in one card: the verdict, the one fact that decides it and the actions; then eligibility, benefits and what this service needs as label and value rows;
    then any warning the rows do not already say, and the facts of the check in one quiet line.
    `rules` and `docs` are the payer's saved configuration from Payers, so the last row follows an edit made there. */
export function ResultSummary({ result, actions, payer, program, rules, docs, plan, facts, warnings }: { result: CheckResult; actions: ReactNode; payer: PayerSummary; program: Program; rules: Rule[]; docs: DocItem[]; plan: string | null; facts: Fact[]; warnings?: ReactNode }) {
  const { verdict, fact } = result;
  const { coverage, benefits, auth } = result.summary;
  const notice = rules.find((r) => r.id === "windows")?.lines[0];
  return (
    <section aria-label="Result" className="overflow-hidden rounded-[20px] border border-edge bg-white">
      <div className={cn("flex flex-col gap-2.5 border-b px-5 py-3", BAND[verdict])}>
        <div role="status" aria-label="Verdict" className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-serif text-[18px] font-semibold leading-tight">{VERDICT_LABEL[verdict]}</span>
          <span className="flex items-baseline gap-2 border-l border-current/25 pl-4">
            <span className="text-[13px] opacity-80">{fact.label}</span>
            <span className="text-[14px] font-semibold">{fact.value}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      <dl aria-label="What the check found">
        <Row label="Eligibility" chip={coverage.chip} tone={coverage.tone} unknown={coverage.unknown}>
          {coverage.line}
        </Row>
        {plan ? <Row label="Plan type and routing">{plan}</Row> : null}
        <Row label="Benefits" chip={benefits.chip} tone={benefits.tone} unknown={benefits.unknown}>
          {[benefits.line, benefits.limit].filter(Boolean).join(" · ")}
        </Row>
        {benefits.pays ? <Row label="Patient pays">{benefits.pays}</Row> : null}
        <Row label="What this service needs" chip={auth.chip} tone={auth.tone} unknown={auth.unknown}>
          <span>{auth.line}</span>
          {!auth.unknown && notice ? (
            <span className="basis-full text-[13px] text-muted">
              {payer.shortName} rules: {notice} · {docs.length} {docs.length === 1 ? "document" : "documents"} on the {PROGRAM_LABEL[program]} list ·{" "}
              <Link to={paths.payers(payer.id, "rules")} className="font-semibold text-forest hover:underline">
                Open {payer.shortName}'s rules
              </Link>
            </span>
          ) : null}
        </Row>
      </dl>
      {warnings ? <div className="border-t border-line px-5 py-3">{warnings}</div> : null}
      <dl aria-label="About this check" className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-[12px]">
        {facts.map((f) => (
          <div key={f.label} className="flex gap-1.5">
            <dt className="text-muted">{f.label}</dt>
            <dd className="text-ink2">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
