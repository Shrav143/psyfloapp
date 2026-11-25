import { useMemo, useState } from "react";
import { MessageSquarePlus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, EmptyState, Page, PageHeader, SearchInput } from "@/components/ui";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { AddPayerModal } from "./AddPayerModal";
import { stateName } from "./lib/states";
import { useAllWorkflows } from "./lib/studio";
import { payerRows } from "./lib/payers";

/** Payers: a plain list. Open one to tell the agents what Psyflo does not know about it. */
export function PayersLandingPage() {
  const nav = useNavigate();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const edits = useStore((s) => s.payerEdits);
  const notes = useStore((s) => s.payerNotes);
  const workflows = useAllWorkflows();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const rows = useMemo(() => payerRows(custom, config, workflows, edits), [custom, config, workflows, edits]);
  const shown = rows.filter((r) => !q.trim() || `${r.name} ${r.org} ${r.product}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Page>
      <PageHeader title="Payers" sub="Open a payer to tell the agents anything Psyflo does not know about it." actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add a payer</Button>} />
      <Card className="overflow-hidden">
        <div className="px-6 pt-5 pb-4"><SearchInput className="max-w-[340px]" value={q} onChange={setQ} placeholder="Search payers" /></div>
        {shown.length ? (
          <ul aria-label="Payers" data-testid="payers-list">
            {shown.map((r) => {
              const n = notes.filter((x) => x.payerId === r.id && x.active).length;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => nav(paths.payers(r.id))} data-payer={r.id} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-6 py-3.5 text-left hover:bg-tile">
                    <span className="min-w-[200px] flex-1">
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted">{r.product} · {stateName(r.state)}</span>
                    </span>
                    <span className="text-[13px] text-ink2">{r.group}</span>
                    <span className={n ? "inline-flex items-center gap-1.5 rounded-full bg-sage-bg px-2.5 py-1 text-[12px] font-semibold text-forest" : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-faint"} title={n ? `${n} note${n === 1 ? "" : "s"} from you for the agents` : "Nothing added for the agents yet"}>
                      <MessageSquarePlus size={14} className="ico" aria-hidden="true" />{n}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-t border-line"><EmptyState title="No payer matches" action={<Button size="sm" onClick={() => setQ("")}>Clear search</Button>}>Try a different word.</EmptyState></div>
        )}
      </Card>
      {adding ? <AddPayerModal onClose={() => setAdding(false)} onAdded={(pid) => nav(paths.payers(pid))} /> : null}
    </Page>
  );
}
