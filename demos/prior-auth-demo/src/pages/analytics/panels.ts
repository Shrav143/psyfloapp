import { createContext, useContext } from "react";
import type { BuiltInPayerId } from "@/data/types";
import type { CaseQuery } from "./query";

/* The right-hand panels stack: a payer's analysis can open a case list, and a case list can open one case. Escape closes the top one. */
export type PanelState = { kind: "payer"; payer: BuiltInPayerId } | { kind: "cases"; query: CaseQuery } | { kind: "case"; id: string };

export interface PanelApi {
  open: (panel: PanelState) => void;
}
export const PanelContext = createContext<PanelApi>({ open: () => {} });
export const usePanels = (): PanelApi => useContext(PanelContext);

/** Widths, so each layer sits a little inside the one below it and the stack can be seen. */
export const PANEL_WIDTH = { payer: 780, cases: 720, case: 620 } as const;
