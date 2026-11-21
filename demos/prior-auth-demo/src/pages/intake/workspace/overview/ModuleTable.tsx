import { Link, useNavigate } from "react-router-dom";
import { Pill } from "@/components/ui";
import { moduleCompletion } from "@/data/assess/completion";
import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { PreparationTag } from "../bits";
import { workspaceHref, type NavItem, type NavState } from "../nav";

const TONE: Record<NavState, Tone> = { complete: "good", in_progress: "mid", awaiting_review: "mid", attention: "mid", not_started: "neutral", na: "neutral" };
const SKIP = new Set(["overview", "instrument", "documents", "activity"]);
const th = "px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.09em] text-muted uppercase";

/** How far a module is filled in: the required fields with a value, out of the required fields. The CANS and Level of Need modules keep their own records. */
function progressOf(r: IntakeRecord, item: NavItem): string {
  if (!item.child) return item.id === "signoff" ? item.detail ?? "" : "";
  const id = item.id.slice(2) as ModuleId;
  if (id === "cans" || id === "lon" || moduleById(id).kind === "review") return "";
  const c = moduleCompletion(id, r.instruments?.[id]);
  return c.total ? `${c.done} of ${c.total} required` : "";
}

/** The sections and assessment instruments of this intake with where each stands. A row opens its section. */
export function ModuleTable({ record, items }: { record: IntakeRecord; items: NavItem[] }) {
  const nav = useNavigate();
  const rows = items.filter((i) => !SKIP.has(i.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[13px]" data-module-table>
        <thead>
          <tr className="border-b border-line">
            <th className={th} scope="col">Section or module</th>
            <th className={th} scope="col">Level</th>
            <th className={th} scope="col">Status</th>
            <th className={th} scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const href = workspaceHref(record.id, i.target);
            return (
              <tr key={i.id} data-row={i.id} onClick={() => nav(href)} className="cursor-pointer border-b border-line last:border-b-0 hover:bg-[#FAF9F6]">
                <td className="px-4 py-2.5">
                  <Link to={href} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-forest hover:underline">{i.label}</Link>
                  {i.preparation ? <span className="ml-2 align-middle"><PreparationTag /></span> : null}
                </td>
                <td className="px-4 py-2.5 text-muted">{i.child ? i.detail : "Core"}</td>
                <td className="px-4 py-2.5">{i.state ? <Pill tone={TONE[i.state]}>{i.stateLabel}</Pill> : null}</td>
                <td className="px-4 py-2.5 text-muted">{progressOf(record, i)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
