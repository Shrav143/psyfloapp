import type { DocItem, LogChange } from "@/data/payerConfig";

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
