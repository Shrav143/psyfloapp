# EHR round: edit the prior authorization in Lauris, with the Psyflo extension

This demo is a fork of the Oct 24 "Psyflo Prior Auth" demo (commit `4fa4038b`, the page published as artifact `9X3xYEndKX4pZ86vTcBgwH`), recolored to the Unified demo palette,
with a mock **Lauris** EHR and the **Psyflo browser extension** added.

## The rule

| Where | What happens there |
|---|---|
| The prior authorization form and its recommendations (Authorizations tab; a denied authorization that is re-edited, Denial Intelligence tab) | **Edited in Lauris.** A button in Psyflo takes the person to Lauris. The Psyflo extension, docked in Lauris, suggests the recommendations and types them into Lauris's own form. A person checks the yellow text and saves in Lauris. |
| The same recommendations, if the person prefers | **Still possible in Psyflo.** "Apply here in Psyflo" on the case page works as before. Both end in the same state (`queueCases[key].applied`). |
| Appeal letters | **Stay in Psyflo.** The EHR never holds them. The extension links to the appeal in Psyflo and nothing more. |

Psyflo never invents clinical text. A recommendation types the sentence its case model already holds (`rec.add.text(answer)`), made from a stored record or from words the person typed.
A denial correction types the chart excerpt the finding is backed by (`finding.excerpt`). The extension never presses Save in Lauris.

## Colors (the Unified demo)

Paper `#F8F6F2`, ink and rail navy `#151B24`, teal `#217A78` (hover `#15605E`, on dark `#5FC0BE`, tint `#E1F0EF`), marigold `#F0B44C`, DM Sans.
Status pairs: danger `#8A2E1C` on `#FBE7E2`, warning `#6F4A05` on `#FCEFD0`, success `#1D4F43` on `#E3EFEA`, neutral `#3F4752` on `#EFEBE4`, info `#1F4E8C` on `#DCE8F7`.
They are the `@theme` tokens in `src/index.css` (`bg-forest` is teal, `bg-side` and `bg-navy` are the rail). Lauris keeps the look of the mock Lauris in the Unified demo
(slate header, slate left nav with a gold marker, white page, blue links and primary button); the extension panel keeps the look of the Unified demo's panel (navy header, `psyflo.` mark).
In Lauris, **green = already in Lauris**, **yellow = Psyflo typed it, check it**.

## Pieces

| Piece | Owner | Files |
|---|---|---|
| Route `/lauris/*`, outside the Psyflo shell | foundation | `src/App.tsx`, `src/routes.ts` (`paths.lauris`) |
| Shared model, hooks, selectors | foundation | `src/ehr/model.ts` (`useEhrCase`, `formFields`, `applyArgsFor`, `useEditQueue`, `useDenialEdits`) |
| Store slice | foundation | `src/store/ehr.ts` (`ehrOpen`, `ehrPanel`, `ehrAddRecs`, `ehrAddFixes`, `ehrSave`, `ehrOverride`) |
| The mock Lauris: browser frame, header, nav, Consumers, Authorizations, the authorization form | Lauris | `src/ehr/lauris/*` |
| The Psyflo extension panel: home, authorization suggestions, denial corrections | panel | `src/ehr/panel/*` |
| Buttons in Psyflo that go to Lauris; "Added in Lauris" marks; appeal stays | platform | `src/pages/authorizations/*`, `src/pages/denials/*` |

## Lauris pages

- `/lauris` Consumers (Active Consumers table). `/lauris/authorizations` Authorizations list. `/lauris/case/:id` the authorization form for that case (`?view=denial` for a denied one).
- The browser frame has two tabs: **Psyflo** (returns to `ehr.returnTo`, or the Dashboard) and **Lauris Online** (active). The Psyflo extension button sits in the toolbar and shows or hides the panel.
- The form has the case's sections as text boxes (`useEhrCase(id).fields`: Clinical picture, Why a lower level of care is not enough, Current severity, Plan, and on a denied case Corrections for resubmission),
  **Save** (Lauris's own button; `ehrSave`) and a link back to Psyflo.

## Extension panel

- Docked right, 400 px, under the browser toolbar. Navy header with the `psyflo.` mark, "Psyflo", "Lauris connected · <page>", a role pill. Legend chips (green / yellow).
- **Home** (Consumers and Authorizations pages): greeting, the most urgent authorization, "To edit in Lauris" (`useEditQueue`), "Denials to correct" (`useDenialEdits`), Open Psyflo.
- **Authorization** (form page): case strip (consumer, payer, level of care, approval chance now to with every action, due), **Suggested by Psyflo** cards (Include, title, points, where it goes, the person's own words box on
  cards that need them, Why, Dismiss), footer: **Add N to the Lauris form**, Refine, Add clinical context, Dismiss. Added cards move to "Typed in Lauris" (yellow until saved, green after).
- **Denial** (form page, `?view=denial`): the corrections the denial's findings suggest, each with its source chip and chart excerpt, **Add N to the Lauris form**; and "Appeal letter · stays in Psyflo" with a button to the denial in Psyflo.
