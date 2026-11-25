import { ScanSearch } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { scenarioOf, useCurrent } from "@/ext/hooks";
import { useStore } from "@/ext/store";
import "../panel-scribe.css";
import "../panel-nav.css";
import Capturing from "./scribe/Capturing";
import Consent from "./scribe/Consent";
import Generating from "./scribe/Generating";
import Recover from "./scribe/Recover";
import Review from "./scribe/Review";
import Start from "./scribe/Start";
import Picker from "./scribe/Picker";
import Typed from "./scribe/Typed";
import type { ScribeCtx } from "./scribe/shared";

/** A session that has work in it. The view follows it even when the EHR page has moved on, so nothing the person recorded or reviewed is thrown away. */
const IN_PROGRESS = ["capturing", "recover", "generating", "review"];

/**
 * Scribe: start a session on the open document, ask for consent, record, generate a draft, review it card by card, type it into the EHR.
 * The stage lives in the store; this view picks the screen, keeps the store pointed at the document on the page, and moves focus on stage changes.
 */
export default function ScribeView() {
  const { clinic, docId: pageDocId } = useCurrent();
  const scribeDoc = useStore((s) => s.scribe.docId);
  const storeStage = useStore((s) => s.scribe.stage);
  const scribeOpen = useStore((s) => s.scribeOpen);
  const root = useRef<HTMLDivElement>(null);

  // Follow the page. A session in progress (or a finished one while the page is not on a document) keeps its own document.
  const keep = IN_PROGRESS.includes(storeStage) || (storeStage === "typed" && !pageDocId);
  const docId = keep ? scribeDoc : pageDocId;
  const stage = scribeDoc === docId ? storeStage : "start";

  useLayoutEffect(() => {
    if (!keep && pageDocId && scribeDoc !== pageDocId) scribeOpen(pageDocId);
  }, [keep, pageDocId, scribeDoc, scribeOpen]);

  // Move focus to the new stage's heading, but only when focus was in this panel (or lost with the control that was pressed).
  // A stage the EHR caused (recover) never takes focus from the page.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const sig = `${docId}:${stage}`;
    const before = seen.current;
    seen.current = sig;
    if (before === null || before === sig || before.split(":")[0] !== String(docId)) return;
    const a = document.activeElement;
    const mine = !!a && root.current?.contains(a);
    if (mine || (stage !== "recover" && (!a || a === document.body))) root.current?.querySelector<HTMLElement>("[data-stage-heading]")?.focus();
  }, [docId, stage]);

  const seed = docId ? clinic.docs.find((d) => d.id === docId) : undefined;
  const spec = seed ? clinic.forms[seed.kind] : undefined;
  const scenario = scenarioOf(clinic.scribe, docId);
  const consumer = seed ? clinic.consumers.find((c) => c.id === seed.consumerId) : undefined;

  let body: React.ReactNode;
  if (!docId || !seed || !spec) body = <NoDocument />;
  else if (!scenario) body = <NoScenario />;
  else {
    const ctx: ScribeCtx = { docId, seed, spec, consumer, scenario };
    body =
      stage === "consent" ? <Consent ctx={ctx} /> :
      stage === "capturing" ? <Capturing ctx={ctx} /> :
      stage === "recover" ? <Recover ctx={ctx} /> :
      stage === "generating" ? <Generating ctx={ctx} /> :
      stage === "review" ? <Review ctx={ctx} /> :
      stage === "typed" ? <Typed ctx={ctx} /> :
      <Start ctx={ctx} />;
  }
  return <div className="scr-root" ref={root} data-stage={stage}>{body}</div>;
}

function NoDocument() {
  return (
    <div className="psy-body">
      <section className="p-card" aria-labelledby="scr-new0">
        <h2 className="p-big" id="scr-new0" tabIndex={-1} data-stage-heading="">Start a new session</h2>
        <Picker />
        <p className="p-note">Psyflo listens, writes a draft and types it into the document you pick. It opens that document in Lauris. You check it and save.</p>
      </section>
    </div>
  );
}

function NoScenario() {
  const setTab = useStore((s) => s.setTab);
  return (
    <div className="psy-body">
      <section className="p-card">
        <h2 className="p-title" tabIndex={-1} data-stage-heading="">Scribe is not set up for this form</h2>
        <p className="p-sub">Psyflo cannot listen and draft this form yet. If it is already written, Scan &amp; Enhance can read it and suggest fixes.</p>
        <button type="button" className="p-btn pri block" data-testid="scribe-go-scan" onClick={() => setTab("scan")}><ScanSearch size={16} aria-hidden="true" />Go to Scan &amp; Enhance</button>
      </section>
    </div>
  );
}
