import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { CaseCtx } from "../caseTypes";
import { Fold, useMinWidth } from "../Fold";
import { ClinicalRail, type ShowTarget } from "./ClinicalRail";
import { DraftCard, sectionTestId, useDraftSections, usesSource } from "./DraftCard";

/** Clinical picture & draft: the medical necessity request is the main column; the clinical picture is a narrow rail beside it
    (under it and folded at 1024 px and below). "Show in draft" on a clinical item lights the sections that use the same chart page. */
export function PictureDraftTab({ ctx, section }: { ctx: CaseCtx; section: "picture" | "risk" | null }) {
  const wide = useMinWidth(1025);
  const sections = useDraftSections(ctx);
  const [lit, setLit] = useState<string[]>([]);

  // An old ?tab=picture link lands here on the clinical picture.
  useEffect(() => {
    if (section !== "picture") return;
    const t = setTimeout(() => document.getElementById("clinical-picture")?.scrollIntoView({ block: "start" }), 60); // after the shell's scroll to the top
    return () => clearTimeout(t);
  }, [section]);

  // The sections that cite the same chart page light up; with none, the section the item speaks to.
  const show = ({ label, section: fallback }: ShowTarget) => {
    const cited = sections.filter((s) => usesSource(s, label)).map((s) => s.id);
    const ids = cited.length ? cited : sections.some((s) => s.id === fallback) ? [fallback] : [sections[0]?.id].filter(Boolean);
    setLit(ids);
    if (ids[0]) document.querySelector(`[data-testid="${sectionTestId(ids[0])}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  // The light fades after a few seconds, so the draft reads plainly again.
  useEffect(() => {
    if (!lit.length) return;
    const t = setTimeout(() => setLit([]), 4000);
    return () => clearTimeout(t);
  }, [lit]);

  const rail = <ClinicalRail detail={ctx.detail} onShow={show} />;
  return (
    <div className="grid grid-cols-1 items-start gap-5 min-[1025px]:grid-cols-[minmax(0,1fr)_340px]">
      <DraftCard ctx={ctx} sections={sections} lit={lit} />
      <Card id="clinical-picture" aria-label="Clinical picture" className="scroll-mt-4 px-4 py-3">
        {wide ? (
          <>
            <h3 className="mb-2 font-serif text-[18px] font-semibold leading-tight tracking-tight">Clinical picture</h3>
            {rail}
          </>
        ) : (
          <Fold head={<span className="font-serif text-[18px] font-semibold tracking-tight">Clinical picture</span>} open={section === "picture"}>
            <div className="pt-1">{rail}</div>
          </Fold>
        )}
      </Card>
    </div>
  );
}
