import { Drawer, DocumentSheet } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import type { Finding } from "./lib/analysis";
import type { DenialView } from "./lib/useDenialView";

/** The chart excerpt behind a finding, in the same paper style used elsewhere. */
export function SourceDrawer({ view, finding, onClose }: { view: DenialView; finding: Finding; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} width={560} title={finding.source} subtitle="From the chart. Reader found this and removed identifiers.">
      <DocumentSheet
        highlightId="evidence"
        blocks={[
          { kind: "letterhead", org: "Clinical record excerpt", sub: "Identifiers removed" },
          { kind: "title", text: finding.source },
          { kind: "meta", items: [["Member", `${view.req.patient.initials}, ${view.req.patient.age}`], ["Program", PROGRAM_LABEL[view.req.program]]] },
          { kind: "p", text: finding.excerpt, id: "evidence" },
        ]}
      />
    </Drawer>
  );
}
