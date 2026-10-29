import { useMemo, useState } from "react";
import { FilePlus2, FileSearch, Sparkles } from "lucide-react";
import { Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { documentsOnRecord } from "@/data/assess/readiness";
import type { IntakeDocument, IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { setDocumentAttach, setDocumentModule } from "../workspace/actions";
import { AddDocumentDialog } from "../workspace/documents/AddDocumentDialog";
import { DocumentDrawer } from "../workspace/documents/DocumentDrawer";
import { DocumentRows } from "../workspace/documents/DocumentRows";
import { summaryDocument } from "../workspace/documents/generate";
import { countByOrigin, ORIGIN_LABEL, ORIGINS, originOf, type DocOrigin } from "../workspace/documents/model";
import { moduleOptions } from "../workspace/documents/moduleOptions";
import { runAgent } from "../lib/agents";
import { FilterChips } from "../workspace/FilterChips";
import { useModel } from "../workspace/useWorkspaceModel";

type Filter = DocOrigin | "all";

/** Documents: everything on file for this intake (referral documents, uploads, what Psyflo generated, authorization attachments) with its type, source, date
    and the module it supports. A switch marks a document to go with the authorization; New Authorization reads it. */
export function DocumentsSection({ record }: { record: IntakeRecord }) {
  const { plan, now } = useModel();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const counts = useMemo(() => countByOrigin(record.documents), [record.documents]);
  const modules = useMemo(() => moduleOptions(record, plan), [record, plan]);
  const docs = record.documents.filter((d) => filter === "all" || originOf(d) === filter);
  const attached = record.documents.filter((d) => d.attach).length;
  const viewDoc = record.documents.find((d) => d.id === viewing);

  const generate = () =>
    runAgent(record.id, {
      role: "documentation", action: "Draft a clinical summary document", section: "review", source: "The intake record", ms: 1000,
      work: () => {
        const s = useStore.getState();
        const cur = s.intakes.find((r) => r.id === record.id);
        if (!cur) return;
        const doc: IntakeDocument = summaryDocument(cur, plan, now, `doc-${record.id}-summary-${Date.now().toString(36)}`);
        s.addIntakeDocument(record.id, doc, "Draft generated from the intake record. A clinician reviews it");
        return `Draft ready in Documents: ${doc.name}`;
      },
    });

  return (
    <div className="flex min-w-0 flex-col gap-4" data-section-view="documents">
      <Card>
        <CardHeader
          title="Documents"
          subtitle={`${documentsOnRecord(record)} on the record · ${attached} marked to attach to the authorization`}
          right={<><Button size="sm" icon={Sparkles} onClick={generate}>Draft a summary</Button><Button size="sm" variant="primary" icon={FilePlus2} onClick={() => setAdding(true)} data-add-document>Add document</Button></>}
        />
        <div className="px-5 pt-3 pb-3">
          <FilterChips<Filter> label="Show documents from" items={[{ id: "all", label: "All", count: counts.all }, ...ORIGINS.map((o) => ({ id: o, label: ORIGIN_LABEL[o], count: counts[o] }))]} value={filter} onChange={setFilter} />
        </div>
        {docs.length ? (
          <DocumentRows docs={docs} sourceOrg={record.sourceOrg} modules={modules} onView={(d) => setViewing(d.id)} onAttach={(d, v) => setDocumentAttach(record.id, d, v)} onModule={(d, m) => setDocumentModule(record.id, d, m)} />
        ) : (
          <EmptyState icon={FileSearch} title={filter === "all" ? "No documents yet" : `No ${ORIGIN_LABEL[filter as DocOrigin].toLowerCase()} documents`}
            action={filter === "all" ? <Button size="sm" variant="primary" icon={FilePlus2} onClick={() => setAdding(true)}>Add a document</Button> : <Button size="sm" onClick={() => setFilter("all")}>Show all documents</Button>}>
            {filter === "all" ? "Add a referral document, a record from another provider or a form." : "Nothing of this kind is on the intake."}
          </EmptyState>
        )}
      </Card>
      {adding ? <AddDocumentDialog record={record} plan={plan} onClose={() => setAdding(false)} onAdded={() => setFilter("all")} /> : null}
      {viewDoc ? <DocumentDrawer doc={viewDoc} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
