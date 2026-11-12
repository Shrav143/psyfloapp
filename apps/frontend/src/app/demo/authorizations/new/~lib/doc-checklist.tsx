"use client";

import { FileText } from "lucide-react";
import { Button } from "@/lib/core-ui/button";
import { fmtDate } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import {
  DOC_TONE,
  type DocItem,
  docStatus,
  packetCounts,
} from "./packet-model";

export function DocChecklist({
  docs,
  requested,
  onRequest,
}: {
  docs: DocItem[];
  requested: string[];
  onRequest: (name: string) => void;
}) {
  const counts = packetCounts(docs, requested);
  return (
    <Panel
      title="Required documents"
      description={`${counts.attached} of ${counts.total} attached. Gaps are surfaced here, before anything is filed.`}
      padded={false}
    >
      <ul className="divide-y divide-slate-100">
        {docs.map((d) => {
          const status = docStatus(d, requested);
          const meta = [
            d.rule,
            d.dated ? `dated ${fmtDate(d.dated, true)}` : undefined,
            d.note,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li
              key={d.name}
              className="flex flex-wrap items-center gap-3 px-5 py-3"
            >
              <FileText className="size-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="text-slate-800 text-sm">{d.name}</div>
                <div className="text-slate-500 text-xs">{meta}</div>
              </div>
              <Pill tone={DOC_TONE[status]}>{status}</Pill>
              {status === "stale" || status === "missing" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequest(d.name)}
                >
                  Request from clinician
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
