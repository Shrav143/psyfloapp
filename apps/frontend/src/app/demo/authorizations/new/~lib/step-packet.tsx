"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { coverRows, DOC_TONE, packetCounts } from "./packet-model";
import { ReadinessPanel } from "./readiness-panel";
import type { StepProps } from "./wizard-model";

export function StepPacket({ state, ctx }: StepProps) {
  const { patient, payer, docs } = ctx;
  const rows = coverRows(patient);
  const { gaps } = packetCounts(docs, state.requested);
  const criteria =
    payer.criteriaSet === "unconfirmed" ? "payer policy" : payer.criteriaSet;
  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast.success("Cover sheet regenerated", {
            description: `${rows.length} criteria re-mapped from the current Sunwave documents · draft 2`,
          })
        }
      >
        <RefreshCw className="size-4" /> Regenerate cover sheet
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast("Opens Sunwave form package · demo")}
      >
        <ExternalLink className="size-4" /> Edit in Sunwave
      </Button>
    </div>
  );
  return (
    <div className="space-y-6">
      <Panel
        title="Cover sheet · criteria crosswalk"
        description={`One row per ${criteria} criterion: what the payer asks, the evidence, and the document it lives in. Packet assembles; clinicians wrote every word.`}
        right={actions}
        padded={false}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Criterion</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead className="pr-5">Source document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const gap = gaps.find((g) => g.name === r.source);
              return (
                <TableRow key={r.criterion}>
                  <TableCell className="whitespace-normal p-3 pl-5 align-top font-medium text-slate-900">
                    {r.criterion}
                  </TableCell>
                  <TableCell className="whitespace-normal p-3 align-top text-slate-700">
                    {r.evidence}
                  </TableCell>
                  <TableCell className="whitespace-normal p-3 pr-5 align-top text-slate-600 text-xs">
                    {r.source}
                    {gap ? (
                      <Pill tone={DOC_TONE[gap.status]} className="ml-2">
                        {gap.status}
                      </Pill>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
      <ReadinessPanel payer={payer} gaps={gaps} />
    </div>
  );
}
