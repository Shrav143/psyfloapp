# Workflow diagrams

Every screen, click and decision in the Psyflo prior-auth demo, mapped one menu tab and sub tab at a time. Sixteen shapes and colours mean the same thing in every diagram (see `src/00-overview/10-legend.flow`).

| Folder | Menu tab |
|---|---|
| `00-overview` | Legend, site map, one request from referral to decision |
| `01-global-shell` | Sidebar, top bar (Ask FLO, Notifications, Demo menu), Help, Sign out |
| `02-dashboard` | Dashboard |
| `03-authorizations` | Authorizations: worklist and case page |
| `04-new-case` | Authorizations › New case (Referral, Medical records, Agents work, Review and sign) |
| `05-eligibility` | Authorizations › Eligibility & Benefits |
| `06-denials` | Denial Intelligence |
| `07-case-manager` | Authorizations: approved, reviews and tracked cases (Case Manager merged into Authorizations in round 7; the folder keeps its name) |
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

Also `node tools/pdf.mjs` (after a build) writes `out/Psyflo-workflow-diagrams.pdf`, one page per diagram sized to the diagram. It needs `pdfunite` (poppler-utils) and is about 35 MB, so it is not committed.

`DEMO-GAPS.md` lists what the mapping found in the demo itself: controls that go nowhere, screens that disagree, states that cannot be reached.

`out/Psyflo-workflow-diagrams.html` is one self-contained page (menu tree, search, zoom, full screen, click-through between diagrams). `out/mmd/` holds the compiled Mermaid text for each diagram, which pastes into Mermaid Live, Notion, Miro, draw.io or any Mermaid-aware tool, and `out/md/` has one Markdown page per menu tab with the diagrams as Mermaid blocks (how they look depends on the Mermaid version your Markdown viewer ships). The HTML, `out/mmd/` and `out/md/` are committed; `out/svg/` and the PDF are rebuilt on demand. How to write a `.flow` file: `AUTHORING.md`.
