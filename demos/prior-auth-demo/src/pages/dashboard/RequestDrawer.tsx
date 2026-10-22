import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, RefreshCw, Scale } from "lucide-react";
import { AgentChip, Banner, Button, Drawer, KeyValue, Pill, Timeline } from "@/components/ui";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { band } from "@/lib/format";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { PAYER_ROW_LABEL, isDenial, nextLine } from "./helpers";
import { chanceFacts, nextCheckIn, sentAt } from "./requestFacts";
import { DemoControls, StateActions } from "./RequestActions";

const VIA = { portal: "through the payer's portal", fax: "by fax", phone: "by phone" } as const;

/** The line under the history: when Navigator looks next, or why nothing is scheduled. */
function checkBanner(r: PsyRequest): ReactNode {
  const inT = nextCheckIn(r);
  if ((r.stage === "received" || r.stage === "under_review") && inT) {
    return (
      <>
        Next automatic check in <b>{inT}</b>.
      </>
    );
  }
  if (r.stage === "preparing") return "Not sent yet. Automatic checks start once the request is signed and sent.";
  if (r.stage === "info_requested") return "Waiting on you, not on the payer. Automatic checks resume once the answer is sent.";
  if (r.stage === "decided") return "Decided. Cadence booked the next review, so no more checks are needed.";
  return r.next.startsWith("Waiting") ? "Navigator checks again every 2 hours until the decision date." : "Advocate has the next step. Open Denial Intelligence for the brief.";
}

/** Everything the agents did on one request, in order, plus the buttons that act on it. */
export function RequestDrawer({ request: r, onClose, onSwitch }: { request: PsyRequest; onClose: () => void; onSwitch: (id: string) => void }) {
  const navigate = useNavigate();
  const writeBackOn = useStore(selectWriteBackOn);
  const [checking, setChecking] = useState(false);

  const payer = payerById(r.payerId);
  const sent = sentAt(r);
  const facts = chanceFacts(r);
  const denial = isDenial(r);

  const checkNow = () => {
    setChecking(true);
    setTimeout(() => {
      const s = useStore.getState();
      s.addEvent(r.id, { actor: "navigator", text: `Navigator checked: ${r.chip.toLowerCase()}` });
      if (r.stage === "received" || r.stage === "under_review") s.updateRequest(r.id, { next: "Navigator checks again in 30 minutes" });
      s.toast({ title: "Navigator checked", body: `${r.id} is still ${r.chip.toLowerCase()} at ${payer.shortName}. It checks again in 30 minutes.`, tone: "good" });
      setChecking(false);
    }, 1200);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={`${r.id} · ${PAYER_ROW_LABEL[r.payerId]}`}
      subtitle={`${PROGRAM_LABEL[r.program]} ${r.type.toLowerCase()} · ${sent === undefined ? "not sent yet" : `sent ${stamp(sent)}`}`}
      right={
        <Pill tone={r.tone} dot>
          {r.chip}
        </Pill>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          {r.stage !== "preparing" ? (
            <Button variant="primary" icon={RefreshCw} loading={checking} onClick={checkNow}>
              Check now
            </Button>
          ) : null}
          <Button onClick={() => navigate(paths.case(r.caseId))}>Open case</Button>
          {denial ? (
            <Button icon={Scale} onClick={() => navigate(paths.denials(r.id))}>
              Open in Denial Intelligence
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <StateActions request={r} />
        <KeyValue
          className="grid-cols-[130px_1fr] text-[14px]"
          items={[
            ["Patient", `${r.patient.initials}, ${r.patient.age}`],
            ["Held by", <span key="a" className="inline-flex flex-wrap items-center gap-2"><AgentChip agent={r.agent} /><span className="font-normal">{nextLine(r, writeBackOn)}</span></span>],
            ...(facts ? [[denial ? "Chance of winning" : "Approval chance", `${facts.chance}% · ${band(facts.chance).word} · likely ${facts.low} to ${facts.high}% · ${facts.similar.toLocaleString("en-US")} similar cases`] as [string, ReactNode]] : []),
            ["Sent", sent === undefined ? "Not yet" : VIA[r.sentVia]],
          ]}
        />
        <div>
          <h3 className="mb-3 font-serif text-xl font-semibold">History</h3>
          <Timeline events={r.events} empty="No events yet." />
        </div>
        <Banner icon={Clock}>{checkBanner(r)}</Banner>
        <DemoControls request={r} onNewId={onSwitch} />
      </div>
    </Drawer>
  );
}
