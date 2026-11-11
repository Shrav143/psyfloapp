// Roadmap · title-only tiles for the later phases. Each links to a screen that already exists; nothing here is in the main navigation.
import { register, Screen, M, raw } from '../app.js';

const TILES = [
  ['Incident reports', 'ExtIncident.dc.html', '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'],
  ['Quarterly reports', 'ExtQuarterly.dc.html', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
  ['Discharge summary', 'ExtDischarge.dc.html', '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 13h8M8 17h5"/>'],
  ['Payer scorecard', 'PayerScorecard.dc.html', '<path d="M4 20h16M7 20V9M12 20V4M17 20v-8"/>'],
  ['Parent progress', 'ParentProgress.dc.html', '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'],
  ['Insurance letters', 'ParentLetters.dc.html', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'],
  ['Parent survey', 'ParentSurvey.dc.html', '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'],
  ['Book a call', 'ParentSchedule.dc.html', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>']
];

register('Roadmap', class extends Screen {
  renderVals() { return { today: M.fmtDate(this.s.today, { dow: true }), tiles: TILES.map(([title, href, icon]) => ({ title, href, icon: raw(icon) })) }; }
});
