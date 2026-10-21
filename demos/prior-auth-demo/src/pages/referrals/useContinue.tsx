import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal } from "@/components/ui";
import { continueWithReferral } from "@/pages/newcase/intake";
import { stepPatch } from "@/pages/newcase/steps";
import { useStore } from "@/store";

/** Takes a referral into the case and on to the medical records. When the agents already ran on that case, asks first:
    attaching changes the patient and the documents, so they have to re-check it. Render `dialog` next to the button that calls `go`. */
export function useContinueWithReferral(referralId: string, draftId: string | undefined): { go: () => void; dialog: ReactNode } {
  const nav = useNavigate();
  const ran = useStore((s) => (draftId ? (s.caseDrafts.find((d) => d.id === draftId)?.run.done ?? 0) > 0 : false));
  const [asking, setAsking] = useState(false);

  const attach = () => {
    const to = continueWithReferral(referralId, draftId);
    if (!to) return;
    if (ran && draftId) {
      // The case goes back to the medical records, so it does not reopen on an agents step with nothing run.
      const st = useStore.getState();
      st.patchCaseDraft(draftId, stepPatch(1));
      st.toast({ title: "The agents will re-check this case", body: `${referralId} changed the case, so the agents' earlier work was cleared.`, tone: "mid" });
    }
    nav(to);
  };

  const close = () => setAsking(false);
  const dialog = asking ? (
    <Modal
      open
      onClose={close}
      size="sm"
      title="Attach this referral?"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={() => { close(); attach(); }}>Continue</Button>
        </>
      }
    >
      <p className="text-sm text-ink2">Attaching this referral makes the agents re-check the case. Continue?</p>
      <p className="mt-2 text-[13px] text-muted">Their finished work is cleared. You start them again after the medical records.</p>
    </Modal>
  ) : null;

  return { go: () => (ran ? setAsking(true) : attach()), dialog };
}
