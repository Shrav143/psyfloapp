import { useRef, useState } from "react";
import type { DocSpot } from "./FieldRow";

/** Which document block is outlined: the one under the pointer, or the one a person pinned by focusing a field or clicking a passage. */
export function useDocSpot() {
  const root = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<DocSpot | null>(null);
  const [pin, setPin] = useState<DocSpot | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const spot = hover ?? pin;
  const onSpot = (s: DocSpot | null, pinIt?: boolean) => {
    if (pinIt && s) setPin(s);
    else setHover(s);
  };
  /** Clicking a passage pins it and scrolls to the fields taken from it. */
  const findFields = (d: string, b: string) => {
    setPin({ docId: d, blockId: b });
    root.current?.querySelector<HTMLElement>(`[data-src-doc="${d}"][data-src-block="${b}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  /** Shows a block from elsewhere (a document check): pins it and switches to its document. */
  const show = (s: DocSpot) => {
    setPin(s);
    setDocId(s.docId);
  };
  return { root, spot, pin, clearPin: () => setPin(null), onSpot, findFields, show, docId: spot?.docId ?? docId, setDocId: (id: string) => { setPin(null); setDocId(id); } };
}
export type DocSpotState = ReturnType<typeof useDocSpot>;
