import { Link } from "react-router-dom";
import { Pill } from "@/components/ui";
import { paths } from "@/routes";
import { joinWords } from "../lib/checker";
import type { ChangeImpact } from "../lib/impact";

const TONE = { published: "good", draft: "mid", archived: "neutral" } as const;
const LABEL = { published: "Published", draft: "Draft", archived: "Archived" } as const;

/** Who and what the change reaches: the payer's workflows that apply the rule, the open cases (each keeps the workflow version it follows), and the owner.
    Nothing here is applied; it is the list a person reviews before "Review & apply changes". */
export function ImpactPanel({ id, impact }: { id: string; impact: ChangeImpact }) {
  const { workflows, cases, owners } = impact;
  return (
    <div className="mt-3 rounded-xl bg-white/70 px-3.5 py-3 text-[13px]">
      <div className="text-[11px] font-medium tracking-[0.08em] uppercase">Impact</div>
      <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-0 @md:grid-cols-[130px_minmax(0,1fr)] @md:gap-y-1.5">
        <dt className="mt-1.5 font-medium @md:mt-0">Workflows</dt>
        <dd>
          {workflows.length ? (
            <ul className="flex flex-col gap-1">
              {workflows.map((w) => (
                <li key={`${w.id}-${w.draftOfNext}`} className="flex flex-wrap items-center gap-2">
                  <Link to={paths.payers(id, "builder")} className="font-semibold underline-offset-2 hover:underline">{w.name}</Link>
                  <span className="text-muted">version {w.version}{w.draftOfNext ? ", next draft" : ""}</span>
                  <Pill tone={TONE[w.status]}>{LABEL[w.status]}</Pill>
                </li>
              ))}
            </ul>
          ) : "No workflow of this payer applies the rule yet."}
        </dd>
        <dt className="mt-1.5 font-medium @md:mt-0">Open cases</dt>
        <dd>
          {cases.length ? (
            <ul className="flex flex-col gap-0.5">
              {cases.map((c) => (
                <li key={c.id}>
                  <b className="font-semibold">{c.id}</b> ({c.patient})
                  {c.workflowName ? <span className="text-muted"> follows {c.workflowName}, version {c.version}, until a person reviews it.</span> : null}
                  {c.redrafted ? <span className="text-muted"> Not sent yet: applying redrafts it for a new signature.</span> : null}
                </li>
              ))}
            </ul>
          ) : "None. No open case is affected."}
        </dd>
        <dt className="mt-1.5 font-medium @md:mt-0">Owner notice</dt>
        <dd>{owners.length ? `${joinWords(owners)} ${owners.length === 1 ? "owns" : "own"} the affected ${workflows.length === 1 ? "workflow" : "workflows"}. ` : ""}{impact.noticeInBell ? "Sentinel's notice is in the bell." : "The change shows on the Payers badge and on this page."}</dd>
      </dl>
    </div>
  );
}
