"use client";

import { PageHeader } from "@/lib/demo-ui/primitives";
import { AgentRoster } from "./agent-roster";
import { AuditTrail } from "./audit-trail";
import { CredentialVault } from "./credential-vault";
import { GuardrailsPanel } from "./guardrails-panel";
import { IntegrationsPanel } from "./integrations-panel";
import { RunsPanel } from "./runs-panel";
import { StatTiles } from "./stat-tiles";

const DESCRIPTION =
  "Seven agents do the button-pressing, polling, drafting and phone holds. Every action is logged to the ledger. Nothing leaves the building without a clinician's signature.";

export function AgentsClient() {
  const jumpToRuns = () => {
    document
      .getElementById("agent-runs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div>
      <PageHeader
        eyebrow="What runs, what never sends"
        title="Agents & integrations"
        description={DESCRIPTION}
      />
      <StatTiles onQuestions={jumpToRuns} />
      <AgentRoster />
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RunsPanel />
        <div className="space-y-6">
          <GuardrailsPanel />
          <CredentialVault />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <IntegrationsPanel />
        <AuditTrail />
      </div>
    </div>
  );
}
