import { ArrowLeft, ExternalLink, MessageCircle, PlayCircle, CircleHelp } from "lucide-react";
import { useState } from "react";
import { useCurrent } from "@/hooks";
import "../panel-nav.css";

/** What the chat offers. Options only: nobody types, so nobody has to guess what to say. */
const TOPICS = [
  { id: "typing", label: "Something did not type into Lauris", reply: "Sorry about that. Check that the document is still open in Lauris and the fields are not locked. If it still did not type, a Psyflo teammate can look at it with you." },
  { id: "fix", label: "A fix looks wrong", reply: "Thanks for flagging it. Psyflo only types a quote from the chart, your own words, or a choice you make, so a wrong fix is worth a look. A Psyflo teammate can review it with you." },
  { id: "learn", label: "I want to learn how to use it", reply: "There is a short training video and a page of answers to common questions. You can open either from the Help screen." },
  { id: "other", label: "Something else", reply: "No problem. A Psyflo teammate can pick this up." },
];

/** The question-mark icon: a few options and nothing else. Chat with Psyflo, the FAQs, the training videos. */
export default function HelpView() {
  const { clinic } = useCurrent();
  const [view, setView] = useState<"options" | "chat">("options");
  const [note, setNote] = useState<string | null>(null);
  if (view === "chat") return <Chat onBack={() => setView("options")} />;

  const link = (id: string, text: string) => setNote(note === id ? null : text);
  return (
    <div className="psy-body" data-testid="help">
      <h2 className="p-big">Help</h2>
      <p className="nv-lead">How can we help, {clinic.user.name.split(" ")[0]}?</p>

      <ul className="hp-opts">
        <li>
          <button type="button" className="hp-opt" data-testid="help-chat" onClick={() => setView("chat")}>
            <span className="g" aria-hidden="true"><MessageCircle size={18} /></span>
            <span className="tx"><b>Chat with Psyflo</b><span>Talk to our team</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="hp-opt" data-testid="help-faq" aria-expanded={note === "faq"} onClick={() => link("faq", "faq")}>
            <span className="g" aria-hidden="true"><CircleHelp size={18} /></span>
            <span className="tx"><b>FAQs</b><span>Answers to common questions</span></span>
            <ExternalLink size={15} aria-hidden="true" className="ext" />
          </button>
          {note === "faq" ? <p className="p-note hp-demo">In the real extension this opens Psyflo&apos;s FAQ page in a new tab. The link is not set up in this demo.</p> : null}
        </li>
        <li>
          <button type="button" className="hp-opt" data-testid="help-training" aria-expanded={note === "training"} onClick={() => link("training", "training")}>
            <span className="g" aria-hidden="true"><PlayCircle size={18} /></span>
            <span className="tx"><b>Training videos</b><span>Short how-to videos</span></span>
            <ExternalLink size={15} aria-hidden="true" className="ext" />
          </button>
          {note === "training" ? <p className="p-note hp-demo">In the real extension this opens Psyflo&apos;s training videos in a new tab. The link is not set up in this demo.</p> : null}
        </li>
      </ul>

      <p className="p-note" style={{ marginTop: 14 }}>In Lauris, <b>green</b> is already saved and <b>yellow</b> is text Psyflo typed for you to check. Psyflo never presses Save.</p>
    </div>
  );
}

/** A help chat that is options only. Simulated: no one is on the other end in this demo. */
function Chat({ onBack }: { onBack: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [person, setPerson] = useState(false);
  const left = TOPICS.filter((t) => !picked.includes(t.id));
  const last = picked.length ? TOPICS.find((t) => t.id === picked[picked.length - 1]) : undefined;
  return (
    <div className="psy-body" data-testid="help-chat-view">
      <button type="button" className="p-btn ghost sm pt-back" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Help</button>
      <h2 className="p-big">Chat with Psyflo</h2>
      <p className="p-note" style={{ marginBottom: 10 }}>Simulated: nobody is on the other end in this demo.</p>

      <div className="p-bubble ai">Hi! What do you need help with? Choose one.</div>
      {picked.map((id) => {
        const t = TOPICS.find((x) => x.id === id)!;
        return (
          <div key={id}>
            <div className="p-bubble you">{t.label}</div>
            <div className="p-bubble ai" data-testid="help-reply">{t.reply}</div>
          </div>
        );
      })}
      {person ? <div className="p-bubble ai" data-testid="help-person">Connecting you to a Psyflo teammate. They will reply here (simulated).</div> : null}

      <div className="hp-chips" role="group" aria-label="Choose an option">
        {last && !person ? <button type="button" className="p-chip btn" data-testid="help-person-btn" onClick={() => setPerson(true)}>Talk to a person</button> : null}
        {left.map((t) => <button key={t.id} type="button" className="p-chip btn" data-testid={`help-opt-${t.id}`} onClick={() => setPicked([...picked, t.id])}>{t.label}</button>)}
      </div>
    </div>
  );
}
