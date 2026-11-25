/* STARTER screens so the shell can be tested before the real Lauris screens exist. Replaced by later files with the same id. */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris;
  PSY.register({
    id: 'lauris-consumers', kind: 'lauris', label: 'Consumers', url: 'consumers',
    render() {
      const rows = L.consumers.map((c) => '<tr class="hov"><td>' + c.id + '</td><td>' + c.ini + '</td><td>' + c.staff + '</td><td>' + c.group + '</td><td>' + c.updated + '</td><td><a class="lk' + (L.units(c) == null ? ' warn' : '') + '" data-go="lauris-dpn">' + L.unitsLabel(c) + '</a></td></tr>').join('');
      const main = '<div class="ltabs"><a class="ltab on">Active Consumers</a><a class="ltab">Discharged Consumers</a></div><table class="lt"><thead><tr><th>Unique ID</th><th>Name</th><th>Staff</th><th>Group</th><th>Last updated</th><th>Units</th></tr></thead><tbody>' + rows + '</tbody></table>';
      return PSY.lauris.page({ active: 'Consumers', main, panel: { context: 'J. Perez · Campbell County and Lynchburg City', notes: '<div class="xcard">Good morning, Jordan.</div>' } });
    },
  });
  PSY.register({ id: 'lauris-dpn', kind: 'lauris', label: 'Daily note', render() { return PSY.lauris.page({ active: 'Add Session', main: '<h3 class="lh1">Daily note (starter)</h3>', panel: { notes: 'notes' } }); } });
})();
