import { useState } from "react";
import { LockKeyhole, PauseCircle } from "lucide-react";
import { AgentBadge, Banner, Button, Card, CardBody, CardHeader, Dropdown, Modal, Page, PageHeader, Switch } from "@/components/ui";
import { AGENTS, CREW } from "@/data/agents";
import type { AgentKey, CrewKey } from "@/data/types";
import { useStore } from "@/store";

type Freedom = "ask" | "report" | "auto";
const FREEDOM = [
  { value: "ask" as Freedom, label: "Ask before acting" },
  { value: "report" as Freedom, label: "Act, then report" },
  { value: "auto" as Freedom, label: "Act on its own" },
];
const DEFAULT: Partial<Record<AgentKey, Freedom>> = { navigator: "report", caller: "ask", reader: "auto", verify: "auto", cadence: "report" };

/** Settings, then Agents: the roster, how much freedom each agent has, and Pause all. */
export default function SettingsPage() {
  const toast = useStore((s) => s.toast);
  const [freedom, setFreedom] = useState<Record<string, Freedom>>(() => Object.fromEntries((Object.keys(AGENTS) as AgentKey[]).map((k) => [k, DEFAULT[k] ?? "ask"])));
  const [paused, setPaused] = useState<Set<AgentKey>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const allPaused = paused.size === Object.keys(AGENTS).length;

  const crews = (Object.keys(CREW) as CrewKey[]).map((c) => ({ key: c, agents: (Object.keys(AGENTS) as AgentKey[]).filter((a) => AGENTS[a].crew === c) }));
  return (
    <Page>
      <PageHeader
        title="Settings"
        sub="Who the agents are, how much freedom each one has, and a way to pause them."
        actions={allPaused ? <Button icon={PauseCircle} variant="primary" onClick={() => { setPaused(new Set()); toast({ title: "Agents resumed", tone: "good" }); }}>Resume all agents</Button> : <Button icon={PauseCircle} variant="danger" onClick={() => setConfirm(true)}>Pause all agents</Button>}
      />
      {allPaused ? <Banner tone="mid" title="All agents are paused">Nothing is being checked, drafted or sent until you resume them. In this demo the pause does not change the other screens.</Banner> : null}
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
                    <div className="font-semibold">{AGENTS[a].name}</div>
                    <div className="truncate text-[13px] text-muted">{AGENTS[a].role}</div>
                  </div>
                  <Dropdown<Freedom> variant="filter" value={freedom[a]} options={FREEDOM} onChange={(v) => { setFreedom((f) => ({ ...f, [a]: v })); toast({ title: `${AGENTS[a].name}: ${FREEDOM.find((x) => x.value === v)?.label}`, tone: "neutral" }); }} ariaLabel={`Freedom for ${AGENTS[a].name}`} menuWidth={200} />
                  <Switch checked={!paused.has(a)} onChange={(on) => setPaused((p) => { const n = new Set(p); if (on) n.delete(a); else n.add(a); return n; })} />
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
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm" title="Pause all agents?" subtitle="No checks, calls or drafts will run until you resume." footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { setPaused(new Set(Object.keys(AGENTS) as AgentKey[])); setConfirm(false); toast({ title: "All agents paused", tone: "mid" }); }}>Pause all</Button></>}>
        <p className="text-sm text-ink2">Requests already with a payer stay where they are. You can resume at any time.</p>
      </Modal>
    </Page>
  );
}
