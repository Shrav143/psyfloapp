"use client";

import { FilePlus2, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import type { Appeal, AppealDoc } from "@/lib/demo/appeals";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { Pill } from "@/lib/demo-ui/status-badge";
import { PART_TITLE, partPages } from "./workspace-helpers";

const PARTS: (1 | 2 | 3)[] = [1, 2, 3];

function DocStatus({
  doc,
  onDocReady,
}: {
  doc: AppealDoc;
  onDocReady: (name: string) => void;
}) {
  if (doc.status === "missing") {
    return (
      <div className="flex items-center gap-2">
        <Pill tone="red">missing</Pill>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            onDocReady(doc.name);
            toast.success("Requested from Dr. Okafor", {
              description: `${doc.name} · received and attached to Part ${doc.part}`,
            });
          }}
        >
          <Send className="size-3.5" /> Request from Dr. Okafor
        </Button>
      </div>
    );
  }
  if (doc.status === "needs_signature") {
    return <Pill tone="violet">needs signature</Pill>;
  }
  return <Pill tone="green">ready</Pill>;
}

export function PacketTab({
  appeal,
  docs,
  pages,
  onDocReady,
}: {
  appeal: Appeal;
  docs: AppealDoc[];
  pages: number;
  onDocReady: (name: string) => void;
}) {
  const payer = PAYER_BY_ID[appeal.payerId];
  const missing = docs.filter((d) => d.status === "missing").length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-slate-600 text-xs">
          {docs.length} documents · {pages} pages
          {missing ? ` · ${missing} missing` : " · complete"}. Assembled from
          Sunwave; the agent never writes clinical content.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast("Attach from Sunwave", {
              description:
                "Pick a document from the chart · it lands in the part the payer expects",
            })
          }
        >
          <FilePlus2 className="size-4" /> Add document
        </Button>
      </div>
      {PARTS.map((part) => (
        <div key={part}>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="font-medium text-slate-900 text-sm">
              {PART_TITLE[part]}
            </div>
            <div className="text-slate-500 text-xs tabular-nums">
              {partPages(docs, part)} pages
            </div>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {docs
              .filter((d) => d.part === part)
              .map((d) => (
                <li
                  key={d.name}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    {d.name}
                  </span>
                  <span className="w-12 shrink-0 text-right text-slate-400 text-xs tabular-nums">
                    {d.status === "missing" ? "—" : `${d.pages} pp`}
                  </span>
                  <DocStatus doc={d} onDocReady={onDocReady} />
                </li>
              ))}
          </ul>
        </div>
      ))}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="font-medium text-slate-900">
          {pages} pages total · {payer.short} rule:{" "}
          {payer.packetSplit === "three-part"
            ? "three separate documents"
            : "single upload"}
        </div>
        <p className="mt-1 text-slate-600">
          {payer.packetSplit === "three-part"
            ? `${payer.short} rejects merged PDFs as incomplete. The agent exports Part 1, 2 and 3 as separate files and the cover letter lists all three so a reviewer who stops at page 12 still sees the criteria crosswalk.`
            : `${payer.short} accepts a single upload. Parts are kept as bookmarks and the crosswalk stays on page 1 so the reviewer sees the SMI evidence first.`}
          {payer.requiresMemberSignedAppealForm
            ? " Member-signed appeal authorization form is required and attached in Part 1."
            : ""}
        </p>
      </div>
    </div>
  );
}
