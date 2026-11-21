// Every menu, view, status, request type and metric name in the Psyflo app and the Lauris panel lives here.
// Standard revenue cycle management (RCM) and utilization review (UR) terms; where Harvest, Lauris or DMAS
// already has its own name (SRA, Process Form, Forms to Approve, "Continued stay" as a form title) that name stays.
// The phone app keeps its own plain words and does not read this file.

export const NAV = { Worklist: 'Worklist', Authorizations: 'Authorizations', Documentation: 'Documentation', Analytics: 'Analytics' };

// route id -> name shown in the sidebar, the screen picker and the page title
export const PAGE_TITLE = {
  DoNext: 'Worklist', Referrals: 'Intake', Referral: 'Referral', Eligibility: 'Eligibility re-verification',
  Authorizations: 'Authorizations', Submission: 'Authorization activity', InfoRequest: 'Additional info request', Partials: 'Partial approval',
  EarlyDischarge: 'Early discharge', PeerBrief: 'P2P call notes', AppealLetter: 'Appeal letter',
  StaffDashboard: 'Documentation', ReviewQueue: 'Chart review', Analytics: 'Analytics', PayerPlaybook: 'Payer rules', Users: 'Users & roles',
  Roadmap: 'Roadmap'
};

export const VIEWS = {
  authorizations: { requests: 'Prior auth & UR', intake: 'Intake' },
  documentation: { compliance: 'Note timeliness', review: 'Chart review' },
  analytics: { kpis: 'KPIs', outcomes: 'Outcomes' }
};

export const FILTER = { mine: 'Assigned to me', waiting: 'Awaiting response', funding: 'Funding source', site: 'All sites', status: 'Status', payer: 'Payer' };

// request type -> label (Lauris/DMAS form titles keep their own names where a form is shown)
export const REQ_TYPE = {
  initial: 'Initial auth', continued_stay: 'Reauth', additional_info: 'Additional info', peer_to_peer: 'P2P',
  early_discharge_new_initial: 'Initial auth', appeal: 'Appeal'
};
export const FORM_TITLE = { initial: 'TDT Initial SRA', continued_stay: 'Continued stay' };

// request stage -> status chip text (three words at most)
export const STATUS = {
  draft_ready: 'Ready for review', needs_approval: 'Pending clinical approval', awaiting_signature: 'Pending signature', signed: 'Ready to submit',
  sending: 'Sending', portal_open: 'Portal open', submitted: 'Submitted', overdue: 'Overdue', info_requested: 'Pended',
  partial_decide: 'Partial approval', peer_to_peer_requested: 'P2P requested', peer_to_peer_booked: 'P2P booked', p2p_awaiting: 'P2P held',
  denied: 'Denied', appeal_sent: 'Appeal sent', active: 'Authorized', early_discharge: 'Early discharge', closed: 'Closed'
};
export const RENEWAL = 'Reauth due';

export const METRIC = {
  timely: 'Timely %', backlog: 'Backlog', review: 'Review', everyNote: '100% review', sampled: 'Sampled',
  authorized: 'Authorized', requested: 'Requested', minutesPerNote: 'Minutes per note', timelyNotes: 'Timely notes'
};
export const PART = {
  eligibility: 'Eligibility re-verification', verify: 'Verify', preChecks: 'Pre-submission checks', docChecks: 'Documentation checks',
  activity: 'Activity log', attachments: 'Attachments', reviewOffer: 'Review offer', respond: 'Respond', followUp: 'follow-up', worklist: 'Worklist',
  awaiting: 'Awaiting response', approve: 'Approve'
};

// Short wording used in several places so the same fact always reads the same.
export const TXT = {
  dayN: n => `Day ${n}`, dayCall: n => `Day ${n} · follow-up`, hoursLeft: h => `${h} h left`, overdue: n => `${n} day${n === 1 ? '' : 's'} overdue`
};

export const HELP = {
  legend: 'Reads only the page you have open.',
  mic: 'Nothing is recorded until you press Record.',
  clock: 'Harvest calls at day 10. Public rule: 7 days. Many payers take 14.',
  units: '1 unit 2–2.99 h · 2 units 3–4.99 h · 3 units 5 h or more.',
  checks: 'Rules every draft must pass before you process it.',
  household: 'Family details stay out of payer text unless you include them.',
  approval: 'The clinical lead approves before the clinician signs.',
  proof: 'Dated screenshot kept in Psyflo, not in Lauris.',
  timely: 'Processed in Lauris within 24 hours of the session.',
  attachments: 'The authorization request needs all three.'
};
