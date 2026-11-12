import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, Pill } from "@/components/ui";
import { LEGACY_SECTION, sectionParam } from "@/data/assess/nav";
import { paths } from "@/routes";
import type { Need } from "../../assistant/needs";
import type { WorkspaceModel } from "../useWorkspaceModel";

const SHOWN = 5;
const TONE_DOT: Record<Need["tone"], string> = { risk: "bg-risk", mid: "bg-mid", neutral: "bg-faint" };

/** What waits on a person: suggestions to decide, agent work to approve, a safety review, a handoff to approve. Agents suggest; people decide. */
export function NeedsCard({ model }: { model: WorkspaceModel }) {
  const { record: r, needs } = model;
  const [all, setAll] = useState(false);
  const shown = all ? needs : needs.slice(0, SHOWN);
  return (
    <Card data-card="needs">
      <CardHeader title="Needs you" right={needs.length ? <Pill tone="mid">{needs.length}</Pill> : null} />
      {needs.length ? (
        <ul className="divide-y divide-line">
          {shown.map((n) => (
            <li key={n.key} className="flex items-start gap-3 px-5 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[n.tone]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{n.text}</p>
                {n.detail ? <p className="text-[12px] text-muted">{n.detail}</p> : null}
              </div>
              {n.target || n.to ? (
                <Link
                  to={paths.intakeRecord(r.id, sectionParam(n.target ?? LEGACY_SECTION[n.to?.section ?? "referral"]), n.to?.panel)}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-forest hover:underline"
                >
                  {n.toLabel ?? "Open"}
                  <ArrowRight size={13} className="ico" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[13px] text-muted">Nothing is waiting on a person right now.</p>
      )}
      {needs.length > SHOWN ? <button type="button" onClick={() => setAll((v) => !v)} className="px-5 pb-3 text-[12px] font-semibold text-forest hover:underline">{all ? "Show fewer" : `Show all ${needs.length}`}</button> : null}
    </Card>
  );
}
