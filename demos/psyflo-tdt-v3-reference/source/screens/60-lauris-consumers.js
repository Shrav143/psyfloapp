/* lauris-consumers: the Consumers page of Lauris Online (Active / Discharged, filters, sortable table).
   Direct support staff (round 9): only their assigned consumers open (PSY.caseload('dss'): M.R., T.N.); every other row reads No access,
   and the Units (authorization) column reads No access for them. */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris; const U = PSY.l1a; const esc = PSY.esc;
  const COLS = {
    active: [['id', 'Unique ID'], ['ini', 'Name'], ['staff', 'Staff'], ['group', 'Group'], ['updated', 'Last updated'], ['units', 'Units']],
    disch: [['id', 'Unique ID'], ['ini', 'Name'], ['staff', 'Staff'], ['group', 'Group'], ['when', 'Discharged'], ['why', 'Reason']],
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/[.\s]/g, '');
  function keyOf(c, k) {
    if (k === 'id') return +c.id;
    if (k === 'units') { const u = L.units(c); return u == null ? -1 : u; }
    if (k === 'updated' || k === 'when') { const d = U.pd(c[k]); return d ? d.getTime() : 0; }
    return String(c[k] || '').toLowerCase();
  }
  function list(tab) {
    const S = U.S().cons; const f = S.af;
    const rows = (tab === 'disch' ? U.discharged : L.consumers).filter((c) =>
      (!norm(f.name) || norm(c.ini).includes(norm(f.name)) || c.id.includes(f.name.trim())) &&
      (!f.rec.trim() || c.id.includes(f.rec.trim())) && (!f.staff || c.staff === f.staff) && (!f.group || c.group === f.group));
    const k = S.sort.k, d = S.sort.d;
    const valid = COLS[tab].some((x) => x[0] === k) ? k : 'id';
    return rows.slice().sort((a, b) => { const x = keyOf(a, valid), y = keyOf(b, valid); return (x < y ? -1 : x > y ? 1 : +a.id - +b.id) * d; });
  }
  function table(tab) {
    const S = U.S().cons; const cols = COLS[tab]; const total = (tab === 'disch' ? U.discharged : L.consumers).length;
    const rows = list(tab);
    const th = cols.map(([k, t]) => '<th class="srt' + (k === 'updated' || k === 'when' ? ' c-upd' : '') + '" data-act="l1a-cons-sort" data-k="' + k + '" title="Sort by ' + esc(t) + '">' + esc(t) + '<span class="ar">' + (S.sort.k === k ? (S.sort.d > 0 ? '▲' : '▼') : '') + '</span></th>').join('');
    /* the name opens the file; a consumer not assigned to this user reads No access (Lauris's own guardrail) */
    const name = (c) => (!U.blocked(c) ? '<a class="lk" data-go="lauris-consumer?c=' + c.id + '">' + esc(c.ini) + '</a>' : '<span class="l1-off" data-psy="off">' + esc(c.ini) + '</span>' + U.NOACC);
    const row = tab === 'disch'
      ? (c) => '<tr class="hov"><td>' + c.id + '</td><td class="nw">' + name(c) + '</td><td class="nw">' + esc(c.staff) + '</td><td class="nw">' + esc(c.group) + '</td><td class="c-upd">' + esc(c.when) + '</td><td>' + esc(c.why) + '</td></tr>'
      : (c) => { const none = L.units(c) == null; const off = U.blocked(c); return '<tr class="hov' + (off ? ' off' : '') + '"><td>' + c.id + '</td><td class="nw">' + name(c) + '</td><td class="nw">' + esc(c.staff) + '</td><td class="nw">' + esc(c.group) + '</td><td class="c-upd">' + esc(c.updated) + '</td><td class="nw">' + (off ? '' : U.dss() ? U.NOACC : '<a class="lk' + (none ? ' warn' : '') + '" data-go="lauris-consumer?c=' + c.id + '&amp;tab=auth">' + esc(L.unitsLabel(c)) + '</a>') + '</td></tr>'; };
    const body = rows.length ? rows.map(row).join('') : '<tr><td colspan="6"><div class="l1-empty">No consumers match. <a class="lk" data-act="l1a-cons-clear">Clear the filters</a></div></td></tr>';
    return '<table class="lt"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table>' +
      '<div class="lmuted" style="padding:8px 4px 0" data-psy="count">' + (rows.length === total ? U.plural(total, 'consumer') : 'Showing ' + rows.length + ' of ' + total + ' consumers') + (tab === 'disch' ? ' discharged since 2025' : '') + '</div>';
  }
  function tabs(tab) {
    return '<a class="ltab' + (tab === 'active' ? ' on' : '') + '" data-act="l1a-cons-tab" data-tab="active">Active Consumers</a><a class="ltab' + (tab === 'disch' ? ' on' : '') + '" data-act="l1a-cons-tab" data-tab="disch">Discharged Consumers</a>';
  }
  const groups = () => { const g = []; U.all().forEach((c) => { if (!g.includes(c.group)) g.push(c.group); }); return g.sort(); };
  const staffs = () => { const g = []; U.all().forEach((c) => { if (!g.includes(c.staff)) g.push(c.staff); }); return g.sort(); };

  function redraw(root) {
    const S = U.S().cons;
    root.querySelector('[data-psy="tabs"]').innerHTML = tabs(S.tab);
    root.querySelector('[data-psy="tbl"]').innerHTML = table(S.tab);
  }

  PSY.register({
    id: 'lauris-consumers', app: 'lauris', label: 'Consumers', url: 'consumers', css: U.css,
    render() {
      const S = U.S().cons; const f = S.f;
      const opt = (arr, v, all) => '<option value="">' + all + '</option>' + arr.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
      const main =
        '<div class="ltabs" data-psy="tabs">' + tabs(S.tab) + '</div>' +
        '<div class="l1-bar">' +
        '<div><label>Consumer</label><input class="l1-in" data-f="name" data-input="l1a-cons-typed" data-enter="l1a-cons-search" value="' + esc(f.name) + '" placeholder="Initials or ID" autocomplete="off"></div>' +
        '<div class="s"><label>Record #</label><input class="l1-in" data-f="rec" data-input="l1a-cons-typed" data-enter="l1a-cons-search" value="' + esc(f.rec) + '" autocomplete="off"></div>' +
        '<div><label>Assigned staff</label><select class="l1-in" data-f="staff" data-change="l1a-cons-typed">' + opt(staffs(), f.staff, 'All staff') + '</select></div>' +
        '<div class="g"><label>Case Load Group</label><select class="l1-in" data-f="group" data-change="l1a-cons-typed">' + opt(groups(), f.group, 'All groups') + '</select></div>' +
        '<button class="lb" data-act="l1a-cons-search" style="min-height:30px;padding:5px 14px">Search Consumers</button>' +
        '</div>' +
        '<div class="lcard" style="overflow-x:auto" data-psy="tbl">' + table(S.tab) + '</div>';
      return PSY.lauris.page({
        active: 'Consumers', main,
        panel: { context: 'Consumers', notes: U.notes.consumers() },
      });
    },
  });

  PSY.acts['l1a-cons-tab'] = (el, ctx) => { const S = U.S().cons; S.tab = el.getAttribute('data-tab'); PSY.save(); redraw(ctx.root); };
  PSY.acts['l1a-cons-sort'] = (el, ctx) => {
    const S = U.S().cons; const k = el.getAttribute('data-k');
    S.sort = S.sort.k === k ? { k, d: -S.sort.d } : { k, d: 1 }; PSY.save(); redraw(ctx.root);
  };
  PSY.acts['l1a-cons-typed'] = (el) => { const S = U.S().cons; S.f[el.getAttribute('data-f')] = el.value; };
  PSY.acts['l1a-cons-search'] = (el, ctx) => {
    const S = U.S().cons;
    ctx.root.querySelectorAll('[data-f]').forEach((i) => { S.f[i.getAttribute('data-f')] = i.value; });
    S.af = Object.assign({}, S.f); PSY.save(); redraw(ctx.root);
  };
  PSY.acts['l1a-cons-clear'] = (el, ctx) => {
    const S = U.S().cons; S.f = { name: '', rec: '', staff: '', group: '' }; S.af = Object.assign({}, S.f); PSY.save();
    ctx.root.querySelectorAll('[data-f]').forEach((i) => { i.value = ''; });
    redraw(ctx.root);
  };
})();
