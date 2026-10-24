import { useMemo, useRef } from "react";
import { Button, Label, Modal } from "@/components/ui";
import type { Dimension } from "./lib/analysis";
import { buildLong, DIM_TONE_WORD } from "./lib/long";
import { dimensionText } from "./lib/summaryText";
import { useDialogFocus } from "./lib/useDialogFocus";
import type { DenialView } from "./lib/useDenialView";
import { CopyButton } from "./FullSummary";

/** One framework dimension in a pop-up: the reading, the long text behind it and where in the chart it comes from. Focus goes back to its row on close. */
export function DimensionModal({ view, dim, from, onClose }: { view: DenialView; dim: Dimension; from: HTMLElement; onClose: () => void }) {
  const back = useRef<HTMLElement | null>(from);
  const ref = useDialogFocus(back);
  const long = useMemo(() => buildLong(view.req.id, view.meta.type, view.analysis).dims[dim.n - 1], [view, dim.n]);
  const asOf = view.analysis.dimsSub;
  return (
    <Modal
      open
      onClose={onClose}
      title={dim.label}
      subtitle={`${view.analysis.framework.name} · ${DIM_TONE_WORD[dim.tone]}`}
      footer={<><CopyButton text={dimensionText({ label: dim.label, tone: dim.tone, text: long?.text ?? dim.text })} label="Copy" size="md" /><Button onClick={onClose}>Close</Button></>}
    >
      <div ref={ref} tabIndex={-1} className="flex select-text flex-col gap-3 leading-[1.65] outline-none">
        <p className="font-medium">{dim.text}</p>
        {long && long.text !== dim.text ? <p>{long.text}</p> : null}
        <div>
          <Label className="mb-0.5">Source</Label>
          <p className="text-[13px] text-ink2">{dim.source}{asOf ? ` · ${asOf}` : ""}</p>
        </div>
      </div>
    </Modal>
  );
}
