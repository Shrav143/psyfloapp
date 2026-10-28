import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw, Save } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useEscape } from "@/components/ui/escape";
import { sectionParam, type WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { useStore } from "./index";
import { describeStatus, hasSavedChanges, resetDemoData, saveDraftNow, usePersistStatus, type SaveState } from "./persist";

/* The autosave indicator and the two explicit actions of save and resume. <SaveIndicator /> goes in the workspace header (and anywhere a person
   should see that their work is kept): it reads "Saved locally, 10:42 am" (the demo clock), "Saving…", "Autosave on" or "Not saved: storage
   unavailable", and opens a small menu with Save draft and Reset demo data. */

const DOT: Record<SaveState, string> = { idle: "bg-faint", pending: "bg-mid", saved: "bg-good", unavailable: "bg-risk" };

/** Reset demo data, with its confirmation. It removes what is saved in this browser and puts every record back to the seed data. */
export function ResetDemoDataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useStore((s) => s.toast);
  const saved = open ? hasSavedChanges() : false;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Reset demo data"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            icon={RotateCcw}
            onClick={() => {
              resetDemoData();
              onClose();
              toast({ title: "Demo data reset", body: "Everything saved in this browser was removed and the records are back to the starting point.", tone: "neutral" });
            }}
          >
            Reset demo data
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-ink2">
        {saved ? "Your saved changes to intakes, assessments and drafts are removed from this browser. " : "Nothing is saved in this browser yet. "}
        Every record goes back to the starting point.
      </p>
    </Modal>
  );
}

/** A button that opens the reset confirmation, for Settings and the Demo menu. */
export function ResetDemoDataButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className={className} variant="danger" icon={RotateCcw} onClick={() => setOpen(true)}>Reset demo data</Button>
      <ResetDemoDataDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** "Saved locally, 10:42 am". Work is saved in this browser a moment after each change; the menu saves now or resets the demo data. */
export function SaveIndicator({ className }: { className?: string }) {
  const status = usePersistStatus();
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  const text = describeStatus(status);
  const saveNow = () => {
    const s = saveDraftNow();
    setOpen(false);
    toast(s.state === "unavailable"
      ? { title: "Not saved: storage unavailable", body: "This browser does not allow saving. Your changes stay in this tab until it is closed.", tone: "mid" }
      : { title: "Draft saved", body: "Your work is saved in this browser. Open the record again to pick up where you left off.", tone: "good" });
  };
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        data-testid="save-indicator"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-2 rounded-[10px] border border-transparent px-2.5 text-[12px] font-medium text-ink2 hover:border-field hover:bg-tile"
      >
        <span className={cn("h-2 w-2 rounded-full", DOT[status.state])} aria-hidden="true" />
        {/* A fixed width, so "Saving…" and "Saved locally, 10:42 am" take the same room and the header does not change height with every save on a narrow window. */}
        <span className="min-w-[150px] text-left">{text}</span>
      </button>
      {open ? (
        <div role="menu" aria-label="Save and reset" className="psy-fade-up absolute top-[36px] right-0 z-40 w-[230px] rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.12)]">
          <button type="button" role="menuitem" onClick={saveNow} className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] hover:bg-tile">
            <Save size={15} className="ico" />
            Save draft
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setResetting(true); }} className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-risk-ink hover:bg-risk-bg">
            <RotateCcw size={15} className="ico" />
            Reset demo data
          </button>
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-muted">{status.state === "unavailable" ? "This browser does not allow saving." : "Saved in this browser only."}</p>
        </div>
      ) : null}
      <ResetDemoDataDialog open={resetting} onClose={() => setResetting(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ resume */

/** Where "Resume" takes a person back to: the configuration wizard step they left unfinished, or the workspace section they were last in. */
export function resumeHref(record: Pick<IntakeRecord, "id" | "progress">): string {
  const p = record.progress;
  if (p?.step) return paths.configure(record.id, p.step as "purpose" | "program" | "population" | "plan");
  return paths.intakeRecord(record.id, p?.section && p.section !== "overview" ? p.section : undefined);
}

/** Remembers the section of the workspace that is open, and reopens the one a person left when the record is opened without a `?section=`.
    Call it once in the workspace, with the section it shows. The section is stored on the record (`progress`), so it is saved with the rest. */
export function useResume(record: IntakeRecord | undefined, target: WorkspaceTarget): void {
  const [params, setParams] = useSearchParams();
  const remember = useStore((s) => s.setLastSection);
  const id = record?.id;
  const saved = record?.progress?.section;
  const key = sectionParam(target);
  const hasSection = params.has("section");
  const first = useRef<string | null>(null);
  const resuming = useRef(false);
  useEffect(() => {
    if (!id || first.current === id) return;
    first.current = id;
    resuming.current = !hasSection && !!saved && saved !== "overview" && !params.has("panel");
    if (resuming.current) setParams((p) => { const n = new URLSearchParams(p); n.set("section", saved as string); return n; }, { replace: true });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return;
    if (resuming.current && !hasSection) return;
    resuming.current = false;
    remember(id, key);
  }, [id, key, hasSection, remember]);
}
