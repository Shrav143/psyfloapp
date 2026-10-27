import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DEFAULT_STATE } from "@/data/payerProfile";
import { PROGRAMS, type Program } from "@/data/types";
import type { RuleGroup, Workflow } from "@/data/workflow/types";
import { useStore } from "@/store";
import { paths } from "@/routes";
import { payerRows } from "../lib/payers";
import { BuilderWorkspace } from "./BuilderWorkspace";
import { GenerateDrawer } from "./GenerateDrawer";
import { NewWorkflowDrawer, type PayerInfo } from "./NewWorkflowDrawer";
import { StudioEmpty } from "./StudioEmpty";
import type { StudioDoc } from "./StudioContext";
import { usePayerRules, usePayerWorkflows } from "./lib/store";
import type { NewKind } from "./WorkflowSelector";

/** The payer's documents for the services a workflow covers, one entry per item. With no service chosen, every service's list counts. */
export function docsForServices(docs: Record<Program, { id: string; title: string; requirement: string }[]> | undefined, services: Program[]): StudioDoc[] {
  if (!docs) return [];
  const out: StudioDoc[] = [];
  for (const p of services.length ? services : PROGRAMS) for (const d of docs[p] ?? []) out.push({ id: d.id, title: d.title, requirement: d.requirement, services: [p] });
  return out;
}

/** The workflow each payer was last open on, so leaving the builder for another view and coming back lands on the same one. */
const LAST = new Map<string, string>();

/** The first published workflow, else the first one that is not archived, else the first. */
const defaultPick = (list: Workflow[]): Workflow | undefined => list.find((w) => w.status === "published") ?? list.find((w) => w.status !== "archived") ?? list[0];

export function WorkflowBuilderTab({ payerId }: { payerId: string }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const custom = useStore((s) => s.customPayers);
  const config = useStore((s) => s.payerConfig);
  const workflows = usePayerWorkflows(payerId);
  const rules = usePayerRules(payerId);
  const [drawer, setDrawer] = useState<null | NewKind>(null);

  const row = useMemo(() => payerRows(custom, config).find((r) => r.id === payerId), [custom, config, payerId]);
  const payer: PayerInfo = { id: payerId, name: row?.name ?? payerId, state: row?.state ?? DEFAULT_STATE, product: row?.product ?? "" };
  const asked = params.get("workflow") ?? LAST.get(payerId);
  const stored = workflows.find((w) => w.id === asked) ?? defaultPick(workflows);
  if (stored) LAST.set(payerId, stored.id);
  const node = params.get("node") ?? undefined;

  const pick = useCallback(
    (id: string) =>
      setParams((p) => {
        const n = new URLSearchParams(p);
        n.set("workflow", id);
        n.delete("node");
        return n;
      }, { replace: true }),
    [setParams],
  );
  const openRules = useCallback((group?: RuleGroup, ruleId?: string) => nav(`${paths.payers(payerId, "rules", group)}${ruleId ? `${group ? "&" : "?"}rule=${ruleId}` : ""}`), [nav, payerId]);
  const test = useCallback((id: string) => nav(`${paths.payers(payerId, "test")}&workflow=${id}`), [nav, payerId]);
  const created = (id: string) => {
    setDrawer(null);
    pick(id);
  };

  return (
    <>
      {stored ? (
        <BuilderWorkspace
          key={stored.id}
          payer={{ id: payerId, name: payer.name }}
          stored={stored}
          workflows={workflows}
          rules={rules}
          docs={docsForServices(config[payerId]?.docs, stored.services)}
          focusNode={node}
          onSelectWorkflow={pick}
          onNew={setDrawer}
          onTest={test}
          onOpenRules={openRules}
        />
      ) : (
        <StudioEmpty payerName={payer.name} onNew={setDrawer} />
      )}
      {drawer === "template" || drawer === "blank" ? <NewWorkflowDrawer payer={payer} mode={drawer} onClose={() => setDrawer(null)} onCreated={created} /> : null}
      {drawer === "flo" ? <GenerateDrawer payer={payer} docs={config[payerId]?.docs} rules={rules} onClose={() => setDrawer(null)} onCreated={created} /> : null}
    </>
  );
}
