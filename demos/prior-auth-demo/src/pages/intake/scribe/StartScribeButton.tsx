import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Plus } from "lucide-react";
import { Button, SearchInput } from "@/components/ui";
import { useEscape } from "@/components/ui/escape";
import { serviceById } from "@/data/va/services";
import { sitesInView } from "@/lib/scope";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { intakesInView } from "@/store/intakeSelectors";

/** Start AI Scribe. On a record it opens that record's scribe; on the Intake page it asks which encounter first
    (an intake in view, or a new encounter, which creates a manual intake). */
export function StartScribeButton({ intakeId }: { intakeId?: string }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const all = useStore((s) => s.intakes);
  const focus = useStore((s) => s.programFocus);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  const records = useMemo(() => intakesInView(useStore.getState()), [all, focus, viewerId, siteScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = records.filter((r) => !q.trim() || `${r.id} ${r.initials} ${serviceById(r.serviceId).short}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);

  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    nav(paths.intakeRecord(id, "assessment", "scribe"));
  };
  const newEncounter = () => {
    const s = useStore.getState();
    const site = sitesInView(s)[0];
    const id = s.createIntake({ serviceId: s.programFocus === "all" ? "opt" : s.programFocus, method: "manual", site, title: "New encounter started from the AI Scribe", sourceOrg: "Walk-in or scheduled encounter" });
    s.setAssessmentMode(id, "scribe");
    go(id);
  };

  if (intakeId) return <Button icon={Mic} variant="primary" onClick={() => go(intakeId)}>Start AI Scribe</Button>;
  return (
    <div ref={ref} className="relative">
      <Button icon={Mic} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Start AI Scribe</Button>
      {open ? (
        <div role="dialog" aria-label="Choose the encounter" className="psy-fade-up absolute top-[44px] right-0 z-40 w-[min(340px,calc(100vw-32px))] rounded-[14px] border border-field bg-white p-2 shadow-[0_12px_32px_rgba(21,27,36,0.12)]">
          <p className="px-2 pt-1 pb-2 text-[12px] font-semibold text-ink2">Which encounter?</p>
          <SearchInput value={q} onChange={setQ} placeholder="Search intakes" />
          <ul className="mt-1.5 max-h-[280px] overflow-y-auto">
            {shown.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => go(r.id)} className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] hover:bg-tile">
                  <span className="font-semibold">{r.initials || "No patient yet"}{r.age !== null ? `, ${r.age}` : ""}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{serviceById(r.serviceId).short}</span>
                  <span className="text-[12px] text-muted">{r.id}</span>
                </button>
              </li>
            ))}
            {!shown.length ? <li className="px-2.5 py-3 text-[13px] text-muted">No intake matches. Start a new encounter instead.</li> : null}
          </ul>
          <button type="button" onClick={newEncounter} className="mt-1 flex w-full items-center gap-2 rounded-[10px] border-t border-line px-2.5 py-2.5 text-left text-[13px] font-semibold text-forest hover:bg-tile">
            <Plus size={15} className="ico" />
            New encounter (creates a manual intake)
          </button>
        </div>
      ) : null}
    </div>
  );
}
