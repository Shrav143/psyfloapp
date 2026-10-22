import { useCallback } from "react";
import { copyText } from "@/pages/denials/lib/clipboard";
import { useStore } from "@/store";

/** "Copy summary": puts the text on the clipboard and says so with a toast. */
export function useCopy(): (text: string, title: string) => void {
  return useCallback((text, title) => {
    void copyText(text).then((ok) => useStore.getState().toast(ok ? { title, body: "Paste it into an email or a note. It is demo data.", tone: "good" } : { title: "Could not copy", body: "Select the text and copy it by hand.", tone: "risk" }));
  }, []);
}
