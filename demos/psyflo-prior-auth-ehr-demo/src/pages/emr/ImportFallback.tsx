import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp } from "lucide-react";
import { ImportSources, type ImportResult } from "@/components/import";
import { Button, Drawer } from "@/components/ui";
import { applyImport } from "@/pages/newcase/importIntake";
import { paths } from "@/routes";
import { useStore } from "@/store";

/** For a record system with no connection: bring a patient in from an export or a screenshot, and start a New Case with it. */
export function ImportFallback() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const start = (r: ImportResult) => {
    const id = useStore.getState().createCaseDraft({ kind: "initial", started: true });
    applyImport(id, r);
    setOpen(false);
    nav(paths.newCase({ draft: id }));
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge bg-white px-5 py-3">
        <span className="text-[14px]">No connection for a system? Import an export or paste a screenshot</span>
        <Button size="sm" icon={FileUp} onClick={() => setOpen(true)}>
          Import a record
        </Button>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title="Import a record" width={620}>
        <ImportSources target="patient" onImport={start} />
      </Drawer>
    </>
  );
}
