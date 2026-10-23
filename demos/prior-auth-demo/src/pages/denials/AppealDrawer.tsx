import { useEffect, useState } from "react";
import { FileSignature, Save } from "lucide-react";
import { AgentChip, Banner, Button, Checkbox, Drawer, Label, Spinner, TextArea } from "@/components/ui";
import { levelOf } from "@/data/denials";
import { shortDate } from "@/lib/time";
import { useStore } from "@/store";
import { buildAppealLetter, defaultEvidence } from "./lib/appeal";
import { capitalize, isFiled } from "./lib/format";
import { ReviewNote } from "./ReviewNote";
import { SignModal } from "./SignModal";
import type { DenialView } from "./lib/useDenialView";

/** The appeal letter: Advocate drafts it (about two seconds), the user edits it, a clinician signs, Navigator files. Mounted only while open. */
export function AppealDrawer({ view, onClose }: { view: DenialView; onClose: () => void }) {
  const { req, analysis, work, clock } = view;
  const store = useStore.getState;
  const readOnly = !!work.appealFiled || isFiled(req);
  const level = levelOf(req.chip, work);
  const stored = work.appealDraft;
  const [drafting, setDrafting] = useState(!stored && !readOnly);
  const [text, setText] = useState(stored?.text ?? (readOnly ? buildAppealLetter(req, analysis, clock, level) : ""));
  const [evidence, setEvidence] = useState<string[]>(stored?.evidence ?? defaultEvidence(analysis, work.fixes));
  const [signing, setSigning] = useState(false);
  const available = Array.from(new Set([...defaultEvidence(analysis, work.fixes), ...evidence]));

  useEffect(() => {
    if (!drafting) return;
    let live = true;
    const t = setTimeout(() => {
      if (!live) return;
      const letter = buildAppealLetter(req, analysis, clock, level);
      const items = defaultEvidence(analysis, work.fixes);
      store().saveAppealDraft(req.id, letter, items);
      setText(letter);
      setEvidence(items);
      setDrafting(false);
    }, 1800);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [drafting, req, analysis, clock, level, work.fixes, store]);

  const toggle = (item: string) => setEvidence((e) => (e.includes(item) ? e.filter((x) => x !== item) : [...e, item]));
  const save = () => {
    store().saveAppealDraft(req.id, text, evidence);
    store().toast({ title: "Draft saved", body: "It stays in Denial Intelligence until a clinician signs.", tone: "neutral" });
  };
  const dueBy = req.deadlineAt !== undefined ? shortDate(req.deadlineAt) : undefined;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width={720}
        title={`Appeal letter · ${req.id}`}
        subtitle={readOnly ? `${work.appealFiled ? `Filed by ${work.appealFiled.role}.` : `${capitalize(req.clockSub ?? "filed")}.`}${req.clockNote ? ` ${capitalize(req.clockNote)}.` : ""}` : `${analysis.ctx.payerName}${dueBy ? `. Due ${dueBy}.` : ""}`}
        footer={readOnly ? <div className="flex justify-end"><Button onClick={onClose}>Close</Button></div> : <div className="flex justify-end gap-2.5"><Button icon={Save} onClick={save} disabled={drafting}>Save draft</Button><Button variant="primary" icon={FileSignature} onClick={() => setSigning(true)} disabled={drafting}>Sign and file</Button></div>}
      >
        {drafting ? (
          <div className="flex items-center gap-3 py-10 text-ink2" role="status"><Spinner size={20} />Advocate is drafting the letter from the findings. Integrity is checking each sentence.</div>
        ) : (
          <div className="flex flex-col gap-5">
            <Banner tone="neutral" title="Drafted by Advocate, checked by Integrity">
              <span className="flex items-center gap-2"><AgentChip agent="advocate" /><AgentChip agent="integrity" /></span>
              {readOnly ? <span className="mt-1.5 block">This is the letter that was filed.</span> : <><span className="mt-1.5 block">Edit anything you like.</span><ReviewNote className="mt-1" /></>}
            </Banner>
            <div>
              <Label className="mb-1.5">Letter</Label>
              <TextArea value={text} onChange={(e) => setText(e.target.value)} readOnly={readOnly} aria-label="Appeal letter" className="min-h-[340px] font-serif text-[14px] leading-[1.6]" />
            </div>
            <div>
              <Label className="mb-2">Evidence to attach</Label>
              <div className="flex flex-col gap-2.5">
                {available.map((item) => (
                  <Checkbox key={item} checked={evidence.includes(item)} onChange={() => !readOnly && toggle(item)} disabled={readOnly} label={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
      {signing ? (
        <SignModal
          onClose={() => setSigning(false)}
          onSigned={(role) => {
            store().fileAppeal(req.id, { text, evidence, role });
            setSigning(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}
