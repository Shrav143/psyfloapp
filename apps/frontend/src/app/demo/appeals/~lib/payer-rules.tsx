"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/core-ui/table";
import { MCO_IDS, PAYER_BY_ID } from "@/lib/demo/payers";
import { Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { CHANNEL_LABEL } from "./appeal-helpers";

export function PayerRules() {
  return (
    <Panel
      title="Payer appeal rules"
      description="Filed from provider manuals and bulletins by the Sentinel agent. The packet builder follows them; the deadline clock counts to receipt at the payer."
      padded={false}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Payer</TableHead>
            <TableHead className="text-xs">Appeal channel</TableHead>
            <TableHead className="text-xs">Fax</TableHead>
            <TableHead className="text-xs">Deadline</TableHead>
            <TableHead className="text-xs">Packet split</TableHead>
            <TableHead className="text-xs">Member-signed form</TableHead>
            <TableHead className="text-xs">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MCO_IDS.map((id) => {
            const p = PAYER_BY_ID[id];
            return (
              <TableRow key={id}>
                <TableCell>
                  <PayerChip color={p.color} name={p.short} />
                </TableCell>
                <TableCell className="text-slate-700 text-sm">
                  {CHANNEL_LABEL[p.appealChannel]}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-slate-700 text-xs">
                  {p.appealFax ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  <span
                    className={
                      p.appealDeadlineDays <= 30
                        ? "font-medium text-rose-600"
                        : "text-slate-700"
                    }
                  >
                    {p.appealDeadlineDays} days
                  </span>
                </TableCell>
                <TableCell>
                  {p.packetSplit === "three-part" ? (
                    <Pill tone="amber">three separate documents</Pill>
                  ) : (
                    <Pill tone="slate">single upload</Pill>
                  )}
                </TableCell>
                <TableCell>
                  {p.requiresMemberSignedAppealForm ? (
                    <Pill tone="violet">required</Pill>
                  ) : (
                    <span className="text-slate-400 text-xs">not required</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[320px] text-slate-500 text-xs">
                  {p.notes.join(" ")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
