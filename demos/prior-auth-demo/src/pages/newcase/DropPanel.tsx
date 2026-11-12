import { Sparkles } from "lucide-react";
import { ImportSources } from "@/components/import";
import { Button, FileDrop } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { applyImport } from "./importIntake";
import { applySampleChart } from "./intake";
import { useEmrConnected } from "./useEmrConnected";
import { sortFiles } from "./readFiles";

/** Everything for this patient goes in one place: drop the files and Reader sorts them onto the list below, or bring notes in from the EMR, an export or a screenshot. */
export function DropPanel({ draft }: { draft: CaseDraft }) {
  const emr = useEmrConnected();
  /* A request prepared from an intake record adds a file by its name and type only. The imports and the sample chart bring canned content in, so they are not offered. */
  if (draft.intakeId) {
    return (
      <section aria-label="Add documents" className="flex flex-col gap-2">
        <FileDrop hint="Add a file by dropping it here or clicking to choose. Only its name and type are kept; files are not read" onFiles={(files) => sortFiles(draft.id, files)} />
      </section>
    );
  }
  return (
    <section aria-label="Add documents" className="flex flex-col gap-2">
      <FileDrop hint="Drop the chart, the insurance card and any documents, or click to choose" onFiles={(files) => sortFiles(draft.id, files)} />
      <ImportSources
        compact
        target="documents"
        emr={emr}
        emrChart={draft.emrChart}
        onImport={(r) => applyImport(draft.id, r)}
        extra={
          <Button size="sm" variant="ghost" icon={Sparkles} onClick={() => applySampleChart(draft.id)}>
            Use sample chart
          </Button>
        }
      />
    </section>
  );
}
