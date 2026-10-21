import { conditionText, STEP_KIND_LABEL, type DocItem, type LogChange, type WorkflowStep } from "@/data/payerConfig";

const branchText = (b: WorkflowStep["branches"][number]): string => `If ${conditionText(b.cond)}: ${STEP_KIND_LABEL[b.kind]}. ${b.text}`;

/** What changed between two versions of a workflow, one line per change, for the edit log. */
export function workflowChanges(before: WorkflowStep[], after: WorkflowStep[]): LogChange[] {
  const out: LogChange[] = [];
  const old = new Map(before.map((s) => [s.id, s]));
  after.forEach((s, i) => {
    const o = old.get(s.id);
    const label = `Step ${i + 1}, “${s.title}”`;
    if (!o) {
      out.push({ what: `Added step ${i + 1}, “${s.title}”`, before: "", after: `${STEP_KIND_LABEL[s.kind]}. ${s.text}` });
      return;
    }
    if (o.title !== s.title) out.push({ what: `${label}: title`, before: o.title, after: s.title });
    if (o.kind !== s.kind) out.push({ what: `${label}: step type`, before: STEP_KIND_LABEL[o.kind], after: STEP_KIND_LABEL[s.kind] });
    if (o.text !== s.text) out.push({ what: `${label}: text`, before: o.text, after: s.text });
    if (o.typical !== s.typical) out.push({ what: `${label}: typical time`, before: o.typical, after: s.typical });
    const oldBranches = new Map(o.branches.map((b) => [b.id, b]));
    for (const b of s.branches) {
      const ob = oldBranches.get(b.id);
      if (!ob) out.push({ what: `${label}: added a condition`, before: "", after: branchText(b) });
      else if (branchText(ob) !== branchText(b)) out.push({ what: `${label}: changed a condition`, before: branchText(ob), after: branchText(b) });
    }
    for (const ob of o.branches) if (!s.branches.some((b) => b.id === ob.id)) out.push({ what: `${label}: removed a condition`, before: branchText(ob), after: "" });
  });
  for (const o of before) if (!after.some((s) => s.id === o.id)) out.push({ what: `Removed step “${o.title}”`, before: `${STEP_KIND_LABEL[o.kind]}. ${o.text}`, after: "" });
  const common = (list: WorkflowStep[], other: WorkflowStep[]) => list.filter((s) => other.some((x) => x.id === s.id)).map((s) => s.id).join();
  if (common(before, after) !== common(after, before)) out.push({ what: "Step order", before: before.map((s) => s.title).join(" → "), after: after.map((s) => s.title).join(" → ") });
  return out;
}

/** The same for a document list. */
export function docsChanges(before: DocItem[], after: DocItem[]): LogChange[] {
  const out: LogChange[] = [];
  const old = new Map(before.map((d) => [d.id, d]));
  for (const d of after) {
    const o = old.get(d.id);
    if (!o) out.push({ what: "Added a document", before: "", after: `${d.title}. ${d.requirement}` });
    else if (o.title !== d.title || o.requirement !== d.requirement) out.push({ what: `Changed “${o.title}”`, before: `${o.title}. ${o.requirement}`, after: `${d.title}. ${d.requirement}` });
  }
  for (const o of before) if (!after.some((d) => d.id === o.id)) out.push({ what: "Removed a document", before: `${o.title}. ${o.requirement}`, after: "" });
  return out;
}
