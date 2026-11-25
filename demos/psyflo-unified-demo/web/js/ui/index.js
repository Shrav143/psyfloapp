// The UI kit. `import { ui } from '../ui/index.js'` (or `import { ui } from '../app.js'`), then in renderVals:
//   return { rows: raw(ui.queueTable({ … })), status: raw(ui.statusChip(r.stage)) }
// Every fragment helper returns an HTML string: wrap it with raw(). Importing this module installs the delegated listeners once.
import * as chipMod from './chip.js';
import * as filterMod from './filter-bar.js';
import * as tableMod from './queue-table.js';
import * as overlayMod from './overlay.js';
import * as timelineMod from './timeline.js';
import * as drMod from './draft-review.js';
import * as recsMod from './recs.js';
import * as intelMod from './intel.js';
import * as miscMod from './misc.js';
import * as glanceMod from './glance.js';
import { pager as pagerFn } from './pager.js';
import { hint as hintFn } from './hint.js';
import { dateCard as dateCardFn } from './date-card.js';
import * as dockMod from './dock.js';
import * as toastMod from './toast.js';
import * as queryMod from './query.js';
import * as utilMod from './util.js';
import { install } from './wire.js';
import { maturity as maturityTier } from './chip.js';

install();

export const ui = {
  // chips
  chip: chipMod.chip, statusChip: chipMod.statusChip, resolveStatus: chipMod.resolveStatus, STATUS: chipMod.STATUS,
  maturity: chipMod.maturity, sourceChip: chipMod.sourceChip, verification: chipMod.verification, VERIFICATION: chipMod.VERIFICATION,
  datasetChip: chipMod.datasetChip, evidenceChip: chipMod.evidenceChip, progress: chipMod.progress,
  // lists and tables
  filterBar: filterMod.filterBar, queueTable: tableMod.queueTable, sortRows: tableMod.sortRows,
  timeline: timelineMod.timeline, history: timelineMod.history, eventDetailHtml: timelineMod.eventDetailHtml,
  draftReview: drMod.draftReview,
  // recommendations (R6): cards in a drawer or modal, a short list for a case page, the drawer that repaints itself
  recPanel: recsMod.recPanel, bindRecPanel: recsMod.bindRecPanel, recDrawer: recsMod.recDrawer, recMini: recsMod.recMini,
  // Oprox parity (R7): streaming steps, trend chart, severity tags, KPI tiles, bars, money and due chips, the insights drawer
  stepsHTML: intelMod.stepsHTML, runSteps: intelMod.runSteps, trendChart: intelMod.trendChart, sevTag: intelMod.sevTag, statusPill: intelMod.statusPill, kpiTile: intelMod.kpiTile, barRow: intelMod.barRow,
  moneyChip: intelMod.moneyChip, dueChip: intelMod.dueChip, needsInputBadge: intelMod.needsInputBadge, decisionSupport: intelMod.decisionSupport, sampleChip: intelMod.sampleChip, basisLine: intelMod.basisLine,
  insightsHTML: intelMod.insightsHTML, insightsDrawer: intelMod.insightsDrawer, pulseStrip: intelMod.pulseStrip, bandRow: intelMod.bandRow,
  // overlays
  overlay: overlayMod.overlay, modal: overlayMod.modal, drawer: overlayMod.drawer, popover: overlayMod.popover, confirm: overlayMod.confirm,
  tooltip: overlayMod.tooltip, dialogHtml: overlayMod.dialogHtml,
  // table footer: rows per page 10, 25, 50, 100 (replaces the "N of M" count)
  pager: pagerFn,
  hint: hintFn,
  dateCard: dateCardFn,
  // at-a-glance pieces
  unitsBar: glanceMod.unitsBar, dateFlag: glanceMod.dateFlag,
  // small pieces
  emptyState: miscMod.emptyState, skipLink: miscMod.skipLink, stepper: miscMod.stepper, statStrip: miscMod.statStrip, infoPopover: miscMod.infoPopover, kbd: miscMod.kbd,
  draft: miscMod.draft, draftField: miscMod.draftField,
  toast: toastMod.toast, toastHtml: toastMod.toastHtml,
  presenterDock: dockMod.presenterDock,
  // plumbing
  query: queryMod, icon: utilMod.icon, ICON_NAMES: utilMod.ICON_NAMES, esc: utilMod.esc, resetAutoIds: utilMod.resetAutoIds
};
export const { chip, statusChip, maturity, sourceChip, verification, datasetChip, evidenceChip, progress, filterBar, queueTable, sortRows, timeline, history, draftReview, emptyState, skipLink, stepper, statStrip, infoPopover, tooltip, draft, draftField, presenterDock, toast, modal, drawer, popover, confirm } = ui;
export { overlayMod as overlayApi, dockMod as dockApi, chipMod, tableMod };
