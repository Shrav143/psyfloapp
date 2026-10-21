# Workflow diagrams

Every screen, click and decision in the Psyflo prior-auth demo, mapped one menu tab and sub tab at a time. Sixteen shapes and colours mean the same thing in every diagram (see `src/00-overview/10-legend.flow`).

| Folder | Menu tab |
|---|---|
| `00-overview` | Legend, site map, one request from referral to decision |
| `01-global-shell` | Sidebar, top bar (Ask FLO, Notifications, Demo menu), Help, Sign out |
| `02-dashboard` | Dashboard |
| `03-authorizations` | Authorizations: queue and case page |
| `04-new-case` | Authorizations › New case (Referral, Medical records, Agents work, Review and sign) |
| `05-eligibility` | Authorizations › Eligibility & Benefits |
| `06-denials` | Denial Intelligence |
| `07-case-manager` | Case Manager (Active cases, Reviews this week) |
| `08-analytics` | Analytics |
| `09-emr-connect` | EMR Connect |
| `10-payers` | Payers |
| `11-settings` | Settings |

Each folder holds `.flow` files (one diagram each) and a coverage file listing every control and the diagram that shows it.

```bash
cd demos/prior-auth-demo/workflows
npm install                                   # Mermaid, used to draw
node tools/check.mjs src/02-dashboard         # draw one folder to PNGs in /tmp/wf-check
node tools/build.mjs                          # everything: out/Psyflo-workflow-diagrams.html, out/mmd/*.mmd, out/svg/*.svg
```

`out/Psyflo-workflow-diagrams.html` is one self-contained page (menu tree, search, zoom, full screen, click-through between diagrams). `out/mmd/` holds the compiled Mermaid text for each diagram, which pastes into Mermaid Live, Notion, Miro, draw.io or any Mermaid-aware tool. How to write a `.flow` file: `AUTHORING.md`.
