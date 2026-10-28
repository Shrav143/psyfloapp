import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import { Banner, Button, Card, CardBody, CardHeader, Field, FileDrop, FileRow, Segmented, TextArea, type DemoFile } from "@/components/ui";
import { sampleById } from "@/data/intake/samples";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { SiteSelect } from "./inputs";
import { blocksToText, parsePastedText } from "./pasteParse";
import { draftPath } from "./paths";
import { startFromPaste } from "./startDraft";

type Mode = "text" | "screenshot";
const TEXT_SAMPLES = [
  { id: "s-email-pcp", title: "Referral email from primary care", note: "Names two plans" },
  { id: "s-up-court", title: "Court or probation letter", note: "Release not signed" },
];

/** Paste text or a screenshot. Pasted text is read by a small pattern reader that copies only what the text says and points to the line. A screenshot is not read:
    the demo extracts a sample's content and says so. */
export function PasteFlow() {
  const nav = useNavigate();
  const scope = useScope();
  const paused = useStore((s) => s.agentPaused.reader);
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [shot, setShot] = useState<DemoFile | null>(null);
  const [site, setSite] = useState(scope.sites[0]);
  const box = useRef<HTMLDivElement>(null);

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const f = item?.getAsFile();
    if (f) {
      e.preventDefault();
      setShot({ id: `shot-${Date.now()}`, name: f.name && f.name !== "image.png" ? f.name : "Pasted screenshot.png", sizeKb: Math.max(1, Math.round(f.size / 1024)) });
    }
  };
  const start = () => {
    if (mode === "text") {
      const parsed = parsePastedText(text);
      nav(draftPath(startFromPaste(parsed, { site, name: "Pasted text.txt" })));
    } else {
      const sample = sampleById("s-web-dup");
      if (!sample) return;
      const parsed = parsePastedText(blocksToText(sample.blocks), "Parent (web form)");
      nav(draftPath(startFromPaste(parsed, { site, name: shot?.name ?? "Pasted screenshot.png", screenshot: true })));
    }
  };
  const ready = mode === "text" ? text.trim().length >= 20 : !!shot;

  return (
    <Card data-flow="paste">
      <CardHeader title="Paste text or a screenshot" subtitle="Paste a referral email or a screenshot of one. Reader finds the fields and links each one to where it came from." />
      <CardBody className="flex flex-col gap-4">
        {paused ? <Banner tone="mid" title="Reader is paused in Settings">Nothing is read until you resume it.</Banner> : null}
        <Segmented<Mode> items={[{ id: "text", label: "Paste text" }, { id: "screenshot", label: "Paste a screenshot" }]} value={mode} onChange={setMode} />
        {mode === "text" ? (
          <>
            <Field label="Referral text" hint="Reader copies only what the text says. Names are reduced to initials.">
              <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Paste the email or note here" data-paste-text />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">Or use sample text:</span>
              {TEXT_SAMPLES.map((s) => (
                <Button key={s.id} size="sm" onClick={() => { const sm = sampleById(s.id); if (sm) setText(blocksToText(sm.blocks)); }} data-sample-text={s.id}>{s.title}</Button>
              ))}
            </div>
          </>
        ) : (
          <div ref={box} tabIndex={0} onPaste={onPaste} className="flex flex-col gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-forest/30">
            {shot ? <FileRow file={shot} status="warn" onRemove={() => setShot(null)} /> : <FileDrop variant="panel" title="Paste a screenshot here" hint="Press Ctrl+V or Cmd+V with an image copied, or click to choose an image" onFiles={(f) => setShot(f[0] ?? null)} sampleName="Sample screenshot of a parent web form.png" />}
            <p className="flex items-center gap-2 text-[12px] font-medium text-ink2"><ImageIcon size={14} className="ico" />Simulated: the image is not read; the content of a sample web form is extracted.</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Site"><SiteSelect value={site} sites={scope.sites} onChange={setSite} /></Field></div>
        <div><Button variant="primary" onClick={start} disabled={paused || !ready} data-start-paste>Read it</Button></div>
      </CardBody>
    </Card>
  );
}
