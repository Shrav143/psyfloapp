import { createContext, useContext } from "react";
import type { PayerRule, RuleGroup, Program, RequestType } from "@/data/workflow/types";

/** What the side-panel editors need to know about the workflow they edit: whose payer it is, which documents it can ask for and which central rules exist. */
export interface StudioDoc { id: string; title: string; requirement: string; services: Program[] }
export interface StudioCtx {
  payerId: string;
  payerName: string;
  services: Program[];
  requestType: RequestType | "any";
  docs: StudioDoc[];
  rules: PayerRule[];
  /** Leaves the builder for Rules & Instructions, opening a group (and, when known, a rule). */
  openRules: (group?: RuleGroup, ruleId?: string) => void;
}

const Ctx = createContext<StudioCtx | null>(null);
export const StudioProvider = Ctx.Provider;
export function useStudio(): StudioCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStudio needs a StudioProvider");
  return c;
}
