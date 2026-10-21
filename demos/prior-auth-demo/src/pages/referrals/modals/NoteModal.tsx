import { useState } from "react";
import { Banner, Button, Modal, TextArea } from "@/components/ui";
import { useStore } from "@/store";

export function NoteModal({ id, onClose }: { id: string; onClose: () => void }) {
  const add = useStore((s) => s.addReferralNote);
  const [text, setText] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Add a note"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!text.trim()} onClick={() => { add(id, text); onClose(); }}>Add note</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Banner tone="mid">These notes are private and only visible to you and your team. The referrer cannot see them.</Banner>
        <TextArea aria-label="Note" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your note" />
      </div>
    </Modal>
  );
}
