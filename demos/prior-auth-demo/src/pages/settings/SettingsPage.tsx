import { useState } from "react";
import { LockKeyhole, PauseCircle } from "lucide-react";
import { AgentBadge, Banner, Button, Card, CardBody, CardHeader, Dropdown, Modal, Page, PageHeader, Pill, Switch } from "@/components/ui";
import { AGENTS, CREW } from "@/data/agents";
import type { AgentKey, CrewKey } from "@/data/types";
import { useStore } from "@/store";
import { FREEDOM_LABEL, selectAllAgentsPaused, type Freedom } from "@/store/agentSettings";
import { nameList, pauseEffects } from "./pauseEffects";

const AGENT_KEYS = Object.keys(AGENTS) as AgentKey[];
const FREEDOM = (Object.keys(FREEDOM_LABEL) as Freedom[]).map((value) => ({ value, label: FREEDOM_LABEL[value] }));

/** What a level changes. Today the levels are applied in EMR Connect (Sync now, Fix and Reconnect), so the lines say that. */
const LEVELS: { value: Freedom; line: string }[] = [
  { value: "ask", line: "Waits for your OK. Reader asks before it syncs, and Navigator before it fixes or reconnects a system." },
  { value: "report", line: "Goes ahead, then reports what it did in a toast and in Recent activity." },
  { value: "auto", line: "Goes ahead and only logs what it did in Recent activity, with no toast." },
];

const nameOf = (a: AgentKey) => AGENTS[a].name;

/** Settings, then Agents: the roster, how much freedom each agent has, and Pause all. The choices live in the store, so other screens read them. */
export default function SettingsPage() {
  const toast = useStore((s) => s.toast);
  const freedom = useStore((s) => s.agentFreedom);
  const paused = useStore((s) => s.agentPaused);
  const allPaused = useStore(selectAllAgentsPaused);
  const [confirm, setConfirm] = useState(false);
  const pausedKeys = AGENT_KEYS.filter((k) => paused[k]);
  const pausedNames = pausedKeys.map(nameOf);
  const effect = pauseEffects(pausedKeys, allPaused, nameOf).join(" ");
  const resumeAll = () => { useStore.getState().resumeAllAgents(); toast({ title: "Agents resumed", tone: "good" }); };

  const crews = (Object.keys(CREW) as CrewKey[]).map((c) => ({ key: c, agents: AGENT_KEYS.filter((a) => AGENTS[a].crew === c) }));
  return (
    <Page>
      <PageHeader
        title="Settings"
        sub="Who the agents are, how much freedom each one has, and a way to pause them."
        actions={allPaused ? <Button icon={PauseCircle} variant="primary" onClick={resumeAll}>Resume all agents</Button> : <Button icon={PauseCircle} variant="danger" onClick={() => setConfirm(true)}>Pause all agents</Button>}
      />
      {pausedNames.length ? (
        <Banner tone="mid" title={allPaused ? "All agents are paused" : `${pausedNames.length === 1 ? `${pausedNames[0]} is` : `${pausedNames.length} agents are`} paused`} action={allPaused ? undefined : <Button size="sm" variant="primary" onClick={resumeAll}>Resume all agents</Button>}>
          {allPaused ? null : <>Paused: {nameList(pausedNames)}. </>}{effect} Requests already with a payer stay where they are.
        </Banner>
      ) : null}
      <Banner icon={LockKeyhole} title="Privacy mode is always on">Names, dates and IDs are swapped for codes before an agent reads a chart, and mapped back only on your screen.</Banner>
      <div className="grid grid-cols-2 gap-4">
        {crews.map((c) => (
          <Card key={c.key}>
            <CardHeader title={CREW[c.key].label} subtitle={CREW[c.key].sub} />
            <div>
              {c.agents.map((a) => (
                <div key={a} className="flex items-center gap-3 border-b border-line px-6 py-3 last:border-b-0">
                  <AgentBadge agent={a} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold">{AGENTS[a].name}</span>{paused[a] ? <Pill tone="mid">Paused</Pill> : null}</div>
                    <div className="truncate text-[13px] text-muted">{AGENTS[a].role}</div>
                  </div>
                  <Dropdown<Freedom> variant="filter" value={freedom[a]} options={FREEDOM} onChange={(v) => {
                    if (v === freedom[a]) return;
                    useStore.getState().setAgentFreedom(a, v);
                    toast({ title: `${AGENTS[a].name}: ${FREEDOM_LABEL[v]}`, tone: "neutral" });
                  }} ariaLabel={`Freedom for ${AGENTS[a].name}`} menuWidth={200} />
                  <Switch checked={!paused[a]} onChange={(on) => {
                    useStore.getState().setAgentPaused(a, !on);
                    toast({ title: `${AGENTS[a].name} ${on ? "resumed" : "paused"}`, tone: on ? "good" : "mid" });
                  }} label={<span className="sr-only">{AGENTS[a].name} is {paused[a] ? "paused" : "working"}</span>} />
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Card>
          <CardHeader title="Gates" subtitle="Agents never pass these without a person" />
          <CardBody className="flex flex-col gap-3 text-sm">
            {[["Sign-off", "A licensed clinician signs every request and appeal."], ["Confirm", "The case owner confirms before agents start, before a next step on a denial, and before any write-back."], ["Answer", "A person answers when an agent asks a question."], ["Acknowledge", "A person acknowledges a payer rule change before drafts are updated."], ["Pause", "An operator can pause one agent or all of them."]].map(([k, v]) => (
              <div key={k} className="flex gap-3"><span className="w-[92px] shrink-0 font-semibold">{k}</span><span className="text-ink2">{v}</span></div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What each level changes" subtitle="Set per agent. Applied in EMR Connect" />
          <CardBody className="flex flex-col gap-3 text-sm">
            {LEVELS.map((l) => (
              <div key={l.value} className="flex gap-3"><span className="w-[92px] shrink-0 font-semibold">{FREEDOM_LABEL[l.value]}</span><span className="text-ink2">{l.line}</span></div>
            ))}
          </CardBody>
        </Card>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm" title="Pause all agents?" subtitle="No agent starts new work until you resume." footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { useStore.getState().pauseAllAgents(); setConfirm(false); toast({ title: "All agents paused", tone: "mid" }); }}>Pause all</Button></>}>
        <p className="text-sm text-ink2">{pauseEffects(AGENT_KEYS, true, nameOf).join(" ")} Requests already with a payer stay where they are. You can resume at any time.</p>
      </Modal>
    </Page>
  );
}
