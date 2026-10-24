import { ImportSources } from "@/components/import";
import { FileDrop } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { applyImport } from "./importIntake";
import { useEmrConnected } from "./IntakeSources";
import { sortFiles } from "./readFiles";

/** Everything for this patient goes in one place: drop the files and Reader sorts them onto the list below, or bring notes in from the EMR, an export or a screenshot. */
export function DropPanel({ draft }: { draft: CaseDraft }) {
  const emr = useEmrConnected();
  return (
    <section aria-label="Add documents" className="flex flex-col gap-2">
      <FileDrop hint="Drop the chart, the insurance card and any documents, or click to choose" onFiles={(files) => sortFiles(draft.id, files)} />
      <ImportSources compact target="documents" emr={emr} emrChart={draft.emrChart} onImport={(r) => applyImport(draft.id, r)} />
    </section>
  );
}
