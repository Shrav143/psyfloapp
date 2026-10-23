import { Card, CardHeader, Disclosure } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { useVersionsApi } from "./lib/versionsApi";
import { AuditList } from "./history/AuditList";
import { EarlierProcessView } from "./history/EarlierProcessView";
import { PendingChangeCard } from "./history/PendingChange";
import { Suggestions } from "./history/Suggestions";
import { VersionsSection } from "./history/VersionsSection";

/** History & Changes: the change waiting for a person with its impact (first), what changed, the edit audit, Historian's suggestions and the earlier process view.
    Rule changes never rewrite a submitted packet and never move an active case to another workflow version by themselves. */
export function HistoryChangesTab({ payerId, name, cfg }: { payerId: string; name: string; cfg: PayerConfig }) {
  const edits = useStore((s) => s.payerEdits).filter((e) => e.payerId === payerId);
  const versions = useVersionsApi(payerId).rows;
  return (
    <div className="flex flex-col gap-4">
      {cfg.pending ? <PendingChangeCard id={payerId} name={name} cfg={cfg} pending={cfg.pending} /> : <p className="px-1 text-sm text-muted">Nothing is waiting for you. Changes here are demo data, not read from {name}'s policy.</p>}
      <Card>
        <CardHeader title="What changed" />
        {cfg.changes.map((c) => (
          <div key={c.id} className="flex items-start gap-4 border-b border-line px-6 py-3.5 last:border-b-0">
            <span className="w-12 shrink-0 pt-0.5 text-muted">{c.date}</span>
            <div>
              <div className="font-semibold">{c.title}</div>
              <div className="text-[13.5px] text-muted">{c.text}</div>
            </div>
          </div>
        ))}
      </Card>
      <Disclosure title="Workflow versions" summary={versions.length ? `${versions.length} saved ${versions.length === 1 ? "version" : "versions"}, newest first. Latest: ${versions[0].name}, version ${versions[0].version}, ${stamp(versions[0].savedAt)}.` : "No saved versions yet."}>
        <VersionsSection payerId={payerId} />
      </Disclosure>
      <Disclosure title="Edit audit" summary={edits.length ? `${edits.length} ${edits.length === 1 ? "edit" : "edits"}, newest first. Filter by area.` : "No edits yet."}>
        <div className="px-6 py-5"><AuditList edits={edits} /></div>
      </Disclosure>
      <Disclosure title="Suggestions from Historian" summary={cfg.proposals.length ? `${cfg.proposals.length} waiting for you. Nothing changes unless you accept.` : "None waiting. Re-learn from decisions to ask for one."} defaultOpen={cfg.proposals.length > 0}>
        <Suggestions id={payerId} name={name} cfg={cfg} />
      </Disclosure>
      <Disclosure title="Earlier process view (migrated)" summary={`Version ${cfg.workflow.version}, edited ${cfg.workflow.editedOn}. Read only; the Workflow Builder holds the same process.`}>
        <EarlierProcessView name={name} cfg={cfg} />
      </Disclosure>
    </div>
  );
}
