import { Info } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Chip, Meter, Pill } from "@/components/ui";
import type { CansAssessment, IntakeRecord } from "@/data/intake/types";
import { cansCompletion, pendingEvidence } from "./cansState";
import { DEMO_TEMPLATE_LABEL, domainForTheme, OFFICIAL_NEEDS_LINE, relevantItem } from "./template";
import { ItemRow } from "./ItemRow";
import { TemplateSlot } from "./TemplateSlot";

/** Assessment Items: the template slot when nothing is loaded; with the demo placeholder loaded, its domains and blank items, each with the assessor's rating label, note and evidence. */
export function ItemsTab({ record, cans, onGo }: { record: IntakeRecord; cans: CansAssessment; onGo: (tab: "evidence" | "summary") => void }) {
  if (!cans.template || !cans.items.length) {
    return (
      <div className="space-y-5" data-cans-tab="items">
        <TemplateSlot record={record} />
      </div>
    );
  }
  const comp = cansCompletion(cans);
  const waiting = pendingEvidence(record);
  /* Proposals the agent would file under this item: they wait for a person, so the item says "Evidence waiting". */
  const pendingFor = (itemId: string) => waiting.filter((sg) => relevantItem(domainForTheme(sg.field.replace(/^evidence:/, ""), sg.value).id, sg.value)?.id === itemId).length;
  const locked = cans.status === "signed";
  return (
    <div className="space-y-5" data-cans-tab="items">
      <Banner tone="neutral" icon={Info} title={DEMO_TEMPLATE_LABEL}>
        Not an official CANS Lifetime assessment. Blank prompts: no official wording, no rating options and no scoring. You type a rating label or a note; nothing is computed. {OFFICIAL_NEEDS_LINE}
      </Banner>
      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-[200px] flex-1">
            <p className="text-[13px] font-semibold text-ink">{comp.addressed} of {comp.total} items addressed</p>
            <Meter value={comp.total ? (comp.addressed / comp.total) * 100 : 0} color="#217A78" className="mt-1.5" />
          </div>
          <p className="text-[13px] text-ink2">{comp.rated} with a rating label · {comp.missing.length} still open</p>
          <Button size="sm" onClick={() => onGo("summary")}>Open the summary</Button>
        </CardBody>
      </Card>
      {locked ? <Banner tone="good" title="Signed">The items are read-only. Start a new version in Assessment Summary to change them.</Banner> : null}
      {cans.domains.map((d) => {
        const items = d.itemIds.map((iid) => cans.items.find((i) => i.id === iid)).filter((i): i is NonNullable<typeof i> => !!i);
        const done = items.filter((i) => comp.missing.every((m) => m.id !== i.id)).length;
        const untied = cans.evidence.filter((e) => !e.itemId && domainForTheme(e.theme, e.text).id === d.id);
        return (
          <Card key={d.id} data-cans-domain={d.id}>
            <CardHeader
              title={d.label}
              subtitle={`${done} of ${items.length} item${items.length === 1 ? "" : "s"} addressed`}
              right={<>{d.id === "d-risk" ? <Pill tone="risk">A clinician reviews</Pill> : null}<Chip>{items.reduce((n, i) => n + cans.evidence.filter((e) => e.itemId === i.id).length, 0)} evidence</Chip></>}
            />
            <CardBody>
              {d.id === "d-risk" ? <p className="mb-3 text-[13px] text-ink2">A clinician reviews any safety information directly. Psyflo proposes no rating here and does not decide whether a person is safe.</p> : null}
              {items.map((i) => <ItemRow key={i.id} record={record} cans={cans} item={i} pendingForItem={pendingFor(i.id)} />)}
              {untied.length ? <p className="mt-3 text-[12px] text-muted">{untied.length} accepted statement{untied.length === 1 ? " is" : "s are"} not tied to an item. <button type="button" className="font-semibold text-forest hover:underline" onClick={() => onGo("evidence")}>Tie them in Evidence Review</button></p> : null}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
