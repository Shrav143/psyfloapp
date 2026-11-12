import { useMemo } from "react";
import type { Decision } from "@/data/decisions";
import type { Scope } from "@/lib/scope";
import { CasePanel } from "./CasePanel";
import { CaseListPanel } from "./CaseListPanel";
import type { Filters } from "./filters";
import { PANEL_WIDTH, type PanelState } from "./panels";
import { PayerPanel } from "./PayerPanel";
import { rowsForQuery } from "./query";

/** The stack of right-hand panels, bottom first. Each layer is its own Drawer, so Escape closes the top one and the one below shows again. */
export function PanelsHost({ stack, scoped, filters, scope, onOpen, onClose }: { stack: PanelState[]; scoped: Decision[]; filters: Filters; scope: Scope; onOpen: (p: PanelState) => void; onClose: () => void }) {
  const byId = useMemo(() => new Map(scoped.map((d) => [d.id, d])), [scoped]);
  return (
    <>
      {stack.map((p, i) => {
        const top = i === stack.length - 1;
        const close = top ? onClose : () => undefined;
        if (p.kind === "payer") {
          return <PayerPanel key={`payer-${i}`} payer={p.payer} scoped={scoped} filters={filters} siteLabel={scope.label} width={PANEL_WIDTH.payer} onCases={(query) => onOpen({ kind: "cases", query })} onCase={(d) => onOpen({ kind: "case", id: d.id })} onClose={close} />;
        }
        if (p.kind === "cases") {
          return <CaseListPanel key={`cases-${i}`} query={p.query} rows={rowsForQuery(scoped, filters, p.query)} filters={filters} siteLabel={scope.label} width={PANEL_WIDTH.cases} onOpenCase={(d) => onOpen({ kind: "case", id: d.id })} onClose={close} />;
        }
        const d = byId.get(p.id);
        return d ? <CasePanel key={`case-${i}`} d={d} width={PANEL_WIDTH.case} onClose={close} /> : null;
      })}
    </>
  );
}
