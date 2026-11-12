import { useState } from "react";
import { FileCog, Settings2 } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Pill } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { CANS_PENDING } from "@/data/va/policy";
import { LoadTemplateModal } from "./LoadTemplateModal";
import { TemplateDrawer } from "./TemplateDrawer";
import { OFFICIAL_NEEDS, OFFICIAL_NOT_VERIFIED } from "./template";

/** The template slot of Assessment Items when nothing is loaded: the official mapping is not available, and an administrator can load a demo placeholder. */
export function TemplateSlot({ record }: { record: IntakeRecord }) {
  const [load, setLoad] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <Card data-template-slot>
      <CardHeader title="Official CANS Lifetime item mapping: not loaded" right={<Pill tone="mid">Awaiting DMAS</Pill>} />
      <CardBody className="space-y-3">
        <p className="text-[14px] text-ink">{CANS_PENDING}</p>
        <div>
          <p className="text-[13px] font-semibold text-ink2">The official template needs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink">{OFFICIAL_NEEDS.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-1 text-[12px] text-muted">{OFFICIAL_NOT_VERIFIED}</p>
        </div>
        <p className="text-[13px] text-ink2">Until a template is loaded there are no items to rate. Evidence can still be gathered in Evidence Review.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={FileCog} onClick={() => setLoad(true)}>Load a demo placeholder template</Button>
          <Button icon={Settings2} onClick={() => setDrawer(true)}>Template settings</Button>
        </div>
      </CardBody>
      <LoadTemplateModal record={record} open={load} onClose={() => setLoad(false)} />
      <TemplateDrawer record={record} open={drawer} onClose={() => setDrawer(false)} />
    </Card>
  );
}
