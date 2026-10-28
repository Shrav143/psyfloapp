import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { LEVEL_LABEL } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import { stamp } from "@/lib/time";
import { StatusPill, PreparationTag } from "../bits";
import { workspaceHref } from "../nav";
import type { SignoffRow } from "../signoff";

/** Every required module with where it stands and who signed it: the person, the time and the version. Amend starts a new version. */
export function SignoffRows({ recordId, rows, canAmend, onAmend }: { recordId: string; rows: SignoffRow[]; canAmend: boolean; onAmend: (row: SignoffRow) => void }) {
  return (
    <ul className="divide-y divide-line" data-signoff-rows>
      {rows.map((row) => {
        const sig = row.signature;
        const who = sig ? staffOf(sig.by) : undefined;
        const special = row.moduleId === "cans" || row.moduleId === "lon";
        return (
          <li key={row.key} data-row={row.key} data-status={row.status} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0 flex-1 basis-[200px]">
              <Link to={workspaceHref(recordId, row.to)} className="text-[14px] font-medium text-ink hover:text-forest hover:underline">{row.label}</Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span>{row.kind === "assessment" ? "Core clinical modules" : LEVEL_LABEL[row.level]}</span>
                {row.preparation ? <PreparationTag /> : null}
                {!row.required && !row.preparation ? <span>Not required</span> : null}
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
              <StatusPill status={row.status} />
              {sig ? (
                <span className="text-[12px] text-muted">
                  {who?.name ?? sig.by}{who?.credentials ? `, ${who.credentials}` : ""} · {stamp(sig.at)} · v{sig.version}{sig.rolePlay ? " (demo role-play)" : ""}
                </span>
              ) : null}
              {row.earlier ? <span className="text-[12px] text-muted">{row.earlier} earlier {row.earlier === 1 ? "version" : "versions"} kept</span> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {row.status === "signed" && !special ? (
                <Button size="sm" icon={RotateCcw} disabled={!canAmend} title={canAmend ? undefined : "A qualified clinician amends a signed item"} onClick={() => onAmend(row)}>Amend</Button>
              ) : null}
              <Link to={workspaceHref(recordId, row.to)} className="inline-flex h-8 items-center rounded-[10px] border border-field bg-white px-3 text-[13px] font-medium hover:bg-tile">Open</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
