import { CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import { AgentBadge, Banner, Button, Card, CardBody, CardHeader, Chip, Fact, Label, Pill, Table, Td, Th, Tr } from "@/components/ui";
import { criteriaView } from "@/data/caseModel";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import type { CaseCtx } from "../caseTypes";
import { EvidenceChip } from "../EvidenceChip";
import { useBusy } from "../useBusy";

export function CriteriaTab({ ctx }: { ctx: CaseCtx }) {
  const { detail, work, goTab } = ctx;
  const payer = payerById(detail.payerId);
  const rows = criteriaView(detail, work);
  const met = rows.filter((r) => r.met).length; // backed directly by the chart
  const open = rows.filter((r) => !r.met); // covered in the draft, but could be stronger
  const [checking, run] = useBusy();
  const recheck = () =>
    run(1600, () =>
      useStore.getState().toast({ title: "Criteria re-checked", body: `Criteria read ${payer.shortName}'s policy ${detail.policy} again. ${rows.length} of ${rows.length} are covered in the draft${open.length ? `, ${open.length} could be stronger` : ""}.`, tone: open.length ? "mid" : "good" }),
    );
  const recTitle = (id?: string): string => detail.recs.find((r) => r.id === id)?.title ?? "Settle this item";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={`${payer.name} · ${detail.levelLabel} · ${detail.dx}`} subtitle="What this payer asks for, read by the Criteria agent from the current policy and past decisions" />
        <CardBody className="flex flex-wrap items-center gap-2">
          <Chip className="border border-field bg-white font-medium">Published payer policy {detail.policy}</Chip>
          <Chip className="border border-field bg-white font-medium">Past decisions</Chip>
          <Chip className="border border-field bg-white font-medium">Denial patterns</Chip>
          <Chip className="border border-field bg-white font-medium">Ohio rules</Chip>
          {open.length ? <Pill tone="mid" dot>{open.length} {open.length === 1 ? "item" : "items"} could be stronger before sending</Pill> : <Pill tone="good" dot>Everything {payer.shortName} asks for is covered</Pill>}
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Fact label="Approved as asked" value={<span className="text-forest">{payer.approvedAsAsked}%</span>} note={`${payer.shortName}, ${detail.levelLabel}, last 90 days`} />
        <Fact label="Chart-to-criteria match" value={<span className="text-forest" data-testid="match">{rows.length} / {rows.length}</span>} note="covered in the draft" />
        <Fact label="Time to read the policy" value={<span className="text-forest">&lt; 10 s</span>} note="by hand, usually over an hour" />
        <Fact label="Required tool" value={<span className="text-[16px] leading-snug">{detail.tool}</span>} note="attached to the packet" />
      </div>

      <Card>
        <CardHeader
          title={`What ${payer.shortName} requires for approval`}
          subtitle={<span data-testid="criteria-summary">{met} of {rows.length} are backed directly by the chart{open.length ? `, ${open.length} could be stronger` : ""}</span>}
          right={<><Pill tone={open.length ? "mid" : "good"}>{rows.length} of {rows.length} covered</Pill><Button icon={RefreshCw} loading={checking} onClick={recheck}>Re-check criteria</Button></>}
        />
        <Table>
          <thead>
            <tr>
              <Th>Criterion</Th>
              <Th>Status</Th>
              <Th>Evidence</Th>
              <Th><span className="inline-flex items-center gap-1.5"><AgentBadge agent="criteria" size={18} />Criteria says</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="min-w-[280px] align-top">
                  <div className="font-medium">{r.text}</div>
                  <div className="text-[13px] text-muted">{r.evidence}</div>
                </Td>
                <Td className="align-top whitespace-nowrap">
                  {r.met ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-good"><CircleCheck size={17} className="ico" />Met</span>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-mid"><CircleAlert size={17} className="ico" />Could be stronger</span>
                      {r.fixRec ? <Button size="sm" variant="ghost" onClick={() => goTab("actions", r.fixRec)}>Go to the action</Button> : null}
                    </div>
                  )}
                </Td>
                <Td className="align-top"><EvidenceChip evidence={r.source} detail={detail} /></Td>
                <Td className="min-w-[240px] align-top text-[13px] text-ink2">{r.note}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="To keep the approval chance high" />
        <CardBody>
          <Banner tone="mid" className="mb-4"><b className="font-semibold">Why it matters for {payer.shortName}.</b> {detail.keepHigh}</Banner>
          <Label className="mb-2">Include in the request</Label>
          {open.length === 0 ? <div className="text-sm text-good-ink">Nothing to add. The draft already covers every requirement.</div> : null}
          <ol className="flex flex-col gap-3">
            {open.map((r, i) => (
              <li key={r.id} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-bg text-xs font-semibold">{i + 1}</span>
                <div className="flex-1">
                  <div className="font-semibold">{recTitle(r.fixRec)}</div>
                  <div className="text-[13px] text-muted">Meets the requirement that is thin today: {r.text.toLowerCase()}</div>
                </div>
                {r.fixRec ? <Button size="sm" onClick={() => goTab("actions", r.fixRec)}>Open the action</Button> : null}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
