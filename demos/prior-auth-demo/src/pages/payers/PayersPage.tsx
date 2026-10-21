import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Page, PageHeader } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AddPayerModal } from "./AddPayerModal";
import { ChangesTab } from "./ChangesTab";
import { DocumentsTab } from "./DocumentsTab";
import { EditLogDrawer } from "./EditLogDrawer";
import { EditPayerModal } from "./EditPayerModal";
import { payerRows, waitingCount } from "./lib/payers";
import { PayerHeader } from "./PayerHeader";
import { PayerList } from "./PayerList";
import { PayerTabs } from "./PayerTabs";
import { ProcessTab } from "./ProcessTab";
import { RulesTab } from "./RulesTab";

type Tab = "process" | "rules" | "documents" | "changes";
const TABS: Tab[] = ["process", "rules", "documents", "changes"];
const LABEL: Record<Tab, string> = { process: "Process", rules: "Rules", documents: "Documents", changes: "Changes" };

/** Payers: the list on the left, the selected payer's header and four tabs on the right. /payers/:id?tab= picks both. */
export default function PayersPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const edits = useStore((s) => s.payerEdits);
  const [dialog, setDialog] = useState<"edit" | "log" | "add" | null>(null);

  const rows = payerRows(custom);
  const row = rows.find((r) => r.id === id) ?? rows[0];
  const cfg = config[row.id];
  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "process";
  const mine = edits.filter((e) => e.payerId === row.id);
  const waiting = waitingCount(cfg);

  const setTab = (t: Tab) => setParams({ tab: t });

  return (
    <Page>
      <PageHeader title={`${rows.length} payers. The agents know how each one works.`} sub="Workflow, rules and documents for every payer. Change a rule and open drafts can follow." actions={<Button variant="primary" icon={Plus} onClick={() => setDialog("add")}>Add a payer</Button>} />
      <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-5">
        <PayerList rows={rows} config={config} selectedId={row.id} onSelect={(pid) => nav(paths.payers(pid, tab))} />
        <div className="flex flex-col gap-4">
          <PayerHeader row={row} cfg={cfg} edits={mine.length} onEdit={() => setDialog("edit")} onLog={() => setDialog("log")} />
          <PayerTabs<Tab> value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t, label: LABEL[t], waiting: t === "changes" ? waiting : 0 }))} />
          {tab === "process" ? <ProcessTab key={row.id} id={row.id} name={row.shortName} cfg={cfg} onReview={() => setTab("changes")} /> : null}
          {tab === "rules" ? <RulesTab key={row.id} id={row.id} name={row.shortName} cfg={cfg} /> : null}
          {tab === "documents" ? <DocumentsTab key={row.id} id={row.id} name={row.shortName} cfg={cfg} /> : null}
          {tab === "changes" ? <ChangesTab key={row.id} id={row.id} name={row.shortName} cfg={cfg} /> : null}
        </div>
      </div>
      {dialog === "edit" ? <EditPayerModal id={row.id} cfg={cfg} onClose={() => setDialog(null)} /> : null}
      {dialog === "log" ? <EditLogDrawer name={row.name} edits={mine} onClose={() => setDialog(null)} /> : null}
      {dialog === "add" ? <AddPayerModal onClose={() => setDialog(null)} onAdded={(pid) => nav(paths.payers(pid, "process"))} /> : null}
    </Page>
  );
}
