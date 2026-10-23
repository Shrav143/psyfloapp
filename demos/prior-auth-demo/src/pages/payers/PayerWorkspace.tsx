import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Crumbs, EmptyState, Page } from "@/components/ui";
import { paths, type PayerTabId } from "@/routes";
import { useStore } from "@/store";
import { EditLogDrawer } from "./EditLogDrawer";
import { EditPayerModal } from "./EditPayerModal";
import { HistoryChangesTab } from "./HistoryChangesTab";
import { useAllWorkflows } from "./lib/studio";
import { payerRows, waitingCount } from "./lib/payers";
import { PAYER_TABS, resolveTab, TAB_LABEL } from "./lib/tabs";
import { PayerHeader } from "./PayerHeader";
import { PayerTabs } from "./PayerTabs";
import { RulesInstructionsTab } from "./RulesInstructionsTab";
import { TestWorkflowTab, WorkflowBuilderTab } from "./studio";
import { Unapplied } from "./Unapplied";

/** One payer: breadcrumb back to the list, the header, and four views. /payers/:id?tab=builder|rules|test|history picks the view.
    The older ids (process, documents, changes) open the matching view; documents also opens the Clinical documentation group. */
export function PayerWorkspace({ id }: { id: string }) {
  const [params, setParams] = useSearchParams();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const edits = useStore((s) => s.payerEdits);
  const workflows = useAllWorkflows();
  const [dialog, setDialog] = useState<"edit" | "log" | null>(null);
  const { tab, group } = resolveTab(params.get("tab"), params.get("group"));
  // Tab changes made by hand never carry the old group along.
  const setTab = (t: PayerTabId) => setParams({ tab: t });

  const row = payerRows(custom, config, workflows, edits).find((r) => r.id === id);
  const cfg = config[id];
  // A payer opened from a bookmark keeps its place at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!row || !cfg) {
    return (
      <Page>
        <EmptyState icon={SearchX} title="That payer is not in the demo" action={<Link to={paths.payers()}><Button variant="primary">Back to all payers</Button></Link>}>
          Pick a payer from the list.
        </EmptyState>
      </Page>
    );
  }
  const mine = edits.filter((e) => e.payerId === id);

  return (
    <Page>
      <Crumbs items={[{ label: "Payers", to: paths.payers() }, { label: row.name }]} />
      <PayerHeader row={row} cfg={cfg} edits={mine.length} onEdit={() => setDialog("edit")} onLog={() => setDialog("log")} />
      <PayerTabs<PayerTabId> value={tab} onChange={setTab} tabs={PAYER_TABS.map((t) => ({ id: t, label: TAB_LABEL[t], waiting: t === "history" ? waitingCount(cfg) : 0 }))} />
      <div id="payer-panel" role="tabpanel" aria-labelledby={`payer-tab-${tab}`} className="flex min-w-0 flex-col gap-4">
        {tab === "rules" || tab === "history" ? <Unapplied id={id} name={row.shortName} cfg={cfg} /> : null}
        {tab === "builder" ? <WorkflowBuilderTab key={id} payerId={id} /> : null}
        {tab === "rules" ? <RulesInstructionsTab key={`${id}-${group ?? ""}`} payerId={id} name={row.shortName} cfg={cfg} openGroup={group} /> : null}
        {tab === "test" ? <TestWorkflowTab key={id} payerId={id} /> : null}
        {tab === "history" ? <HistoryChangesTab key={id} payerId={id} name={row.shortName} cfg={cfg} /> : null}
      </div>
      {dialog === "edit" ? <EditPayerModal id={id} cfg={cfg} onClose={() => setDialog(null)} /> : null}
      {dialog === "log" ? <EditLogDrawer name={row.name} edits={mine} onClose={() => setDialog(null)} /> : null}
    </Page>
  );
}
