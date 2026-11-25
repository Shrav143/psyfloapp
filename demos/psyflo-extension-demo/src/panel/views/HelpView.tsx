import { ExternalLink, MessageCircle, PlayCircle, CircleHelp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { HELP_LINKS } from "@/helpLinks";
import "../panel-nav.css";

interface Opt { id: "chat" | "faqs" | "training"; testid: string; title: string; sub: string; icon: ReactNode; where: string }

const OPTIONS: Opt[] = [
  { id: "chat", testid: "help-chat", title: "Chat with Psyflo", sub: "Talk to our team on Help Scout", icon: <MessageCircle size={18} />, where: "Psyflo's Help Scout chat" },
  { id: "faqs", testid: "help-faq", title: "FAQs", sub: "Answers to common questions", icon: <CircleHelp size={18} />, where: "Psyflo's FAQs" },
  { id: "training", testid: "help-training", title: "Training videos", sub: "Short how-to videos", icon: <PlayCircle size={18} />, where: "Psyflo's training videos" },
];

/** The question-mark icon: three options and nothing else. Each opens in a new tab once its link is set (src/helpLinks.ts). */
export default function HelpView() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="psy-body" data-testid="help">
      <h2 className="p-big">Help</h2>
      <p className="nv-lead">How can we help?</p>
      <ul className="hp-opts">
        {OPTIONS.map((o) => {
          const url = HELP_LINKS[o.id];
          const inner = (
            <>
              <span className="g" aria-hidden="true">{o.icon}</span>
              <span className="tx"><b>{o.title}</b><span>{o.sub}</span></span>
              <ExternalLink size={15} aria-hidden="true" className="ext" />
            </>
          );
          return (
            <li key={o.id}>
              {url ? (
                <a className="hp-opt" data-testid={o.testid} href={url} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <button type="button" className="hp-opt" data-testid={o.testid} aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? null : o.id)}>{inner}</button>
              )}
              {!url && open === o.id ? <p className="p-note hp-demo">In the real extension this opens {o.where} in a new tab. The link is not set in this demo.</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
