import type { CansAssessment, IntakeRecord, Suggestion } from "@/data/intake/types";
import { actorName } from "../shared/provenance";
import { disagreementOf } from "./assistant";
import { HEDGED, RISK_THEME, themeWord } from "./cansModel";
import { domainForTheme, relevantItem } from "./template";

/* What the Evidence Review tab says about one proposal: where it would be filed, why the agent proposed it and what a person should look at before
   keeping it. Pure reading of the record: the agent proposes, and nothing here rates an item. */

export interface ProposalFacts {
  theme: string;
  /** The domain of the loaded template it would be filed under, and the item its wording points at. */
  domain: { id: string; label: string } | null;
  item: { id: string; name: string } | null;
  explanation: string;
  hedged: boolean;
  risk: boolean;
  disagreement: string | null;
}

export function proposalFacts(record: IntakeRecord, cans: CansAssessment, sg: Suggestion): ProposalFacts {
  const theme = sg.field.replace(/^evidence:/, "");
  const domain = cans.template ? domainForTheme(theme, sg.value) : null;
  const item = domain ? relevantItem(domain.id, sg.value) : null;
  const word = themeWord(sg.value);
  const explanation = [
    `${actorName(sg.agent)} read ${sg.source.ref} and found wording that matches ${theme.toLowerCase()}${word ? ` (“${word}”)` : ""}${domain ? `, so it would be filed under ${domain.label}` : ""}.`,
    item ? `It may bear on “${item.name}”.` : "",
    "It is a draft: a person decides whether it supports an item. The agent never rates.",
  ].filter(Boolean).join(" ");
  return {
    theme, domain: domain ? { id: domain.id, label: domain.label } : null, item: item ? { id: item.id, name: item.name } : null, explanation,
    hedged: HEDGED.test(sg.value), risk: theme === RISK_THEME, disagreement: disagreementOf(record, cans, sg.value),
  };
}
