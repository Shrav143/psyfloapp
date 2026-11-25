import { useEffect } from "react";
import { BookOpenCheck, Clock3, SearchX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Crumbs, EmptyState, Page } from "@/components/ui";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { payerRows } from "./lib/payers";
import { resolveTab } from "./lib/tabs";
import { stateName } from "./lib/states";
import { PayerContext } from "./PayerContext";
import { RulesInstructionsTab } from "./RulesInstructionsTab";
import { useAllWorkflows } from "./lib/studio";

/** One payer on one page. Above: tell the agents anything Psyflo does not know about this payer (a box and a list of what you have said). Below: the rules Psyflo already follows for it, in groups that open one at a time.
    There is no workflow to build and nothing to test: the agents work from the rules and from what you tell them. A link can still open one rule (?rule=) or one group (?group=). */
export function PayerWorkspace({ id }: { id: string }) {
  const [params] = useSearchParams();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const edits = useStore((s) => s.payerEdits);
  const workflows = useAllWorkflows();
  const { group } = resolveTab(params.get("tab"), params.get("group"));
  const row = payerRows(custom, config, workflows, edits).find((r) => r.id === id);
  const cfg = config[id];
  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  if (!row || !cfg) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="That payer is not in the demo" action={<Link to={paths.payers()}><Button variant="primary">Back to all payers</Button></Link>}>Pick a payer from the list.</EmptyState>
      </Page>
    );
  }
  const reach = payerById(id as never)?.reachedBy ?? cfg.reachedBy;
  return (
    <Page>
      <Crumbs items={[{ label: "Payer settings", to: paths.payers() }, { label: row.name }]} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-serif text-[24px] leading-tight font-semibold">{row.name}</h1>
        <span className="text-[13px] text-muted">{row.product} · {stateName(row.state)}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-1 text-[12px] text-neutral-ink" title="How requests reach this payer">{reach}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-2.5 py-1 text-[12px] text-neutral-ink" title="Notice due"><Clock3 size={13} className="ico" aria-hidden="true" />{cfg.facts.noticeDue}</span>
      </div>
      <PayerContext payerId={id} name={row.shortName} />
      <h2 className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-ink2"><BookOpenCheck size={17} className="ico text-forest" aria-hidden="true" />What Psyflo already knows</h2>
      <RulesInstructionsTab key={`${id}-${group ?? ""}-${params.get("rule") ?? ""}`} payerId={id} name={row.shortName} cfg={cfg} openGroup={group} openRule={params.get("rule")} />
    </Page>
  );
}
