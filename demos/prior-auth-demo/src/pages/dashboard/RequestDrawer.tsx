import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Scale } from "lucide-react";
import { AgentChip, Button, Disclosure, Drawer, KeyValue, Pill, Timeline } from "@/components/ui";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { band } from "@/lib/format";
import { stamp } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { selectWriteBackOn } from "@/store/emr";
import { PAYER_ROW_LABEL, isDenial, nextLine } from "./helpers";
import { CMS_DAYS, cmsClock } from "@/lib/doNext";
import { chanceFacts, nextCheckIn, sentAt } from "./requestFacts";
import { DemoControls, StateActions } from "./RequestActions";

const VIA = { portal: "through the payer's portal", fax: "by fax", phone: "by phone" } as const;

/** The line under Details: when Navigator looks next, or why nothing is scheduled. */
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
  const clock = useStore((s) => s.clock);
  const cms = cmsClock(r, clock);
  const [checking, setChecking] = useState(false);

  const payer = payerById(r.payerId);
  const sent = sentAt(r);
  const facts = chanceFacts(r);
  const denial = isDenial(r);
  const nextCheck = r.stage === "received" || r.stage === "under_review" ? nextCheckIn(r) : undefined;
  const detailsLine = [sent === undefined ? "Not sent yet" : `Sent ${VIA[r.sentVia]}`, nextCheck ? `next check in ${nextCheck}` : ""].filter(Boolean).join(" · ");

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
            ...(cms && (cms.hint || cms.past) ? [["Decision time", <span key="cms" className="font-normal text-mid-ink">{cms.past ? `Past ${CMS_DAYS} days` : `Day ${cms.day} of ${CMS_DAYS}`} under the CMS rule for Medicaid managed care</span>] as [string, ReactNode]] : []),
            ...(facts ? [[denial ? "Chance of winning" : "Approval chance", `${facts.chance}% · ${band(facts.chance).word} · likely ${facts.low} to ${facts.high}% · ${facts.similar.toLocaleString("en-US")} similar cases`] as [string, ReactNode]] : []),
          ]}
        />
        <div>
          <h3 className="mb-3 font-serif text-xl font-semibold">History</h3>
          <Timeline events={r.events} empty="No events yet." />
        </div>
        <Disclosure variant="plain" className="-mx-6" title="Details" summary={detailsLine}>
          <KeyValue className="grid-cols-[130px_1fr] px-6 py-4 text-[14px]" items={[["Sent", sent === undefined ? "Not sent yet" : `Signed and sent ${VIA[r.sentVia]}`], ["Checks", <span key="c" className="font-normal">{checkBanner(r)}</span>]]} />
        </Disclosure>
        <DemoControls request={r} onNewId={onSwitch} />
      </div>
    </Drawer>
  );
}
